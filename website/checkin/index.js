// PARAMETERS
const Bucket = 'www.whereisdavidaugustus.com'
const region = 'us-west-2'
const lambdaRegion = 'us-east-1'
const signatureVersion = 'v4'

// DOM HELPERS
function emptyHtml (id) {
  const el = document.getElementById(id)
  while (el.firstChild) el.removeChild(el.firstChild);
}

function displayStatus(text) {
  const fullMsg = text + '\n\n'
  document.getElementById('display-div')
    .prepend(document.createTextNode(fullMsg))
}

function appendCheckinToContentString(content, checkin) {
  return content + `
david.checkins.push(${JSON.stringify(checkin, null, 2)})`
}

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
async function putPublicS3Object(Key, Body) {
  const putParams = { Bucket, Key, Body, ACL: 'public-read' }
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

async function onDocumentLoad () {
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
    s3 = new AWS.S3({
      endpoint: `s3-${region}.amazonaws.com`,
      accessKeyId,
      secretAccessKey,
      Bucket,
      signatureVersion,
      region 
    })

    let data
    try {
      data = await getS3Object({
        Bucket,
        Key: 'checkins.json'
      })
    } catch (e) {
      displayStatus(`Uh oh. ${e.toString()}`)
    }

    // APPEND NEW CHECKIN
    const contentJson = JSON.parse(data.Body.toString())
    const newCheckin = {
      name: checkinName,
      time: checkinTime,
      location: checkinLocation,
      latlng,
      blurb: checkinBlurb
    }
    console.log(newCheckin)
    contentJson.checkins.push(newCheckin)

    // UPLOAD NEW CHECKIN LIST
    displayStatus('Pushing new checkin list...')
    try {
      await putPublicS3Object('checkins.json', JSON.stringify(contentJson, null, 2))
      await putPublicS3Object('checkins.js', `david = ${JSON.stringify(contentJson, null, 2)}`)
    } catch (e) {
      displayStatus(`Uh oh. ${e.toString()}`)
      return
    }
    displayStatus('Pushed: ' + JSON.stringify(newCheckin, null, 2))

    // CALL DEPLOYMENT LAMBDA
    const lambda = new AWS.Lambda({
      accessKeyId,
      secretAccessKey,
      region: lambdaRegion
    })

    lambda.invoke({
      FunctionName: "arn:aws:lambda:us-east-1:907442024158:function:wida-deployment",
    }, function (err, data) {
      console.log(err)
      console.log(data)
    })
  })

}

onDocumentLoad()