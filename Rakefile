require 'fileutils'
require 'erb'
require './buildtools/wida_build'

task default: :build

S3_ROOT = 's3://www.whereisdavidaugustus.com'
DEPLOYMENT_LAMBDA_ARN = 'arn:aws:lambda:us-east-1:907442024158:function:wida-deployment'
CLOUDFRONT_DISTRIBUTION_ID = 'E8NGZT2IL30A7'

ROOT = File.dirname(__FILE__)
BUILD_ROOT = "#{ROOT}/build"
SRC_ROOT = "#{ROOT}/src"
WEBSITE_SRC_ROOT = "#{SRC_ROOT}/website"
TOOLS_ROOT = "#{SRC_ROOT}/tools"
WEBSITE_BUILD_DIR = "#{BUILD_ROOT}/website"
TOOLS_SERVER_DIR = "#{TOOLS_ROOT}/server"

BUILD_STAGE = ENV['CODEBUILD_SRC_DIR'] ? 'prod' : 'local'
if BUILD_STAGE == 'local'
  CREDENTIALS_FILE = "#{ROOT}/../whereisdavidaugustus-credentials/credentials/local.json"
  CHECKINS_DIR = "#{ROOT}/../whereisdavidaugustus-content/content/data/checkins"
else
  CREDENTIALS_FILE = "#{ENV['CODEBUILD_SRC_DIR_CredentialsSource']}/prod.json"
  CHECKINS_DIR = "#{ENV['CODEBUILD_SRC_DIR_CheckinsSource']}/checkins"
end



def run_cmd cmd, msg
  puts msg
  puts "  #{cmd}"
  `#{cmd}`
end


task :build => :clean do
  WidaBuild.build(
    src_root: SRC_ROOT,
    build_root: BUILD_ROOT,
    checkins_dir: CHECKINS_DIR,
    credentials_file: CREDENTIALS_FILE
  )
  puts "BUILD COMPLETE"
  puts
end

task :push => :build do
  raise 'haet.'
  run_cmd "aws s3 sync #{WEBSITE_SRC_ROOT} #{S3_ROOT} --exclude 'content/*' --delete --acl public-read", "Pushing static website files to S3"
  puts "PUSH COMPLETE"
  puts
end

task :tools_server do
  exec "node #{TOOLS_SERVER_DIR}/src/tools-server.js"
end

task :clean do
  run_cmd "rm -rf #{WEBSITE_BUILD_DIR}", 'Cleaning build directory'
  puts 'CLEAN COMPLETE'
  puts
end
