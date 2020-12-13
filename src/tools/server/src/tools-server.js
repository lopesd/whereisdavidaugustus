const express = require('express')
const path = require('path')
const fs = require('fs')
const gpmfExtract = require('gpmf-extract')
const goproTelemetry = require('gopro-telemetry')
const child_process = require('child_process')

const app = express()
app.use(express.json())

const publicDir = `${__dirname}/public`
app.use(express.static(publicDir))

const rawDir = '/Volumes/2TB SSD/GoPro Footage/The Great Escape'
app.use(express.static(rawDir))

const outputDir = `${__dirname}/output`

const allTelemetry = {}

// root page
app.get('/', (req, res) => {
  res.sendFile('./public/processor.html', { root: __dirname });
})

// request to list videos
app.get('/list-raw-videos', (req, res) => {
  const fileList = fs.readdirSync(rawDir)
  res.send({ videos: fileList })
})

// request for telemetry
app.get('/telemetry', async (req, res) => {
  const fileName = req.query.video
  let telemetry
  try {
    telemetry = await getTelemetry(fileName)
  } catch (e) {
    console.error(e)
  }
  res.send({ telemetry })
  console.log('done')
})

// request to export a trimmed and renamed gopro video
app.post('/export', async (req, res) => {
  try {
    performExport(req.body)
  } catch (e) {
    console.error(e)
    res.send({ status: 'failed' })
    return
  }

  res.send({ status: 'success' })
})

// start the server
const port = 3000
app.listen(port, () => {
  console.log(`Tools server listening http://localhost:${port}`)
})


// FUNCTIONALITY
async function performExport(r) {
  const fullFilename = getFullRawVideoFilename(r.videoName)
  const outputDirName = getFullOutputVideoDirName(r.rename)
  const outputFileName = getFullOutputVideoFilename(r.rename)
  const outputMetadataFileName = getFullOutputMetadataFilename(r.rename)

  const telemetry = await getTelemetry(r.videoName)
  const trimmedPath = getTrimmedPath(telemetry, r.trimStart, r.trimEnd)

  // CLEAR EXISTING FILES AND RECREATE OUTPUT FOLDER
  try {
    fs.rmdirSync(outputDirName, { recursive: true });
  } catch (e) {}
  fs.mkdirSync(outputDirName, { recursive: true })

  // TRIM AND RESIZE
  const args = [
    '-ss', r.trimStart,
    '-i', fullFilename,
    '-to', r.trimEnd - r.trimStart,
    '-vf', 'scale=720:-2',
    outputFileName
  ]
  runChildProcess('ffmpeg', args)

  // SAVE PATH FILE
  const metadata = {
    path: trimmedPath,
    name: `${r.rename}.mp4`
  }
  console.log('Writing file ', r.rename)
  fs.writeFileSync(outputMetadataFileName, JSON.stringify(metadata, null, 2))
}


// UTILITY
function getFullRawVideoFilename(videoName) {
  return `${rawDir}/${videoName}`
}

function getFullOutputVideoDirName(videoName) {
  return `${outputDir}/${videoName}`
}

function getFullOutputVideoFilename(videoName) {
  return path.join(getFullOutputVideoDirName(videoName), `/${videoName}.mp4`)
}

function getFullOutputMetadataFilename(videoName) {
  return path.join(getFullOutputVideoDirName(videoName), `/${videoName}-metadata.json`)
}

async function getTelemetry(fileName) {
  let telemetry = allTelemetry[fileName]
  if (telemetry) {
    console.log('Found cached telemetry for ' + fileName)
    return telemetry
  }

  const fullFileName = getFullRawVideoFilename(fileName)
  const file = fs.readFileSync(fullFileName)
  console.log('Extracting telemetry for ' + fullFileName)
  const gpmfExtractResult = await gpmfExtract(file)
  telemetry = await goproTelemetry(gpmfExtractResult, { debug: true, preset: 'geojson' })
  console.log('Extracted')

  allTelemetry[fileName] = telemetry
  return telemetry
}

function getTrimmedPath(telemetry, trimStart, trimEnd) {
  const pathWithoutMs = telemetry.geometry.coordinates
    .filter(p => p)
    .map(p => ({ lat: p[1], lng: p[0] }))
  const path = (telemetry.properties.RelativeMicroSec || [])
    .filter(ms => ms)
    .map((ms, i) => ({ ms, ...pathWithoutMs[i] }))

  let startIndex = 0
  let endIndex = path.length - 1
  if (trimStart !== 0) {
    startIndex = path.findIndex(t => t.ms > trimStart*1000)
  }
  if (trimEnd !== 0) {
    endIndex = path.findIndex(t => t.ms > trimEnd*1000)
  }
  const firstMs = path[startIndex].ms
  const trimmedPath = path.slice(startIndex, endIndex)
  trimmedPath.forEach(t => t.ms -= firstMs)
  return trimmedPath
}

function runChildProcess(command, args, callback) {
  var child = child_process.spawn(command, args);
  child.stdout.setEncoding('utf8')
  child.stderr.setEncoding('utf8')
  child.stdout.on('data', data => console.log(data))
  child.stderr.on('data', data => console.error(data))
  if (callback) {
    child.on('close', code => callback(code))
  } else {
    console.log('finished running ' + command)
  }
}