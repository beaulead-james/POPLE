const express = require('express');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const path = require('path');
const fs = require('fs');
const Database = require('./db');

const app = express();
const PORT = process.env.PORT || 5000;

// 환경변수 설정 (기본값)
const ADMIN_USER = process.env.ADMIN_USER || 'admin';
const ADMIN_PASS = process.env.ADMIN_PASS || 'admin123!';
const SESSION_SECRET = process.env.SESSION_SECRET || 'poker-admin-secret-key';

// 데이터베이스 초기화
const db = new Database();

// Analytics 초기화 (데이터베이스 준비 후)
const analytics = require('./server/analytics');

// 미들웨어 설정
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// 세션 설정
app.use(session({
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false, // HTTPS에서는 true로 설정
    maxAge: 2 * 60 * 60 * 1000, // 2시간
  }
}));

// 정적 파일 서빙 (캐시 제어)
const buildTime = Date.now();
app.use('/static', express.static(path.join(__dirname, 'public'), {
  setHeaders: (res, path) => {
    if (path.endsWith('.css') || path.endsWith('.js')) {
      res.set('Cache-Control', 'public, max-age=31536000'); // 1년
    }
  }
}));

app.use(express.static(path.join(__dirname, 'public')));

// Analytics middleware 추가 (세션 설정 이후)
app.use(analytics.analyticsMiddleware());
app.use('/admin/analytics/api', analytics.analyticsRouter);
console.log('SQLite 접속 통계 기능이 활성화되었습니다.');

// 로그인 확인 미들웨어
const requireAuth = (req, res, next) => {
  if (req.session && req.session.isAuthenticated) {
    next();
  } else {
    res.status(401).json({ error: true, message: '로그인이 필요합니다.' });
  }
};

// 라우트 설정

// 메인 페이지
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 관리자 문의 페이지
app.get('/admin-contacts.html', (req, res) => {
  if (req.session && req.session.isAuthenticated) {
    res.sendFile(path.join(__dirname, 'public', 'admin-contacts.html'));
  } else {
    res.redirect('/admin/login');
  }
});

// 관리자 로그인 페이지
app.get('/admin/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin-login.html'));
});

// 접속 통계 페이지 (세션 로그인 필요)
app.get('/admin/analytics', (req, res) => {
  if (req.session && req.session.isAuthenticated) {
    res.sendFile(path.join(__dirname, 'public', 'admin-analytics.html'));
  } else {
    res.redirect('/admin/login');
  }
});

// 관리자 페이지  
app.get('/admin', (req, res) => {
  if (req.session && req.session.isAuthenticated) {
    res.sendFile(path.join(__dirname, 'public', 'admin.html'));
  } else {
    res.redirect('/admin/login');
  }
});

// 로그인 처리
app.post('/admin/login', (req, res) => {
  const { username, password } = req.body;
  
  if (username === ADMIN_USER && password === ADMIN_PASS) {
    req.session.isAuthenticated = true;
    req.session.username = username;
    res.redirect('/admin');
  } else {
    res.send(`
      <!DOCTYPE html>
      <html lang="ko">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>로그인 실패 - PO+PLE</title>
        <script src="https://cdn.tailwindcss.com"></script>
      </head>
      <body class="bg-gray-100 min-h-screen flex items-center justify-center">
        <div class="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
          <div class="text-center mb-6">
            <div class="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
              <svg class="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h1 class="text-2xl font-bold text-gray-900">로그인 실패</h1>
            <p class="text-gray-600 mt-2">사용자명 또는 비밀번호가 올바르지 않습니다.</p>
          </div>
          <a href="/admin" class="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition duration-200 text-center block">
            다시 시도
          </a>
        </div>
      </body>
      </html>
    `);
  }
});

// 로그아웃
app.post('/admin/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/admin');
});

// API 라우트들

// 이벤트 목록 조회 (공개)
app.get('/api/events', (req, res) => {
  const params = {
    status: req.query.status || '',
    search: req.query.search || '',
    page: parseInt(req.query.page) || 1,
    pageSize: parseInt(req.query.pageSize) || 12,
    from: req.query.from || '',
    to: req.query.to || '',
    sort: req.query.sort || 'published_at',
    order: req.query.order || 'desc'
  };

  db.getEvents(params, (err, events) => {
    if (err) {
      res.status(500).json({ error: true, message: '이벤트를 불러올 수 없습니다.' });
      return;
    }

    db.getEventsCount(params, (countErr, countResult) => {
      if (countErr) {
        res.status(500).json({ error: true, message: '이벤트 개수를 불러올 수 없습니다.' });
        return;
      }

      res.json({
        events,
        pagination: {
          page: params.page,
          pageSize: params.pageSize,
          total: countResult.count,
          totalPages: Math.ceil(countResult.count / params.pageSize)
        }
      });
    });
  });
});

// 이벤트 단일 조회 (공개)
app.get('/api/events/:id', (req, res) => {
  const id = parseInt(req.params.id);
  
  if (isNaN(id)) {
    res.status(400).json({ error: true, message: '유효하지 않은 이벤트 ID입니다.' });
    return;
  }

  db.getEventById(id, (err, event) => {
    if (err) {
      res.status(500).json({ error: true, message: '이벤트를 불러올 수 없습니다.' });
      return;
    }

    if (!event) {
      res.status(404).json({ error: true, message: '이벤트를 찾을 수 없습니다.' });
      return;
    }

    res.json(event);
  });
});

// 슬러그로 이벤트 조회 (공개)
app.get('/api/events/slug/:slug', (req, res) => {
  const slug = req.params.slug;

  db.getEventBySlug(slug, (err, event) => {
    if (err) {
      res.status(500).json({ error: true, message: '이벤트를 불러올 수 없습니다.' });
      return;
    }

    if (!event) {
      res.status(404).json({ error: true, message: '이벤트를 찾을 수 없습니다.' });
      return;
    }

    res.json(event);
  });
});

// 이벤트 생성 (관리자 전용)
app.post('/api/events', requireAuth, (req, res) => {
  const { title, slug, content, content_format, start_date, end_date, status, thumbnail_url, tags } = req.body;

  // 필수 필드 검증
  if (!title || !content || !start_date || !end_date) {
    res.status(400).json({ 
      error: true, 
      message: '제목, 내용, 시작일, 종료일은 필수 항목입니다.' 
    });
    return;
  }

  // 날짜 검증
  if (new Date(start_date) > new Date(end_date)) {
    res.status(400).json({ 
      error: true, 
      message: '시작일은 종료일보다 이전이어야 합니다.' 
    });
    return;
  }

  const eventData = {
    title, slug, content, content_format, start_date, end_date, status, thumbnail_url, tags
  };

  db.createEvent(eventData, (err, result) => {
    if (err) {
      if (err.code === 'SQLITE_CONSTRAINT' && err.message.includes('slug')) {
        res.status(400).json({ error: true, message: '이미 사용 중인 슬러그입니다.' });
      } else {
        res.status(500).json({ error: true, message: '이벤트 생성에 실패했습니다.' });
      }
      return;
    }

    res.status(201).json({ success: true, id: result.id, message: '이벤트가 생성되었습니다.' });
  });
});

// 이벤트 수정 (관리자 전용)
app.put('/api/events/:id', requireAuth, (req, res) => {
  const id = parseInt(req.params.id);
  const { title, slug, content, content_format, start_date, end_date, status, thumbnail_url, tags } = req.body;

  if (isNaN(id)) {
    res.status(400).json({ error: true, message: '유효하지 않은 이벤트 ID입니다.' });
    return;
  }

  // 필수 필드 검증
  if (!title || !content || !start_date || !end_date) {
    res.status(400).json({ 
      error: true, 
      message: '제목, 내용, 시작일, 종료일은 필수 항목입니다.' 
    });
    return;
  }

  // 날짜 검증
  if (new Date(start_date) > new Date(end_date)) {
    res.status(400).json({ 
      error: true, 
      message: '시작일은 종료일보다 이전이어야 합니다.' 
    });
    return;
  }

  const eventData = {
    title, slug, content, content_format, start_date, end_date, status, thumbnail_url, tags
  };

  db.updateEvent(id, eventData, (err, result) => {
    if (err) {
      if (err.code === 'SQLITE_CONSTRAINT' && err.message.includes('slug')) {
        res.status(400).json({ error: true, message: '이미 사용 중인 슬러그입니다.' });
      } else {
        res.status(500).json({ error: true, message: '이벤트 수정에 실패했습니다.' });
      }
      return;
    }

    if (result.changes === 0) {
      res.status(404).json({ error: true, message: '이벤트를 찾을 수 없습니다.' });
      return;
    }

    res.json({ success: true, message: '이벤트가 수정되었습니다.' });
  });
});

// 이벤트 삭제 (관리자 전용)
app.delete('/api/events/:id', requireAuth, (req, res) => {
  const id = parseInt(req.params.id);

  if (isNaN(id)) {
    res.status(400).json({ error: true, message: '유효하지 않은 이벤트 ID입니다.' });
    return;
  }

  db.deleteEvent(id, (err, result) => {
    if (err) {
      res.status(500).json({ error: true, message: '이벤트 삭제에 실패했습니다.' });
      return;
    }

    if (result.changes === 0) {
      res.status(404).json({ error: true, message: '이벤트를 찾을 수 없습니다.' });
      return;
    }

    res.json({ success: true, message: '이벤트가 삭제되었습니다.' });
  });
});

// 이벤트 상세 페이지 (슬러그 또는 ID)
app.get('/event/:identifier', (req, res) => {
  const identifier = req.params.identifier;
  const isNumeric = /^\d+$/.test(identifier);

  const callback = (err, event) => {
    if (err) {
      res.status(500).send('서버 오류가 발생했습니다.');
      return;
    }

    if (!event) {
      res.status(404).send('이벤트를 찾을 수 없습니다.');
      return;
    }

    // 간단한 이벤트 상세 페이지 HTML
    const html = `
      <!DOCTYPE html>
      <html lang="ko">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>${event.title} - PO+PLE</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>
      </head>
      <body class="bg-slate-900 text-white min-h-screen">
        <div class="container mx-auto px-4 py-8">
          <div class="max-w-4xl mx-auto">
            <div class="mb-8">
              <a href="/" class="text-blue-400 hover:text-blue-300 transition-colors">← 홈으로 돌아가기</a>
            </div>
            <article class="bg-white/5 backdrop-blur-md rounded-3xl border border-white/10 overflow-hidden">
              ${event.thumbnail_url ? `<img src="${event.thumbnail_url}" alt="${event.title}" class="w-full h-64 object-cover">` : ''}
              <div class="p-8">
                <div class="flex items-center gap-4 mb-6">
                  <span class="px-3 py-1 bg-blue-500/20 text-blue-300 rounded-full text-sm font-medium">${event.status === 'published' ? '진행중' : '예정'}</span>
                  <span class="text-gray-400 text-sm">${event.start_date} ~ ${event.end_date}</span>
                </div>
                <h1 class="text-4xl font-bold text-white mb-6">${event.title}</h1>
                <div id="content" class="prose prose-invert max-w-none"></div>
                ${event.tags ? `
                <div class="flex flex-wrap gap-2 mt-8 pt-6 border-t border-white/10">
                  ${event.tags.split(',').map(tag => `<span class="px-3 py-1 bg-purple-500/20 text-purple-300 rounded-full text-sm">#${tag.trim()}</span>`).join('')}
                </div>
                ` : ''}
              </div>
            </article>
          </div>
        </div>
        <script>
          document.getElementById('content').innerHTML = marked.parse(\`${event.content.replace(/`/g, '\\`')}\`);
        </script>
      </body>
      </html>
    `;

    res.send(html);
  };

  if (isNumeric) {
    db.getEventById(parseInt(identifier), callback);
  } else {
    db.getEventBySlug(identifier, callback);
  }
});

// === ADMIN UPLOAD START ===
const multer = require('multer');
const uploadDir = path.join(__dirname, 'public', 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB 제한
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('이미지 파일만 업로드 가능합니다.'));
    }
  }
});

app.post('/admin/upload', requireAuth, upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: true, message: '파일이 선택되지 않았습니다.' });
    }
    
    const fileUrl = '/uploads/' + req.file.filename;
    console.log(`파일 업로드 완료: ${req.file.filename}`);
    res.json({ ok: true, url: fileUrl });
  } catch (error) {
    console.error('파일 업로드 오류:', error);
    res.status(500).json({ error: true, message: '파일 업로드 중 오류가 발생했습니다.' });
  }
});
// === ADMIN UPLOAD END ===

// === CONTACT API START ===
const CONTACTS_FILE = path.join(__dirname, 'contacts.json');

function readContacts() {
  try {
    return JSON.parse(fs.readFileSync(CONTACTS_FILE, 'utf-8'));
  } catch (e) {
    return [];
  }
}

function writeContacts(list) {
  fs.writeFileSync(CONTACTS_FILE, JSON.stringify(list, null, 2));
}

// 파일 초기화
if (!fs.existsSync(CONTACTS_FILE)) {
  writeContacts([]);
}

// 문의 접수 API (공개)
app.post('/api/contact', (req, res) => {
  const { name, email, message } = req.body || {};
  
  if (!name || !email || !message) {
    return res.status(400).json({ error: true, message: 'name, email, message는 필수입니다.' });
  }

  try {
    const list = readContacts();
    const id = list.length ? list[list.length-1].id + 1 : 1;
    const item = { 
      id, 
      name: name.trim(), 
      email: email.trim(), 
      message: message.trim(), 
      created_at: new Date().toISOString() 
    };
    
    list.push(item);
    writeContacts(list);
    
    console.log(`새 문의 접수: ${name} <${email}>`);
    res.json({ ok: true, id, message: '문의가 성공적으로 접수되었습니다.' });
  } catch (error) {
    console.error('문의 접수 오류:', error);
    res.status(500).json({ error: true, message: '문의 접수 중 오류가 발생했습니다.' });
  }
});

// 관리자 문의 목록 API (인증 필요)
app.get('/admin/api/contacts', requireAuth, (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page || '1', 10));
    const pageSize = Math.max(1, Math.min(100, parseInt(req.query.pageSize || '20', 10)));
    
    const list = readContacts().sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    const start = (page - 1) * pageSize;
    const items = list.slice(start, start + pageSize);
    
    res.json({ page, pageSize, total: list.length, items });
  } catch (error) {
    console.error('문의 목록 조회 오류:', error);
    res.status(500).json({ error: true, message: '문의 목록을 불러올 수 없습니다.' });
  }
});
// === CONTACT API END ===

// 에러 핸들링
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: true, message: '서버 오류가 발생했습니다.' });
});

// 404 핸들링
app.use((req, res) => {
  res.status(404).json({ error: true, message: '페이지를 찾을 수 없습니다.' });
});

// 서버 종료 시 데이터베이스 연결 해제
process.on('SIGINT', () => {
  console.log('\n서버를 종료합니다...');
  db.close();
  process.exit(0);
});

// 서버 시작
app.listen(PORT, () => {
  console.log(`이벤트 관리 서버가 포트 ${PORT}에서 실행 중입니다.`);
  console.log(`메인 사이트: http://localhost:${PORT}/`);
  console.log(`관리자 페이지: http://localhost:${PORT}/admin`);
  console.log(`관리자 계정: ${ADMIN_USER} / ${ADMIN_PASS}`);
});