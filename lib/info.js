const Schema = require('tableschema').Schema
const Table = require('cli-table')

const {writers} = require('./cat')
const {streamToString} = require('./utils/stream')

const infoPackage = dataset => {
  let firstParagraphReadme
  const readme = dataset.readme || dataset.descriptor.description || 'No readme is provided'

  if (readme) {
    firstParagraphReadme = readme.substring(0, 200).split(' ')
    firstParagraphReadme.pop()
    firstParagraphReadme = firstParagraphReadme.join(' ')
  }

  // prep the resources table
  let table = new Table({
    head: ['Name', 'Format', 'Size', 'Title']
  })

  dataset.descriptor.resources.forEach(resource => {
    table.push([
        resource.name,
        resource.format || 'N/A',
        resource.bytes || '?',
        resource.title || ''
      ])
  })

  const resourcesInfo = '\n## RESOURCES\n\n' + table.toString()

  const title = dataset.descriptor.title || dataset.descriptor.name

  const out = `
# ${title}

${firstParagraphReadme} ... *[see more below]*

${resourcesInfo}

## README

${readme}
`
  return out
}

const infoResource = async resource => {
  const out = await writers.ascii(resource, {limit:10})
  return await streamToString(out)
}

module.exports = {
  infoPackage,
  infoResource
}
