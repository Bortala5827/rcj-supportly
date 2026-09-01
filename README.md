# Supportly · Lightweight Live-Chat Customer Support (Cloudflare Workers)

> An open-source, self-hostable customer-support backend on Cloudflare Workers + D1.
> Web chat widget + Telegram bot channel, admin console, and real-time alerts.

Supportly is a small, dependency-light support backend you can deploy in minutes.
It handles visitor web-chat and routes messages to operators via a Telegram bot,
with an admin console for replying to and managing conversations.

## Features

- 💬 **Web chat widget** — drop-in `<script>` snippet, plain-text messaging
- 🤖 **Telegram channel** — visitors can also message your bot directly;
  operators get owner alerts in Telegram
- 🗂️ **Unified conversation management** — list, reply, and assign
- 🛡️ **Admin console** — session list, message reply, data cleanup & stats
- 🔔 **Alerts** — new-message notifications via email (Resend) and/or Telegram
- 🗄️ **Cloudflare D1** (SQLite) storage — no separate database to run

## Tech stack

- Cloudflare Workers
- Cloudflare D1 (SQLite)
- TypeScript + Hono
- Static HTML / JS admin panel

## Deploy

```bash
npm install
npx wrangler d1 create supportly_db      # copy the id into wrangler.toml
npx wrangler d1 migrations apply supportly_db --remote
# create an admin user (see docs/), then:
npx wrangler deploy
```

### Web widget

```html
<script src="https://support.yourdomain.com/widget.js" data-channel-id="your-channel-id"></script>
```

### Telegram bot

Create a bot via [@BotFather](https://t.me/BotFather), add the Telegram channel
in the admin console, and set its webhook to
`https://support.yourdomain.com/api/webhook/telegram/<CHANNEL_ID>`.

Email alerts use [Resend](https://resend.com) (set `RESEND_API_KEY`,
`EMAIL_NOTIFY_TO`, `EMAIL_FROM`).

## Notes

- Personal / small-team use; plain-text messages only.
- No R2 media storage, AI auto-reply, or knowledge base in the core (easy to extend).

---

Part of the [RCJ ecosystem](https://955827.xyz).
