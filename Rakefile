require 'fileutils'

task default: :build

S3_ROOT = 's3://www.whereisdavidaugustus.com'
DEPLOYMENT_LAMBDA_ARN = 'arn:aws:lambda:us-east-1:907442024158:function:wida-deployment'
CLOUDFRONT_DISTRIBUTION_ID = 'E8NGZT2IL30A7'

WEBSITE_ROOT = './website'
WEBSITE_BUILD_DIR = './build/website'

CONTENT_DIR = 'content'
CHECKINS_JS = "#{CONTENT_DIR}/data/checkins.js"
CHECKINS_JSON = "#{CONTENT_DIR}/data/checkins.json"
IMAGES_DIR = "#{CONTENT_DIR}/images"
VIDEOS_DIR = "#{CONTENT_DIR}/videos"

FOLDERS_TO_VERSION = [
  'scripts',
  'css'
]
FILES_TO_TEMPLATE = [
  'index.html',
  'devlog.html',
  'about.html'
]

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

def versioned_filename(filename, version_id)
  extension = File.extname(filename)
  basename = filename.delete_suffix(extension)
  return "#{basename}.#{version_id}#{extension}"
end

task :build => :clean do
  # create build folder if non existent
  FileUtils.mkdir_p('./build')

  # copy src files into build folder
  # TODO: don't copy images?
  FileUtils.cp_r('./website', './build')

  # create a version timestamp
  version_id = Time.now.to_i

  # change the filenames of all .css and .js in build folder
  puts "Versioning"
  puts "  Folders: #{FOLDERS_TO_VERSION.join(', ')}"
  files_to_version = FOLDERS_TO_VERSION.flat_map { |folder| Dir["#{WEBSITE_BUILD_DIR}/#{folder}/*"] }
  files_to_version.each do |filename|
    new_filename = versioned_filename(filename, version_id)
    puts "  #{filename} => #{new_filename}"
    FileUtils.mv(filename, new_filename)
  end

  # replace references
  puts "Templating"
  FILES_TO_TEMPLATE.each do |filename|
    full_filename = "#{WEBSITE_BUILD_DIR}/#{filename}"
    puts "  #{full_filename}"
    new_contents = File.read(full_filename)
    files_to_version.each do |full_filename_to_version|
      filename_to_version = File.basename(full_filename_to_version)
      versioned = versioned_filename(filename_to_version, version_id)
      new_contents = new_contents.gsub(/#{filename_to_version}/, versioned)
    end
    File.open(full_filename, "w") { |file| file.puts(new_contents) }
  end
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
  run_cmd "aws s3 sync #{WEBSITE_BUILD_DIR} #{S3_ROOT} --exclude #{CONTENT_DIR}/* --delete --acl public-read", "Pushing static website files to S3"
  puts "PUSH COMPLETE"
  puts
end

task :push_checkins do
  run_cmd "aws s3 cp #{WEBSITE_ROOT}/#{CHECKINS_JS} #{S3_ROOT}/#{CHECKINS_JS} --acl public-read", "Pushing checkins.js file to S3"
  run_cmd "aws s3 cp #{WEBSITE_ROOT}/#{CHECKINS_JSON} #{S3_ROOT}/#{CHECKINS_JSON} --acl public-read", "Pushing checkins.json file to S3"
  puts "PUSH CHECKINS COMPLETE"
  puts
end

task :pull_checkins do
  run_cmd "aws s3 cp #{S3_ROOT}/#{CHECKINS_JS} #{WEBSITE_ROOT}/#{CHECKINS_JS}", "Pulling checkins files to local folder"
  run_cmd "aws s3 cp #{S3_ROOT}/#{CHECKINS_JSON} #{WEBSITE_ROOT}/#{CHECKINS_JSON}", "Pulling checkins files to local folder"
  puts "PULL CHECKINS COMPLETE"
  puts
end

task :sync_media => :build do
  run_cmd "aws s3 sync #{S3_ROOT}/#{IMAGES_DIR} #{WEBSITE_ROOT}/#{IMAGES_DIR}", "Syncing images from S3 to local"
  run_cmd "aws s3 sync #{WEBSITE_ROOT}/#{IMAGES_DIR} #{S3_ROOT}/#{IMAGES_DIR} --acl public-read", "Syncing images from local to S3"

  run_cmd "aws s3 sync #{S3_ROOT}/#{VIDEOS_DIR} #{WEBSITE_ROOT}/#{VIDEOS_DIR}", "Syncing videos from S3 to local"
  run_cmd "aws s3 sync #{WEBSITE_ROOT}/#{VIDEOS_DIR} #{S3_ROOT}/#{VIDEOS_DIR} --acl public-read", "Syncing videos from local to S3"
  puts "SYNC MEDIA COMPLETE"
  puts
end

### CLEAN TASKS
task :clean do
  run_cmd 'rm -rf build', 'Cleaning build directory'
  puts 'CLEAN COMPLETE'
  puts
end
