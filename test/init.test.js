const path = require('path')
const test = require('ava')
const {Dataset} = require('data.js')
const run = require('inquirer-test')
const {ENTER} = require('inquirer-test')

const {scanDir, addResource} = require('../lib/init')

test.serial('checks scanDir function', async t => {
  const res = await scanDir('test/fixtures/readdirTest/')
  const exp = {
    files:
     ['sample1.csv', 'sample2.json'],
    dirs: ['dir']
  }
  t.deepEqual(res, exp)
})

test.serial('adding resources - addResource function', async t => {
  const dpObj = await Dataset.load('test/fixtures/dp-test/datapackage.json')

  t.true(dpObj.resources.length === 1)
  const path_ = path.resolve(__dirname, './fixtures/sample.csv')
  await addResource(path_, dpObj)
  t.true(dpObj.resources.length === 2)
  t.is(dpObj.resources[1].descriptor.name, 'sample')
})

test.serial('adding tabular data should include schema', async t => {
  const dpObj = await Dataset.load('test/fixtures/dp-test/datapackage.json')
  const expResourceDescriptor = {
    name: 'sample',
    path: 'sample.csv',
    format: 'csv',
    schema: {
      fields: [
        {
          format: 'default',
          name: 'number',
          type: 'integer'
        },
        {
          format: 'default',
          name: 'string',
          type: 'string'
        },
        {
          format: 'default',
          name: 'boolean',
          type: 'boolean'
        }
      ]
    }
  }
  const path_ = path.resolve(__dirname, './fixtures/sample.csv')
  await addResource(path_, dpObj)
  t.deepEqual(dpObj.resources[1].descriptor.schema.fields, expResourceDescriptor.schema.fields)
})

test.serial('adding non tabular file', async t => {
  const dpObj = await Dataset.load('test/fixtures/dp-test/datapackage.json')
  const expResourceDescriptor = {
    encoding: "ISO-8859-9",
    name: 'second-resource-non-tabular',
    path: 'test/fixtures/dp-test/second-resource-non-tabular.json',
    pathType: "local",
    format: 'json',
    mediatype: "application/json"
  }
  await addResource('test/fixtures/dp-test/second-resource-non-tabular.json', dpObj)
  t.deepEqual(dpObj.resources[1].descriptor, expResourceDescriptor)
})
