require 'fileutils'
require 'erb'
require './buildtools/wida_build'

# parameters
module WIDA
  S3_ROOT = 's3://www.whereisdavidaugustus.com'
  DEPLOYMENT_LAMBDA_ARN = 'arn:aws:lambda:us-east-1:907442024158:function:wida-deployment'
  CLOUDFRONT_DISTRIBUTION_ID = 'E8NGZT2IL30A7'

  ROOT = File.dirname(__FILE__)
  BUILD_ROOT = "#{ROOT}/build"
  SRC_ROOT = "#{ROOT}/src"

  BUILD_STAGE = ENV['CODEBUILD_SRC_DIR'] ? 'prod' : 'local'
  if BUILD_STAGE == 'local'
    CREDENTIALS_FILE = "#{ROOT}/../whereisdavidaugustus-credentials/credentials/local.json"
    CONTENT_DIR = "#{ROOT}/../whereisdavidaugustus-content/content"
  else
    CREDENTIALS_FILE = "#{ENV['CODEBUILD_SRC_DIR_CredentialsSource']}/prod.json"
    CONTENT_DIR = "#{ENV['CODEBUILD_SRC_DIR_CheckinsSource']}/content"
  end
  CHECKINS_DIR = "#{CONTENT_DIR}/static/checkins"
  PEEPS_DIR = "#{CONTENT_DIR}/dynamic/peeps"
  PARTIALS_DIR = "#{SRC_ROOT}/partials"
end

puts "Constants"
WIDA.constants.each do |c|
  puts "  #{c} => #{WIDA.const_get(c)}"
end
puts

# helpers
def run_cmd cmd, msg
  puts msg
  puts "  #{cmd}"
  `#{cmd}`
end

# tasks
task default: :build

task :build => :clean do
  WidaBuild.build(
    build_stage: WIDA::BUILD_STAGE,
    src_root: WIDA::SRC_ROOT,
    build_root: WIDA::BUILD_ROOT,
    checkins_dir: WIDA::CHECKINS_DIR,
    peeps_dir: WIDA::PEEPS_DIR,
    partials_dir: WIDA::PARTIALS_DIR,
    credentials_file: WIDA::CREDENTIALS_FILE
  )
  puts "BUILD COMPLETE"
  puts
end

task :clean do
  run_cmd "rm -rf #{WIDA::BUILD_ROOT}", 'Cleaning build directory'
  puts
  puts 'CLEAN COMPLETE'
  puts
end
