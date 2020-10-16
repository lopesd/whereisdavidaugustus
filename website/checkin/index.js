// GLOBAL SCOPE
david = {
  images: []
}

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

// ASYNC HELPER FOR THE UPLOAD FUNCTION WHICH HANDLES BIGGER FILES MORE GRACEFULLY
async function putHeavyPublicS3Object(Key, Body) {
  const putParams = { Bucket, Key, Body, ACL: 'public-read' }
  return new Promise(function (resolve, reject) {
    s3.upload(putParams, function(err, data) {
      if (err) {
        reject(err)
      } else {
        resolve(data)
      }
    })
  })
}

async function onDocumentLoad () {
  // IMAGE HANDLER AND RESIZER
  document.getElementById('image-file-input').addEventListener('change', () => {
    emptyHtml('images-div')
    david.images = []

    // get all the files from the file input element
    const files = document.getElementById('image-file-input').files
    if (files.length === 0) {
      return
    }

    // create resizer object
    const resizer = pica()

    // for each file
    for (let i = 0; i < files.length; ++i) {
      const file = files[i]
      const img = new Image()
      img.onload = async () => {
        const destinationCanvas = document.createElement('canvas')
        destinationCanvas.id = 'image' + i
        document.getElementById('images-div').append(destinationCanvas)
        let destinationWidth, destinationHeight
        if (img.width > img.height) {
          destinationCanvas.width = 600
          destinationCanvas.height = img.height * 600 / img.width
        } else {
          destinationCanvas.height = 600
          destinationCanvas.width = img.width * 600 / img.height
        }
        await resizer.resize(img, destinationCanvas)
        destinationCanvas.toBlob(blob => david.images.push(blob), 'image/jpeg')
      }
      img.src = URL.createObjectURL(file)
    }
  })


  // CHECK IN BUTTON
  document.getElementById('checkin-button').addEventListener('click', async () => {
    // GET LOCATION
    if (!navigator.geolocation) {
      displayStatus("Geolocation is not supported by this browser.")
      return
    }
    displayStatus('Getting location...')

    const latString = document.getElementById('checkin-lat-input').value
    const lngString = document.getElementById('checkin-lng-input').value
    let lat, lng
    if ((latString && !lngString) || (!latString && lngString)) {
      displayStatus('Must input both latitude and longitude or neither.')
      return

    } else if (latString && lngString) {
      lat = parseFloat(latString)
      lng = parseFloat(lngString)
      if (isNaN(lat)) {
        displayStatus('Fix your latitude')
        return
      } else if (isNaN(lng)) {
        displayStatus('Fix your longitude')
        return
      }

    } else {
      const location = await getUserLocation()
      lat = location.coords.latitude
      lng = location.coords.longitude
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
        Key: 'content/data/checkins.json'
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
      blurb: checkinBlurb,
      images: david.images.map((img, i) => `${checkinTime}/${checkinTime}-${i}.jpeg`)
    }
    console.log(newCheckin)
    contentJson.checkins.push(newCheckin)

    // UPLOAD IMAGES
    for (let i = 0; i < david.images.length; ++i) {
      displayStatus('Uploading image ' + i)
      try {
        await putHeavyPublicS3Object(`content/images/${checkinTime}/${checkinTime}-${i}.jpeg`, david.images[i])
      } catch (e) {
        displayStatus('Uh oh. ' + e.toString())
        return
      }
    }

    // UPLOAD NEW CHECKIN LIST
    displayStatus('Pushing new checkin list...')
    try {
      await putPublicS3Object('content/data/checkins.json', JSON.stringify(contentJson, null, 2))
      await putPublicS3Object('content/data/checkins.js', `david = ${JSON.stringify(contentJson, null, 2)}`)
    } catch (e) {
      displayStatus(`Uh oh. ${e.toString()}`)
      return
    }
    displayStatus('Pushed: ' + JSON.stringify(newCheckin, null, 2))
  })

}

onDocumentLoad()