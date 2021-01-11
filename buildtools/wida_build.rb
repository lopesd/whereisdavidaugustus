require 'erb'
require 'fileutils'
require 'json'

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

    CHAPTER_CONFIG_FILENAME = 'config.json'

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
      # create build folder if non existent
      FileUtils.mkdir_p(options[:build_root])


      ## COPY SRC INTO BUILD ##
      FileUtils.cp_r("#{options[:src_root]}/.", options[:build_root])

      # GET CHECKINS ORGANIZED IN CHAPTERS
      chapters = {}
      Dir.glob("#{options[:checkins_dir]}/*").each do |chapter_dir|
        chapter_config_json = JSON.parse(File.read("#{chapter_dir}/#{CHAPTER_CONFIG_FILENAME}"))
        chapter_number = chapter_config_json['number']
        throw "Chapter #{chapter_number} defined twice" if chapters.keys.include?(chapter_number)

        checkins = []
        Dir.glob("#{chapter_dir}/*").each do |checkin_file|
          next if File.basename(checkin_file) == CHAPTER_CONFIG_FILENAME
          checkin = JSON.parse(File.read(checkin_file))
          checkins.push(checkin)
        end
        checkins.sort_by! { |checkin| checkin['checkinId'] }
        chapter_config_json['checkins'] = checkins
        chapters[chapter_number] = chapter_config_json
      end

      # GET PEEPS
      peeps = {}
      Dir.glob("#{options[:peeps_dir]}/*").each do |peep_file|
        peep = JSON.parse(File.read(peep_file))
        peeps[peep['checkinId']] = peep
      end

      ## TEMPLATING ##
      build_stage = options[:build_stage]
      build_version_id = Time.now.to_i
      maps_api_key = JSON.parse(File.read(options[:credentials_file]))['googleMapsAPIKey']
      files_to_template = Dir["#{options[:build_root]}/**/*.erb"]

      puts "Loading partials"
      partials_to_load = Dir.glob("#{options[:partials_dir]}/**/*.html")
      partials = {}
      partials_to_load.each do |partial_file_name|
        content = File.read(partial_file_name)
        basename = File.basename(partial_file_name).delete_suffix(File.extname(partial_file_name))
        partials[basename] = content
        puts "  #{partial_file_name} => #{basename}"
      end
      puts

      puts "Templating"
      files_to_template.each do |filename|
        puts "  #{filename}"
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
      files_to_version = FOLDERS_TO_VERSION.flat_map { |folder| Dir["#{options[:build_root]}/#{folder}/*"] }
      files_to_version.each do |filename|
        new_filename = versioned_filename(filename, build_version_id)
        puts "  #{filename} => #{new_filename}"
        FileUtils.mv(filename, new_filename)
      end
      puts
    end
  end
end