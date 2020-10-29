// GLOBAL SCOPE
david = david || {}
david.allMarkers = {}

// SOME CONSTANTS
const defaultCheckinIconUrl = 'https://maps.google.com/mapfiles/ms/icons/blue-dot.png'
const lastCheckinIconUrl = 'https://maps.google.com/mapfiles/ms/icons/red-dot.png'
const highlightedCheckinIconUrl = 'https://maps.google.com/mapfiles/ms/icons/orange-dot.png'

// UTIL
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function sanitize(string) {
  const map = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#x27;',
      "/": '&#x2F;',
  }
  const reg = /[&<>"'/]/ig
  return string.replace(reg, match => map[match])
}

// TEST UTIL
async function spoofPostPeep(time, peeperName) {
  await sleep(1000)
  return { peepSuccessful: firstPeeper === 'david', peeperName: 'david' }
}

// BUTTON CALLBACKS
async function onClickPeepButton(event) {
  const time = event.target.parentElement.dataset.checkinTime
  const peeperName = event.target.previousElementSibling.value
  if (!peeperName) {
    event.target.previousElementSibling.placeholder = 'name is required dummy'
    return
  }

  // enter loading state
  event.target.disabled = true
  event.target.innerHTML = '...'
  event.target.previousElementSibling.disabled = true

  // send post
  let response
  try {
    response = await postPeep(time, peeperName)
  } catch (e) {
    console.error(e)
    document.getElementById(`${time}-peeper-pane-wrapper`).innerHTML = 'There was an error :( pls check console and report'
    return
  }

  // exit loading state and update html
  document.getElementById(`${time}-peeper-pane-wrapper`).innerHTML = innerHTMLForPeeperPane(time, response.firstPeeper, !response.peepSuccessful)
}

async function postPeep(time, peeperName) {
  const url = 'https://www.whereisdavidaugustus.com/peep'
  const body = { time, peeper: peeperName }
  const fetchParams = {
    method: 'POST',
    mode: 'same-origin',
    cache: 'no-cache',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    redirect: 'follow',
    referrerPolicy: 'no-referrer',
    body: JSON.stringify(body)
  }

  const response = await fetch(url, fetchParams)

  const responseJson = await response.json()
  console.log(response)
  console.log(responseJson)
  return responseJson
}

// TEMPLATING HELPERS
function innerHTMLForPeeperPane(time, peeperName, beatYouToIt=false) {
  if (peeperName === '$LOCKED$'){
    return ''
  } else if (peeperName) {
    const msg = beatYouToIt ? 'beat you to it' : 'was first peeper'
    return `
    <div class="checkin-peeper-pane">
      <span class="checkin-peeper-icon">\&#128064;</span><span class="checkin-peeper-text"><span class="checkin-peeper-name">${sanitize(peeperName)}</span> ${msg}</span>
    </div>`
  } else {
    return `
    <div class="checkin-peeper-pane available" data-checkin-time="${time}">
      <input class="checkin-peeper-name-input" type="text" maxlength="40" placeholder="what's your name? quick!"/>
      <button class="checkin-claim-first-peep-button" onclick="onClickPeepButton(event)">PEEP</button>
    </div>`
  }
}

function htmlForCheckin(checkin) {
  let imagesInnerHtml = ''
  if (checkin.images && checkin.images.length > 0) {
    imagesInnerHtml = checkin.images.reduce((html, imageName) => {
      return `${html}
      <img loading="lazy" class="checkin-image" src="./content/images/${imageName}" />`
    }, '')
  }

  let videosInnerHtml = ''
  if (checkin.videos && checkin.videos.length > 0) {
    videosInnerHtml = checkin.videos.reduce((html, { name }) => {
      return `${html}
      <video class="checkin-video" controls preload="metadata" src="./content/videos/${name}/${name}-720p.mp4" />`
    }, '')
  }

  let peepersHtml =
  `<div class="checkin-peeper-pane-wrapper" id="${checkin.time}-peeper-pane-wrapper">
    ${innerHTMLForPeeperPane(checkin.time, checkin.firstPeeper)}
  </div>
  `

  const blurbHtml = !checkin.blurb ? '' :
  `<div class="checkin-blurb">${checkin.blurb}</div>`

  const imagesHtml = !imagesInnerHtml ? '' :
  `<div class="checkin-image-pane">
${imagesInnerHtml}
  </div>`

  const videosHtml = !videosInnerHtml ? '' :
  `<div class="checkin-video-pane">
${videosInnerHtml}
  </div>`

  const miniMapUrl = '' // `https://maps.googleapis.com/maps/api/staticmap?center=${checkin.latlng.lat},${checkin.latlng.lng}&zoom=7&size=72x72&maptype=map&markers=color:green%7Csize:tiny%7C${checkin.latlng.lat},${checkin.latlng.lng}&key=AIzaSyBf15qoVrZ2GwmdWaT-lu9PUDzxQLWmox8`

  return `
  <div class="checkin-content" 
    onmouseenter="mouseOverHighlight('${checkin.time}')"
    onmouseleave="mouseLeaveHighlight('${checkin.time}')"
    onclick="scrollCheckinIntoView('${checkin.time}')"
    id="checkin-content-${checkin.time}"
    >
    <div class="checkin-content-anchor" id="checkin-content-anchor-${checkin.time}"></div>

    <div class="checkin-title">
      <div class="checkin-title-left">
        <div class="checkin-title-name">${checkin.name}</div>
        <div class="checkin-title-location">${checkin.location}</div>
        <div class="checkin-title-date">${checkin.time}</div>
      </div>
      <!--
      <div class="checkin-title-right">
        <img class="checkin-minimap" src="${miniMapUrl}" />
      </div>
      -->
    </div>

    ${blurbHtml}

    ${imagesHtml}

    ${videosHtml}

    ${peepersHtml}
  </div>`
}

// HIGHLIGHT

// MOUSE OVER HIGHLIGHT EFFECTS
function mouseOverHighlight(checkinTime) {
  // highlight the marker
  const marker = david.allMarkers[checkinTime]
  if (marker) {
    marker.setIcon(highlightedCheckinIconUrl)
    marker.setZIndex(500)
  }

  // highlight the checkin div
  const checkinDiv = document.getElementById(`checkin-content-${checkinTime}`)
  checkinDiv.classList.add('mouse-over-highlight')
}


function mouseLeaveHighlight(checkinTime) {
  // unhighlight the marker
  const marker = david.allMarkers[checkinTime]
  if (marker) {
    if (david.checkins[david.checkins.length-1].time === checkinTime) {
      marker.setIcon(lastCheckinIconUrl)
    } else {
      marker.setIcon(defaultCheckinIconUrl)
    }
    marker.setZIndex(undefined)
  }

  // unhighlight the checkin div
  const checkinDiv = document.getElementById(`checkin-content-${checkinTime}`)
  checkinDiv.classList.remove('mouse-over-highlight')
}

// SCROLL CHECKIN INTO VIEW
function scrollCheckinIntoView(checkinTime) {
  const checkinAnchor = document.getElementById(`checkin-content-anchor-${checkinTime}`)
  checkinAnchor.scrollIntoView({ behavior: 'smooth' })
}


// ON MAP LOAD
function onMapsApiLoad() {
  // CREATE MAP AND CONFIGURE BOUNDS
  const bounds = new google.maps.LatLngBounds()
  david.checkins.forEach(({ latlng, path }) => {
    if (latlng) {
      bounds.extend(latlng)
    } else if (path) {
      path.forEach(latlng => bounds.extend(latlng))
    }
  })

  const map = new google.maps.Map(document.getElementById('map'), {
    restriction: { latLngBounds: bounds },
    disableDefaultUI: true,
    gestureHandling: 'cooperative'
  });
  map.fitBounds(bounds);


  // CREATE CHECKIN MARKERS
  const addCheckinMarker = (checkin, isLastCheckin) => {
    if (checkin.latlng) {
      let icon = { url: defaultCheckinIconUrl }
      if (isLastCheckin) {
        icon = { url: lastCheckinIconUrl }
      }
      const marker = new google.maps.Marker({
        position: checkin.latlng,
        animation: google.maps.Animation.BOUNCE,
        icon,
        map
      })
      setTimeout(() => marker.setAnimation(null), 400)
      marker.addListener("mouseover", () => mouseOverHighlight(checkin.time))
      marker.addListener("mouseout", () => mouseLeaveHighlight(checkin.time))
      marker.addListener("click", () => scrollCheckinIntoView(checkin.time))
      david.allMarkers[checkin.time] = marker
    }

    if (checkin.videos) {
      checkin.videos.forEach(async ({ path }) => {
        new google.maps.Polyline({ path, map })
      })
    }
  }

  const pathAnimationTime = 3000 // ms
  const pathAnimationDelay = 500 // ms
  const pathAnimationStep = pathAnimationTime / david.checkins.length
  for (var i = 0; i < david.checkins.length; ++i) {
    const checkin = david.checkins[i]
    const isLastCheckin = i === david.checkins.length - 1
    setTimeout(function () {
      addCheckinMarker(checkin, isLastCheckin)
    }, i * pathAnimationStep + pathAnimationDelay)
  }

  /*
  // This example adds an animated symbol to a polyline.
  const map = new google.maps.Map(document.getElementById("map"), {
    center: { lat: 40.2520756, lng: -111.6639886 },
    zoom: 16,
    disableDefaultUI: true
  })

  // Define the symbol, using one of the predefined paths ('CIRCLE')
  // supplied by the Google Maps JavaScript API.
  const lineSymbol = {
    path: google.maps.SymbolPath.CIRCLE,
    scale: 8,
    strokeColor: "#393",
  }

  // Create the polyline and add the symbol to it via the 'icons' property.
  const line = new google.maps.Polyline({
    path,
    icons: [
      {
        icon: lineSymbol,
        offset: "100%",
      },
    ],
    map: map,
  })
  animateCircle(line)
  */
}

// Use the DOM setInterval() function to change the offset of the symbol
// at fixed intervals.
function animateCircle(line) {
  let count = 0;
  window.setInterval(() => {
    count = (count + 1) % 200
    const icons = line.get("icons")
    icons[0].offset = count / 2 + "%"
    line.set("icons", icons)
  }, 20)
}

// ON DOCUMENT LOAD
(function () {
  // CREATE CHECKIN HTML
  const reversedCheckins = [].concat(david.checkins).reverse()
  let htmlForAllCheckins = reversedCheckins.reduce((allHtml, checkin) => allHtml + htmlForCheckin(checkin), '')
  document.getElementById('checkins-pane').innerHTML = htmlForAllCheckins

  // ADD LISTENERS TO MAP CONTROLS
  document.getElementById('map-down-arrow').addEventListener('click', () => {
    document.getElementById('right-pane-anchor').scrollIntoView({ behavior: 'smooth' })
  })
})()