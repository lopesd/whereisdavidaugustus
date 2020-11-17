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
  const sanitizeMap = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#x27;',
      "/": '&#x2F;',
  }
  const reg = /[&<>"'/]/ig
  return string.replace(reg, match => sanitizeMap[match])
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

// Don't trigger a click on the checkin if you click in the peeper pane
// This prevents a bug where the user can't type in the pane because it 
// scrolled out of the way.
function peeperPaneClick(e) {
  e.stopPropagation()
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
    <div onclick="peeperPaneClick(event)" class="checkin-peeper-pane available" data-checkin-time="${time}">
      <input class="checkin-peeper-name-input" type="text" maxlength="40" placeholder="what's your name? quick!"/>
      <button class="checkin-claim-first-peep-button" onclick="onClickPeepButton(event)">PEEP</button>
    </div>`
  }
}

function htmlForCheckin(checkin) {
  let imagesInnerHtml = ''
  if (checkin.images && checkin.images.length > 0) {
    imagesInnerHtml = checkin.images.reduce((html, { name, width, height }) => {

      return `${html}
      <img width="${width}px" height="${height}px" loading="lazy" class="checkin-image" src="./content/images/${name}" />`
    }, '')
  }

  let videosInnerHtml = ''
  if (checkin.videos && checkin.videos.length > 0) {
    videosInnerHtml = checkin.videos.reduce((html, video) => {
      const { name, width, height } = video
      return `${html}
      <video style="width:${width}px;height:${height}px" class="checkin-video" controls preload="metadata" src="./content/videos/${name}" data-video-name="${name}"/>`
    }, '')

    // also add each video metadata to a global array for easy access (helpful for the video callbacks)
    david.allCheckinVideos = david.allCheckinVideos || {}
    checkin.videos.forEach(video => { 
      david.allCheckinVideos[video.name] = video
    })
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
    onmouseenter="highlightCheckinAndMarker('${checkin.time}')"
    onmouseleave="unHighlightCheckinAndMarker('${checkin.time}')"
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
function highlightCheckinAndMarker(checkinTime) {
  // marker
  const marker = david.allMarkers[checkinTime]
  if (marker) {
    marker.setIcon(highlightedCheckinIconUrl)
    marker.setZIndex(500)
  }

  // checkin div
  const checkinDiv = document.getElementById(`checkin-content-${checkinTime}`)
  checkinDiv.classList.add('mouse-over-highlight')
}


function unHighlightCheckinAndMarker(checkinTime) {
  // marker
  const marker = david.allMarkers[checkinTime]
  if (marker) {
    if (david.checkins[david.checkins.length-1].time === checkinTime) {
      marker.setIcon(lastCheckinIconUrl)
    } else {
      marker.setIcon(defaultCheckinIconUrl)
    }
    marker.setZIndex(undefined)
  }

  // checkin div
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
  const continentalUSABounds = new google.maps.LatLngBounds()
  continentalUSABounds.extend({ lat: 49.271721, lng: -125.635007 })
  continentalUSABounds.extend({ lat: 49.531478, lng: -59.414887 })
  continentalUSABounds.extend({ lat: 24.186119, lng: -125.193349 })
  continentalUSABounds.extend({ lat: 24.186119, lng: -59.414887 })

  const bounds = new google.maps.LatLngBounds()
  david.checkins.forEach(({ latlng, path }) => {
    if (latlng) {
      bounds.extend(latlng)
    } else if (path) {
      path.forEach(latlng => bounds.extend(latlng))
    }
  })

  const map = new google.maps.Map(document.getElementById('map'), {
    restriction: { latLngBounds: continentalUSABounds }, 
    disableDefaultUI: true,
    gestureHandling: 'cooperative'
  })
  map.fitBounds(bounds)
  david.map = map

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
      marker.addListener("mouseover", () => highlightCheckinAndMarker(checkin.time))
      marker.addListener("mouseout", () => unHighlightCheckinAndMarker(checkin.time))
      marker.addListener("click", () => scrollCheckinIntoView(checkin.time))
      david.allMarkers[checkin.time] = marker
      setTimeout(() => marker.setAnimation(null), 400)
    }

    if (checkin.videos) {
      checkin.videos.forEach(async ({ path }) => {
        if (!path) return
        new google.maps.Polyline({ path, map })
      })
    }
  }

  // animate the markers as they enter the screen
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

  // create the circular path marker for gopro videos, invisible for now
  david.pathMarker = new google.maps.Marker({
    map: david.map,
    icon: {
      path: google.maps.SymbolPath.CIRCLE,
      scale: 6,
      strokeColor: "#393",
    },
    visibility: false
  })
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

  // ADD LISTENERS TO VIDEO ELEMENTS
  document.querySelectorAll('.checkin-video').forEach(videoElement => {
    // pause all other videos when a video plays
    videoElement.addEventListener('play', () => {
      document.querySelectorAll('.checkin-video').forEach(otherVideoElement => {
        if (otherVideoElement !== videoElement) {
          otherVideoElement.pause()
        }
      })
    })

    // erase the path marker when a video pauses
    videoElement.addEventListener('pause', () => {
      david.pathMarker.setVisible(false) 
    })

    // update the path marker as the video plays
    videoElement.addEventListener('timeupdate', () => {
      // place a marker along the path
      const video = david.allCheckinVideos[videoElement.dataset.videoName]
      if (!video.path) return
      const index = video.path.findIndex(t => t.ms > videoElement.currentTime*1000)
      const position = video.path[index]
      david.pathMarker.setPosition(position)
      david.pathMarker.setVisible(true)
    })
  })

  // WORK IN PROGRESS 
  // Code to highlight the checkin that has been scrolled to
  // Note - include GSAP for this to work
  /*
  reversedCheckins.forEach(checkin => {
    const element = document.getElementById(`checkin-content-${checkin.time}`) 
    ScrollTrigger.create({
      trigger: element,
      scroller: '#checkins-pane',
      start: "top center",
      end: "bottom center",
      onToggle: self => {
        if (self.isActive) {
          highlightCheckinAndMarker(checkin.time)
          if (david.map) {
            david.map.panTo(checkin.latlng)
          }
        } else {
          unHighlightCheckinAndMarker(checkin.time)
        }
      }
    })
  })
  */
})()