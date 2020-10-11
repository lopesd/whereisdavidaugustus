task default: :build

s3_root = 's3://www.whereisdavidaugustus.com/'
exclude_files = 'checkins.js'
website_root = './website'
CLOUDFRONT_DISTRIBUTION_ID = 'E8NGZT2IL30A7'

def run_cmd cmd, msg
  puts msg
  puts "  #{cmd}"
  `#{cmd}`
end

def invalidate_cloudfront
  run_cmd "aws cloudfront create-invalidation --distribution-id #{CLOUDFRONT_DISTRIBUTION_ID} --paths '/*'", "Busting Cloudfront cache"
end

task :build do
  puts "Nothing to build, run rake push to push index to S3"
end

task :bust_cache do
  invalidate_cloudfront
  puts "Complete"
end

task :push do
  run_cmd "aws s3 sync #{website_root} #{s3_root} --exclude #{exclude_files} --delete --acl public-read", "Pushing index file to S3"
  invalidate_cloudfront
  puts "Complete"
end

task :push_checkins do
  run_cmd "aws s3 cp #{website_root}/checkins.js #{s3_root} --acl public-read", "Pushing checkins file to S3"
  invalidate_cloudfront
  puts "Complete"
end

task :pull_checkins do
  run_cmd "aws s3 cp #{s3_root}checkins.js #{website_root}/checkins.js", "Pulling checkins file to local folder"
  invalidate_cloudfront
  puts "Complete"
end

### CLEAN TASKS
task :clean do
  `rm -rf build`
end
