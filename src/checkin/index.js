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

  function getUserLocation(options) {
    return new Promise(function (resolve, reject) {
      navigator.geolocation.getCurrentPosition(resolve, reject, options);
    });
  }

  function appendCheckinToContentString(content, checkin) {
    return content + `
david.checkins.push(${JSON.stringify(checkin, null, 2)})`
  }

  /** CHECK IN BUTTON **/
  document.getElementById('checkin-button').addEventListener('click', () => {
    // GET LOCATION
    if (!navigator.geolocation) {
      displayStatus("Geolocation is not supported by this browser.")
      return
    }
    displayStatus('Getting location...')

    getUserLocation().then(location => {

      // GET S3 CHECKINS LIST
      displayStatus('Getting S3 object...')
      const accessKeyId = document.getElementById('access-key-id-input').value
      const secretAccessKey = document.getElementById('secret-key-input').value
      const checkinName = document.getElementById('checkin-name-input').value
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
          const latlng = {
            lat: location.coords.latitude,
            lng: location.coords.longitude
          }
          const date = new Date()
          const time = `${date.toDateString()} ${date.toLocaleTimeString()}`
          const newCheckin = {
            name: checkinName,
            time,
            latlng,
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
  })

})()