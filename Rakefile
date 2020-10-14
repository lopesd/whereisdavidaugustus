require 'fileutils'

task default: :build

s3_root = 's3://www.whereisdavidaugustus.com/'
checkins_js = 'checkins.js'
checkins_json = 'checkins.json'
website_root = './website'

WEBSITE_BUILD_DIR = './build/website'

DEPLOYMENT_LAMBDA_ARN = 'arn:aws:lambda:us-east-1:907442024158:function:wida-deployment'
CLOUDFRONT_DISTRIBUTION_ID = 'E8NGZT2IL30A7'

FILES_TO_VERSION = [
  'scripts/main.js',
  'css/main.css'
]
FILES_TO_TEMPLATE = [
  'index.html'
]

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

def versioned_filename(filename, version_id)
  extension = File.extname(filename)
  puts "extension: #{extension}"
  basename = filename.delete_suffix(extension)
  puts "basename: #{basename}"
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
  FILES_TO_VERSION.each do |filename|
    full_filename = "#{WEBSITE_BUILD_DIR}/#{filename}"
    new_filename = versioned_filename(full_filename, version_id)
    puts "  #{full_filename} => #{new_filename}"
    FileUtils.mv(full_filename, new_filename)
  end

  # replace references
  puts "Templating"
  FILES_TO_TEMPLATE.each do |filename|
    full_filename = "#{WEBSITE_BUILD_DIR}/#{filename}"
    puts "  #{full_filename}"
    new_contents = File.read(full_filename)
    FILES_TO_VERSION.each do |filename_to_version|
      versioned = versioned_filename(filename_to_version, version_id)
      new_contents = new_contents.gsub(/#{filename_to_version}/, versioned)
    end
    File.open(full_filename, "w") { |file| file.puts(new_contents) }
  end
end

task :bust_cache do
  invoke_deployment_lamdda
  puts "Complete"
end

task :push do
  run_cmd "aws s3 sync #{WEBSITE_BUILD_DIR} #{s3_root} --exclude #{WEBSITE_BUILD_DIR}/#{checkins_js} --exclude #{WEBSITE_BUILD_DIR}/#{checkins_json} --delete --acl public-read", "Pushing static website files to S3"
  #invoke_deployment_lamdda
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
  #invoke_deployment_lamdda
  puts "Complete"
end

### CLEAN TASKS
task :clean do
  `rm -rf build`
end
