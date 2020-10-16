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
      <span class="checkin-peepers-icon">\&#128064;</span><span class="checkin-peepers-text"><span class="checkin-peeper-name">${sanitize(peeperName)}</span> ${msg}</span>
    </div>`
  } else {
    return `
    <div class="checkin-peeper-pane available" data-checkin-time="${time}">
      <input class="checkin-peeper-name-input" type="text" maxlength="15" placeholder="what's your name? quick!"/>
      <button class="checkin-claim-first-peep-button" onclick="onClickPeepButton(event)">PEEP</button>
    </div>`
  }
}

function htmlForCheckin(checkin) {
  let imagesInnerHtml = ''
  if (checkin.images && checkin.images.length > 0) {
    imagesInnerHtml = checkin.images.reduce((html, imageName) => {
      return `${html}
      <img class="checkin-image" src="./content/images/${imageName}" />`
    }, '')
  }

  let peepersHtml =
  `<div class="checkin-peeper-pane-wrapper" id="${checkin.time}-peeper-pane-wrapper">
    ${innerHTMLForPeeperPane(checkin.time, checkin.firstPeeper)}
  </div>
  `

  const blurbHtml = !checkin.blurb ? '' :
  `<div class="checkin-blurb">
${checkin.blurb}
  </div>`

  const imagesHtml = !checkin.images || checkin.images.length === 0 ? '' :
  `<div class="checkin-image-pane">
${imagesInnerHtml}
  </div>`

  const miniMapUrl = `https://maps.googleapis.com/maps/api/staticmap?center=${checkin.latlng.lat},${checkin.latlng.lng}&zoom=7&size=72x72&maptype=map&markers=color:green%7Csize:tiny%7C${checkin.latlng.lat},${checkin.latlng.lng}&key=AIzaSyBf15qoVrZ2GwmdWaT-lu9PUDzxQLWmox8`

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
        <img class="mini-map" id="mini-map-${checkin.time}" src="${miniMapUrl}"/>
        <div class="mini-map-cheat"></div>
      </div>
      -->
    </div>

    ${blurbHtml}

    ${imagesHtml}

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

// ON DOCUMENT LOAD
(function () {
  // CREATE HEADER HTML
  /* TABLING THE HEADER FOR NOW
  const lastCheckin = david.checkins[david.checkins.length-1]
  const checkinText = `<span id="header-last-seen-text">LAST SEEN:</span> ${lastCheckin.location}<br>${lastCheckin.time}`
  document.getElementById('header-right-text').innerHTML = checkinText
  */
  // CREATE CHECKIN HTML
  const reversedCheckins = [].concat(david.checkins).reverse()
  let htmlForAllCheckins = reversedCheckins.reduce((allHtml, checkin) => allHtml + htmlForCheckin(checkin), '')
  document.getElementById('checkins-wrapper').innerHTML = htmlForAllCheckins
})()


// ON MAP LOAD
function onMapsApiLoad() {
  // CREATE MAP AND CONFIGURE BOUNDS
  const bounds = new google.maps.LatLngBounds();
  david.checkins.forEach(({ latlng }) => {
    bounds.extend(latlng)
  })
  const map = new google.maps.Map(document.getElementById('map'), {
    disableDefaultUI: true,
    restriction: { latLngBounds: bounds },
    gestureHandling: 'cooperative'
  });
  map.fitBounds(bounds);


  // CREATE CHECKIN MARKERS
  const addCheckinMarker = (checkin, isLastCheckin) => {
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

    marker.addListener("mouseover", () => {
      mouseOverHighlight(checkin.time)
    })

    marker.addListener("mouseout", () => {
      mouseLeaveHighlight(checkin.time)
    })

    marker.addListener("click", () => {
      scrollCheckinIntoView(checkin.time)
    })

    setTimeout(() => marker.setAnimation(null), 400)

    david.allMarkers[checkin.time] = marker
  }

  for (var i = 0; i < david.checkins.length; ++i) {
    const checkin = david.checkins[i]
    const isLastCheckin = i === david.checkins.length - 1
    setTimeout(function () {
      addCheckinMarker(checkin, isLastCheckin)
    }, i * 150 + 500)
  }
}