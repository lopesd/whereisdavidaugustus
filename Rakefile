require 'fileutils'
require 'erb'
require './buildtools/wida_build'

task default: :build

S3_SRC_ROOT = 's3://src-www.whereisdavidaugustus.com'
DEPLOYMENT_LAMBDA_ARN = 'arn:aws:lambda:us-east-1:907442024158:function:wida-deployment'
CLOUDFRONT_DISTRIBUTION_ID = 'E8NGZT2IL30A7'

ROOT = Rake.application.original_dir
BUILD_ROOT = "#{ROOT}/build"
SRC_ROOT = "#{ROOT}/src"
WEBSITE_SRC_ROOT = "#{SRC_ROOT}/website"
TOOLS_ROOT = "#{SRC_ROOT}/tools"

CONTENT_DIR = "#{WEBSITE_SRC_ROOT}/content"

WEBSITE_BUILD_DIR = "#{BUILD_ROOT}/website"

PROCESSED_VIDEOS_DIR = "#{TOOLS_ROOT}/videos/processed"

LOCAL_CHECKINS_JS = "#{CONTENT_DIR}/data/checkins.js"
LOCAL_CHECKINS_JSON = "#{CONTENT_DIR}/data/checkins.json"
LOCAL_IMAGES_DIR = "#{CONTENT_DIR}/images"
LOCAL_VIDEOS_DIR = "#{CONTENT_DIR}/videos"

S3_CHECKINS_JS = "#{S3_SRC_ROOT}/content/data/checkins.js"
S3_CHECKINS_JSON = "#{S3_SRC_ROOT}/content/data/checkins.json"
S3_IMAGES_DIR = "#{S3_SRC_ROOT}/content/images"
S3_VIDEOS_DIR = "#{S3_SRC_ROOT}/content/videos"

TOOLS_SERVER_DIR = "#{TOOLS_ROOT}/server"

def run_cmd cmd, msg
  puts msg
  puts "  #{cmd}"
  `#{cmd}`
end

def invalidate_cloudfront
  run_cmd "aws cloudfront create-invalidation --distribution-id #{CLOUDFRONT_DISTRIBUTION_ID} --paths '/*'", "Busting Cloudfront cache"
end

def invoke_deployment_lamdda
  run_cmd "aws lambda invoke --function-name #{DEPLOYMENT_LAMBDA_ARN} --region us-east-1 ./logs/deployment-#{Time.now.to_i}.log", "Invoking deployment Lambda"
end

task :build => :clean do
  WidaBuild.new(src_root: SRC_ROOT, build_root: BUILD_ROOT).build
  puts "BUILD COMPLETE"
  puts
end

task :bust_cloudfront do
  invalidate_cloudfront
  puts "CLOUDFRONT BUST COMPLETE"
  puts
end

task :deployment_lambda do
  invoke_deployment_lamdda
  puts "DEPLOYMENT COMPLETE"
  puts
end

task :push => :build do
  run_cmd "aws s3 sync #{WEBSITE_SRC_ROOT} #{S3_SRC_ROOT} --exclude 'content/*' --delete --acl public-read", "Pushing static website files to S3"
  puts "PUSH COMPLETE"
  puts
end

task :push_checkins do
  run_cmd "aws s3 cp #{LOCAL_CHECKINS_JS} #{S3_CHECKINS_JS} --acl public-read", "Pushing checkins.js file to S3"
  run_cmd "aws s3 cp #{LOCAL_CHECKINS_JSON} #{S3_CHECKINS_JSON} --acl public-read", "Pushing checkins.json file to S3"
  puts "PUSH CHECKINS COMPLETE"
  puts
end

task :pull_checkins do
  run_cmd "aws s3 cp #{S3_CHECKINS_JS} #{LOCAL_CHECKINS_JS}", "Pulling checkins files to local folder"
  run_cmd "aws s3 cp #{S3_CHECKINS_JSON} #{LOCAL_CHECKINS_JSON}", "Pulling checkins files to local folder"
  puts "PULL CHECKINS COMPLETE"
  puts
end

task :pull_images do 
  run_cmd "aws s3 sync #{S3_IMAGES_DIR} #{LOCAL_IMAGES_DIR}", "Syncing images from S3 to local"
end

task :push_images do
  run_cmd "aws s3 sync #{LOCAL_IMAGES_DIR} #{S3_IMAGES_DIR} --acl public-read", "Syncing images from local to S3"
end

task :pull_videos do
  run_cmd "aws s3 sync #{S3_VIDEOS_DIR} #{LOCAL_VIDEOS_DIR}", "Syncing videos from S3 to local"
end

task :push_videos do
  run_cmd "aws s3 sync #{LOCAL_VIDEOS_DIR} #{S3_VIDEOS_DIR} --acl public-read", "Syncing videos from local to S3"
end

task :sync_images => [:pull_images, :push_images]
task :sync_videos => [:pull_videos, :push_videos]
task :sync_media => [:sync_images, :sync_videos]

### TOOLS TASKS
task :tools_server do
  exec "node #{TOOLS_SERVER_DIR}/src/tools-server.js"
end

### CLEAN TASKS
task :clean do
  run_cmd "rm -rf #{WEBSITE_BUILD_DIR}", 'Cleaning build directory'
  puts 'CLEAN COMPLETE'
  puts
end
