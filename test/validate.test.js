const path = require('path')
const test = require('ava')
const nock = require('nock')
const {Dataset} = require('data.js')

const {Validator, Profile} = require('../lib/validate')

nock('http://example.com')
  .persist()
  .get('/data-package.json')
  .replyWithFile(200, path.join(__dirname, './fixtures/schema/data-package.json'))
  .get('/profile.json')
  .replyWithError(400)

// ====================================
// validate function
// ====================================

test('validate method', async t => {
  // Returns true if valid
  const descriptor = {
    name: 'valid-descriptor',
    resources: [
      {
        name: 'name',
        path: 'test/fixtures/sample.csv'
      }
    ]
  }
  let validator = new Validator({identifier: descriptor})
  const valid = await validator.validate()
  t.true(valid)

  const invalidDescriptor = {
    resources: []
  }
  validator = new Validator({identifier: invalidDescriptor})
  const invalid = await validator.validate()
  t.true(invalid[0].toString().includes('Array is too short (0), minimum 1'))
})

test('validate method with resource', async t => {
  const validator = new Validator({identifier: 'test/fixtures/finance-vix/'})
  const out = await validator.validate()
  t.true(out)
})

test('validate method with invalid resource', async t => {
  const validator = new Validator({identifier: 'test/fixtures/invalid-finance-vix/'})
  const out = await validator.validate()
  t.is(out.errors[0].message, 'The value "17.96" in column "VIXOpen" is not type "date" and format "default"')
})

// ====================================
// validateData method
// ====================================

test('validateData works with valid schema and data', async t => {
  const basePath = path.join(__dirname, './fixtures/finance-vix/')
  const dpjson = require(path.join(basePath, 'datapackage.json'))
  const descriptor = dpjson.resources[0]
  const path_ = path.join(basePath, descriptor.path)
  const validator = new Validator()
  const valid = await validator.validateData(descriptor, path_)
  t.true(valid)
})

test('validateData fails if data is not valid against schema', async t => {
  const basePath = path.join(__dirname, './fixtures/invalid-finance-vix/')
  const dpjson = require(path.join(basePath, 'datapackage.json'))
  const descriptor = dpjson.resources[0]
  const path_ = path.join(basePath, descriptor.path)
  const validator = new Validator()
  const error = await t.throws(validator.validateData(descriptor, path_))
  t.is(error.errors[0].message, 'The value "17.96" in column "VIXOpen" is not type "date" and format "default"')
  // t.true(error[0].toString().includes('Error: Wrong type for header: VIXOpen and value: 17.96'))
})

// ====================================
// validateMetadata method
// ====================================

test('it validateMetadata method works with valid descriptor', async t => {
  const descriptor = {
    name: 'valid-descriptor',
    resources: [
      {
        name: 'name',
        path: 'path'
      }
    ]
  }
  const validator = new Validator()
  const valid = await validator.validateMetadata(descriptor)
  t.true(valid)
})

test('it returns list of errors if descriptor is invalid', async t => {
  const descriptor = {
    resources: []
  }
  const validator = new Validator()
  const error = await t.throws(validator.validateMetadata(descriptor))
  t.true(error[0].toString().includes('Array is too short (0), minimum 1'))
})

// ====================================
// Profile class
// ====================================

// Constants

const PROFILES = [
  'data-package'
]

// Tests

PROFILES.forEach(name => {
  test(`Profile.load method for ${name}`, async t => {
    const jsonschema = require(`./fixtures/schema/${name}.json`)
    const defaultProfile = name
    const profile = await Profile.load(defaultProfile)
    t.deepEqual(profile.jsonschema, jsonschema)
  })
})

test('Profile.load method for remote', async t => {
  const url = 'http://example.com/data-package.json'
  const jsonschema = require('./fixtures/schema/data-package.json')
  const profile = await Profile.load(url)
  t.deepEqual(profile.name, 'data-package')
  t.deepEqual(profile.jsonschema, jsonschema)
})

test('throw loading bad registry profile', async t => {
  const name = 'bad-data-package'
  const error = await t.throws(Profile.load(name))
  t.true(error.message.includes('profile bad-data-package'))
})

test('throw loading bad remote profile', async t => {
  const name = 'http://example.com/profile.json'
  const error = await t.throws(Profile.load(name))
  t.true(error.toString().includes('Can not retrieve remote profile http://example.com/profile.json'))
})
