const cat = require('./lib/cat')
const {get} = require('./lib/get')
const info = require('./lib/info')
const init = require('./lib/init')
const {login} = require('./lib/login')
const {authenticate} = require('./lib/login')
const validate = require('./lib/validate')

const config = require('./lib/utils/config')
const {DataHub} = require('./lib/utils/datahub')


// Module API

module.exports = {
  cat,
  get,
  info,
  init,
  login,
  authenticate,
  validate,
  config,
  DataHub
}
