const EventEmitter = require('events')
const fs = require('fs')
const path = require('path')

const {File, Dataset} = require('data.js')
const parse = require('csv-parse/lib/sync')
const infer = require('tableschema').infer
const urljoin = require('url-join')
const inquirer = require('inquirer')

const checkDpIsThere = require('./utils/common').checkDpIsThere

const specialFiles = ['readme', 'readme.md', 'license', 'license.md', 'licenses', 'licenses.md']


class Init extends EventEmitter {

  constructor({interactive}={}) {
    super()
    this.interactive = interactive
    this.dpObj = {}
  }


  /*
  * Method to create datapackage.json file
  * @param none - does not take any parameters
  * @return {descriptor}
  */
  async createDataset() {
    // Intro messages:
    this.emit('message', 'This process initializes a new datapackage.json file.')
    this.emit('message', 'Once there is a datapackage.json file, you can still run `data init` to update/extend it.')
    this.emit('message', 'Press ^C at any time to quit.\n')

    // Guess default name from cwd name:
    const cwdPathParts = process.cwd().split('/')
    let datasetName = cwdPathParts[cwdPathParts.length - 1]
    // Make unslugified version for title:
    let datasetTitle = datasetName.replace(/-+/g, ' ')
    datasetTitle = datasetTitle.charAt(0).toUpperCase() + datasetTitle.slice(1)
    // If interactive mode, ask user to confirm default values:
    if (this.interactive) {
      const questions = [
        {
          type: 'input',
          name: 'name',
          message: 'Enter Data Package name',
          default: () => {
            return datasetName
          },
          validate: value => {
            // eslint-disable-next-line no-useless-escape
            const pass = value.match(/^[a-z\0-9\.\-\_]+$/)
            if (pass) {
              return true
            }
            return `Must consist only of lowercase alphanumeric characters plus ".", "-" and "_"`
          }
        },
        {
          type: 'input',
          name: 'title',
          message: 'Enter Data Package title',
          default: () => {
            return datasetTitle
          }
        }
      ]
      const result = await inquirer.prompt(questions)
      datasetName = result.name
      datasetTitle = result.title
    }

    const descriptor = {
      name: datasetName,
      title: datasetTitle,
      resources: []
    }

    this.dpObj = await Dataset.load(descriptor)
    if (this.interactive) {
      const path_ = ''
      const filesAndDirs = await this.scanOnlyDir()
      await this.shouldAddFiles(filesAndDirs.files, path_)
      await this.shouldScanDir(filesAndDirs.dirs, path_)
      await this.shouldWrite()
    } else {
      // Scan all nested directories and collect files:
      // It's done recursively so may cause memory issues:
      const allFiles = await new Promise((resolve, reject) => {
        this.scanAllDir('./', (err, results) => {
          if (err) throw err
          resolve(results)
        })
      })

      // Add all collected files as 'resources':
      for (let file of allFiles) {
        await this.addResource(file)
      }
    }
    this.addDefaultLicense()
    return this.dpObj._descriptor
  }


  /*
  * Method to update/extend a datapackage.json
  * @param none - does not take any parameters
  * @return {descriptor}
  */
  async updateDataset() {
    // Intro messages:
    this.emit('message', 'This process updates existing datapackage.json file.')
    this.emit('message', '\nPress ^C at any time to quit.\n')

    const questions = [
      {
        type: 'input',
        name: 'answer',
        message: `There is datapackage.json already. Do you want to update it - y/n?`,
        validate: value => {
          const pass = value.match(/^[y,n]+$/)
          if (pass) {
            return true
          }
          return `Please, provide with following responses 'y' for yes or 'n' for no`
        }
      }
    ]
    const result = await inquirer.prompt(questions)
    if (result.answer === 'y') {
      this.dpObj = await Dataset.load('./datapackage.json')
      const path_ = ''
      const filesAndDirs = await this.scanOnlyDir()
      await this.shouldAddFiles(filesAndDirs.files, path_)
      await this.shouldScanDir(filesAndDirs.dirs, path_)
      await this.shouldWrite()
      this.addDefaultLicense()
      return this.dpObj._descriptor
    } else {
      this.emit('message', `Process canceled\n`)
    }
  }


  /*
   * Method to scan directory
   * @param {path} as path to directory
   * @return {Object} object with 2 properties -  files and dirs
   */
  scanOnlyDir(path_ = './') {
    return new Promise((resolve, reject) => {
      const filesAndDirs = {
        files: [],
        dirs: []
      }
      fs.readdir(path_, (err, files) => {
        if (err) {
          reject(err)
          return
        }
        files.forEach(file => {
          const stats = fs.lstatSync(urljoin(path_, file))
          if (stats.isDirectory()) {
            filesAndDirs.dirs.push(file)
          } else if (file !== 'datapackage.json') {
            filesAndDirs.files.push(file)
          }
        })
        resolve(filesAndDirs)
      })
    })
  }


  /*
   * Method to scan directory with all nested directories recursively
   * @param {dir} as path to directory
   * @param {done} as callback function
   * Triggers callback function once done
   */
  scanAllDir(dir, done) {
    let results = []
    fs.readdir(dir, function(err, list) {
      if (err) return done(err)
      let pending = list.length
      if (!pending) return done(null, results)
      list.forEach(function(file) {
        file = path.join(dir, file)
        fs.stat(file, function(err, stat) {
          if (stat && stat.isDirectory()) {
            scanDirAll(file, function(err, res) {
              results = results.concat(res)
              if (!--pending) done(null, results)
            });
          } else {
            results.push(file)
            if (!--pending) done(null, results)
          }
        })
      })
    })
  }


  /*
   * Method to add resource to datapackage object
   * @param {path_} as path to file
   * @return it does not explicitely return anything but it modifies a given param
   */
  async addResource(path_) {
    // Initialize File object from path_ and add it as resource into dataset:
    const file = await File.load(path_)
    // Exclude specialFiles:
    if (specialFiles.includes(file.descriptor.name.toLowerCase())) {
      this.emit('message', `Detected special file: ${file.descriptor.path}`)
      // If file is readme then use it as description:
      if (file.descriptor.name.toLowerCase() === 'readme') {
        const buffer = await file.buffer
        this.addDescriptionFromReadme(buffer.toString())
      }
      return
    }
    // By checking extension of file, guess if it's tabular. If so enerate schema:
    const knownTabularFormats = ['csv', 'tsv', 'dsv']
    if (knownTabularFormats.includes(file.descriptor.format)) {
      await file.addSchema()
    }
    // Now add this file as resource into dataset:
    this.dpObj.addResource(file)
    this.emit('message', `${file.descriptor.path} is just added to resources`)
  }


  /*
  * Method to add a default license into descriptor
  * no params
  * doesn't return anything explicitely
  */
  addDefaultLicense() {
   // We use ODC-PDDL-1.0 as default license:
   // TODO: detect LICENSE file to add custom licenses.
   this.dpObj._descriptor.licenses = [
     {
        name: 'ODC-PDDL-1.0',
        path: 'http://opendatacommons.org/licenses/pddl/',
        title: 'Open Data Commons Public Domain Dedication and License v1.0'
     }
   ]
  }


  /*
  * Method to add description from README file
  */
  addDescriptionFromReadme(readme) {
    // Use first 100 chars of readme as description:
    this.dpObj._descriptor.description = readme.substring(0, 100)
  }


  /*
  * Method to loop through list of files
  * @param {filesAndDirs} object with 2 properties -  files and dirs
  * @return it does not explicitely return anything but it modifies a given param {dpObj}
  */
  async shouldAddFiles(files, currentPath) {
    // Make array of resource pathes so we can check if a resource already included
    // in a data package.
    const arrayOfResourceNames = this.dpObj.descriptor.resources.map(resource => {
      // eslint-disable-next-line no-useless-escape
      return resource.path.replace(/^.*[\\\/]/, '')
    })
    for (let i = 0; i < files.length; i++) {
      // Check if file is already included
      if (arrayOfResourceNames.indexOf(files[i]) === -1) {
        const questions = [
          {
            type: 'input',
            name: 'answer',
            message: `Do you want to add following file as a resource "${files[i]}" - y/n?`,
            validate: value => {
              const pass = value.match(/^[y,n]+$/)
              if (pass) {
                return true
              }
              return `Please, provide with following responses 'y' for yes or 'n' for no`
            }
          }
        ]
        const result = await inquirer.prompt(questions)
        if (result.answer === 'y') {
          const pathForResource = path.join(currentPath, files[i])
          await this.addResource(pathForResource)
        } else {
          this.emit('message', `Skipped ${files[i]}`)
        }
      } else {
        this.emit('message', `Skipping ${files[i]} as it is already in the datapackage.json`)
      }
    }
  }


  /*
  * Method to loop through files inside directory
  * @param {filesAndDirs} object with 2 properties -  files and dirs
  * @return it does not explicitely return anything but it modifies a given param {dpObj}
  */
  async shouldScanDir(dirs, currentPath) {
    for (let j = 0; j < dirs.length; j++) {
      const questions = [
        {
          type: 'input',
          name: 'answer',
          message: `Do you want to scan following directory "${dirs[j]}" - y/n?`,
          validate: value => {
            const pass = value.match(/^[y,n]+$/)
            if (pass) {
              return true
            }
            return `Please, provide with following responses 'y' for yes or 'n' for no`
          }
        }
      ]
      const result = await inquirer.prompt(questions)

      if (result.answer === 'y') {
        const nextPath = path.join(currentPath, dirs[j])
        const filesAndDirs = await this.scanOnlyDir(nextPath)
        // Add resources if needed:
        await this.shouldAddFiles(filesAndDirs.files, nextPath)
        // If there are dirs in this dir then recurse:
        if (filesAndDirs.dirs.length > 0) {
          await this.shouldScanDir(filesAndDirs.dirs, nextPath)
        }
      }
    }
  }


  /*
  * Method to ask if it should write datapackage.json
  * does not return anything but stops the process depending on user's input
  */
  async shouldWrite() {
    const cwd = path.join(process.cwd(), 'datapackage.json')
    const questions = [
      {
        type: 'input',
        name: 'answer',
        message: `Going to write to ${cwd}:\n\n${JSON.stringify(this.dpObj._descriptor, null, 2)} \n\n\nIs that OK - y/n?`,
        validate: value => {
          const pass = value.match(/^[y,n]+$/)
          if (pass) {
            return true
          }
          return `Please, provide with following responses 'y' for yes or 'n' for no`
        }
      }
    ]
    const result = await inquirer.prompt(questions)
    if (result.answer === 'n') {
      throw new Error(`Process cancelled`)
    }
  }


}

module.exports.Init = Init
