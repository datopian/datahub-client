const test = require('ava')

const data = require('data.js')
const info = require('../lib/info.js')

test('infoPackage works', async t => {
  const dataset = await data.Dataset.load('test/fixtures/co2-ppm')
  const out = info.infoPackage(dataset)
  t.true(out.includes('CO2 PPM - Trends in Atmospheric Carbon Dioxide.'))
})

test('infoPackage works with description and no readme', async t => {
  const description = 'Aaa\nbbb\n\nccc'
  const dataset = await data.Dataset.load({
    title: 'My dataset',
    description: description,
    resources: []
  })
  const out = info.infoPackage(dataset)
  t.true(out.includes(description))
})

test('infoResource works', async t => {
  const resource = data.File.load('test/fixtures/sample.csv')
  const out = await info.infoResource(resource)
  t.true(out.includes('number'))
})

