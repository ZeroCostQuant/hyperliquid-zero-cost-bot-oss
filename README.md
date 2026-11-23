# Hyperliquid Zero-Cost Paper Bot & Exchange Radar (Cloudflare Workers + D1)

> **Free Validation Report (PDF) & Weekly Build Logs:**
> Get the full 10-strategy backtest report (including drawdowns, failed strategies, and monkey-test benchmarks):
> 👉 **[Subscribe to ZeroCostQuant Newsletter](https://zerocostquant.substack.com/?utm_source=github&utm_medium=readme)**

Run a 24/7 **zero-server-cost (\$0/month)** crypto monitoring & paper-trading infrastructure on **Cloudflare Workers + D1** — no VPS, no laptop left open, no custody of user funds.

## What's Included (Open-Source Edition)

- **Hyperliquid Daily Market Data Feed** (`api.hyperliquid.xyz/info` `candleSnapshot` with Binance public fallback)
- **Automated Daily Paper-Trading Ledger** stored in Cloudflare D1 (models 0.15% one-way fee + slippage)
- **24/7 Exchange Announcement Monitor** (Binance / Upbit public feeds, scored 0–100 with D1 deduplication)
- **Telegram Channel Broadcast** (automated daily logs for build-in-public transparency)
- **Fail-Closed Admin API** (`GET /health`, `GET /status`, `POST /run/radar`, `POST /run/paper`)

> Looking for the full production execution kit (Hyperliquid non-custodial Agent Wallet order execution, Kill Switch, notional caps, and the 10-strategy stress-testing suite)? Details are shared via the newsletter above.

## Quick Start (3 Minutes, \$0/Month)

```bash
npm install
npm test

# 1. Authenticate with Cloudflare
npx wrangler login

# 2. Create your D1 database and paste the returned database_id into wrangler.jsonc
npx wrangler d1 create hl_zero_cost_bot_db
npx wrangler d1 execute hl_zero_cost_bot_db --remote --file=migrations/0001_init.sql

# 3. Set secrets (never commit secrets to Git)
npx wrangler secret put ADMIN_API_TOKEN
npx wrangler secret put TELEGRAM_BOT_TOKEN
npx wrangler secret put TELEGRAM_CHANNEL_ID

# 4. Deploy 24/7 serverless cron triggers
npx wrangler deploy
```

## Important Disclaimers & Jurisdiction Notice

- **Software & Educational Infrastructure Only:** This repository provides open-source software for paper-trading simulation and public data monitoring. Nothing in this repository constitutes financial, investment, legal, or tax advice, nor a recommendation to buy, sell, or hold any digital asset or derivative.
- **No Guaranteed Returns:** Historical backtests and paper simulations are not indicative of future performance. Cryptocurrency perpetual derivatives carry a high risk of loss.
- **Restricted Jurisdictions:** This software is not intended for distribution to, or use by, residents or entities in restricted jurisdictions including the **United States, United Kingdom, Hong Kong, or Japan** where applicable regulations restrict crypto derivatives or automated trading services. Users are solely responsible for complying with local laws.
