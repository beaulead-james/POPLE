const crypto = require("crypto");
const express = require("express");

const BOT_RE = /(bot|spider|crawl|crawler|fetch|headless|curl|wget|python-requests|httpclient|lighthouse|monitor)/i;

function ipHash(ip) {
  return crypto.createHash("sha256").update(ip || "").digest("hex").slice(0, 48);
}

// 세션 로그인 기반 관리자 인증 (server.js의 방식과 동일)
function requireAdmin(req, res, next) {
  if (req.session && req.session.isAuthenticated) return next();
  return res.status(401).json({ error: "Unauthorized" });
}

// --- 1) 로깅 미들웨어 (SQLite 버전) ---
function analyticsMiddleware() {
  const exclude = [/^\/admin/, /^\/assets/, /^\/static/, /^\/images/, /^\/favicon/, /^\/healthz/, /^\/uploads/];
  return async function (req, _res, next) {
    try {
      if (exclude.some((re) => re.test(req.path))) return next();

      const ua = req.get("user-agent") || "";
      const isBot = BOT_RE.test(ua);

      // SQLite에 간단한 로그 저장 (테이블이 없으면 스킵)
      const Database = require('../db');
      if (global.analyticsDb) {
        const ip = (req.headers["x-forwarded-for"] || "").split(",")[0].trim() || req.socket.remoteAddress;
        const ipH = ipHash(ip);
        
        global.analyticsDb.run(`
          INSERT OR IGNORE INTO analytics_logs (path, ip_hash, user_agent, is_bot, created_at)
          VALUES (?, ?, ?, ?, datetime('now'))
        `, [req.path, ipH, ua, isBot ? 1 : 0]);
      }
    } catch (e) {
      console.error("analytics insert failed", e);
    }
    next();
  };
}

// --- 2) SQLite 테이블 초기화 ---
function initAnalytics(db) {
  if (!db) return;
  
  global.analyticsDb = db;
  
  // 분석 로그 테이블 생성
  db.run(`
    CREATE TABLE IF NOT EXISTS analytics_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      path TEXT NOT NULL,
      ip_hash TEXT,
      user_agent TEXT,
      is_bot INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `, (err) => {
    if (err) {
      console.error('Analytics 테이블 생성 실패:', err.message);
    } else {
      console.log('Analytics 테이블이 생성되었습니다.');
    }
  });

  // 인덱스 생성
  db.run(`CREATE INDEX IF NOT EXISTS idx_analytics_path ON analytics_logs(path)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_analytics_created_at ON analytics_logs(created_at)`);
}

// --- 3) API Router (SQLite 버전) ---
const analyticsRouter = express.Router();

analyticsRouter.get("/timeseries", requireAdmin, async (_req, res) => {
  try {
    if (!global.analyticsDb) {
      return res.json({ ok: true, rows: [] });
    }

    const query = `
      SELECT 
        DATE(created_at) as day,
        COUNT(*) as pv,
        COUNT(DISTINCT ip_hash) as uv
      FROM analytics_logs 
      WHERE is_bot = 0 AND created_at >= date('now', '-30 days')
      GROUP BY DATE(created_at)
      ORDER BY day
    `;

    global.analyticsDb.all(query, [], (err, rows) => {
      if (err) {
        console.error("Timeseries query failed:", err);
        return res.status(500).json({ error: "Internal server error" });
      }
      res.json({ ok: true, rows: rows || [] });
    });
  } catch (error) {
    console.error("Timeseries query failed:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

analyticsRouter.get("/top-paths", requireAdmin, async (_req, res) => {
  try {
    if (!global.analyticsDb) {
      return res.json({ ok: true, rows: [] });
    }

    const query = `
      SELECT 
        path,
        COUNT(*) as pv,
        COUNT(DISTINCT ip_hash) as uv
      FROM analytics_logs 
      WHERE is_bot = 0 AND created_at >= date('now', '-30 days')
      GROUP BY path
      ORDER BY pv DESC
      LIMIT 50
    `;

    global.analyticsDb.all(query, [], (err, rows) => {
      if (err) {
        console.error("Top paths query failed:", err);
        return res.status(500).json({ error: "Internal server error" });
      }
      res.json({ ok: true, rows: rows || [] });
    });
  } catch (error) {
    console.error("Top paths query failed:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

analyticsRouter.get("/summary", requireAdmin, async (req, res) => {
  try {
    const day = req.query.day;
    if (!day || !global.analyticsDb) {
      return res.json({ ok: true, rows: [] });
    }

    const query = `
      SELECT 
        path,
        COUNT(*) as pv,
        COUNT(DISTINCT ip_hash) as uv
      FROM analytics_logs 
      WHERE is_bot = 0 AND DATE(created_at) = ?
      GROUP BY path
      ORDER BY pv DESC
      LIMIT 1000
    `;

    global.analyticsDb.all(query, [day], (err, rows) => {
      if (err) {
        console.error("Summary query failed:", err);
        return res.status(500).json({ error: "Internal server error" });
      }
      res.json({ ok: true, rows: rows || [] });
    });
  } catch (error) {
    console.error("Summary query failed:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = {
  analyticsMiddleware,
  analyticsRouter,
  initAnalytics
};