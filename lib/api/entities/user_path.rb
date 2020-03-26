# frozen_string_literal: true

module API
  module Entities
    class UserPath < UserBasic
      include RequestAwareEntity
      include UserStatusTooltip

      expose :path do |user|
        user_path(user)
      end
    end
  end
end