export interface Env {
  DB: D1Database;
  INITIAL_CAPITAL_USD?: string;
  TELEGRAM_BOT_TOKEN?: string;
  TELEGRAM_CHANNEL_ID?: string;
  ADMIN_API_TOKEN?: string;
}

export interface ExchangeAnnouncement {
  ann_id: string;
  exchange: "Binance" | "Upbit";
  category: string;
  published_at: string;
  title: string;
  url: string;
}

export interface ScoredAnnouncement {
  ann: ExchangeAnnouncement;
  score: number;
  tier: "HOT" | "WATCH" | "NORMAL";
}

export interface DailyClose {
  date: string;
  close: number;
}
