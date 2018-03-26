const EventEmitter = require('events')
const tv4 = require('tv4')
const fetch = require('node-fetch')
const {Table} = require('tableschema')

const {Dataset, File, isUrl} = require('data.js')

class Validator extends EventEmitter {
  constructor({identifier}={}) {
    super()
    this.identifier = identifier
  }


  async validate() {
    this.emit('message', 'Loading the Dataset object...')
    const datasetObj = await Dataset.load(this.identifier)
    try {
      this.emit('message', {name: 'datapackage.json', status: 'validating'})
      await this.validateMetadata(datasetObj.descriptor)
      this.emit('message', {name: 'datapackage.json', status: 'done'})
      for (const resource of datasetObj.resources) {
        // Run data validation against schema if file format is either csv or tsv:
        this.emit('message', {
          name: resource.descriptor.name,
          status: 'validating'
        })
        if (['csv', 'tsv'].includes(resource.descriptor.format)) {
          await this.validateData(
            resource.descriptor,
            resource.path
          )
          this.emit('message', {
            name: resource.descriptor.name,
            status: 'done'
          })
        } else {
          this.emit('message', {
            name: resource.descriptor.name,
            status: 'skipped validation for non-tabular resource'
          })
        }
      }
      return true
    } catch (err) {
      // Throw error only if it is instance of Error:
      if (err.constructor.name === 'Error') {
        throw err
      } else { // E.g., if it TableSchemaError then just return it so we treat it differently:
        return err
      }
    }
  }


  async validateData(descriptor, absPath) {
    // TODO: handle inlined data resources
    let options = {schema: descriptor.schema}
    if (descriptor.dialect) {
      Object.assign(options, descriptor.dialect)
    }
    const table = await Table.load(absPath, options)
    try {
      await table.read()
    } catch (err) {
      err.resource = descriptor.name
      err.path = absPath
      throw err
    }
    return true
  }


  async validateMetadata(descriptor) {
    // If descriptor has a profile property then use it
    // Else use the latest schema
    const defaultProfile = descriptor.profile || 'data-package'

    const profile = await Profile.load(defaultProfile)

    // Validate descriptor
    return profile.validate(descriptor)
  }
}


// Profile class extracted from datapackage-js library
class Profile {

  static async load(profile) {
    let jsonschema = _cache[profile]
    if (!jsonschema) {
      let knownProfiles = []
      try {
        const profilesResponse = await fetch('https://frictionlessdata.io/schemas/registry.json')
        knownProfiles = await profilesResponse.json()
      } catch (err) {
        throw new Error('Failed to load schema registry')
      }
      const remoteProfile = knownProfiles.find(item => profile === item.id)
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
        let errorMsg = `Descriptor validation error:
          ${error.message}
          at "${error.dataPath}" in descriptor and
          at "${error.schemaPath}" in profile`
        // Show more details of error when `path` property doesn't match the pattern:
        if (error.schemaPath === '/properties/resources/items/properties/path/oneOf') {
          errorMsg += `\n Because of security reasons 'path' property cannot:
          - have backwards path '../'
          - start from filesystem root '/'
          - start from user root '~/'
          - start with '.'`
        }
        errors.push(new Error(errorMsg))
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
  Validator,
  Profile
}
