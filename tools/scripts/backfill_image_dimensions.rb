require 'json'

content_dir = "#{__dir__}/../../website/content"

checkins_json_file = "#{content_dir}/data/checkins.json"
json = JSON.parse(File.read(checkins_json_file))
new_json = JSON.parse(File.read(checkins_json_file))

json['checkins'].each_with_index do |checkin, checkin_index|
  next unless checkin['images']
  checkin['images'].each_with_index do |image_name, image_index|
    next unless image_name.is_a? String
    full_image_name = "#{content_dir}/images/#{image_name}"
    cmd = "identify -format '%wx\%h' '#{full_image_name}'"
    dimensions = `#{cmd}`
    width, height = dimensions.split('x')
    new_image_json = {
      'name' => image_name,
      'width' => width,
      'height' => height
    }

    new_json['checkins'][checkin_index]['images'][image_index] = new_image_json
  end
end

File.write(checkins_json_file, JSON.pretty_generate(new_json))