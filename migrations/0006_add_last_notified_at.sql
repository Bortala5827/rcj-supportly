-- 添加邮件通知节流字段
ALTER TABLE conversations ADD COLUMN last_notified_at INTEGER;

-- 创建索引，方便查询
CREATE INDEX IF NOT EXISTS idx_conversations_last_notified_at ON conversations(last_notified_at);
