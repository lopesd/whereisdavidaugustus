const fs = require('fs')
const gpmfExtract = require('gpmf-extract')
const goproTelemetry = require('gopro-telemetry')

const filename = 'GH010434.MP4'
const file = fs.readFileSync(`./${filename}`)

async function extract() {
  const gpmfExtractResult = await gpmfExtract(file)
  const telemetry = await goproTelemetry(gpmfExtractResult, { debug: true, preset: 'geojson' })
  fs.writeFile('telemetry.json', JSON.stringify(telemetry, null, 2), err => {
    if (err) {
      console.error(err)
    } else {
      console.log("success")
    }
  })
}

extract()