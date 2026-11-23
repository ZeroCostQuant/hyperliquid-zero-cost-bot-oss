import { fetchBtcDailyCloses } from "./marketData.ts";
import { sendTelegramLog } from "./notify.ts";
import { computePaperPositions, formatPositionLabel } from "./strategy.ts";
import type { Env } from "./types.ts";

const STRATEGY_ID = "donchian_20_ma200_short30";
const COST_RATE = 0.0015; // 0.15% round-side modeled cost (fee + slippage)

interface LedgerRow {
  strategy_id: string;
  symbol: string;
  initial_capital_usd: number;
  started_date: string;
  last_date: string;
  last_price_usd: number;
  current_position: number;
  equity_usd: number;
  peak_equity_usd: number;
  total_trades: number;
  updated_at: string;
}

export async function runDailyPaperBot(env: Env) {
  const initCap = Number(env.INITIAL_CAPITAL_USD ?? "10000") || 10_000;
  const { source, candles } = await fetchBtcDailyCloses(400);
  const dates = candles.map((c) => c.date);
  const closes = candles.map((c) => c.close);
  const positions = computePaperPositions(closes, 20, 0.3, 200);

  const latestDate = dates[dates.length - 1];
  const latestPrice = closes[closes.length - 1];
  const latestPos = Math.round(positions[positions.length - 1] * 10000) / 10000;
  const nowIso = new Date().toISOString();

  let ledger = await env.DB.prepare("SELECT * FROM paper_ledger WHERE strategy_id = ?")
    .bind(STRATEGY_ID)
    .first<LedgerRow>();

  if (!ledger) {
    const equity = Math.round(initCap * (1 - Math.abs(latestPos) * COST_RATE) * 100) / 100;
    const peak = Math.max(initCap, equity);
    const trades = Math.abs(latestPos) > 1e-6 ? 1 : 0;
    await env.DB.batch([
      env.DB.prepare(
        `INSERT INTO paper_ledger
         (strategy_id, symbol, initial_capital_usd, started_date, last_date,
          last_price_usd, current_position, equity_usd, peak_equity_usd, total_trades, updated_at)
         VALUES (?, 'BTC', ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(
        STRATEGY_ID,
        initCap,
        latestDate,
        latestDate,
        latestPrice,
        latestPos,
        equity,
        peak,
        trades,
        nowIso
      ),
      env.DB.prepare(
        `INSERT OR IGNORE INTO paper_history
         (strategy_id, trade_date, btc_usd, position, daily_return_pct, equity_usd, note)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      ).bind(
        STRATEGY_ID,
        latestDate,
        latestPrice,
        latestPos,
        Math.round((equity / initCap - 1) * 100000) / 1000,
        equity,
        `Init: ${formatPositionLabel(latestPos)}`
      ),
    ]);
    ledger = {
      strategy_id: STRATEGY_ID,
      symbol: "BTC",
      initial_capital_usd: initCap,
      started_date: latestDate,
      last_date: latestDate,
      last_price_usd: latestPrice,
      current_position: latestPos,
      equity_usd: equity,
      peak_equity_usd: peak,
      total_trades: trades,
      updated_at: nowIso,
    };
  } else if (latestDate > ledger.last_date) {
    const startIdx = dates.findIndex((d) => d > ledger!.last_date);
    let equity = ledger.equity_usd;
    let peak = ledger.peak_equity_usd;
    let prevPos = ledger.current_position;
    let prevPrice = ledger.last_price_usd;
    let trades = ledger.total_trades;
    const stmts: D1PreparedStatement[] = [];

    if (startIdx >= 0) {
      for (let i = startIdx; i < dates.length; i++) {
        const rawRet = prevPrice > 0 ? closes[i] / prevPrice - 1 : 0;
        const newPos = Math.round(positions[i] * 10000) / 10000;
        const turnover = Math.abs(newPos - prevPos);
        if (turnover > 1e-6) trades += 1;
        const netRet = prevPos * rawRet - turnover * COST_RATE;
        equity *= 1 + netRet;
        if (equity > peak) peak = equity;
        stmts.push(
          env.DB.prepare(
            `INSERT OR IGNORE INTO paper_history
             (strategy_id, trade_date, btc_usd, position, daily_return_pct, equity_usd, note)
             VALUES (?, ?, ?, ?, ?, ?, ?)`
          ).bind(
            STRATEGY_ID,
            dates[i],
            closes[i],
            newPos,
            Math.round(netRet * 100000) / 1000,
            Math.round(equity * 100) / 100,
            turnover > 1e-6
              ? `${formatPositionLabel(prevPos)} -> ${formatPositionLabel(newPos)}`
              : `Hold ${formatPositionLabel(newPos)}`
          )
        );
        prevPos = newPos;
        prevPrice = closes[i];
      }
    }
    equity = Math.round(equity * 100) / 100;
    peak = Math.round(peak * 100) / 100;
    stmts.push(
      env.DB.prepare(
        `UPDATE paper_ledger
         SET last_date = ?, last_price_usd = ?, current_position = ?,
             equity_usd = ?, peak_equity_usd = ?, total_trades = ?, updated_at = ?
         WHERE strategy_id = ?`
      ).bind(latestDate, latestPrice, prevPos, equity, peak, trades, nowIso, STRATEGY_ID)
    );
    await env.DB.batch(stmts);
    ledger = {
      ...ledger,
      last_date: latestDate,
      last_price_usd: latestPrice,
      current_position: prevPos,
      equity_usd: equity,
      peak_equity_usd: peak,
      total_trades: trades,
      updated_at: nowIso,
    };
  }

  const pnlPct = (ledger.equity_usd / ledger.initial_capital_usd - 1) * 100;
  const ddPct = (ledger.equity_usd / ledger.peak_equity_usd - 1) * 100;

  const log = [
    `[Paper Bot Log | $0 Cloudflare Worker]`,
    `Date (UTC): ${ledger.last_date} | Feed: ${source}`,
    `BTC Close: $${ledger.last_price_usd.toLocaleString("en-US", { maximumFractionDigits: 2 })}`,
    `State: ${formatPositionLabel(ledger.current_position)}`,
    `Paper Return: ${pnlPct >= 0 ? "+" : ""}${pnlPct.toFixed(2)}% | Max DD: ${ddPct.toFixed(2)}% | Trades: ${ledger.total_trades}`,
    `Paper simulation only. Not financial advice.`,
  ].join("\n");

  const notify = await sendTelegramLog(env, log);
  return { ledger, notified: notify.sent };
}
