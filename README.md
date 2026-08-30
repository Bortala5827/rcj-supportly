# RCJ Supportly · 轻量客服系统

> 基于 Cloudflare Workers + D1 的轻量客服后端，支持网页聊天和 Telegram Bot，纯文本消息，最小可用版本。

## 功能

- ✅ 网页聊天 Widget（纯文本）
- ✅ Telegram Bot 接入
- ✅ 统一会话管理
- ✅ 客服后台（会话列表、消息回复）
- ✅ 邮件通知（新消息提醒）
- ✅ 数据管理（删除会话、清理旧数据、统计）

## 技术栈

- Cloudflare Workers
- Cloudflare D1（SQLite）
- TypeScript + Hono
- 纯前端 HTML/JS 后台

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

复制 `wrangler.toml` 中的配置，根据需要修改：

```toml
[vars]
JWT_SECRET = "your-jwt-secret"
WIDGET_TOKEN_SECRET = "your-widget-secret"

# 邮件通知（可选）
EMAIL_NOTIFICATION_ENABLED = "false"
# RESEND_API_KEY = "re_xxxxxxxxxxxxxxxx"
# EMAIL_FROM = "onboarding@resend.dev"
# EMAIL_NOTIFY_TO = "your-email@qq.com"
```

### 3. 创建 D1 数据库

```bash
npx wrangler d1 create supportly_db
```

把返回的 database_id 填到 `wrangler.toml` 中。

### 4. 执行数据库迁移

```bash
npx wrangler d1 migrations apply supportly_db --remote
```

### 5. 创建管理员账号

```bash
npx wrangler d1 execute supportly_db --remote --command "INSERT INTO admin_users (id, email, password_hash, name, role, status, created_at, updated_at) VALUES ('admin_1', 'admin@example.com', '\$2a\$10\$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'Admin', 'owner', 'active', unixepoch(), unixepoch())"
```

默认账号：`admin@example.com`，密码：`password123`

### 6. 部署

```bash
npx wrangler deploy
```

## 使用

### 客服后台

部署后访问：`https://your-worker.workers.dev/admin.html`

或自定义域名：`https://support.yourdomain.com/admin.html`

### 网页聊天 Widget

在你的网站中嵌入：

```html
<script src="https://support.yourdomain.com/widget.js" data-channel-id="your-channel-id"></script>
```

### Telegram Bot

1. 在 [@BotFather](https://t.me/BotFather) 创建 Bot，获取 Token
2. 在客服后台「渠道管理」中添加 Telegram 渠道
3. 设置 Webhook：`https://api.telegram.org/bot<TOKEN>/setWebhook?url=https://support.yourdomain.com/api/webhook/telegram/<CHANNEL_ID>`

## 邮件通知

使用 [Resend](https://resend.com) 免费 API（每天100封）：

1. 注册 Resend 账号，获取 API Key
2. 配置环境变量：
   ```
   EMAIL_NOTIFICATION_ENABLED = true
   RESEND_API_KEY = re_xxxxxxxxxxxxxxxx
   EMAIL_NOTIFY_TO = your-email@qq.com
   EMAIL_FROM = onboarding@resend.dev
   ```
3. 重新部署

## 项目结构

```
├── src/
│   ├── config/          # 配置
│   ├── http/            # HTTP 路由
│   ├── modules/         # 业务模块
│   │   ├── channels/    # 渠道管理
│   │   ├── conversations/ # 会话管理
│   │   ├── messages/    # 消息管理
│   │   ├── notifications/ # 邮件通知
│   │   └── users/       # 用户认证
│   ├── services.ts      # 服务初始化
│   └── app.ts           # 应用入口
├── migrations/          # 数据库迁移
├── public/              # 静态文件（后台、Widget）
├── wrangler.toml        # Cloudflare 配置
└── package.json
```

## 说明

- 本项目为最小可用版本，仅支持纯文本消息
- 不包含 R2 媒体存储、AI 自动回复、知识库等高级功能
- 数据存储在 Cloudflare D1（SQLite）中
- 适合个人或小团队使用

## License

MIT
