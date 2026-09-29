-- 记录站长通知（邮件/Telegram）最近一次失败原因，便于排查"客服提醒没发"问题
-- 注：线上 D1 已存在 last_notify_error 列（前一次 deploy 时 ALTER 成功但 d1_migrations
-- 表未补记 0007），导致每次 CI 重跑都报 duplicate column name。
-- 这里改为 no-op，仅用于让 wrangler 把 0007 标记为 applied，不再重试 ALTER。
-- 如需在新环境重建该列，请参考 0001_init.sql 中 conversations 表的列定义。
SELECT 1;
