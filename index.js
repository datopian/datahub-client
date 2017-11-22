const cat = require('./lib/cat')
const {generateDescriptor} = require('./lib/descriptor')
const {get} = require('./lib/get')
const info = require('./lib/info')
const init = require('./lib/init')
const {login} = require('./lib/login')
const {authenticate} = require('./lib/login')
const validate = require('./lib/validate')

const wait = require('./lib/utils/output/wait')
const infoOutput = require('./lib/utils/output/info.js')
const {error} = require('./lib/utils/error')

const {Agent} = require('./lib/utils/agent')
const {checkDpIsThere} = require('./lib/utils/common')
const config = require('./lib/utils/config')
const {DataHub} = require('./lib/utils/datahub')
const {processExcelSheets} = require('./lib/utils/datahub')
const {handleOutputs} = require('./lib/utils/datahub')
const {handleError} = require('./lib/utils/error')
const {customMarked} = require('./lib/utils/tools.js')




// Module API

module.exports = {
  cat,
  generateDescriptor,
  get,
  info,
  init,
  login,
  authenticate,
  validate,
  wait,
  infoOutput,
  error,
  Agent,
  checkDpIsThere,
  config,
  DataHub,
  processExcelSheets,
  handleOutputs,
  handleError,
  customMarked
}