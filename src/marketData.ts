import type { DailyClose } from "./types.ts";

function utcDate(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

export async function fetchBtcDailyCloses(days = 400): Promise<{
  source: "hyperliquid" | "binance";
  candles: DailyClose[];
}> {
  const endTime = Date.now();
  const startTime = endTime - days * 86_400_000;
  try {
    const resp = await fetch("https://api.hyperliquid.xyz/info", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "candleSnapshot",
        req: { coin: "BTC", interval: "1d", startTime, endTime },
      }),
    });
    if (resp.ok) {
      const rows = (await resp.json()) as Array<{ t: number; c: string }>;
      const map = new Map<string, number>();
      for (const r of rows) {
        const c = Number(r.c);
        if (Number.isFinite(c) && c > 0) map.set(utcDate(Number(r.t)), c);
      }
      const candles = Array.from(map.entries())
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([date, close]) => ({ date, close }));
      if (candles.length >= 230) return { source: "hyperliquid", candles };
    }
  } catch {
    // Fallback to Binance public data API
  }

  const resp = await fetch(
    `https://data-api.binance.vision/api/v3/klines?symbol=BTCUSDT&interval=1d&limit=${Math.min(1000, days)}`
  );
  if (!resp.ok) throw new Error(`Binance klines HTTP ${resp.status}`);
  const rows = (await resp.json()) as Array<Array<string | number>>;
  const map = new Map<string, number>();
  for (const k of rows) {
    const c = Number(k[4]);
    if (Number.isFinite(c) && c > 0) map.set(utcDate(Number(k[0])), c);
  }
  const candles = Array.from(map.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, close]) => ({ date, close }));
  if (candles.length < 220) throw new Error(`Insufficient candles: ${candles.length}`);
  return { source: "binance", candles };
}
