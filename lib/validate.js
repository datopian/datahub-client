const tv4 = require('tv4')
const fetch = require('node-fetch')
const {Table} = require('tableschema')

const {File, isUrl} = require('data.js')

async function validate(datasetObj) {
  try {
    await validateMetadata(datasetObj.descriptor)
    for (let i = 0; i < datasetObj.resources.length; i++) {
      // Run data validation against schema if file format is either csv or tsv:
      if (['csv', 'tsv'].includes(datasetObj.resources[i].descriptor.format)) {
        await validateData(
          datasetObj.resources[i].descriptor.schema,
          datasetObj.resources[i].path,
          datasetObj.resources[i].descriptor.dialect
        )
      }
    }
    return true
  } catch (err) {
    return err
  }
}

async function validateData(schema, absPath, parserOptions) {
  // TODO: handle inlined data resources
  let options = {schema}
  if (parserOptions) {
    Object.assign(options, parserOptions)
  }
  const table = await Table.load(absPath, options)
  await table.read()
  return true
}

async function validateMetadata(descriptor) {
  // If descriptor has a profile property then use it
  // Else use the latest schema
  const defaultProfile = descriptor.profile || 'data-package'

  const profile = await Profile.load(defaultProfile)

  // Validate descriptor
  return profile.validate(descriptor)
}

// Profile class extracted from datapackage-js library
class Profile {

  static async load(profile) {
    let jsonschema = _cache[profile]
    if (!jsonschema) {
      let knownProfiles = []
      try {
        const profilesRes = await fetch('https://frictionlessdata.io/schemas/registry.json')
        knownProfiles = await profilesRes.json()
      } catch (err) {
        throw new Error('Failed to load schema registry')
      }
      const remoteProfile = knownProfiles.find(prof => profile === prof.id)
      if (remoteProfile) {
        try {
          const response = await fetch(remoteProfile.schema)
          jsonschema = await response.json()
        } catch (err) {
          throw new Error('Can not retrieve remote profile ' + profile)
        }
      } else if (isUrl(profile)) {
        try {
          const response = await fetch(profile)
          jsonschema = await response.json()
        } catch (err) {
          throw new Error('Can not retrieve remote profile ' + profile)
        }
      } else {
        try {
          // Local
          const schemaPath = './schema/' + profile + '.json'
          jsonschema = require(schemaPath)
        } catch (err) {
          throw new Error('Profiles registry hasn\'t profile ' + profile)
        }
      }



      _cache[profile] = jsonschema
    }
    return new Profile(jsonschema)
  }

  get name() {
    if (this._jsonschema.title) {
      return this._jsonschema.title.replace(' ', '-').toLowerCase()
    }
    return null
  }

  get jsonschema() {
    return this._jsonschema
  }

  /**
   * Validate descriptor
   *
   */
  validate(descriptor) {
    const validation = tv4.validateMultiple(descriptor, this._jsonschema)
    if (!validation.valid) {
      const errors = []
      for (const error of validation.errors) {
        errors.push(new Error(
          `Descriptor validation error:
          ${error.message}
          at "${error.dataPath}" in descriptor and
          at "${error.schemaPath}" in profile`))
      }
      throw errors
    }
    return true
  }

  // Private

  constructor(jsonschema) {
    this._jsonschema = jsonschema
  }

}

// Internal

const _cache = {}

module.exports = {
  validate,
  validateData,
  validateMetadata,
  Profile
}
