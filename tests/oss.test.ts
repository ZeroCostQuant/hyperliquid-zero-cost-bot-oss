import assert from "node:assert/strict";
import test from "node:test";
import worker, { isAuthorized } from "../src/index.ts";
import { scoreAnnouncement } from "../src/radar.ts";
import { computePaperPositions, formatPositionLabel } from "../src/strategy.ts";
import type { Env } from "../src/types.ts";

test("OSS: scores exchange announcements accurately", () => {
  const s = scoreAnnouncement({
    ann_id: "u1",
    exchange: "Upbit",
    category: "Trade",
    published_at: "2026-11-22 10:00",
    title: "ABC 신규 거래지원 안내 (KRW)",
    url: "https://upbit.com",
  });
  assert.equal(s.score, 98);
  assert.equal(s.tier, "HOT");
});

test("OSS: computes paper positions deterministically", () => {
  const closes = Array.from({ length: 240 }, (_, i) => 50000 + i * 100);
  const pos = computePaperPositions(closes, 20, 0.3, 200);
  assert.equal(pos[pos.length - 1], 1);
  assert.equal(formatPositionLabel(pos[pos.length - 1]), "LONG (100%)");
});

test("OSS: admin auth fails closed", async () => {
  const env = {} as Env;
  const req = new Request("https://example.com/status", {
    headers: { Authorization: "Bearer test-token-1234567890" },
  });
  assert.equal(isAuthorized(req, env), false);
  assert.equal((await worker.fetch(req, env)).status, 401);
  assert.equal((await worker.fetch(new Request("https://example.com/health"), env)).status, 200);
});
