const express = require('express');
const path = require('path');
const session = require('express-session');
const bcrypt = require('bcrypt');
const { Pool, neonConfig } = require('@neondatabase/serverless');

// Configure WebSocket for Neon with proper settings
neonConfig.webSocketConstructor = require('ws');
neonConfig.useSecureWebSocket = true;

const app = express();

// Pool configuration with connection pooling and error handling
const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

// Add connection error handling
pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

// Test database connection
async function testConnection() {
  try {
    const client = await pool.connect();
    console.log('Database connection successful');
    client.release();
    return true;
  } catch (error) {
    console.error('Database connection failed:', error);
    return false;
  }
}

// CORS 및 캐시 설정
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  
  // 캐시 무효화 헤더 추가
  res.header('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.header('Pragma', 'no-cache');
  res.header('Expires', '0');
  
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// Serve public directory first, then root directory
app.use(express.static('public'));
app.use(express.static('.'));

app.use(session({
  secret: process.env.SESSION_SECRET || 'pokerplayer-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false,
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
  },
}));

// Auth middleware
const requireAuth = (req, res, next) => {
  if (req.session.adminId) {
    next();
  } else {
    res.redirect('/admin/login');
  }
};

// Create admin if not exists
async function initializeAdmin() {
  try {
    const result = await pool.query('SELECT COUNT(*) FROM admins');
    if (result.rows[0].count === '0') {
      const hashedPassword = await bcrypt.hash('admin123', 10);
      await pool.query(
        'INSERT INTO admins (username, password, email) VALUES ($1, $2, $3)',
        ['admin', hashedPassword, 'admin@pokerplayer.com']
      );
      console.log('기본 관리자 계정 생성: admin / admin123');
    }
  } catch (error) {
    console.error('Admin initialization error:', error);
  }
}

// Routes
app.get('/admin/login', (req, res) => {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache');
  
  const errorMessage = req.query.error ? '<div class="bg-red-600 text-white p-2 rounded mb-4 text-center">로그인 실패</div>' : '';
  
  const html = `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>관리자 로그인 - 포플</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-gray-900 min-h-screen flex items-center justify-center">
  <div class="bg-gray-800 p-8 rounded-lg w-96">
    <h1 class="text-2xl font-bold text-white mb-6 text-center">관리자 로그인</h1>
    ${errorMessage}
    <form action="/admin/login" method="POST">
      <div class="mb-4">
        <input type="text" name="username" placeholder="사용자명" required 
               class="w-full px-3 py-2 bg-gray-700 text-white rounded">
      </div>
      <div class="mb-6">
        <input type="password" name="password" placeholder="비밀번호" required 
               class="w-full px-3 py-2 bg-gray-700 text-white rounded">
      </div>
      <button type="submit" class="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded">
        로그인
      </button>
    </form>
    <p class="text-gray-400 text-sm mt-4 text-center">기본 계정: admin / admin123</p>
  </div>
</body>
</html>`;
  
  res.send(html);
});

app.post('/admin/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const result = await pool.query('SELECT * FROM admins WHERE username = $1', [username]);
    
    if (result.rows.length > 0) {
      const admin = result.rows[0];
      const isValid = await bcrypt.compare(password, admin.password);
      
      if (isValid) {
        req.session.adminId = admin.id;
        res.redirect('/admin');
        return;
      }
    }
    
    res.redirect('/admin/login?error=1');
  } catch (error) {
    console.error('Login error:', error);
    res.redirect('/admin/login?error=1');
  }
});

// 새로운 관리자 대시보드 페이지
app.get('/admin', requireAuth, (req, res) => {
  res.sendFile(path.resolve('./admin.html'));
});

// 기존 관리자 페이지는 /admin/old로 이동
app.get('/admin/old', requireAuth, async (req, res) => {
  try {
    const events = await pool.query('SELECT * FROM events ORDER BY created_at DESC');
    
    res.send(`
      <!DOCTYPE html>
      <html lang="ko">
      <head>
        <meta charset="utf-8" />
        <title>관리자 대시보드 - 포플</title>
        <script src="https://cdn.tailwindcss.com"></script>
      </head>
      <body class="bg-gray-900 text-white min-h-screen">
        <nav class="bg-gray-800 p-4">
          <div class="container mx-auto flex justify-between items-center">
            <h1 class="text-xl font-bold">포플 관리자</h1>
            <form action="/admin/logout" method="POST" class="inline">
              <button type="submit" class="bg-red-600 hover:bg-red-700 px-4 py-2 rounded">로그아웃</button>
            </form>
          </div>
        </nav>
        
        <div class="container mx-auto p-6">
          <div class="flex justify-between items-center mb-6">
            <h2 class="text-2xl font-bold">이벤트 관리</h2>
            <a href="/admin/events/new" class="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded">새 이벤트 추가</a>
          </div>
          
          <div class="grid gap-4">
            ${events.rows.map(event => `
              <div class="bg-gray-800 p-4 rounded-lg">
                <div class="flex justify-between items-start">
                  <div class="flex-1">
                    <h3 class="text-lg font-semibold">${event.title}</h3>
                    <p class="text-gray-400">${event.description || ''}</p>
                    <p class="text-sm text-gray-500">
                      ${event.event_date ? new Date(event.event_date).toLocaleDateString('ko-KR') : ''}
                      ${event.location ? ' | ' + event.location : ''}
                    </p>
                    ${event.image_url ? `<img src="${event.image_url}" class="mt-2 w-32 h-20 object-cover rounded">` : ''}
                  </div>
                  <div class="flex gap-2 ml-4">
                    <a href="/admin/events/${event.id}/edit" class="bg-yellow-600 hover:bg-yellow-700 px-3 py-1 rounded text-sm">수정</a>
                    <form action="/admin/events/${event.id}/delete" method="POST" class="inline">
                      <button type="submit" onclick="return confirm('정말 삭제하시겠습니까?')" 
                              class="bg-red-600 hover:bg-red-700 px-3 py-1 rounded text-sm">삭제</button>
                    </form>
                  </div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      </body>
      </html>
    `);
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).send('서버 오류가 발생했습니다.');
  }
});

app.get('/admin/events/new', requireAuth, (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="ko">
    <head>
      <meta charset="utf-8" />
      <title>새 이벤트 추가 - 포플 관리자</title>
      <script src="https://cdn.tailwindcss.com"></script>
    </head>
    <body class="bg-gray-900 text-white min-h-screen">
      <nav class="bg-gray-800 p-4">
        <div class="container mx-auto">
          <a href="/admin" class="text-blue-400 hover:text-blue-300">← 관리자 대시보드</a>
        </div>
      </nav>
      
      <div class="container mx-auto p-6 max-w-2xl">
        <h1 class="text-2xl font-bold mb-6">새 이벤트 추가</h1>
        
        <form action="/admin/events" method="POST" class="space-y-4">
          <div>
            <label class="block text-sm font-medium mb-2">제목</label>
            <input type="text" name="title" required 
                   class="w-full px-3 py-2 bg-gray-800 text-white border border-gray-600 rounded">
          </div>
          
          <div>
            <label class="block text-sm font-medium mb-2">설명</label>
            <textarea name="description" rows="4" 
                      class="w-full px-3 py-2 bg-gray-800 text-white border border-gray-600 rounded"></textarea>
          </div>
          
          <div>
            <label class="block text-sm font-medium mb-2">이미지 URL</label>
            <input type="url" name="imageUrl" 
                   class="w-full px-3 py-2 bg-gray-800 text-white border border-gray-600 rounded">
          </div>
          
          <div>
            <label class="block text-sm font-medium mb-2">이벤트 날짜</label>
            <input type="date" name="eventDate" 
                   class="w-full px-3 py-2 bg-gray-800 text-white border border-gray-600 rounded">
          </div>
          
          <div>
            <label class="block text-sm font-medium mb-2">장소</label>
            <input type="text" name="location" 
                   class="w-full px-3 py-2 bg-gray-800 text-white border border-gray-600 rounded">
          </div>
          
          <div class="flex gap-4">
            <button type="submit" class="bg-blue-600 hover:bg-blue-700 px-6 py-2 rounded">저장</button>
            <a href="/admin" class="bg-gray-600 hover:bg-gray-700 px-6 py-2 rounded">취소</a>
          </div>
        </form>
      </div>
    </body>
    </html>
  `);
});

app.post('/admin/events', requireAuth, async (req, res) => {
  try {
    const { title, description, imageUrl, eventDate, location } = req.body;
    
    console.log('Creating event:', { title, description, imageUrl, eventDate, location });
    
    await pool.query(
      'INSERT INTO events (title, description, image_url, event_date, location, is_active) VALUES ($1, $2, $3, $4, $5, $6)',
      [title, description, imageUrl || null, eventDate || null, location, true]
    );
    
    // JSON 응답으로 성공 반환
    if (req.headers['content-type'] === 'application/x-www-form-urlencoded') {
      res.json({ success: true, message: '이벤트가 성공적으로 추가되었습니다.' });
    } else {
      res.redirect('/admin');
    }
  } catch (error) {
    console.error('Create event error:', error);
    if (req.headers['content-type'] === 'application/x-www-form-urlencoded') {
      res.status(500).json({ success: false, message: '이벤트 생성 중 오류가 발생했습니다.' });
    } else {
      res.status(500).send('이벤트 생성 중 오류가 발생했습니다.');
    }
  }
});

app.post('/admin/events/:id/delete', requireAuth, async (req, res) => {
  try {
    await pool.query('DELETE FROM events WHERE id = $1', [req.params.id]);
    res.json({ success: true, message: '이벤트가 삭제되었습니다.' });
  } catch (error) {
    console.error('Delete event error:', error);
    res.status(500).json({ success: false, message: '이벤트 삭제 중 오류가 발생했습니다.' });
  }
});

app.post('/admin/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/admin/login');
  });
});

// API endpoint for frontend
app.get('/api/events', async (req, res) => {
  try {
    const events = await pool.query('SELECT * FROM events WHERE is_active = true ORDER BY event_date DESC');
    res.json(events.rows);
  } catch (error) {
    console.error('Get events error:', error);
    res.status(500).json({ error: '이벤트를 불러오는 중 오류가 발생했습니다.' });
  }
});

const PORT = process.env.PORT || 5000;

// Initialize database and start server
async function start() {
  try {
    console.log('Starting admin server...');
    
    // Test database connection first
    const connectionOk = await testConnection();
    if (!connectionOk) {
      console.error('Cannot start server: Database connection failed');
      process.exit(1);
    }
    
    // Create tables if they don't exist
    console.log('Creating database tables...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS sessions (
        sid VARCHAR PRIMARY KEY,
        sess JSON NOT NULL,
        expire TIMESTAMP NOT NULL
      );
      
      CREATE INDEX IF NOT EXISTS IDX_session_expire ON sessions (expire);
      
      CREATE TABLE IF NOT EXISTS admins (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        username VARCHAR(50) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        email VARCHAR UNIQUE,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
      
      CREATE TABLE IF NOT EXISTS events (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        title VARCHAR(200) NOT NULL,
        description TEXT,
        image_url VARCHAR,
        event_date TIMESTAMP,
        location VARCHAR(200),
        is_active BOOLEAN DEFAULT true,
        created_by VARCHAR REFERENCES admins(id),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);
    
    console.log('Database tables ready');
    await initializeAdmin();
    
    // 메인 사이트 루트 라우트 추가
    app.get('/', (req, res) => {
      res.sendFile(path.resolve('./index.html'));
    });

    app.listen(PORT, '0.0.0.0', () => {
      console.log(`관리자 서버가 포트 ${PORT}에서 실행 중입니다`);
      console.log(`메인 사이트: http://localhost:${PORT}/`);
      console.log(`관리자 페이지: http://localhost:${PORT}/admin`);
    });
  } catch (error) {
    console.error('서버 시작 오류:', error);
    process.exit(1);
  }
}

start();