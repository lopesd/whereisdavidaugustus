// HELPER FUNCTIONS TO LOAD PAGE
function htmlForCheckin(checkin) {
  let imagesHtml = ''
  if (checkin.images) {
    imagesHtml = checkin.images.reduce((html, imageName) => {
      return `${html}
      <img class="checkin-image" src="./images/${imageName}" />`
    }, '')
  } else {
    imagesHtml = ''//`<div class="no-photos">No photos for this checkin :(</div>`
  }

  imagesHtml = `<div class="checkin-image-pane">${imagesHtml}</div>`
  const title = `<div class="checkin-title-name">${checkin.name}</div><div class="checkin-title-date">${checkin.time}</div>`
  return `
  <div class="checkin-content">
    <div class="checkin-title">${title}</div>
    ${imagesHtml}
  </div>`
}

// ON DOCUMENT LOAD
(function () {
  // CREATE HEADER HTML
  const lastCheckin = david.checkins[david.checkins.length-1]
  const checkinText = `Last seen: ${lastCheckin.name}<br>${lastCheckin.time}`
  document.getElementById('header-right-text').innerHTML = checkinText


  // CREATE CHECKIN HTML
  const reversedCheckins = [].concat(david.checkins).reverse()
  let htmlForAllCheckins = reversedCheckins.reduce((allHtml, checkin) => allHtml + htmlForCheckin(checkin), '')
  htmlForAllCheckins = `${htmlForAllCheckins}
  <div id="content-pane-bottom-spacer"></div>`
  document.getElementById('content-pane-scrollable-area').innerHTML = htmlForAllCheckins
})()


// LOAD MAP
function onMapsApiLoad() {
  // SOME CONFIG
  const defaultCheckinIconUrl = 'https://maps.google.com/mapfiles/ms/icons/blue-dot.png'
  const lastCheckinIconUrl = 'https://maps.google.com/mapfiles/ms/icons/red-dot.png'


  // CREATE MAP AND CONFIGURE BOUNDS
  const bounds = new google.maps.LatLngBounds();
  david.checkins.forEach(({ latlng }) => {
    bounds.extend(latlng)
  })
  const map = new google.maps.Map(document.getElementById('map'), {
    disableDefaultUI: true,
    restriction: { latLngBounds: bounds }
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
      animation: google.maps.Animation.DROP,
      icon,
      map: map
    });
  }

  for (var i = 0; i < david.checkins.length; ++i) {
    const checkin = david.checkins[i]
    const isLastCheckin = i === david.checkins.length - 1
    setTimeout(function () {
      addCheckinMarker(checkin, isLastCheckin)
    }, i * 300 + 500)
  }

}