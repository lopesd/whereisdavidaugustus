const fs = require('fs')
const gpmfExtract = require('gpmf-extract')
const goproTelemetry = require('gopro-telemetry')

const filename = 'GH010440.MP4'
const file = fs.readFileSync(`./${filename}`)

async function extract() {
  const gpmfExtractResult = await gpmfExtract(file)
  const telemetry = await goproTelemetry(gpmfExtractResult, { debug: true, preset: 'geojson' })
  const path = telemetry.geometry.coordinates
    .map(p => ({ lat: p[1], lng: p[0] }))
    .filter(p => p)
    .filter((p, i) => i % 50 === 0)
  fs.writeFile('path.js', `path=${JSON.stringify(path, null, 2)}`, err => {
    if (err) {
      console.error(err)
    } else {
      console.log("wrote path.js")
    }
  })
}

extract()