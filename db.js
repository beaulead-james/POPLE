const sqlite3 = require('sqlite3').verbose();
const path = require('path');

class Database {
  constructor() {
    this.db = new sqlite3.Database(path.join(__dirname, 'events.db'), (err) => {
      if (err) {
        console.error('데이터베이스 연결 실패:', err.message);
      } else {
        console.log('SQLite 데이터베이스에 연결되었습니다.');
        this.initialize();
      }
    });
  }

  initialize() {
    // 이벤트 테이블 생성
    this.db.run(`
      CREATE TABLE IF NOT EXISTS events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        slug TEXT UNIQUE,
        content TEXT NOT NULL,
        content_format TEXT DEFAULT 'markdown' CHECK(content_format IN ('markdown','html','text')),
        start_date TEXT NOT NULL,
        end_date TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','published','archived')),
        thumbnail_url TEXT,
        tags TEXT,
        published_at TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      )
    `, (err) => {
      if (err) {
        console.error('테이블 생성 실패:', err.message);
      } else {
        console.log('이벤트 테이블이 생성되었습니다.');
        this.createIndexes();
        this.insertDummyData();
      }
    });

    // updated_at 자동 갱신 트리거
    this.db.run(`
      CREATE TRIGGER IF NOT EXISTS trg_events_updated_at 
      AFTER UPDATE ON events 
      FOR EACH ROW 
      BEGIN 
        UPDATE events SET updated_at = datetime('now') WHERE id = NEW.id; 
      END
    `);

    // Analytics 테이블 생성
    this.createAnalyticsTable();
  }

  createIndexes() {
    this.db.run(`CREATE INDEX IF NOT EXISTS idx_events_status_date ON events(status, start_date, end_date)`);
    this.db.run(`CREATE INDEX IF NOT EXISTS idx_events_published ON events(published_at DESC)`);
  }

  createAnalyticsTable() {
    this.db.run(`
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
        // Analytics DB 글로벌 설정
        global.analyticsDb = this.db;
      }
    });

    // 인덱스 생성
    this.db.run(`CREATE INDEX IF NOT EXISTS idx_analytics_path ON analytics_logs(path)`);
    this.db.run(`CREATE INDEX IF NOT EXISTS idx_analytics_created_at ON analytics_logs(created_at)`);
  }

  insertDummyData() {
    const dummyEvents = [
      {
        title: "JOPT 2025 메인 이벤트",
        slug: "jopt-2025-main",
        content: `# JOPT 2025 메인 이벤트

일본 오픈 포커 토너먼트 2025의 메인 이벤트입니다.

## 이벤트 상세

- **장소**: 도쿄 컨벤션 센터
- **참가비**: ¥100,000
- **상금**: ¥50,000,000

국제적인 포커 플레이어들과 경쟁하세요!`,
        start_date: "2025-03-15",
        end_date: "2025-03-20",
        status: "published",
        thumbnail_url: "/jopt2025.png",
        tags: "토너먼트,국제,메인이벤트",
        published_at: "2025-01-15 10:00:00"
      },
      {
        title: "커뮤니티 정기 모임",
        slug: "community-meetup-march",
        content: `# 커뮤니티 정기 모임

포커 애호가들과 함께하는 정기 모임입니다.

## 모임 내용

- 포커 전략 토론
- 친목 도모
- 게임 실습

전략 공유와 친목을 도모하세요.`,
        start_date: "2025-08-25",
        end_date: "2025-08-25",
        status: "published",
        thumbnail_url: "/community.png",
        tags: "커뮤니티,모임,친목",
        published_at: "2025-08-01 14:30:00"
      },
      {
        title: "포커 전략 교육 세미나",
        slug: "strategy-seminar-2025",
        content: `# 포커 전략 교육 세미나

프로 포커 플레이어가 진행하는 고급 전략 세미나입니다.

## 세미나 커리큘럼

1. **기본 전략 리뷰**
2. **고급 베팅 패턴**
3. **심리전 기법**
4. **토너먼트 전략**

실력 향상의 기회를 놓치지 마세요.`,
        start_date: "2025-09-01",
        end_date: "2025-09-03",
        status: "published",
        thumbnail_url: "/event.png",
        tags: "교육,세미나,전략",
        published_at: "2025-08-10 09:00:00"
      }
    ];

    // 더미 데이터 추가 (총 23개)
    const additionalEvents = [];
    for (let i = 4; i <= 23; i++) {
      const isPublished = i <= 15; // 12개는 published, 나머지는 draft
      additionalEvents.push({
        title: `이벤트 ${i} - ${isPublished ? '발행됨' : '초안'}`,
        slug: `event-${i}`,
        content: `# 이벤트 ${i}\n\n이벤트 ${i}의 상세 내용입니다.\n\n## 주요 특징\n\n- 특징 1\n- 특징 2\n- 특징 3`,
        start_date: `2025-${String(Math.floor(Math.random() * 12) + 1).padStart(2, '0')}-${String(Math.floor(Math.random() * 28) + 1).padStart(2, '0')}`,
        end_date: `2025-${String(Math.floor(Math.random() * 12) + 1).padStart(2, '0')}-${String(Math.floor(Math.random() * 28) + 1).padStart(2, '0')}`,
        status: isPublished ? 'published' : 'draft',
        thumbnail_url: i % 3 === 0 ? '/event.png' : i % 3 === 1 ? '/community.png' : '/jopt2025.png',
        tags: `태그${i},이벤트`,
        published_at: isPublished ? `2025-0${Math.floor(Math.random() * 8) + 1}-${String(Math.floor(Math.random() * 28) + 1).padStart(2, '0')} ${String(Math.floor(Math.random() * 24)).padStart(2, '0')}:${String(Math.floor(Math.random() * 60)).padStart(2, '0')}:00` : null
      });
    }

    const allEvents = [...dummyEvents, ...additionalEvents];

    this.db.get("SELECT COUNT(*) as count FROM events", (err, row) => {
      if (err) {
        console.error('이벤트 수 확인 실패:', err.message);
        return;
      }

      if (row.count === 0) {
        const stmt = this.db.prepare(`
          INSERT INTO events (title, slug, content, start_date, end_date, status, thumbnail_url, tags, published_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        allEvents.forEach(event => {
          stmt.run([
            event.title,
            event.slug,
            event.content,
            event.start_date,
            event.end_date,
            event.status,
            event.thumbnail_url,
            event.tags,
            event.published_at
          ]);
        });

        stmt.finalize();
        console.log('더미 이벤트 데이터가 삽입되었습니다.');
      }
    });
  }

  // 이벤트 조회 (페이지네이션, 필터링 포함)
  getEvents(params, callback) {
    const {
      status = '',
      search = '',
      page = 1,
      pageSize = 12,
      from = '',
      to = '',
      sort = 'published_at',
      order = 'desc'
    } = params;

    let query = 'SELECT * FROM events WHERE 1=1';
    const queryParams = [];

    if (status) {
      query += ' AND status = ?';
      queryParams.push(status);
    }

    if (search) {
      query += ' AND title LIKE ?';
      queryParams.push(`%${search}%`);
    }

    if (from && to) {
      query += ' AND ((start_date <= ? AND end_date >= ?) OR (start_date >= ? AND start_date <= ?))';
      queryParams.push(to, from, from, to);
    }

    const validSorts = ['title', 'start_date', 'end_date', 'status', 'published_at', 'created_at'];
    const validOrders = ['asc', 'desc'];
    
    if (validSorts.includes(sort) && validOrders.includes(order.toLowerCase())) {
      query += ` ORDER BY ${sort} ${order.toUpperCase()}`;
    } else {
      query += ' ORDER BY published_at DESC';
    }

    // 페이지네이션
    const offset = (page - 1) * pageSize;
    query += ' LIMIT ? OFFSET ?';
    queryParams.push(pageSize, offset);

    this.db.all(query, queryParams, callback);
  }

  // 총 개수 조회
  getEventsCount(params, callback) {
    const { status = '', search = '', from = '', to = '' } = params;

    let query = 'SELECT COUNT(*) as count FROM events WHERE 1=1';
    const queryParams = [];

    if (status) {
      query += ' AND status = ?';
      queryParams.push(status);
    }

    if (search) {
      query += ' AND title LIKE ?';
      queryParams.push(`%${search}%`);
    }

    if (from && to) {
      query += ' AND ((start_date <= ? AND end_date >= ?) OR (start_date >= ? AND start_date <= ?))';
      queryParams.push(to, from, from, to);
    }

    this.db.get(query, queryParams, callback);
  }

  // 이벤트 단일 조회
  getEventById(id, callback) {
    this.db.get('SELECT * FROM events WHERE id = ?', [id], callback);
  }

  getEventBySlug(slug, callback) {
    this.db.get('SELECT * FROM events WHERE slug = ?', [slug], callback);
  }

  // 이벤트 생성
  createEvent(eventData, callback) {
    const {
      title, slug, content, content_format = 'markdown',
      start_date, end_date, status = 'draft',
      thumbnail_url, tags
    } = eventData;

    const published_at = status === 'published' ? new Date().toISOString() : null;

    this.db.run(`
      INSERT INTO events (title, slug, content, content_format, start_date, end_date, status, thumbnail_url, tags, published_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [title, slug, content, content_format, start_date, end_date, status, thumbnail_url, tags, published_at], function(err) {
      callback(err, err ? null : { id: this.lastID });
    });
  }

  // 이벤트 수정
  updateEvent(id, eventData, callback) {
    const {
      title, slug, content, content_format,
      start_date, end_date, status,
      thumbnail_url, tags
    } = eventData;

    const published_at = status === 'published' ? new Date().toISOString() : null;

    this.db.run(`
      UPDATE events 
      SET title = ?, slug = ?, content = ?, content_format = ?, 
          start_date = ?, end_date = ?, status = ?, 
          thumbnail_url = ?, tags = ?, published_at = ?
      WHERE id = ?
    `, [title, slug, content, content_format, start_date, end_date, status, thumbnail_url, tags, published_at, id], function(err) {
      callback(err, err ? null : { changes: this.changes });
    });
  }

  // 이벤트 삭제
  deleteEvent(id, callback) {
    this.db.run('DELETE FROM events WHERE id = ?', [id], function(err) {
      callback(err, err ? null : { changes: this.changes });
    });
  }

  close() {
    this.db.close();
  }
}

module.exports = Database;