const stream = require('stream')

const toArray = require('stream-to-array')
const Table = require('cli-table')
const mdTable = require('markdown-table')
const CSV = require('csv-stringify')
const parse = require('csv-parse')
const XLSX = require('xlsx')

const {stringToStream} = require('./utils/stream')

const getRows = async (fileOrStream, {sheet}={}) => {
  let rows
  if (fileOrStream.constructor.name === 'Socket') {
    rows = await toArray(fileOrStream.pipe(parse()))
  } else {
    rows = await toArray(await fileOrStream.rows({sheet}))
  }
  if (!rows || rows.length === 0) {
    throw new Error('Input source is empty or doesn\'t exist.\n> If you\'re using excel file, remember that sheet index starts from 1. You can also use a sheet name.')
  }
  return rows
}

const dumpAscii = async function (fileOrStream, {limit, sheet}={}) {
  const rows = await getRows(fileOrStream, {sheet})

  // Process.stdout.columns not defined when piping so we assume 100
  const termwidth = process.stdout.columns || 100
  const numrows = rows[0].length
  // Algorithm: termwidth - (1 each for each column edge + 1 extra)
  const eachColWidth = Math.floor(Math.max(5, (termwidth - numrows - 1) / numrows))
  const colWidths = Array(numrows).fill(eachColWidth)

  const table = new Table({
    head: rows[0],
    colWidths
  })

  limit = limit ? limit : rows.length
  limit = limit > rows.length ? rows.length : limit
  for (let i = 1; i < limit; i++) {
    table.push(rows[i])
  }

  return stringToStream(table.toString())
}

const dumpCsv = async function (fileOrStream, {sheet}={}) {
  const stringifier = CSV()
  let rows
  if (fileOrStream.constructor.name === 'Socket') {
    rows = fileOrStream.pipe(parse())
  } else {
    rows = await fileOrStream.rows({sheet})
  }
  return rows.pipe(stringifier)
}

const dumpMarkdown = async function (fileOrStream, {sheet}={}) {
  const rows = await getRows(fileOrStream, {sheet})
  return stringToStream(mdTable(rows))
}

const dumpXlsx = async function (fileOrStream, {sheet}={}) {
  const rows = await getRows(fileOrStream, {sheet})
  const newSheet = XLSX.utils.aoa_to_sheet(rows)
  const wb = {SheetNames: ['sheet'], Sheets: {sheet: newSheet}}
  const string = XLSX.write(wb, {type: 'buffer'})
  return stringToStream(string)
}

const dumpHtml = async function (fileOrStream, {sheet}={}) {
  const rows = await getRows(fileOrStream, {sheet})
  let thead = `<thead>`
  rows[0].forEach(col => {
    thead += `\n<th>${col}</th>`
  })
  thead += '\n</thead>'
  let tbody = '<tbody>'
  rows.slice(1).forEach(row => {
    let tr = '\n<tr>'
    row.forEach(col => {
      tr += `\n<td>${col}</td>`
    })
    tr += '\n</tr>'
    tbody += tr
  })
  tbody += '\n</tbody>'
  let table = `<table class="table table-striped table-bordered">\n${thead}\n${tbody}\n</table>`
  return stringToStream(table)
}

const writers = {
  ascii: dumpAscii,
  csv: dumpCsv,
  md: dumpMarkdown,
  xlsx: dumpXlsx,
  html: dumpHtml
}

module.exports = {
  dumpAscii,
  dumpCsv,
  dumpMarkdown,
  dumpXlsx,
  dumpHtml,
  writers
}
