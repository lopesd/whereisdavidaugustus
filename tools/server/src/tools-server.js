const express = require('express')
const path = require('path')
const fs = require('fs')
const gpmfExtract = require('gpmf-extract')
const goproTelemetry = require('gopro-telemetry')

const app = express()
const port = 3000

app.use(express.static(path.join(__dirname, 'public')))
app.use(express.static(path.join(__dirname, 'raw')))

app.get('/', (req, res) => {
  res.sendFile('./public/processor.html', { root: __dirname });
})

app.get('/list-raw-videos', (req, res) => {
  const fileList = fs.readdirSync(`${__dirname}/raw`)
  res.send({ videos: fileList })
})

app.get('/telemetry', async (req, res) => {
  const fileName = req.query.video
  const fullFileName = path.join(__dirname, `raw/${fileName}`)
  const file = fs.readFileSync(fullFileName)

  // EXTRACT PATH
  console.log('Extracting telemetry')
  const gpmfExtractResult = await gpmfExtract(file)
  const telemetry = await goproTelemetry(gpmfExtractResult, { debug: true, preset: 'geojson' })

  res.send({ telemetry })
})

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`)
})