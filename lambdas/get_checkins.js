// dependencies
const AWS = require('aws-sdk')

// clients
const s3 = new AWS.S3()
const lambda = new AWS.Lambda()

exports.handler = async (event, context, callback) => {
  // GET THE EXISTING CHECKINS FILE
  const bucket = 'www.whereisdavidaugustus.com'
  const key = 'content/data/checkins.json'

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

  // RETURN SUCCESS HTTP
  /*
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
      }],
      'access-control-allow-origin': [{
        key: 'Access-Control-Allow-Origin',
        value: '*'
      }]
    },
    body: JSON.stringify(checkinsJson),
  })*/
  return checkinsJson
}