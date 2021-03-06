# frozen_string_literal: true
#
module Gitlab
  module Diff
    class HighlightCache
      include Gitlab::Utils::StrongMemoize

      EXPIRATION = 1.week
      VERSION = 1

      delegate :diffable,     to: :@diff_collection
      delegate :diff_options, to: :@diff_collection

      def initialize(diff_collection)
        @diff_collection = diff_collection
      end

      # - Reads from cache
      # - Assigns DiffFile#highlighted_diff_lines for cached files
      #
      def decorate(diff_file)
        if content = read_file(diff_file)
          diff_file.highlighted_diff_lines = content.map do |line|
            Gitlab::Diff::Line.safe_init_from_hash(line)
          end
        end
      end

      # For every file that isn't already contained in the redis hash, store the
      #   result of #highlighted_diff_lines, then submit the uncached content
      #   to #write_to_redis_hash to submit a single write. This avoids excessive
      #   IO generated by N+1's (1 writing for each highlighted line or file).
      #
      def write_if_empty
        return if cacheable_files.empty?

        new_cache_content = {}

        cacheable_files.each do |diff_file|
          new_cache_content[diff_file.file_path] = diff_file.highlighted_diff_lines.map(&:to_hash)
        end

        write_to_redis_hash(new_cache_content)
      end

      def clear
        Gitlab::Redis::Cache.with do |redis|
          redis.del(key)
        end
      end

      def key
        strong_memoize(:redis_key) do
          ['highlighted-diff-files', diffable.cache_key, VERSION, diff_options].join(":")
        end
      end

      private

      def cacheable_files
        strong_memoize(:cacheable_files) do
          diff_files.select { |file| cacheable?(file) && read_file(file).nil? }
        end
      end

      # Given a hash of:
      #   { "file/to/cache" =>
      #   [ { line_code: "a5cc2925ca8258af241be7e5b0381edf30266302_19_19",
      #       rich_text: " <span id=\"LC19\" class=\"line\" lang=\"plaintext\">config/initializers/secret_token.rb</span>\n",
      #       text: " config/initializers/secret_token.rb",
      #       type: nil,
      #       index: 3,
      #       old_pos: 19,
      #       new_pos: 19 }
      #   ] }
      #
      #   ...it will write/update a Gitlab::Redis hash (HSET)
      #
      def write_to_redis_hash(hash)
        Gitlab::Redis::Cache.with do |redis|
          redis.pipelined do
            hash.each do |diff_file_id, highlighted_diff_lines_hash|
              redis.hset(
                key,
                diff_file_id,
                compose_data(highlighted_diff_lines_hash.to_json)
              )
            end

            # HSETs have to have their expiration date manually updated
            #
            redis.expire(key, EXPIRATION)
          end

          record_memory_usage(fetch_memory_usage(redis, key))
        end

        # Subsequent read_file calls would need the latest cache.
        #
        clear_memoization(:cached_content)
        clear_memoization(:cacheable_files)
      end

      def record_memory_usage(memory_usage)
        if memory_usage
          current_transaction&.observe(:gitlab_redis_diff_caching_memory_usage_bytes, memory_usage) do
            docstring 'Redis diff caching memory usage by key'
            buckets [100, 1_000, 10_000, 100_000, 1_000_000, 10_000_000]
          end
        end
      end

      def fetch_memory_usage(redis, key)
        # Redis versions prior to 4.0.0 do not support memory usage reporting
        #   for a specific key. As of 11-March-2020 we support Redis 3.x, so
        #   need to account for this. We can remove this check once we
        #   officially cease supporting versions <4.0.0.
        #
        return if Gem::Version.new(redis.info["redis_version"]) < Gem::Version.new("4")

        redis.memory("USAGE", key)
      end

      def file_paths
        strong_memoize(:file_paths) do
          diff_files.collect(&:file_path)
        end
      end

      def read_file(diff_file)
        cached_content[diff_file.file_path]
      end

      def cached_content
        strong_memoize(:cached_content) { read_cache }
      end

      def read_cache
        return {} unless file_paths.any?

        results = []

        Gitlab::Redis::Cache.with do |redis|
          results = redis.hmget(key, file_paths)
        end

        results.map! do |result|
          Gitlab::Json.parse(extract_data(result), symbolize_names: true) unless result.nil?
        end

        file_paths.zip(results).to_h
      end

      def compose_data(json_data)
        # #compress returns ASCII-8BIT, so we need to force the encoding to
        #   UTF-8 before caching it in redis, else we risk encoding mismatch
        #   errors.
        #
        ActiveSupport::Gzip.compress(json_data).force_encoding("UTF-8")
      rescue Zlib::GzipFile::Error
        json_data
      end

      def extract_data(data)
        # Since we could be dealing with an already populated cache full of data
        #   that isn't gzipped, we want to also check to see if the data is
        #   gzipped before we attempt to #decompress it, thus we check the first
        #   2 bytes for "\x1F\x8B" to confirm it is a gzipped string. While a
        #   non-gzipped string will raise a Zlib::GzipFile::Error, which we're
        #   rescuing, we don't want to count on rescue for control flow.
        #
        data[0..1] == "\x1F\x8B" ? ActiveSupport::Gzip.decompress(data) : data
      rescue Zlib::GzipFile::Error
        data
      end

      def cacheable?(diff_file)
        diffable.present? && diff_file.text? && diff_file.diffable?
      end

      def diff_files
        # We access raw_diff_files here, as diff_files will attempt to apply the
        #   highlighting code found in this class, leading  to a circular
        #   reference.
        #
        @diff_collection.raw_diff_files
      end

      def current_transaction
        ::Gitlab::Metrics::Transaction.current
      end
    end
  end
end
