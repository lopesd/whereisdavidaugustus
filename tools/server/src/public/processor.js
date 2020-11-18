david = {
  trimStart: 0,
  trimEnd: 0
}

// DOM HELPERS
function emptyHtml (id) {
  const el = document.getElementById(id)
  while (el.firstChild) el.removeChild(el.firstChild);
}

function disableControls() {
  document.getElementById('video-name-select').disabled = true
  document.getElementById('export-button').disabled = true
}

function enableControls() {
  document.getElementById('video-name-select').disabled = false
  document.getElementById('export-button').disabled = false
}

// REQUEST LIST OF FILES AND POPULATE THE LIST ON SCREEN
async function populateVideoNameOptions() {
  const resp = await (await fetch('./list-raw-videos')).json()
  const videos = resp.videos

  videoSelectElement = document.getElementById('video-name-select')
  videoSelectElement.innerHTML = ''

  const emptyOption = document.createElement('option')
  emptyOption.setAttribute('value', '')
  videoSelectElement.append(emptyOption)
  videos.forEach(videoName => {
    const optionElement = document.createElement('option')
    optionElement.setAttribute('value', videoName)
    optionElement.innerHTML = videoName
    videoSelectElement.append(optionElement)
  })
}

function updateTrim({ start, end }) {
  // defaults  
  david.trimStart = start !== undefined ? start : david.trimStart
  david.trimEnd = end !== undefined ? end : david.trimEnd
  document.getElementById('trim-start').value = david.trimStart
  document.getElementById('trim-end').value = david.trimEnd

  // update trimmed path
  let startIndex = 0
  let endIndex = david.path.length - 1
  if (david.trimStart !== 0) {
    startIndex = david.path.findIndex(t => t.ms > david.trimStart*1000)
  }
  if (david.trimEnd !== 0) {
    endIndex = david.path.findIndex(t => t.ms > david.trimEnd*1000)
  }
  console.log("trimStart", david.trimStart)
  console.log("trimEnd", david.trimEnd)
  console.log("startIndex", startIndex)
  console.log('endIndex', endIndex)
  david.trimmedPath = david.path.slice(startIndex, endIndex)
  setVideoPathOnMap()
}

// Get path from the server
async function requestPath(videoName) {
  const resp = await (await fetch(`./telemetry?video=${videoName}`)).json()
  david.telemetry = resp.telemetry
  console.log("Received telemetry: ", david.telemetry)
  const pathWithoutMs = david.telemetry.geometry.coordinates
    .filter(p => p)
    .map(p => ({ lat: p[1], lng: p[0] }))
  david.path = (david.telemetry.properties.RelativeMicroSec || [])
    .filter(ms => ms)
    .map((ms, i) => ({ ms, ...pathWithoutMs[i] }))
  david.trimmedPath = david.path.filter(p => p)
}

// Clear existing polyline, draw new polyline, and center the map on it
async function setVideoPathOnMap() {
  const bounds = new google.maps.LatLngBounds()
  david.trimmedPath.forEach(latlng => bounds.extend(latlng))
  david.map.fitBounds(bounds)

  if (david.polyline) {
    david.polyline.setPath(david.trimmedPath)
  } else {
    david.polyline = new google.maps.Polyline({
      path: david.trimmedPath,
      map: david.map
    })
    const lineSymbol = {
      path: google.maps.SymbolPath.CIRCLE,
      scale: 6,
      strokeColor: "#393",
    }
    david.marker = new google.maps.Marker({
      position: david.trimmedPath[0],
      map: david.map,
      icon: lineSymbol
    })
  }
}

(async () => {
  populateVideoNameOptions()

  const videoElement = document.getElementById('video')

  // SELECT VIDEO CALLBACK
  const videoNameSelect = document.getElementById('video-name-select')
  videoNameSelect.addEventListener('change', async () => {
    const videoName = document.getElementById('video-name-select').value
    if (!videoName) {
      console.log('no video selected.')
      return
    }

    // GRAB THE PATH AND DISPLAY IT ON THE MAP
    disableControls()
    await requestPath(videoName)
    enableControls()
    setVideoPathOnMap()

    // PUT THE VIDEO ON SCREEN
    videoElement.setAttribute('src', `./${videoName}`)
  })

  // AS THE VIDEO GOES
  videoElement.addEventListener('timeupdate', () => {
    // stop it if it goes too far
    if (david.trimEnd) {
      if (videoElement.currentTime > david.trimEnd) {
        videoElement.pause()
      }
    }

    // move the marker along
    const index = david.path.findIndex(t => t.ms > videoElement.currentTime*1000)
    const position = david.path[index]
    david.marker.setPosition(position)
  })

  // SET TRIM START BUTTON
  document.getElementById('set-trim-start-button')
    .addEventListener('click', () => updateTrim({ start: videoElement.currentTime }))

  // SET TRIM END BUTTON
  document.getElementById('set-trim-end-button')
    .addEventListener('click', () => updateTrim({ end: videoElement.currentTime }))

  // CLEAR TRIM START BUTTON
  document.getElementById('clear-trim-start-button')
    .addEventListener('click', () => updateTrim({ start: 0 }))

  // CLEAR TRIM END BUTTON
  document.getElementById('clear-trim-end-button')
    .addEventListener('click', () => updateTrim({ end: 0 }))

  // CHANGE THE VALUE OF THE TRIM START DIRECTLY
  document.getElementById('trim-start')
    .addEventListener('change', e => updateTrim({ start: e.target.value }))

  // CHANGE THE VALUE OF THE TRIM END DIRECTLY
  document.getElementById('trim-end')
    .addEventListener('change', e => updateTrim({ end: e.target.value }))

  // PLAY TRIMMED VIDEO BUTTON
  document.getElementById('play-trimmed-video-button').addEventListener('click', () => {
    videoElement.currentTime = david.trimStart || 0
    videoElement.play()
  })

  document.getElementById('export-button').addEventListener('click', async () => {
    const videoName = document.getElementById('video-name-select').value
    const rename = document.getElementById('rename-input').value
    if (!rename || !videoName) {
      return
    }

    const exportParams = {
      trimStart: david.trimStart,
      trimEnd: david.trimEnd,
      videoName,
      rename
    }

    disableControls()
    const resp = await fetch('/export', {
      method: 'POST',
      body: JSON.stringify(exportParams),
      headers: {
        'Content-Type': 'application/json'
      }
    })
    enableControls()

    const respJson = await resp.json()
    console.log(respJson)
  })
})()

function onMapsApiLoad () {
  david.map = new google.maps.Map(document.getElementById('map'), {
    center: { lat: -34.397, lng: 150.644 },
    zoom: 8
  })
}