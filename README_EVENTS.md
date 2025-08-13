# 이벤트 관리 시스템 사용 가이드

Node.js + Express + SQLite로 구현된 이벤트 관리 시스템입니다.

## 📁 파일 구조

```
├── server.js              # REST API 서버 및 정적 파일 서빙
├── db.js                  # SQLite 데이터베이스 초기화 및 헬퍼 함수들
├── public/
│   ├── index.html         # 메인 사이트 (이벤트 카드 섹션 포함)
│   ├── events.js          # 공개용: API에서 이벤트 로드 및 카드 렌더링
│   ├── admin.html         # 관리자 페이지 (이벤트 관리 UI)
│   ├── admin.js           # 관리자 페이지 로직
│   └── styles.css         # 공통 스타일
└── events.db              # SQLite 데이터베이스 파일 (자동 생성)
```

## 🚀 실행 방법

### 1. 서버 실행

```bash
node server.js
```

서버가 정상 실행되면 다음과 같은 메시지가 표시됩니다:

```
Connected to SQLite database
Events table ready  
Events index created
Sample events created successfully
서버가 포트 3000에서 실행 중입니다
메인 사이트: http://localhost:3000/
관리자 페이지: http://localhost:3000/admin.html
API 엔드포인트: http://localhost:3000/api/events
ADMIN_TOKEN: default_admin_token_123
```

### 2. 접속 URL

- **메인 사이트**: http://localhost:3000/
- **관리자 페이지**: http://localhost:3000/admin.html
- **API 엔드포인트**: http://localhost:3000/api/events

## 🗄️ 데이터베이스 구조

### events 테이블

| 컬럼명 | 타입 | 설명 | 제약조건 |
|--------|------|------|----------|
| id | INTEGER | 기본키 | PRIMARY KEY, AUTOINCREMENT |
| title | TEXT | 이벤트 제목 | NOT NULL |
| description | TEXT | 이벤트 설명 | NULL 허용 |
| image_url | TEXT | 이미지 URL | NULL 허용 |
| start_at | TEXT | 시작일 (YYYY-MM-DD) | NULL 허용 |
| end_at | TEXT | 종료일 (YYYY-MM-DD) | NULL 허용 |
| is_active | INTEGER | 활성화 상태 (1/0) | DEFAULT 1 |
| created_at | DATETIME | 생성일시 | DEFAULT CURRENT_TIMESTAMP |
| updated_at | DATETIME | 수정일시 | DEFAULT CURRENT_TIMESTAMP |

**인덱스**: `idx_events_active` (is_active 컬럼에 인덱스 생성)

## 🔌 REST API

### GET /api/events
이벤트 목록을 조회합니다.

**쿼리 파라미터:**
- `active`: 활성화 상태 필터 (1 또는 0)
- `limit`: 조회할 최대 개수

**예시:**
```bash
# 활성화된 이벤트 12개 조회
curl "http://localhost:3000/api/events?active=1&limit=12"

# 모든 이벤트 조회  
curl "http://localhost:3000/api/events"
```

**응답 예시:**
```json
[
  {
    "id": 1,
    "title": "JOPT 2025 온라인 새틀라이트",
    "description": "제주 오픈 포커 토너먼트 온라인 새틀라이트에 참가하세요.",
    "image_url": "jopt2025.png",
    "start_at": "2025-05-29",
    "end_at": "2025-06-04", 
    "is_active": 1,
    "created_at": "2025-08-11 02:45:58",
    "updated_at": "2025-08-11 02:45:58"
  }
]
```

### POST /api/events
새 이벤트를 추가합니다. (관리자 인증 필요)

**헤더:**
```
Authorization: Bearer <ADMIN_TOKEN>
Content-Type: application/json
```

**요청 본문:**
```json
{
  "title": "이벤트 제목",          // 필수
  "description": "이벤트 설명",    // 선택
  "image_url": "이미지URL",       // 선택
  "start_at": "2025-08-15",      // 선택 (YYYY-MM-DD)
  "end_at": "2025-08-20",        // 선택 (YYYY-MM-DD)
  "is_active": true              // 선택 (기본값: true)
}
```

**예시:**
```bash
curl -X POST "http://localhost:3000/api/events" \
  -H "Authorization: Bearer default_admin_token_123" \
  -H "Content-Type: application/json" \
  -d '{"title":"새 이벤트","description":"테스트 이벤트입니다","is_active":true}'
```

### DELETE /api/events/:id
이벤트를 삭제합니다. (관리자 인증 필요)

**헤더:**
```
Authorization: Bearer <ADMIN_TOKEN>
```

**예시:**
```bash
curl -X DELETE "http://localhost:3000/api/events/1" \
  -H "Authorization: Bearer default_admin_token_123"
```

## 🔐 관리자 인증

### 1. ADMIN_TOKEN 설정 (중요!)

보안을 위해 환경변수로 관리자 토큰을 설정하세요:

**Replit Secrets에서 설정:**
1. Replit 사이드바에서 "Secrets" 탭 클릭
2. 새 시크릿 추가: 
   - Key: `ADMIN_TOKEN`
   - Value: `your_secure_admin_token_here` (원하는 토큰 값으로 변경)

**또는 환경변수로 설정:**
```bash
export ADMIN_TOKEN="your_secure_admin_token_here"
node server.js
```

**기본 토큰**: 환경변수가 없으면 `default_admin_token_123`이 사용됩니다 (개발용)

### 2. 관리자 페이지 사용법

1. **http://localhost:3000/admin.html** 접속
2. **관리자 토큰 입력**: ADMIN_TOKEN 값을 입력하고 "인증" 클릭
3. **인증 성공**: 관리자 기능이 활성화됩니다
4. **토큰 저장**: 브라우저 로컬스토리지에 안전하게 저장됩니다

## 📋 테스트 시나리오

### 1. 기본 시나리오
1. 서버 실행 → 데모 시드 데이터 2건 자동 생성
2. 메인 사이트(http://localhost:3000/) 접속 → 이벤트 카드 섹션에서 이벤트 확인
3. 관리자 페이지(http://localhost:3000/admin.html) 접속
4. ADMIN_TOKEN으로 인증 → 이벤트 목록 확인
5. 새 이벤트 추가 → 메인 사이트에서 노출 확인
6. 이벤트 삭제 → 메인 사이트에서 제거 확인

### 2. API 테스트
```bash
# 1. 활성 이벤트 조회
curl "http://localhost:3000/api/events?active=1&limit=12"

# 2. 이벤트 추가 (관리자 인증 필요)
curl -X POST "http://localhost:3000/api/events" \
  -H "Authorization: Bearer default_admin_token_123" \
  -H "Content-Type: application/json" \
  -d '{"title":"API 테스트 이벤트","description":"curl로 추가한 이벤트","is_active":true}'

# 3. 이벤트 삭제 (관리자 인증 필요) 
curl -X DELETE "http://localhost:3000/api/events/3" \
  -H "Authorization: Bearer default_admin_token_123"
```

### 3. 오류 처리 테스트
```bash
# 1. 인증 없이 이벤트 추가 시도 (401 에러 예상)
curl -X POST "http://localhost:3000/api/events" \
  -H "Content-Type: application/json" \
  -d '{"title":"테스트"}'

# 2. 잘못된 토큰으로 시도 (401 에러 예상)
curl -X POST "http://localhost:3000/api/events" \
  -H "Authorization: Bearer wrong_token" \
  -H "Content-Type: application/json" \
  -d '{"title":"테스트"}'

# 3. 제목 없이 이벤트 추가 시도 (422 에러 예상)
curl -X POST "http://localhost:3000/api/events" \
  -H "Authorization: Bearer default_admin_token_123" \
  -H "Content-Type: application/json" \
  -d '{"description":"제목 없는 이벤트"}'
```

## ✨ 주요 기능

### 프론트엔드 (메인 사이트)
- ✅ 기존 index.html의 Gallery 섹션을 동적 이벤트 카드로 교체
- ✅ 3열 그리드 레이아웃 (모바일에서는 1열)
- ✅ 반응형 디자인 with Tailwind CSS
- ✅ 자동 이미지 오류 처리
- ✅ 로딩 및 에러 상태 표시
- ✅ 그라데이션 호버 효과

### 관리자 페이지
- ✅ 토큰 기반 인증 시스템
- ✅ 이벤트 추가 폼 (제목*, 설명, 이미지URL, 시작일, 종료일, 활성화 상태)
- ✅ 전체 이벤트 목록 테이블 
- ✅ 이벤트 삭제 기능 (확인 모달)
- ✅ 실시간 폼 검증
- ✅ 알림 메시지 시스템
- ✅ 로컬스토리지 토큰 저장

### 백엔드 (API)
- ✅ RESTful API 설계
- ✅ SQLite 데이터베이스 with 인덱싱
- ✅ Bearer 토큰 인증
- ✅ CORS 지원
- ✅ JSON 에러 응답
- ✅ 자동 날짜 파싱 (실패 시 null 저장)
- ✅ ID DESC 정렬
- ✅ 시드 데이터 자동 생성

## 🔧 환경 설정

### 필요한 Node.js 패키지
```json
{
  "dependencies": {
    "express": "^4.x.x",
    "sqlite3": "^5.x.x" 
  }
}
```

### 포트 설정
- **기본 포트**: 3000
- **환경변수**: `PORT=3000 node server.js`
- **Replit**: 자동으로 적절한 포트 할당

## 🚨 중요 참고사항

1. **보안**: 운영환경에서는 반드시 강력한 ADMIN_TOKEN 설정
2. **데이터베이스**: SQLite 파일이 자동 생성되므로 백업 계획 수립
3. **이미지**: 이미지 URL은 상대경로 또는 절대경로 모두 가능
4. **날짜**: 잘못된 날짜 형식은 null로 저장됨
5. **CORS**: 모든 오리진에 대해 허용됨 (개발용)

## 📈 확장 가능성

- 이벤트 수정(UPDATE) API 추가
- 이미지 업로드 기능
- 페이지네이션
- 카테고리/태그 시스템  
- 사용자별 권한 관리
- 이벤트 조회수 통계
- 이메일 알림 기능