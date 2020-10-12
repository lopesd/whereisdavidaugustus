// dependencies
const AWS = require('aws-sdk');
const util = require('util');

// clients
const s3 = new AWS.S3();
const cloudfront = new AWS.CloudFront({ region: 'us-west-2' })

// parameters
const bucket = 'www.whereisdavidaugustus.com'
const indexKey = 'index.html'
const cloudfrontDistributionId = 'E8NGZT2IL30A7'

// helper function
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// main
exports.handler = async (event, context, callback) => {
  // PART 1: UPDATE TIMESTAMP IN INDEX FILE
  const timestamp = (new Date).toISOString()
  let originalIndex
  try {
    originalIndex = await s3.getObject({
      Bucket: bucket,
      Key: 'index.html'
    }).promise()
  } catch (error) {
    console.log(error)
    return
  }

  const indexText = originalIndex.Body.toString()
  const newBody = indexText.replace(/<!--{{TIMESTAMP .* END_TIMESTAMP}}-->/, `<!--{{TIMESTAMP ${timestamp} END_TIMESTAMP}}-->`)

  try {
    await s3.putObject({
      Bucket: bucket,
      Key: 'index.html',
      Body: newBody,
      ContentType: "text/html"
    }).promise()
  } catch (error) {
    console.log(error)
    return
  }
  console.log("Updated timestamp in index.html: ", timestamp)

  // PART 2: BUST CLOUDFRONT CACHE
  // ugh, we have to wait some time because of S3 eventual consistency.
  await sleep(10000)
  console.log('Waited 10 seconds')

  var cdnParams = {
    DistributionId: cloudfrontDistributionId,
    InvalidationBatch: {
      CallerReference: timestamp,
      Paths: {
        Quantity: 1,
        Items: ['/*']
      }
    }
  }

  cloudfront.createInvalidation(cdnParams, function(err, data) {
    if (err) {
      console.log(err, err.stack)
    } else {
      console.log('Busted cache:', data)
    }
  })
};
