// ASYNC HELPER TO GET USER LOCATION
async function getUserLocation(options) {
  return new Promise(function (resolve, reject) {
    navigator.geolocation.getCurrentPosition(resolve, reject, options);
  });
}

// ASYNC HELPER TO GET FROM S3
async function getS3Object(getParams) {
  return new Promise(function (resolve, reject) {
    s3.getObject(getParams, function(err, data) {
      if (err) {
        reject(err)
      } else {
        resolve(data)
      }
    })
  })
}

// ASYNC HELPER TO PUT TO S3
async function putS3Object(putParams) {
  return new Promise(function (resolve, reject) {
    s3.putObject(putParams, function(err, data) {
      if (err) {
        reject(err)
      } else {
        resolve(data)
      }
    })
  })
}

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

    const date = new Date()
    const currentTime = `${date.toDateString()} ${date.toLocaleTimeString()}`

    const accessKeyId = document.getElementById('access-key-id-input').value
    const secretAccessKey = document.getElementById('secret-key-input').value
    const checkinName = document.getElementById('checkin-name-input').value
    const checkinLocation = document.getElementById('checkin-location-input').value
    const checkinTime = document.getElementById('checkin-time-input').value || currentTime
    const checkinBlurb = document.getElementById('checkin-blurb-input').value

    // GET S3 CHECKINS LIST
    displayStatus('Getting S3 object...')
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

    const data = await getS3Object(params)

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

    const putData = await putS3Object(putParams)

    console.log(data);
    displayStatus('Pushed: ' + JSON.stringify(newCheckin, null, 2))

    // BUST CLOUDFRONT CACHE
    var cdnParams = {
      DistributionId: 'E8NGZT2IL30A7',
      InvalidationBatch: {
        CallerReference: checkinTime,
        Paths: {
          Quantity: 1,
          Items: ['/*']
        }
      }
    }

    const cloudfront = new AWS.CloudFront({
      accessKeyId,
      secretAccessKey,
      region
    })
    cloudfront.createInvalidation(cdnParams, function(err, data) {
      if (err) {
        console.log(err, err.stack)
        displayStatus(`Error on cloudfront invalidation: ${err}`)
      } else {
        console.log('Busted cache:', data)
      }
    });

  })

})()