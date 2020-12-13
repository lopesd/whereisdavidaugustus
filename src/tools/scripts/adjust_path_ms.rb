#! /usr/bin/ruby

require 'json'

CONTENT_DIR = "#{__dir__}/../../website/content"
CHECKINS_JSON_FILENAME = "#{CONTENT_DIR}/data/checkins.json"

def get_image_dimensions(filename)
  full_filename = "#{CONTENT_DIR}/images/#{filename}"
  cmd = "identify -format '%wx\%h' '#{full_filename}'"
  dimensions = `#{cmd}`
  width, height = dimensions.split('x')
  return width.to_i, height.to_i
end

json = JSON.parse(File.read(CHECKINS_JSON_FILENAME))
new_json = JSON.parse(File.read(CHECKINS_JSON_FILENAME))

json['checkins'].each_with_index do |checkin, checkin_index|
  next unless checkin['videos']
  checkin['videos'].each_with_index do |video, video_index|
    next unless video['path']
    first_ms = video['path'][0]['ms']
    video['path'].each_with_index do |point, point_index|
      new_ms = point['ms'] - first_ms
      new_json['checkins'][checkin_index]['videos'][video_index]['path'][point_index]['ms'] = new_ms
    end
  end
end

File.write(CHECKINS_JSON_FILENAME, JSON.pretty_generate(new_json))