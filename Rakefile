require 'fileutils'
require 'erb'
require './buildtools/wida_build'

task default: :build

S3_ROOT = 's3://www.whereisdavidaugustus.com'
DEPLOYMENT_LAMBDA_ARN = 'arn:aws:lambda:us-east-1:907442024158:function:wida-deployment'
CLOUDFRONT_DISTRIBUTION_ID = 'E8NGZT2IL30A7'

ROOT = Rake.application.original_dir
BUILD_ROOT = "#{ROOT}/build"
SRC_ROOT = "#{ROOT}/src"
WEBSITE_SRC_ROOT = "#{SRC_ROOT}/website"
TOOLS_ROOT = "#{SRC_ROOT}/tools"

CONTENT_DIR = "#{ROOT}/../whereisdavidaugustus-content/content"

WEBSITE_BUILD_DIR = "#{BUILD_ROOT}/website"

CHECKINS_FILE = "#{CONTENT_DIR}/data/checkins.json"

TOOLS_SERVER_DIR = "#{TOOLS_ROOT}/server"

def run_cmd cmd, msg
  puts msg
  puts "  #{cmd}"
  `#{cmd}`
end


### BUILD TASKS
task :build => :clean do
  WidaBuild.new(src_root: SRC_ROOT, build_root: BUILD_ROOT, checkins_file: CHECKINS_FILE).build
  puts "BUILD COMPLETE"
  puts
end

task :push => :build do
  run_cmd "aws s3 sync #{WEBSITE_SRC_ROOT} #{S3_ROOT} --exclude 'content/*' --delete --acl public-read", "Pushing static website files to S3"
  puts "PUSH COMPLETE"
  puts
end


### TOOLS SERVER TASKS
task :tools_server do
  exec "node #{TOOLS_SERVER_DIR}/src/tools-server.js"
end


### CLEAN TASKS
task :clean do
  run_cmd "rm -rf #{WEBSITE_BUILD_DIR}", 'Cleaning build directory'
  puts 'CLEAN COMPLETE'
  puts
end
