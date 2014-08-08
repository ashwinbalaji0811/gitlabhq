class AdminEmailsWorker
  include Sidekiq::Worker

  def perform(recipient_id, subject, body)
    recipient_list(recipient_id).pluck(:id).each do |user_id|
      Notify.send_admin_notification(user_id, subject, body).deliver
    end
  end

  private
  def recipient_list(recipient_id)
    case recipient_id
    when 'all'
      User.where(nil)
    when /group-(\d+)\z/
      Group.find($1).users
    when /project-(\d+)\z/
      Project.find($1).users
    end
  end
end