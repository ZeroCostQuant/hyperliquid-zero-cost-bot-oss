CREATE TABLE IF NOT EXISTS seen_announcements (
  ann_id TEXT PRIMARY KEY,
  exchange TEXT NOT NULL,
  category TEXT NOT NULL,
  published_at TEXT NOT NULL,
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  score INTEGER NOT NULL,
  tier TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS paper_ledger (
  strategy_id TEXT PRIMARY KEY,
  symbol TEXT NOT NULL,
  initial_capital_usd REAL NOT NULL,
  started_date TEXT NOT NULL,
  last_date TEXT NOT NULL,
  last_price_usd REAL NOT NULL,
  current_position REAL NOT NULL,
  equity_usd REAL NOT NULL,
  peak_equity_usd REAL NOT NULL,
  total_trades INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS paper_history (
  strategy_id TEXT NOT NULL,
  trade_date TEXT NOT NULL,
  btc_usd REAL NOT NULL,
  position REAL NOT NULL,
  daily_return_pct REAL NOT NULL,
  equity_usd REAL NOT NULL,
  note TEXT NOT NULL,
  PRIMARY KEY (strategy_id, trade_date)
);
