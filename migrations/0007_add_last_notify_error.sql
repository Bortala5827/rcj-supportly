-- 记录站长通知（邮件/Telegram）最近一次失败原因，便于排查"客服提醒没发"问题
ALTER TABLE conversations ADD COLUMN last_notify_error TEXT;
