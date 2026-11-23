import { sendTelegramLog } from "./notify.ts";
import type { Env, ExchangeAnnouncement, ScoredAnnouncement } from "./types.ts";

const USER_AGENT = "Mozilla/5.0 (compatible; HyperliquidZeroCostBot/0.1)";

export function scoreAnnouncement(ann: ExchangeAnnouncement): ScoredAnnouncement {
  const raw = ann.title;
  const t = raw.toLowerCase();
  let score = 40;

  if (ann.exchange === "Upbit") {
    if (raw.includes("신규 거래지원") || t.includes("new trading support")) {
      score = t.includes("krw") || raw.includes("원화") ? 98 : 88;
    } else if (raw.includes("거래지원 종료") || t.includes("termination of trading support")) {
      score = 95;
    } else if (raw.includes("유의종목 지정")) {
      score = 86;
    } else {
      score = 35;
    }
  } else {
    if (
      (t.includes("binance will list") || t.includes("introducing")) &&
      !t.includes("futures") &&
      !t.includes("perpetual")
    ) {
      score = 96;
    } else if (t.includes("will delist")) {
      score = 95;
    } else if (t.includes("binance futures will launch") || t.includes("perpetual contract")) {
      score = 88;
    } else if (t.includes("maintenance") || t.includes("promotion") || t.includes("giveaway")) {
      score = 20;
    }
  }

  const tier = score >= 95 ? "HOT" : score >= 80 ? "WATCH" : "NORMAL";
  return { ann, score, tier };
}

async function fetchAnnouncements(): Promise<ExchangeAnnouncement[]> {
  const out: ExchangeAnnouncement[] = [];
  for (const [catId, catName] of [
    [48, "Listing"],
    [161, "Delisting"],
  ] as const) {
    try {
      const resp = await fetch(
        `https://www.binance.com/bapi/composite/v1/public/cms/article/list/query?type=1&catalogId=${catId}&pageNo=1&pageSize=15`,
        { headers: { "User-Agent": USER_AGENT, Accept: "application/json" } }
      );
      if (!resp.ok) continue;
      const data = (await resp.json()) as {
        data?: { catalogs?: Array<{ articles?: Array<Record<string, unknown>> }> };
      };
      for (const c of data.data?.catalogs ?? []) {
        for (const a of c.articles ?? []) {
          const code = String(a.code ?? "");
          out.push({
            ann_id: `binance_${String(a.id ?? code)}`,
            exchange: "Binance",
            category: catName,
            published_at: new Date(Number(a.releaseDate ?? 0)).toISOString().slice(0, 16),
            title: String(a.title ?? "").trim(),
            url: `https://www.binance.com/en/support/announcement/${code}`,
          });
        }
      }
    } catch {
      continue;
    }
  }

  try {
    const resp = await fetch(
      "https://api-manager.upbit.com/api/v1/announcements?os=web&page=1&per_page=20&category=trade",
      { headers: { "User-Agent": USER_AGENT, Accept: "application/json" } }
    );
    if (resp.ok) {
      const data = (await resp.json()) as {
        data?: { notices?: Array<Record<string, unknown>> };
      };
      for (const n of data.data?.notices ?? []) {
        const nid = String(n.id ?? "");
        out.push({
          ann_id: `upbit_${nid}`,
          exchange: "Upbit",
          category: String(n.category ?? "Trade"),
          published_at: String(n.listed_at ?? "").slice(0, 16),
          title: String(n.title ?? "").trim(),
          url: `https://upbit.com/service_center/notice?id=${nid}`,
        });
      }
    }
  } catch {
    // Ignore transient network failures
  }
  return out;
}

export async function runAnnouncementRadar(env: Env): Promise<{
  fetched: number;
  newlySeen: number;
  hotCount: number;
  notified: boolean;
}> {
  const all = await fetchAnnouncements();
  const existing = await env.DB.prepare("SELECT ann_id FROM seen_announcements").all<{
    ann_id: string;
  }>();
  const seen = new Set((existing.results ?? []).map((r) => r.ann_id));
  const isBootstrap = seen.size === 0;

  const newItems = all.filter((a) => !seen.has(a.ann_id)).map(scoreAnnouncement);
  const hot = newItems.filter((s) => s.tier === "HOT");

  let notified = false;
  if (!isBootstrap && hot.length > 0) {
    const lines = ["[Exchange Announcement Monitor | Score >= 95]"];
    for (const h of hot) {
      lines.push(`\n[${h.score}] ${h.ann.exchange}: ${h.ann.title}\n${h.ann.url}`);
    }
    lines.push("\nAutomated public feed only. Not financial advice.");
    notified = (await sendTelegramLog(env, lines.join("\n"))).sent;
  }

  if (newItems.length > 0) {
    const stmt = env.DB.prepare(
      `INSERT OR IGNORE INTO seen_announcements
       (ann_id, exchange, category, published_at, title, url, score, tier)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    );
    await env.DB.batch(
      newItems.map((s) =>
        stmt.bind(
          s.ann.ann_id,
          s.ann.exchange,
          s.ann.category,
          s.ann.published_at,
          s.ann.title,
          s.ann.url,
          s.score,
          s.tier
        )
      )
    );
  }

  return { fetched: all.length, newlySeen: newItems.length, hotCount: hot.length, notified };
}
