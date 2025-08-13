const crypto = require("crypto");
const express = require("express");
const { db } = require("./db");
const { sql, eq, desc, gt } = require("drizzle-orm");
const { analyticsEvents, analyticsDaily } = require("../shared/schema");

const BOT_RE = /(bot|spider|crawl|crawler|fetch|headless|curl|wget|python-requests|httpclient|lighthouse|monitor)/i;

function ipHash(ip) {
  return crypto.createHash("sha256").update(ip || "").digest("hex").slice(0, 48);
}

// 세션 로그인 기반 관리자 인증 (server.js의 방식과 동일)
function requireAdmin(req, res, next) {
  if (req.session?.isAuthenticated) return next();
  return res.status(401).json({ error: "Unauthorized" });
}

// --- 1) 로깅 미들웨어 ---
function analyticsMiddleware() {
  const exclude = [/^\/admin/, /^\/assets/, /^\/static/, /^\/images/, /^\/favicon/, /^\/healthz/, /^\/uploads/];
  return async function (req, _res, next) {
    try {
      if (exclude.some((re) => re.test(req.path))) return next();

      const ua = req.get("user-agent") || "";
      const isBot = BOT_RE.test(ua);

      const ip = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || req.socket.remoteAddress;
      const ipH = ipHash(ip);

      const url = new URL(`${req.protocol}://${req.get("host")}${req.originalUrl}`);
      const utmSource = url.searchParams.get("utm_source") || undefined;
      const utmMedium = url.searchParams.get("utm_medium") || undefined;
      const utmCampaign = url.searchParams.get("utm_campaign") || undefined;

      const userId = req.session?.username ? String(req.session.username) : undefined;

      await db.insert(analyticsEvents).values({
        path: req.path,
        referrer: req.get("referer") || undefined,
        utmSource, utmMedium, utmCampaign,
        ua, ipHash: ipH, isBot, userId,
      });
    } catch (e) {
      console.error("analytics insert failed", e);
    }
    next();
  };
}

// --- 2) 집계 함수(최근 30일) ---
async function aggregateDaily() {
  try {
    // 최근 30일 내 이벤트만
    const thirtyDaysAgo = sql`now() - interval '30 days'`;
    const rows = await db.select({
      ts: analyticsEvents.ts,
      path: analyticsEvents.path,
      ipHash: analyticsEvents.ipHash,
      isBot: analyticsEvents.isBot,
    }).from(analyticsEvents).where(gt(analyticsEvents.ts, thirtyDaysAgo));

    // 메모리 집계
    const byDayPath = new Map<string, number>();
    const byDayIps = new Map<string, Set<string>>();

    for (const r of rows) {
      if (r.isBot) continue;
      const d = new Date(r.ts as unknown as string);
      const dayKey = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())).toISOString(); // 자정 UTC
      const key = `${dayKey}|${r.path}`;
      byDayPath.set(key, (byDayPath.get(key) || 0) + 1);

      if (!byDayIps.has(dayKey)) byDayIps.set(dayKey, new Set());
      if (r.ipHash) byDayIps.get(dayKey)!.add(r.ipHash);
    }

    // UPSERT
    for (const [key, pv] of byDayPath) {
      const [dayIso, path] = key.split("|");
      const uv = byDayIps.get(dayIso)?.size || 0;
      await db
        .insert(analyticsDaily)
        .values({ day: new Date(dayIso), path, pv, uv })
        .onConflictDoUpdate({
          target: [analyticsDaily.day, analyticsDaily.path],
          set: { pv, uv },
        });
    }

    console.log(`Analytics aggregation completed: ${byDayPath.size} day-path combinations processed`);
  } catch (error) {
    console.error("Analytics aggregation failed:", error);
  }
}

// --- 3) API Router ---
const analyticsRouter = express.Router();

analyticsRouter.get("/timeseries", requireAdmin, async (_req, res) => {
  try {
    const rows = await db
      .select({
        day: analyticsDaily.day,
        pv: sql<number>`sum(${analyticsDaily.pv})`.as("pv"),
        uv: sql<number>`sum(${analyticsDaily.uv})`.as("uv"),
      })
      .from(analyticsDaily)
      .groupBy(analyticsDaily.day)
      .orderBy(analyticsDaily.day)
      .limit(180); // 6개월분
    res.json({ ok: true, rows });
  } catch (error) {
    console.error("Timeseries query failed:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

analyticsRouter.get("/top-paths", requireAdmin, async (_req, res) => {
  try {
    const rows = await db
      .select({
        path: analyticsDaily.path,
        pv: sql<number>`sum(${analyticsDaily.pv})`.as("pv"),
        uv: sql<number>`sum(${analyticsDaily.uv})`.as("uv"),
      })
      .from(analyticsDaily)
      .groupBy(analyticsDaily.path)
      .orderBy(desc(sql`sum(${analyticsDaily.pv})`))
      .limit(50);
    res.json({ ok: true, rows });
  } catch (error) {
    console.error("Top paths query failed:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

analyticsRouter.get("/summary", requireAdmin, async (req, res) => {
  try {
    const day = req.query.day as string | undefined;
    if (!day) {
      return res.json({ ok: true, rows: [] });
    }
    const dayStart = new Date(`${day}T00:00:00.000Z`);
    const rows = await db
      .select({
        day: analyticsDaily.day,
        path: analyticsDaily.path,
        pv: analyticsDaily.pv,
        uv: analyticsDaily.uv,
      })
      .from(analyticsDaily)
      .where(eq(analyticsDaily.day, dayStart))
      .orderBy(desc(analyticsDaily.pv))
      .limit(1000);
    res.json({ ok: true, rows });
  } catch (error) {
    console.error("Summary query failed:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});