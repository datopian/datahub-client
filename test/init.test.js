const test = require('ava')

const {Init} = require('../lib/init')


const initializer = new Init({
  interactive: false,
  path_: 'test/fixtures/readdir test/'
})

test('createDataset', async t => {
  const descriptor = await initializer.createDataset()
  const expected = {
    name: 'readdir-test',
    title: 'Readdir test',
    description: 'This a sample README file.\n',
    readme: 'This a sample README file.\n',
    resources: [
      {
        dialect: {
          delimiter: ",",
          quoteChar: "\""
        },
        encoding: "ISO-8859-1",
        format: "csv",
        mediatype: "text/csv",
        name: "sample1",
        path: "test/fixtures/readdir test/sample1.csv",
        pathType: "local",
        schema: {
          fields: [
            {
              format: "default",
              name: "number",
              type: "integer",
            },
            {
              format: "default",
              name: "string",
              type: "string",
            },
            {
              format: "default",
              name: "boolean",
              type: "boolean",
            }
          ],
          missingValues: ['']
        }
      },
      {
        encoding: "ISO-8859-9",
        format: "",
        name: "sample2",
        path: "test/fixtures/readdir test/dir/sample2",
        pathType: "local"
      },
      {
        encoding: "UTF-8",
        format: "json",
        mediatype: "application/json",
        name: "sample3",
        path: "test/fixtures/readdir test/dir/dir2/sample3.json",
        pathType: "local",
      }
    ],
    licenses: [
      {
        name: 'ODC-PDDL',
        path: 'http://opendatacommons.org/licenses/pddl/',
        title: 'Open Data Commons Public Domain Dedication and License'
      }
    ]
  }

  t.deepEqual(descriptor, expected)
})
