Node client and utilities for interacting with https://DataHub.io and handling Data Packages.

[![Build Status](https://travis-ci.org/datahq/datahub-client.svg?branch=master)](https://travis-ci.org/datahq/datahub-client)
[![XO code style](https://img.shields.io/badge/code_style-XO-5ed9c7.svg)](https://github.com/sindresorhus/xo)
[![Issues](https://img.shields.io/badge/issue-tracker-orange.svg)](https://github.com/datahq/datahub-client/issues)

## Introduction

The [DataHub](http://datahub.io/) platform stores a lot of different datasets - which are packages of useful data alongside with the description (here is [the dataset specification](https://frictionlessdata.io/docs/data-package/)). The data, stored on the DataHub, has a nice structure, views and a description that help people to get insights.
You can also store and share your own datasets on the DataHub

As a programmer, you may want to automate the process of getting or storing the data. Also you may want to integrate your project and the DataHub.

Let's explore the `datahub-client` library together.

**Important notes:**
- Datapackage and dataset means the same.
- You need to use **Node version > 7.6**
- When you see the **await** keyword you should wrap this peace of the code in the **async** function.

## Install the libs

To work with the DataHub as a programmer you need to install two npm packages to your project:
- The `datahub-client` is the DataHub SDK for JavaScript.
- The `data.js` is a standardized interface for accessing data files and datasets.
`data.js` also provides important `Dataset` and `File` classes, that represents a datapackage and a data-file.

```shell
npm install datahub-client --save
npm install data.js --save
```

## Quick overview

After loading `datahub-client` into your program
```javascript
const datahub = require('datahub-client')
```

You can do things like:

- login to DataHub
```javascript
datahub.login(
    'http://api.datahub.io',
    'github or google oauth url'
    'http://datahub.io'
)
```

- authenticate with the jwt token
```javascript
datahub.authenticate('http://api.datahub.io', 'secure_token')
```

- push a dataset:
```javascript
const {DataHub} = require('datahub-client')
// ... set the account options
const datahub = new DataHub(datahubConfigs)
datahub.push(dataset, options)`
```

- get the data from the DataHub:
```javascript
await datahub.get(dataset)
```

**Note:** The `dataset` is usually an instance of the `Dataset` class from the `data.js`: https://github.com/datahq/data.js#datasets

Let's explore some of the `datahub-client` features more deeply below.

## login and authenticate

Before pushing any data to the DataHub, your program should get the **secure jwt token**.

There is `authenticate` and `login` methods for this:
```javascript
const {authenticate, login} = require('datahub-client')
```

**`authenticate`** is used to get the user profile from the DataHub.io site:
- `async function authenticate(api_url, secure_token)`
@return user profile if the token is valid

```javascript
const userProfile = await authenticate('http://api.datahub.io', 'secure_token')
/* returns object:
{ authenticated: true,
  profile:
   { avatar_url: '',
     email: '',
     id: 'test',
     join_date: 'Tue, 20 Feb 2018 16:35:59 GMT',
     name: 'test',
     provider_id: 'test',
     username: 'test' } } */
```

But for the first time you have no secure token, so you should try to authenticate with an empty token to get the oauth providers' urls:
```javascript
authenticate('http://api.datahub.io', 'invalid_secure_token')
/* returns object:
{ authenticated: false,
  providers:
   { github:
      { url: 'https://github.com/login/oauth/authorize?response_type=code&client_id=cd6...' },
     google:
      { url: 'https://accounts.google.com/o/oauth2/auth?response_type=code&client_id=5581...' }
   }
} */
```

With login providers urls you can use **`login()`** method to get the token.

`async function login(apiUrl, authUrl, domain)` tries to login using the browser and oauth login provider - github or google
@return nothing but saves the user profile with the secure token into `config.json`

```javascript
async login(
    'http://api.datahub.io',
    'github or google auth url (from the authenticate method output)'
    'http://datahub.io'
)
```
`~/.config/datahub/config.json` file will be updated as a result:

```json
config = {
  "token": "secure_jwt_token",
   "api": "https://api.datahub.io",
   "profile": {
     "id": "user_id",
     "name": "John Smith",
     "provider_id": "test_provider",
     "username": "test_user"
   }
}
```


## Push data

### Prepare the test data and user credentials
1. Here is a sample dataset to push: https://github.com/datasets/finance-vix/archive/master.zip  Please, download and unpack it.
2. Login and get the credentials from the server (see **login and authenticate**)

### Push code example

```javascript
const {DataHub} = require('datahub-client')
const {Dataset} = require('data.js')

async function push_dataset(datasetPath){
   // Before pushing the dataset we need to load it from the disk
   let dataset = await Dataset.load(datasetPath)
   // Create an instance of the DataHub class, using the data from the user config
   const datahubConfigs = {
     apiUrl: 'http://api.datahub.io/',
     token: 'secure jwt token',
     debug: false,
     ownerid: 'userId',
   }
   const datahub = new DataHub(datahubConfigs)

   // now use the datahub instance to push the data
   const res = await datahub.push(dataset, {findability: 'unlisted'})
   console.log(res)
}
```

**Note:** Possible options for `datahub.push(dataset, options={})`:
- findability: one of 'unlisted', 'published', 'private'
- sheets: used to define excel sheets to push. Could be the sheet number, name or array of numbers, names
- schedule: 'every X[m|h|d|w]' (min, hours, days, weeks)

Using the push function:
```javascript
push_dataset('datasetPath')
```
This is an example of correct console output:
```javascript
{ dataset_id: 'username/finance-vix',
  errors: [],
  flow_id: 'username/finance-vix/40',
  success: true }
```

If you get any errors - change the debug option: `datahubConfigs = {debug: true, ...}`, to see the detailed log.

## Get data using the `datahub-client`

Let's create a function to get the data from the DataHub.

`Dataset.load()` takes a path to the data package and returns a dataset object: https://github.com/datahq/data.js#datasets
`datahub-client.get()` method accept the dataset object and returns an array with resources from it.
Each resource here is the special File object from the `data.js` lib: https://github.com/datahq/data.js#files

```javascript
const datahub = require('datahub-client');
const {Dataset} = require('data.js');

async function get_resources(datasetUrl) => {
  const dataset = await Dataset.load(datasetUrl);
  const resources = await datahub.get(dataset);
  return resources
}
```

Using the function:
```javascript
let resources = await get_resources('https://datahub.io/core/finance-vix')
resources.forEach(async file => {
  // print some info about the file:
  console.log(file._descriptor.name, file._descriptor.format)
  // save the resource into a regular file:
  const stream = await file.stream()
  stream.pipe(fs.createWriteStream( 'some_dest_path' ))
})
```

## Get data using `data.js`

You can get a dataset using only the `data.js` library:
```javascript
const {Dataset} = require('data.js')

const descriptorUrl = 'https://datahub.io/core/finance-vix/datapackage.json'
const dataset = await Dataset.load(descriptorUrl)
```
Then you can use the data from the dataset in different ways:
- get the list of all resources:
```javascript
for (let res of dataset.resources) {
  console.log(res._descriptor.name)
}
```

- get all tabular data (if exists):
```javascript
for (let res of dataset.resources) {
  if (res._descriptor.format === "csv") {
    // Get a raw stream
    const stream = await res.stream()
    // entire file as a buffer (be careful with large files!)
    const buffer = await res.buffer
    // print data
    stream.pipe(process.stdout)
  }
}
```


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
