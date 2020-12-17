require 'erb'
require 'fileutils'
require 'json'

# GASP MONKEY PATCH
# we do this bc dynamodb returns all numbers as BigDecimals which 
# become strings when converted to JSON by default. fuck that noise
class BigDecimal
  def to_json(options)
    self.to_f.to_s
  end
end

module WidaBuild
  class << self
    HTML_SANITIZE_REGEX = Regexp.new('[&<>"\'/]', 'i')
    HTML_SANITIZE_MAP = {
        '&' => '&amp;',
        '<' => '&lt;',
        '>' => '&gt;',
        '"' => '&quot;',
        "'" => '&#x27;',
        "/" => '&#x2F;',
    }

    FOLDERS_TO_VERSION = [
      'scripts',
      'css'
    ]

    # versions the filename using the given version id
    def versioned_filename(filename, build_version_id)
      extension = File.extname(filename)
      basename = filename.delete_suffix(extension)
      return "#{basename}.#{build_version_id}#{extension}"
    end

    # html sanitize a string
    def sanitize(string)
      string.gsub(HTML_SANITIZE_REGEX) { |match| HTML_SANITIZE_MAP[match] }
    end

    # options hash should include :src_root, :build_root, :credentials_file, :checkins_dir
    def build(options)
      website_dir = "#{options[:src_root]}/website"
      website_build_dir = "#{options[:build_root]}/website"

      # create build folder if non existent
      FileUtils.mkdir_p(website_build_dir)


      ## COPY SRC INTO BUILD ##
      FileUtils.cp_r("#{website_dir}/.", website_build_dir)

      # GET CHECKINS
      checkins = []
      Dir.glob("#{options[:checkins_dir]}/*").each do |checkin_file|
        checkin = JSON.parse(File.read(checkin_file))
        checkins.push(checkin)
      end
      checkins.sort_by! { |checkin| checkin['checkinId'] }

      ## TEMPLATING ##
      build_version_id = Time.now.to_i
      maps_api_key = JSON.parse(File.read(options[:credentials_file]))['googleMapsAPIKey']
      files_to_template = Dir["#{website_build_dir}/**/*.erb"]

      puts "Templating"
      puts "  #{files_to_template.join("\n  ")}"
      files_to_template.each do |filename|
        file_contents = File.read(filename)
        renderer = ERB.new(file_contents, trim_mode: ">")
        templated_content = renderer.result(binding)
        new_filename = filename.delete_suffix('.erb')
        File.write(new_filename, templated_content)
        File.delete(filename)
      end
      puts


      ## VERSIONING ##
      # change the filenames of all .css and .js in build folder
      puts "Versioning"
      puts "  Folders: #{FOLDERS_TO_VERSION.join(', ')}"
      files_to_version = FOLDERS_TO_VERSION.flat_map { |folder| Dir["#{website_build_dir}/#{folder}/*"] }
      files_to_version.each do |filename|
        new_filename = versioned_filename(filename, build_version_id)
        puts "  #{filename} => #{new_filename}"
        FileUtils.mv(filename, new_filename)
      end
    end
  end
end