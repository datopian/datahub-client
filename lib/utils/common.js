const fs = require('fs')
const fetch = require('node-fetch')

const checkDpIsThere = (path_ = process.cwd()) => {
  const files = fs.readdirSync(path_)
  return files.indexOf('datapackage.json') > -1
}

const checkUrlIsOK = (url_) => {
  return new Promise((resolve, reject) => {
    fetch(url_).then(res => {
      if (!res.ok) {
        throw new Error(`Invalid URL. ${res.status} ${res.statusText}: ${url_}`)
      }
      resolve()
    }).catch(err => {
      reject(err)
    })
  })
}

module.exports.checkDpIsThere = checkDpIsThere
module.exports.checkUrlIsOK = checkUrlIsOK
