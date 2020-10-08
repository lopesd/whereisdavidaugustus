// HELPER FUNCTIONS TO LOAD PAGE
function htmlForCheckin(checkin) {
  let imagesHtml = ''
  if (checkin.images && checkin.images.length > 0) {
    imagesHtml = checkin.images.reduce((html, imageName) => {
      return `${html}
      <img class="checkin-image" src="./images/${imageName}" />`
    }, '')
  } else {
    imagesHtml = `<div class="no-photos">No photos for this checkin D:</div>`
  }

  return `
  <div class="checkin-content">

    <div class="checkin-title">
      <div class="checkin-title-left">
        <div class="checkin-title-name">
          ${checkin.name}
        </div>
        <div class="checkin-title-location">
          ${checkin.location}
        </div>
      </div>
      <div class="checkin-title-date">
        ${checkin.time}
      </div>
    </div>

    <div class="checkin-blurb">
      ${checkin.blurb}
    </div>

    <div class="checkin-image-pane">
      ${imagesHtml}
    </div>
  </div>`
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