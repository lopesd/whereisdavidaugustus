// GLOBAL SCOPE
david = {
  images: []
}

// PARAMETERS
const region = 'us-west-2'

const mediaBucket = 'wwww.whereisdavidaugustus-media'
const signatureVersion = 'v4'
const imagesPath = 'media/images'

const repositoryName = 'whereisdavidaugustus-content'
const branchName = 'master'
const committerName = 'whereisdavidaugustus.com/checkin'
const checkinsPath = 'content/data/checkins'

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

// ASYNC HELPER TO GET USER LOCATION
async function getUserLocation(options) {
  return new Promise(function (resolve, reject) {
    navigator.geolocation.getCurrentPosition(resolve, reject, options);
  });
}

// ASYNC HELPER FOR THE UPLOAD FUNCTION WHICH HANDLES BIGGER FILES MORE GRACEFULLY
async function putImageToS3(imageName, Body) {
  const Key = `${imagesPath}/${imageName}`
  const putParams = { Bucket: mediaBucket, Key, Body, ACL: 'public-read' }
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

// ASYNC HELPER TO GET LATEST CODECOMMIT BRANCH
async function getLatestCodeCommitBranchId() {
  const params = { repositoryName, branchName }
  return new Promise(function (resolve, reject) {
    codeCommitClient.getBranch(params, function(err, data) {
      if (err) {
        reject(err)
      } else {
        console.log(data)
        resolve(data.branch.commitId)
      }
    })
  })
}

// ASYNC HELPER TO PUT FILES TO CODECOMMIT
async function putToCodeCommit(filePath, fileContent) {
  const parentCommitId = await getLatestCodeCommitBranchId()
  const putFileParams = { 
    repositoryName,
    branchName,
    filePath,
    fileContent,
    parentCommitId,
    name: committerName
  }

  return new Promise(function (resolve, reject) {
    codeCommitClient.putFile(putFileParams, function(err, data) {
      if (err) {
        reject(err)
      } else {
        resolve(data)
      }
    })
  })
}

// IMAGE HANDLER AND RESIZER
function imageFileInputChangeListener () {
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
      destinationCanvas.toBlob(blob => {
        david.images.push({
          data: blob,
          width: destinationCanvas.width,
          height: destinationCanvas.height
        }) 
      }, 'image/jpeg')
    }
    img.src = URL.createObjectURL(file)
  }
}

async function onDocumentLoad () {
  // ATTACH IMAGE HANDLER
  document.getElementById('image-file-input').addEventListener('change', imageFileInputChangeListener)

  // CHECK IN BUTTON
  document.getElementById('checkin-button').addEventListener('click', async () => {
    // GRAB STUFF FROM THE FORM
    const date = new Date()
    const currentTime = `${date.toDateString()} ${date.toLocaleTimeString()}`
    const currentEpoch = Math.round(date.getTime() / 1000) // in seconds
    const currentTimeISO = date.toISOString()

    const accessKeyId = document.getElementById('access-key-id-input').value
    const secretAccessKey = document.getElementById('secret-key-input').value
    const checkinName = document.getElementById('checkin-name-input').value
    const checkinLocation = document.getElementById('checkin-location-input').value
    const checkinTime = document.getElementById('checkin-time-input').value || currentTime
    const checkinBlurb = document.getElementById('checkin-blurb-input').value

    // INITIALIZE AWS CLIENTS
    displayStatus('Initializing AWS clients...')
    s3 = new AWS.S3({
      endpoint: `s3-${region}.amazonaws.com`,
      accessKeyId,
      secretAccessKey,
      signatureVersion,
      region
    })

    codeCommitClient = new AWS.CodeCommit({
      accessKeyId,
      secretAccessKey,
      region
    })

    // PREPARE IMAGE JSON
    const imageJson = david.images.map((img, i) => ({
      name: `${checkinTime}/${checkinTime}-${i}.jpeg`,
      width: img.width,
      height: img.height
    }))

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

    // UPLOAD IMAGES
    for (let i = 0; i < david.images.length; ++i) {
      displayStatus('Uploading image ' + i)
      try {
        await putImageToS3(`${checkinTime}/${checkinTime}-${i}.jpeg`, david.images[i].data)
      } catch (e) {
        displayStatus('Uh oh. ' + e.toString())
        return
      }
    }

    // CREATE AND UPLOAD NEW CHECKIN
    const newCheckin = {
      checkinId: currentEpoch,
      name: checkinName,
      time: checkinTime,
      uploadTime: currentTimeISO,
      location: checkinLocation,
      latlng,
      blurb: checkinBlurb,
      images: imageJson
    }
    const newCheckinJsonString = JSON.stringify(newCheckin, null, 2)
    console.log(newCheckin)
    displayStatus('Pushing new checkin to CodeCommit...')
    try {
      await putToCodeCommit(`${checkinsPath}/${newCheckin.checkinId}.json`, newCheckinJsonString)
    } catch (e) {
      displayStatus(`Uh oh. ${e.toString()}`)
      return
    }
    displayStatus('Push to CodeCommit successful.')


    // We're done!
    displayStatus('Completed push: ' + newCheckinJsonString)
  })
}

onDocumentLoad()