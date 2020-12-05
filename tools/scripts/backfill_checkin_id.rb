#! /usr/bin/ruby

require 'json'
require 'date'

CONTENT_DIR = "#{__dir__}/../../website/content"
CHECKINS_JSON_FILENAME = "#{CONTENT_DIR}/data/checkins.json"

json = JSON.parse(File.read(CHECKINS_JSON_FILENAME))
new_json = JSON.parse(File.read(CHECKINS_JSON_FILENAME))

json['checkins'].each_with_index do |checkin, checkin_index|
  unless checkin['checkinId']
    new_checkin_id = DateTime.parse(checkin['time']).to_time.to_i
    new_json['checkins'][checkin_index]['checkinId'] = new_checkin_id
  end
end

File.write(CHECKINS_JSON_FILENAME, JSON.pretty_generate(new_json))