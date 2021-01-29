require 'erb'
require 'fileutils'
require 'json'
require 'yaml'
require 'date'

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

    CHAPTER_CONFIG_FILENAME = 'config.yaml'

    MOBILE_CUTOFF_PIXELS = 798

    # date helper
    def formatted_duration(seconds)
      seconds = seconds.to_i
      days = seconds / (60 * 60 * 24)
      hours = (seconds / (60 * 60)) % 24
      minutes = (seconds / 60) % 60
      seconds = seconds % 60

      days_str = days > 0 ? "#{days}d " : ''
      hours_str = hours > 0 || days > 0 ? "#{hours}h " : ''
      minutes_str = minutes > 0 || hours > 0 || days > 0 ? "#{minutes}m " : ''
      seconds_str = "#{seconds}s"
      "#{days_str}#{hours_str}#{minutes_str}#{seconds_str}"
    end

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

    # given a hashmap { peeper => score }, return a sorted array of
    # objects that can be used to render a leaderboard.
    # the "increasing" flag can be used to indicate that lower scores rank higher.
    def create_ranking_array(peeper_to_score_hash, increasing=false)
      rankings_array = peeper_to_score_hash.to_a.sort_by { |e| e[1] }
      rankings_array.reverse! unless increasing
      previous_score = nil
      previous_rank = 0
      rankings_array.each_with_index.map do |entry, i|
        rank = previous_rank
        if entry[1] != previous_score
          rank = i + 1
          previous_rank = rank
          previous_score = entry[1]
        end
        { 'peeper' => entry[0], 'score' => entry[1], 'rank' => rank }
      end
    end

    def calculate_leaderboards(chapters, peeps)
      leaderboards = []
      chapters.each do |chapter|
        next unless chapter['showLeaderboards']

        # MOST
        peeper_to_peep_count = {}
        chapter['checkins'].each do |checkin|
          peep = peeps[checkin['checkinId']]
          next unless peep && peep['peeper']
          peeper_name = peep['leaderboardName'] || peep['peeper']
          peeper_to_peep_count[peeper_name] ||= 0
          peeper_to_peep_count[peeper_name] += 1
        end
        most = create_ranking_array(peeper_to_peep_count)

        # QUICKEST
        peeper_to_quickest_peep = {}
        chapter['checkins'].each do |checkin|
          peep = peeps[checkin['checkinId']]
          next unless (peep && peep['peepTime'] && checkin['uploadTime'])
          peep_time = DateTime.parse(peep['peepTime'])
          upload_time = DateTime.parse(checkin['uploadTime'])
          seconds_elapsed = peep_time.to_time.to_i - upload_time.to_time.to_i
          peeper_name = peep['leaderboardName'] || peep['peeper']
          existing_record = peeper_to_quickest_peep[peeper_name]
          if !existing_record || existing_record > seconds_elapsed
            peeper_to_quickest_peep[peeper_name] = seconds_elapsed
          end
        end
        quickest = create_ranking_array(peeper_to_quickest_peep, true)

        # STREAK
        peeper_to_longest_streak = {}
        current_streaker = nil
        current_streak_length = 0
        chapter['checkins'].each do |checkin|
          peep = peeps[checkin['checkinId']]
          peeper_name = peep && (peep['leaderboardName'] || peep['peeper'])
          if peeper_name == current_streaker
            current_streak_length += 1
          else
            if current_streaker
              peeper_to_longest_streak[current_streaker] ||= 0
              if peeper_to_longest_streak[current_streaker] < current_streak_length
                peeper_to_longest_streak[current_streaker] = current_streak_length
              end
            end
            current_streaker = peeper_name
            current_streak_length = 1
          end
        end

        streak = create_ranking_array(peeper_to_longest_streak)

        leaderboard = { 
          'name' => chapter['name'],
          'heading' => chapter['heading'],
          'most' => most,
          'quickest' => quickest,
          'streak' => streak
        }
        leaderboards.push(leaderboard)
      end
      leaderboards
    end

    # options hash should include :src_root, :build_root, :credentials_file, :checkins_dir
    def build(options)
      # create build folder if non existent
      FileUtils.mkdir_p(options[:build_root])

      ## COPY SRC INTO BUILD ##
      FileUtils.cp_r("#{options[:src_root]}/.", options[:build_root])

      # GET CHECKINS ORGANIZED IN CHAPTERS
      content_config = YAML.load(File.read("#{options[:checkins_dir]}/#{CHAPTER_CONFIG_FILENAME}"))
      chapters = content_config['chapters']
      chapters.each do |chapter_config|
        chapter_dir = "#{options[:checkins_dir]}/#{chapter_config['directory']}"
        checkins = []
        Dir.glob("#{chapter_dir}/*").each do |checkin_file|
          checkin = JSON.parse(File.read(checkin_file))
          checkins.push(checkin)
        end
        checkins.sort_by! { |checkin| checkin['checkinId'] }
        chapter_config['checkins'] = checkins
      end

      # GET PEEPS
      peeps = {}
      Dir.glob("#{options[:peeps_dir]}/*").each do |peep_file|
        peep = JSON.parse(File.read(peep_file))
        peeps[peep['checkinId']] = peep
      end

      # CALCULATE LEADERBOARDS
      leaderboards = calculate_leaderboards(chapters, peeps)

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