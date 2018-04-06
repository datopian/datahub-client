Node client and utilities for interacting with https://DataHub.io and handling Data Packages.

[![Build Status](https://travis-ci.org/datahq/datahub-client.svg?branch=master)](https://travis-ci.org/datahq/datahub-client)
[![XO code style](https://img.shields.io/badge/code_style-XO-5ed9c7.svg)](https://github.com/sindresorhus/xo)
[![Issues](https://img.shields.io/badge/issue-tracker-orange.svg)](https://github.com/datahq/datahub-client/issues)

## Introduction

The [DataHub](http://datahub.io/) platform stores a lot of different datasets - which are packages of useful data alongside with the description (here is [the dataset specification](https://frictionlessdata.io/docs/data-package/)). The data, stored on the DataHub, has a nice structure, views and a description that help people to get insights.

You can also store and share your own datasets on the DataHub

As a programmer, you may want to automate the process of getting or storing the data. Also you may want to integrate your project and the DataHub.

The `datahub-client` library is designed for this. Let's explore it together.

**Important notes:**
- You need to use **Node version > 7.6**
- When you see the **await** keyword you should wrap this peace of the code in the **async** function.

## Install

```shell
npm install datahub-client --save
```
```javascript
const datahub = require('datahub-client')
```

## Quick overview

With `datahub-client` you can do things like:
- login to DataHub
- authenticate with the jwt token
- push a dataset:
- get the data from the DataHub:
- init a new dataset
- verify that existing dataset is correct
- transform tabular files info to different formats

Let's explore `datahub-client` features more deeply below.

## login and authenticate

Documentation is not ready at the moment.
Information will be here after refactoring Login module.

### Datahub class

Datahub class contains `push()` and `pushFlow()` methods, that is used to upload a dataset to the DataHub.io

**push a dataset** (dataset is an instance of a Dataset class: https://github.com/datahq/data.js#datasets):
```javascript
const {DataHub} = require('datahub-client')
const {Dataset} = require('data.js')

/* secure jwt token and userId is taken from the Login&Auth module */
const datahubConfigs = {
     apiUrl: 'http://api.datahub.io/',
     token: 'jwt token',
     debug: false,
     ownerid: 'userId',
   }
const datahub = new DataHub(datahubConfigs)

const pushOptions = {findability: 'unlisted'}
const res = await datahub.push(dataset, pushOptions)
console.log(res)
```
Possible push options:
- findability: one of 'unlisted', 'published', 'private'
- sheets: used to define excel sheets to push. Could be the sheet number, name or array of numbers, names
- schedule: 'every X[m|h|d|w]' (min, hours, days, weeks)

This is an example of correct `datahub.push()` response:
```javascript
{ dataset_id: 'username/finance-vix',
  errors: [],
  flow_id: 'username/finance-vix/40',
  success: true }
```

If you get any errors - change the debug option: `datahubConfigs = {debug: true, ...}`, to see the detailed log.

**`pushFlow()` is an experimental method, its documentation is not ready yet.

## Get data using the `datahub-client`

```javascript
const datahub = require('datahub-client');
const {Dataset} = require('data.js');

const dataset = await Dataset.load(datasetUrl);
const resources = await datahub.get(dataset);
```
`Dataset.load()` takes a path to the data package and returns a dataset object: https://github.com/datahq/data.js#datasets

`datahub-client.get()` method accept the dataset object and returns an array with resources from it.

Each resource in the resources is the special File object from the `data.js` lib: https://github.com/datahq/data.js#files

## info

Info module contains two methods:
- `infoPackage(dpObj)` Shows the meta information about the dataset.
  @param {`data.js/Datapackage` object}
  @return: {string}

- `async infoResource(resource)` Shows the information about one particular resource
  @param {`data.js/File` object} - only tabular file objects are supported
  @return: {string} - ascii table

```javascript
const data = require('data.js');
const datahub = require('datahub-client');

let dataset = await data.Dataset.load('http://github.com/datasets/finance-vix')

console.log(
  datahub.info.infoPackage(dataset),
  await datahub.info.infoResource(dataset.resources[0])
)
```


## init

Init module is used to interactively create a new datapackage or update an existing one.
1. `init.init()` scan files/directories in the current directory
2. Asks user interactively about adding found files to the datapackage
3. Generates/extends a `datapackage.json` file, ask user if it is correct
4. save `datapackage.json` on the disk.

Example: save this code into `init.js`
```javascript
const datahub = require('datahub-client');
datahub.init.init()
```
Run the snippet in the terminal:
```
node init.js

This process initializes a new datapackage.json file.
Once there is a datapackage.json file, you can still run `data init` to
update/extend it.
Press ^C at any time to quit.

? Enter Data Package name - Some-Package-Name
? Enter Data Package title - Some-Package-Title
? Do you want to scan following directory ".idea" - y/n? n
? Do you want to scan following directory "basic-csv" - y/n? y
? Do you want to add following file as a resource "comma.csv" - y/n? y
comma.csv is just added to resources
? Going to write to /home/user/data/datapackage.json:

{
  "name": "some-name",
  "title": "some-title",
  "resources": [
    {
      "path": "basic-csv/comma.csv",
<<<<<<<<< cut >>>>>>>>

Is that OK - y/n? y
datapackage.json file is saved in /home/user/data/datapackage.json
```

## validate

This module contains `Validator` class, which checks:
- the datapackage data is valid against the descriptor schema
- the descriptor itself is correct.

Using:
```javascript
const datahub = require('datahub-client')

const validator = new datahub.Validator({identifier: path_to_descriptor})
validator.validate().then(console.log)
```

If the datapackage is valid -  the validator will return **True**
Otherwise it will return an object with the information:
- a TableSchemaError exception
- a list of errors that was found
- help info to find where the error is
```
{ TableSchemaError: There are 1 type and format mismatch errors (see error.errors') ...
  _errors:
   [ { TableSchemaError: The value "true" in column "boolean" is not type "date" and format "default" ... } ],
  rowNumber: 2,
  resource: 'comma',
  path: '/home/user/work/basic-csv/comma.csv' }
```

## cat

This module allows you to read the tabular data from inside the `data.js/File` and to transform this data into a different formats.

Cat module has several writer functions, for different formats:
- ascii, csv, md, xlsx, html

Each of the writers function convert the given source file into the stream with appropriate format.

The module exports the 'writers' object, that contains all this functions together:
```javascript
writers = {
  ascii: dumpAscii,
   csv: dumpCsv,
   md: dumpMarkdown,
   xlsx: dumpXlsx,
   html: dumpHtml
}
```

Example of use:
```javascript
const {writers} = require('datahub-client').cat
const data = require('data.js')

const resource = data.File.load('data.csv')

Promise.resolve().then(async ()=>{
  const stream = await writers.ascii(resource)
  stream.pipe(process.stdout)

  // or you can save the stream into a file:
  const writeStream = fs.createWriteStream('filename', {flags : 'w'})
  stream.pipe(writeStream)
})
```
Output for `writers.ascii`:
```
┌────────────────────────────────┬────────────────────────────────┬────────────────────────────────┐
│ number                         │ string                         │ boolean                        │
├────────────────────────────────┼────────────────────────────────┼────────────────────────────────┤
│ 1                              │ one                            │ true                           │
├────────────────────────────────┼────────────────────────────────┼────────────────────────────────┤
│ 2                              │ two                            │ false                          │
└────────────────────────────────┴────────────────────────────────┴────────────────────────────────┘
```
Output for `writers.md`:
```
| number | string | boolean |
| ------ | ------ | ------- |
| 1      | one    | true    |
| 2      | two    | false   |
```
CSV:
```
number,string,boolean
1,one,true
2,two,false
```
HTML:
```htmlmixed
<table class="table table-striped table-bordered">
<thead>
<th>number</th>
<th>string</th>
<th>boolean</th>
</thead>
<tbody>
<tr>
<td>1</td>
<td>one</td>
....................
```
XLSX: excel file

# For developers

*You need to have Node.js version >7.6*

## Install

```
$ npm install
```

## Running tests

We use Ava for our tests. For running tests use:

```
$ [sudo] npm test
```

To run tests in watch mode:

```
$ [sudo] npm run watch:test
```

## Lint

We use XO for checking our code for JS standard/convention/style:

```bash
# When you run tests, it first runs lint:
$ npm test

# To run lint separately:
$ npm run lint # shows errors only

# Fixing erros automatically:
$ xo --fix
```
