(function () {
  /** HELPERS **/
  function emptyHtml (id) {
    const el = document.getElementById(id)
    while (el.firstChild) el.removeChild(el.firstChild);
  }

  function displayStatus(text) {
    emptyHtml('display-div')
    document.getElementById('display-div')
      .appendChild(document.createTextNode(text))
  }

  async function getUserLocation(options) {
    return new Promise(function (resolve, reject) {
      navigator.geolocation.getCurrentPosition(resolve, reject, options);
    });
  }

  function appendCheckinToContentString(content, checkin) {
    return content + `
david.checkins.push(${JSON.stringify(checkin, null, 2)})`
  }

  /** CHECK IN BUTTON **/
  document.getElementById('checkin-button').addEventListener('click', async () => {
    // GET LOCATION
    if (!navigator.geolocation) {
      displayStatus("Geolocation is not supported by this browser.")
      return
    }
    displayStatus('Getting location...')

    let lat = document.getElementById('checkin-lat-input').value
    let lng = document.getElementById('checkin-lng-input').value
    if (!lat || !lng) {
      const location = await getUserLocation()
      lat = lat || location.coords.latitude
      lng = lng || location.coords.longitude
    }
    const latlng = { lat, lng }

    // GET S3 CHECKINS LIST
    displayStatus('Getting S3 object...')

    const date = new Date()
    const currentTime = `${date.toDateString()} ${date.toLocaleTimeString()}`

    const accessKeyId = document.getElementById('access-key-id-input').value
    const secretAccessKey = document.getElementById('secret-key-input').value
    const checkinName = document.getElementById('checkin-name-input').value
    const checkinLocation = document.getElementById('checkin-location-input').value
    const checkinTime = document.getElementById('checkin-time-input').value || currentTime
    const checkinBlurb = document.getElementById('checkin-blurb-input').value

    const expirationDays = 7
    const Bucket = 'www.whereisdavidaugustus.com'
    const region = 'us-west-2'
    const signatureVersion = 'v4'
    const checkinFileName = 'checkins.js'

    s3 = new AWS.S3({
      endpoint: `s3-${region}.amazonaws.com`,
      accessKeyId,
      secretAccessKey,
      Bucket,
      signatureVersion,
      region 
    });

    const params = {
      Bucket,
      Key: checkinFileName
    }

    s3.getObject(params, function(err, data) {
      if (err) {
        console.log(err)
        displayStatus(err)
      } else {

        // APPEND NEW CHECKIN
        dat = data
        console.log(data.Body.toString())
        const content = data.Body.toString()


        const newCheckin = {
          name: checkinName,
          time: checkinTime,
          location: checkinLocation,
          latlng,
          blurb: checkinBlurb
        }
        console.log(newCheckin)
        const newContent = appendCheckinToContentString(content, newCheckin)

        // UPLOAD NEW CHECKIN LIST
        displayStatus('Pushing new checkin list...')
        const putParams = {
          Body: newContent,
          Key: checkinFileName,
          Bucket,
          ACL: 'public-read'
        }

        s3.putObject(putParams, function(err, data) {
          if (err) {
            console.log(err, err.stack)
            displayStatus(err)
            return
          }

          console.log(data);
          displayStatus('Pushed: ' + JSON.stringify(newCheckin, null, 2))
        });
      }
    })
  })

})()