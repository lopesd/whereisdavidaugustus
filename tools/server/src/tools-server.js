const express = require('express')
const path = require('path')
const fs = require('fs')
const gpmfExtract = require('gpmf-extract')
const goproTelemetry = require('gopro-telemetry')
const child_process = require('child_process')

const outputDir = 'output'
const rawDir = 'raw'
const publicDir = 'public'

const app = express()
const port = 3000

app.use(express.static(path.join(__dirname, publicDir)))
app.use(express.static(path.join(__dirname, rawDir)))
app.use(express.json())

// root page
app.get('/', (req, res) => {
  res.sendFile('./public/processor.html', { root: __dirname });
})

// request to list videos
app.get('/list-raw-videos', (req, res) => {
  const fileList = fs.readdirSync(`${__dirname}/${rawDir}`)
  res.send({ videos: fileList })
})

// request for telemetry
app.get('/telemetry', async (req, res) => {
  const fileName = req.query.video
  const fullFileName = getFullRawVideoFilename(fileName)
  const file = fs.readFileSync(fullFileName)

  // extract path
  console.log('Extracting telemetry for ' + fullFileName)
  const gpmfExtractResult = await gpmfExtract(file)
  const telemetry = await goproTelemetry(gpmfExtractResult, { debug: true, preset: 'geojson' })

  res.send({ telemetry })
})

// request to export a trimmed and renamed gopro video
app.post('/export', async (req, res) => {
  try {
    performExport(req.body)
  } catch (e) {
    console.error(e)
    res.send({ yo: 'failed' })
    return
  }

  res.send({ yo: 'aight' })
})

// start the server
app.listen(port, () => {
  console.log(`Tools server listening http://localhost:${port}`)
})


// FUNCTIONALITY
async function performExport(r) {
  const fullFilename = getFullRawVideoFilename(r.videoName)
  const outputDirName = getFullOutputVideoDirName(r.rename)
  const outputFileName = getFullOutputVideoFilename(r.rename)
  const outputMetadataFileName = getFullOutputMetadataFilename(r.rename)

  // CLEAR EXISTING FILES AND RECREATE OUTPUT FOLDER
  try {
    fs.rmdirSync(outputDirName, { recursive: true });
  } catch (e) {}
  fs.mkdirSync(outputDirName, { recursive: true })

  // TRIM AND RESIZE
  const argsString = `-ss ${r.trimStart} -i ${fullFilename} -to ${r.trimEnd - r.trimStart} -vf scale=720:-2 ${outputFileName}`
  const args = argsString.split(' ')
  runChildProcess('ffmpeg', args)

  // SAVE PATH FILE
  const metadata = {
    path: r.trimmedPath,
    name: `${r.rename}.mp4`
  }
  console.log('writing name', r.rename)
  fs.writeFileSync(outputMetadataFileName, JSON.stringify(metadata, null, 2))
}


// UTILITY
function getFullRawVideoFilename(videoName) {
  return path.join(__dirname, `${rawDir}/${videoName}`)
}

function getFullOutputVideoDirName(videoName) {
  return path.join(__dirname, `${outputDir}/${videoName}`)
}

function getFullOutputVideoFilename(videoName) {
  return path.join(getFullOutputVideoDirName(videoName), `/${videoName}.mp4`)
}

function getFullOutputMetadataFilename(videoName) {
  return path.join(getFullOutputVideoDirName(videoName), `/${videoName}-metadata.json`)
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