import express from 'express';
import session from 'express-session';
import connectPg from 'connect-pg-simple';
import path from 'path';
import { authService } from './auth';
import { eventService } from './events';

const app = express();

// Session configuration
const PgSession = connectPg(session);
app.use(session({
  store: new PgSession({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: false,
    tableName: 'sessions',
  }),
  secret: process.env.SESSION_SECRET || 'pokerplayer-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false, // Set to true in production with HTTPS
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
  },
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('.'));

// Authentication middleware
const requireAuth = (req: any, res: any, next: any) => {
  if (req.session.adminId) {
    next();
  } else {
    res.status(401).json({ error: '로그인이 필요합니다' });
  }
};

// Routes
// Login page
app.get('/admin/login', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="ko">
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>관리자 로그인 - 포플(PO+PLE)</title>
      <script src="https://cdn.tailwindcss.com"></script>
    </head>
    <body class="bg-gray-900 min-h-screen flex items-center justify-center">
      <div class="bg-gray-800 p-8 rounded-lg shadow-lg w-96">
        <h1 class="text-2xl font-bold text-white mb-6 text-center">관리자 로그인</h1>
        <form action="/admin/login" method="POST">
          <div class="mb-4">
            <label class="block text-gray-300 text-sm font-bold mb-2">사용자명</label>
            <input type="text" name="username" required 
                   class="w-full px-3 py-2 bg-gray-700 text-white border border-gray-600 rounded focus:outline-none focus:border-blue-500">
          </div>
          <div class="mb-6">
            <label class="block text-gray-300 text-sm font-bold mb-2">비밀번호</label>
            <input type="password" name="password" required 
                   class="w-full px-3 py-2 bg-gray-700 text-white border border-gray-600 rounded focus:outline-none focus:border-blue-500">
          </div>
          <button type="submit" 
                  class="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
            로그인
          </button>
        </form>
      </div>
    </body>
    </html>
  `);
});

// Login POST
app.post('/admin/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const admin = await authService.validateAdmin(username, password);
    
    if (admin) {
      (req.session as any).adminId = admin.id;
      res.redirect('/admin');
    } else {
      res.redirect('/admin/login?error=1');
    }
  } catch (error) {
    console.error('Login error:', error);
    res.redirect('/admin/login?error=1');
  }
});

// Logout
app.post('/admin/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/admin/login');
  });
});

// Admin dashboard
app.get('/admin', requireAuth, async (req, res) => {
  try {
    const events = await eventService.getAllEvents();
    res.send(`
      <!DOCTYPE html>
      <html lang="ko">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>관리자 대시보드 - 포플(PO+PLE)</title>
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
            ${events.map(event => `
              <div class="bg-gray-800 p-4 rounded-lg">
                <div class="flex justify-between items-start">
                  <div>
                    <h3 class="text-lg font-semibold">${event.title}</h3>
                    <p class="text-gray-400">${event.description || ''}</p>
                    <p class="text-sm text-gray-500">
                      ${event.eventDate ? new Date(event.eventDate).toLocaleDateString('ko-KR') : ''}
                      ${event.location ? ' | ' + event.location : ''}
                    </p>
                  </div>
                  <div class="flex gap-2">
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

export default app;