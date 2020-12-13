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
  next unless checkin['images']
  checkin['images'].each_with_index do |image_data, image_index|
    image_name = nil
    if image_data.is_a? String
      image_name = image_data
    elsif image_data.is_a? Hash
      image_name = image_data['name']
    else
      raise "Huh. checkin #{checkin_index}, image #{image_index}, is a #{image_data.class}"
    end

    width, height = get_image_dimensions(image_name)
    new_image_json = {
      'name' => image_name,
      'width' => width,
      'height' => height
    }
    new_json['checkins'][checkin_index]['images'][image_index] = new_image_json
  end
end

File.write(CHECKINS_JSON_FILENAME, JSON.pretty_generate(new_json))