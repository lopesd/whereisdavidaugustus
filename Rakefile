task default: :build

s3_root = 's3://www.whereisdavidaugustus.com/'
checkins_js = 'checkins.js'
checkins_json = 'checkins.json'
website_root = './website'
DEPLOYMENT_LAMBDA_ARN = 'arn:aws:lambda:us-east-1:907442024158:function:wida-deployment'
CLOUDFRONT_DISTRIBUTION_ID = 'E8NGZT2IL30A7'

def run_cmd cmd, msg
  puts msg
  puts "  #{cmd}"
  `#{cmd}`
end

#def invalidate_cloudfront
#  run_cmd "aws cloudfront create-invalidation --distribution-id #{CLOUDFRONT_DISTRIBUTION_ID} --paths '/*'", "Busting Cloudfront cache"
#end

def invoke_deployment_lamdda
  run_cmd "aws lambda invoke --function-name #{DEPLOYMENT_LAMBDA_ARN} --region us-east-1 ./logs/deployment-#{Time.now.to_i}.log", "Invoking deployment Lambda"
end

task :build do
  puts "Nothing to build, run rake push to push index to S3"
end

task :bust_cache do
  invoke_deployment_lamdda
  puts "Complete"
end

task :push do
  run_cmd "aws s3 sync #{website_root} #{s3_root} --exclude #{checkins_js} --exclude #{checkins_json} --delete --acl public-read", "Pushing static website files to S3"
  invoke_deployment_lamdda
  puts "Complete"
end

task :push_checkins do
  run_cmd "aws s3 cp #{website_root}/checkins.js #{s3_root} --acl public-read", "Pushing checkins.js file to S3"
  run_cmd "aws s3 cp #{website_root}/checkins.json #{s3_root} --acl public-read", "Pushing checkins.json file to S3"
  invoke_deployment_lamdda
  puts "Complete"
end

task :pull_checkins do
  run_cmd "aws s3 cp #{s3_root}checkins.js #{website_root}/checkins.js", "Pulling checkins files to local folder"
  run_cmd "aws s3 cp #{s3_root}checkins.json #{website_root}/checkins.json", "Pulling checkins files to local folder"
  invoke_deployment_lamdda
  puts "Complete"
end

### CLEAN TASKS
task :clean do
  `rm -rf build`
end
