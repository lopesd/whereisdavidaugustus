const AWS = require('aws-sdk')
const s3 = new AWS.S3()
const lambda = new AWS.Lambda()

exports.handler = async (event, context, callback) => {

  // CHECK IF WE REALLY WANT TO HANDLE THIS REQUEST
  const request = event.Records[0].cf.request
  if (request.method !== 'POST' || request.uri !== '/peep') {
    return callback(null, request)
  }

  // GET THE EXISTING CHECKINS FILE
  const bucket = 'www.whereisdavidaugustus.com'
  const key = 'checkins.json'

  let originalFile
  try {
    originalFile = await s3.getObject({
      Bucket: bucket,
      Key: key
    }).promise()
  } catch (error) {
    console.log(error)
    return
  }  
  const checkinsJson = JSON.parse(originalFile.Body)

  // ADD THE FIRST PEEPER
  const requestBody = Buffer.from(request.body.data, 'base64').toString()
  const peeperJson = JSON.parse(requestBody)
  console.log('peeperJson: ', peeperJson)

  const checkinIndex = checkinsJson.checkins.findIndex(checkin => checkin.time === peeperJson.time)
  let peepSuccessful = false
  if (!checkinsJson.checkins[checkinIndex].firstPeeper) {
    peepSuccessful = true
    checkinsJson.checkins[checkinIndex].firstPeeper = peeperJson.peeper
  }

  // UPLOAD NEW CHECKINS.JSON
  try {
    await s3.putObject({
      Bucket: bucket,
      Key: key,
      Body: JSON.stringify(checkinsJson, null, 2),
      ContentType: "application/json"
    }).promise()
  } catch (error) {
    console.log(error)
    return
  } 

  // UPLOAD NEW CHECKINS.JS
  try {
    await s3.putObject({
      Bucket: bucket,
      Key: 'checkins.js',
      Body: `david = ${JSON.stringify(checkinsJson, null, 2)}`,
      ContentType: "application/text"
    }).promise()
  } catch (error) {
    console.log(error)
    return
  } 

  // TRIGGER DEPLOYMENT LAMBDA
  lambda.invoke({
    FunctionName: "arn:aws:lambda:us-east-1:907442024158:function:wida-deployment",
    InvocationType: "Event"
  }, function (err, data) {
    console.log(err)
    console.log(data)
  })

  // RETURN SUCCESS HTTP
  const successJson = {
    peepSuccessful,
    firstPeeper: checkinsJson.checkins[checkinIndex].firstPeeper
  }

  callback(null, {
    status: '200',
    statusDescription: 'OK',
    headers: {
      'cache-control': [{
        key: 'Cache-Control',
        value: 'max-age=0'
      }],
      'content-type': [{
        key: 'Content-Type',
        value: 'application/json'
      }]
    },
    body: JSON.stringify(successJson),
  })
}