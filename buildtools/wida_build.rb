require 'erb'
require 'fileutils'
require 'json'

class WidaBuild
  FOLDERS_TO_VERSION = [
    'scripts',
    'css'
  ]

  # options hash should include :src_root, :build_root
  def initialize(directory_mode, options)
    raise 'Invalid directory_mode' unless ['local', 's3'].include? directory_mode
    @directory_mode = directory_mode
    @options = options
  end

  # versions the filename using the given version id
  def versioned_filename(filename, build_version_id)
    extension = File.extname(filename)
    basename = filename.delete_suffix(extension)
    return "#{basename}.#{build_version_id}#{extension}"
  end

  def build
    if @directory_mode == 'local'
      website_dir = "#{@options[:src_root]}/website"
      website_build_dir = "#{@options[:build_root]}/website"
      checkins_json_filename = "#{website_dir}/content/data/checkins.json"

      # create build folder if non existent
      FileUtils.mkdir_p(website_build_dir)


      ## COPY SRC INTO BUILD ##
      FileUtils.cp_r("#{website_dir}/.", website_build_dir)


      ## TEMPLATING ##
      build_version_id = Time.now.to_i
      checkins = JSON.parse(File.read(checkins_json_filename))['checkins']
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

    else
      raise 'Directory mode not supported'
    end
  end
end