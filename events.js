// 이벤트 API에서 데이터를 가져와서 카드를 렌더링하는 스크립트

class EventsManager {
  constructor() {
    this.container = document.getElementById('event-cards');
    this.apiUrl = '/api/events';
  }

  // API에서 이벤트 데이터 가져오기 (발행된 이벤트만)
  async fetchEvents() {
    try {
      const response = await fetch(`${this.apiUrl}?status=published&limit=12&sort=start_date&order=asc`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      return data.events || [];
    } catch (error) {
      console.error('Error fetching events:', error);
      return [];
    }
  }

  // 날짜 포맷팅 함수
  formatDate(dateString) {
    if (!dateString) return '';
    
    try {
      const date = new Date(dateString);
      const month = date.getMonth() + 1;
      const day = date.getDate();
      return `${month}/${day}`;
    } catch (error) {
      return dateString;
    }
  }

  // 날짜 범위 포맷팅
  formatDateRange(startDate, endDate) {
    const start = this.formatDate(startDate);
    const end = this.formatDate(endDate);
    
    if (start && end && start !== end) {
      return `${start} - ${end}`;
    } else if (start) {
      return start;
    } else if (end) {
      return end;
    }
    return '날짜 미정';
  }

  // 마크다운 콘텐츠에서 설명 추출
  extractDescription(content) {
    if (!content) return '';
    
    // 마크다운 헤더와 특수 문자 제거
    let description = content
      .replace(/^#+\s+/gm, '') // 헤더 제거
      .replace(/\*\*(.*?)\*\*/g, '$1') // 볼드 제거
      .replace(/\*(.*?)\*/g, '$1') // 이탤릭 제거
      .replace(/\[(.*?)\]\(.*?\)/g, '$1') // 링크 제거
      .replace(/```[\s\S]*?```/g, '') // 코드 블록 제거
      .replace(/`(.*?)`/g, '$1') // 인라인 코드 제거
      .replace(/^\s*[-*+]\s+/gm, '') // 리스트 마커 제거
      .replace(/^\s*\d+\.\s+/gm, '') // 숫자 리스트 제거
      .replace(/\n\s*\n/g, ' ') // 빈 줄 제거
      .trim();

    // 첫 번째 문단만 반환 (최대 150자)
    const firstParagraph = description.split('\n')[0];
    return firstParagraph.length > 150 
      ? firstParagraph.substring(0, 150) + '...' 
      : firstParagraph;
  }

  // 이벤트 카드 HTML 생성
  createEventCard(event, index) {
    const gradients = [
      'from-blue-500/20 to-purple-500/20',
      'from-purple-500/20 to-pink-500/20',
      'from-pink-500/20 to-red-500/20',
      'from-green-500/20 to-blue-500/20',
      'from-yellow-500/20 to-orange-500/20',
      'from-indigo-500/20 to-purple-500/20'
    ];
    
    const badgeColors = [
      'bg-blue-500/80',
      'bg-purple-500/80',
      'bg-pink-500/80',
      'bg-green-500/80',
      'bg-yellow-500/80',
      'bg-indigo-500/80'
    ];

    const textColors = [
      'text-blue-300',
      'text-purple-300',
      'text-pink-300',
      'text-green-300',
      'text-yellow-300',
      'text-indigo-300'
    ];

    const gradient = gradients[index % gradients.length];
    const badgeColor = badgeColors[index % badgeColors.length];
    const textColor = textColors[index % textColors.length];

    const imageUrl = event.thumbnail_url || '/placeholder-event.png';
    const dateRange = this.formatDateRange(event.start_date, event.end_date);
    const description = this.extractDescription(event.content) || '이벤트 설명이 없습니다.';

    return `
      <article class="group relative bg-white/5 backdrop-blur-md rounded-3xl border border-white/10 overflow-hidden hover:bg-white/10 transition-all duration-500 hover:scale-105 flex flex-col h-full">
        <div class="absolute inset-0 bg-gradient-to-r ${gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
        <div class="relative z-10 flex flex-col h-full">
          <div class="relative overflow-hidden">
            <img class="h-48 w-full object-cover group-hover:scale-110 transition-transform duration-500" 
                 src="${imageUrl}" 
                 alt="${event.title}"
                 onerror="this.src='/placeholder-event.png'" />
            <div class="absolute top-4 left-4 px-3 py-1 ${badgeColor} backdrop-blur-md rounded-full text-white text-sm font-medium">
              이벤트
            </div>
          </div>
          <div class="p-6 flex-grow flex flex-col">
            <h3 class="text-xl font-bold text-white mb-2">${event.title}</h3>
            <p class="text-gray-300 mb-4 flex-grow">${description}</p>
            <div class="flex items-center justify-between mt-auto">
              <div class="flex items-center gap-2 text-sm text-gray-400">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v14a2 2 0 002 2z"></path>
                </svg>
                ${dateRange}
              </div>
              <a class="inline-flex items-center gap-1 ${textColor} hover:text-white font-medium transition-colors duration-300" href="/event/${event.slug || event.id}">
                <span>자세히</span>
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
                </svg>
              </a>
            </div>
          </div>
        </div>
      </article>
    `;
  }

  // 이벤트 목록을 렌더링
  renderEvents(events) {
    if (!this.container) {
      console.error('Event cards container not found');
      return;
    }

    if (events.length === 0) {
      this.container.innerHTML = `
        <div class="flex justify-center items-center col-span-full py-16">
          <div class="text-center">
            <div class="w-16 h-16 mx-auto mb-4 bg-white/5 rounded-full flex items-center justify-center">
              <svg class="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v14a2 2 0 002 2z"></path>
              </svg>
            </div>
            <div class="text-gray-300 text-lg font-medium">현재 진행중인 이벤트가 없습니다</div>
            <div class="text-gray-400 text-sm mt-1">새로운 이벤트가 곧 업데이트될 예정입니다</div>
          </div>
        </div>
      `;
      return;
    }

    const cardsHTML = events.map((event, index) => this.createEventCard(event, index)).join('');
    this.container.innerHTML = cardsHTML;

    // 이벤트 리스너 추가 (자세히 보기 링크)
    this.addEventListeners();
  }

  // 이벤트 리스너 추가
  addEventListeners() {
    const detailLinks = this.container.querySelectorAll('a[data-event-id]');
    detailLinks.forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const eventId = link.getAttribute('data-event-id');
        console.log(`Event ${eventId} detail clicked`);
        // 여기서 이벤트 상세 페이지로 이동하거나 모달을 열 수 있습니다
      });
    });
  }

  // 에러 상태 렌더링
  renderError() {
    if (!this.container) return;

    this.container.innerHTML = `
      <div class="flex justify-center items-center col-span-full py-16">
        <div class="text-center">
          <div class="w-16 h-16 mx-auto mb-4 bg-red-500/10 rounded-full flex items-center justify-center">
            <svg class="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16c-.77.833.192 2.5 1.732 2.5z"></path>
            </svg>
          </div>
          <div class="text-gray-300 text-lg font-medium">이벤트를 불러올 수 없습니다</div>
          <div class="text-gray-400 text-sm mt-1">잠시 후 다시 시도해 주세요</div>
          <button onclick="window.eventsManager.init()" class="mt-4 px-4 py-2 bg-blue-500/20 text-blue-300 rounded-lg hover:bg-blue-500/30 transition-colors duration-300">
            다시 시도
          </button>
        </div>
      </div>
    `;
  }

  // 초기화 및 이벤트 로드
  async init() {
    try {
      const events = await this.fetchEvents();
      this.renderEvents(events);
    } catch (error) {
      console.error('Failed to initialize events:', error);
      this.renderError();
    }
  }
}

// 페이지 로드 시 이벤트 매니저 초기화
document.addEventListener('DOMContentLoaded', () => {
  window.eventsManager = new EventsManager();
  window.eventsManager.init();
});

// 전역 접근을 위한 export
window.EventsManager = EventsManager;