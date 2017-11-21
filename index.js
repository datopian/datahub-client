const {DataHub} = require('lib/utils/datahub.js')
const {info} = require('lib/info')
const {get} = require('lib/get')
const {init} = require('lib/init')
const {login} = require('lib/login')
const {authenticate} = require('lib/login')
const {writers} = require('lib/cat')
const {validate} = require('lib/validate')
const {customMarked} = require('lib/utils/tools.js')
const {wait} = require('lib/utils/output/wait')
const {handleError} = require('lib/utils/error')
const {error} = require('lib/utils/error')
const {config} = require('lib/utils/config')
const {infoOutput} = require('lib/utils/output/info.js')

// Module API

module.exports = {
  DataHub,
  info,
  get,
  init,
  login,
  authenticate,
  writers,
  validate,
  customMarked,
  wait,
  handleError,
  error,
  config,
  infoOutput
}