import { runDailyPaperBot } from "./paper.ts";
import { runAnnouncementRadar } from "./radar.ts";
import type { Env } from "./types.ts";

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export function isAuthorized(request: Request, env: Env): boolean {
  const expected = env.ADMIN_API_TOKEN?.trim();
  if (!expected || expected.length < 16) return false;
  const header = request.headers.get("Authorization") ?? "";
  if (!header.startsWith("Bearer ")) return false;
  return safeEqual(header.slice(7).trim(), expected);
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (request.method === "GET" && url.pathname === "/health") {
      return json({ ok: true, mode: "paper_only" });
    }
    if (!isAuthorized(request, env)) {
      return json({ error: "Unauthorized" }, 401);
    }
    if (request.method === "GET" && url.pathname === "/status") {
      const ledger = await env.DB.prepare("SELECT * FROM paper_ledger LIMIT 1").first();
      return json({ mode: "paper_only", ledger });
    }
    if (request.method === "POST" && url.pathname === "/run/radar") {
      return json({ ok: true, result: await runAnnouncementRadar(env) });
    }
    if (request.method === "POST" && url.pathname === "/run/paper") {
      return json({ ok: true, result: await runDailyPaperBot(env) });
    }
    return json({ error: "Not Found" }, 404);
  },

  async scheduled(controller: ScheduledController, env: Env, ctx: ExecutionContext): Promise<void> {
    if (controller.cron === "10 * * * *") {
      ctx.waitUntil(runAnnouncementRadar(env));
    } else if (controller.cron === "5 0 * * *") {
      ctx.waitUntil(runDailyPaperBot(env));
    }
  },
};
