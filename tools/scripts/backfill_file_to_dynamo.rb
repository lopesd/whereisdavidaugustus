#! /usr/bin/ruby

require 'json'
require 'aws-sdk-dynamodb'

CONTENT_DIR = "#{__dir__}/../../website/content"
CHECKINS_JSON_FILENAME = "#{CONTENT_DIR}/data/checkins.json"

json = JSON.parse(File.read(CHECKINS_JSON_FILENAME))
newJson = JSON.parse(File.read(CHECKINS_JSON_FILENAME))

dynamo = Aws::DynamoDB::Client.new(region: 'us-east-1')

puts "Initialized"
json['checkins'].each_with_index do |checkin|
  dynamo.put_item(table_name: 'checkins', item: checkin)
end