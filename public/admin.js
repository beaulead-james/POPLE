// 이벤트 관리자 JavaScript

class EventAdmin {
  constructor() {
    this.currentPage = 1;
    this.pageSize = 12;
    this.currentEvent = null;
    this.isEditing = false;
    
    this.init();
  }

  init() {
    // 페이지 로드 시 이벤트 목록 로드
    this.loadEvents();
    
    // 폼 제출 이벤트 리스너
    document.getElementById('eventForm').addEventListener('submit', (e) => {
      e.preventDefault();
      this.saveEvent();
    });

    // 검색 입력에 엔터 키 이벤트
    document.getElementById('searchInput').addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        this.loadEvents();
      }
    });

    // 날짜 필터 변경 시 자동 검색
    ['statusFilter', 'fromDate', 'toDate', 'sortSelect'].forEach(id => {
      document.getElementById(id).addEventListener('change', () => {
        this.loadEvents();
      });
    });
  }

  // 이벤트 목록 로드
  async loadEvents(page = 1) {
    this.currentPage = page;
    this.showLoadingState();

    const params = new URLSearchParams({
      page: page,
      pageSize: this.pageSize,
      search: document.getElementById('searchInput').value,
      status: document.getElementById('statusFilter').value,
      from: document.getElementById('fromDate').value,
      to: document.getElementById('toDate').value,
    });

    const sortValue = document.getElementById('sortSelect').value.split(':');
    if (sortValue.length === 2) {
      params.append('sort', sortValue[0]);
      params.append('order', sortValue[1]);
    }

    try {
      const response = await fetch(`/api/events?${params}`);
      const data = await response.json();

      if (data.error) {
        this.showToast('오류', data.message, 'error');
        this.showEmptyState();
        return;
      }

      this.renderEvents(data.events);
      this.renderPagination(data.pagination);
      
    } catch (error) {
      console.error('이벤트 로드 실패:', error);
      this.showToast('오류', '이벤트를 불러올 수 없습니다.', 'error');
      this.showEmptyState();
    }
  }

  // 이벤트 목록 렌더링
  renderEvents(events) {
    const tbody = document.getElementById('eventsTableBody');
    const loadingState = document.getElementById('loadingState');
    const emptyState = document.getElementById('emptyState');

    loadingState.style.display = 'none';

    if (!events || events.length === 0) {
      tbody.innerHTML = '';
      emptyState.style.display = 'block';
      return;
    }

    emptyState.style.display = 'none';

    tbody.innerHTML = events.map(event => `
      <tr class="hover:bg-gray-50">
        <td class="px-6 py-4 whitespace-nowrap">
          ${event.thumbnail_url 
            ? `<img src="${event.thumbnail_url}" alt="${event.title}" class="w-12 h-12 object-cover rounded-lg">`
            : `<div class="w-12 h-12 bg-gray-200 rounded-lg flex items-center justify-center">
                 <svg class="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                   <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v14a2 2 0 002 2z"></path>
                 </svg>
               </div>`
          }
        </td>
        <td class="px-6 py-4">
          <div>
            <div class="text-sm font-medium text-gray-900">${this.escapeHtml(event.title)}</div>
            ${event.slug ? `<div class="text-sm text-gray-500">/${event.slug}</div>` : ''}
          </div>
        </td>
        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
          ${this.formatDate(event.start_date)} ~ ${this.formatDate(event.end_date)}
        </td>
        <td class="px-6 py-4 whitespace-nowrap">
          ${this.badge(event.status)}
        </td>
        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
          ${event.published_at ? this.formatDateTime(event.published_at) : '-'}
        </td>
        <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
          <button onclick="eventAdmin.editEvent(${event.id})" class="text-blue-600 hover:text-blue-900 mr-3">수정</button>
          <button onclick="eventAdmin.deleteEvent(${event.id})" class="text-red-600 hover:text-red-900">삭제</button>
        </td>
      </tr>
    `).join('');
  }

  // 페이지네이션 렌더링
  renderPagination(pagination) {
    const paginationDiv = document.getElementById('pagination');
    
    if (pagination.totalPages <= 1) {
      paginationDiv.innerHTML = '';
      return;
    }

    let buttons = [];

    // 이전 버튼
    if (pagination.page > 1) {
      buttons.push(`<button onclick="eventAdmin.loadEvents(${pagination.page - 1})" class="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-l-md hover:bg-gray-50">이전</button>`);
    } else {
      buttons.push(`<button disabled class="px-3 py-2 text-sm font-medium text-gray-300 bg-white border border-gray-300 rounded-l-md cursor-not-allowed">이전</button>`);
    }

    // 페이지 번호 버튼들
    const startPage = Math.max(1, pagination.page - 2);
    const endPage = Math.min(pagination.totalPages, pagination.page + 2);

    for (let i = startPage; i <= endPage; i++) {
      const isActive = i === pagination.page;
      buttons.push(`
        <button onclick="eventAdmin.loadEvents(${i})" 
                class="px-3 py-2 text-sm font-medium ${isActive 
                  ? 'text-blue-600 bg-blue-50 border-blue-500' 
                  : 'text-gray-500 bg-white border-gray-300 hover:bg-gray-50'} border-t border-b">
          ${i}
        </button>
      `);
    }

    // 다음 버튼
    if (pagination.page < pagination.totalPages) {
      buttons.push(`<button onclick="eventAdmin.loadEvents(${pagination.page + 1})" class="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-r-md hover:bg-gray-50">다음</button>`);
    } else {
      buttons.push(`<button disabled class="px-3 py-2 text-sm font-medium text-gray-300 bg-white border border-gray-300 rounded-r-md cursor-not-allowed">다음</button>`);
    }

    paginationDiv.innerHTML = `
      <div class="flex items-center">
        ${buttons.join('')}
      </div>
      <div class="ml-4 text-sm text-gray-700">
        전체 ${pagination.total}개 중 ${((pagination.page - 1) * pagination.pageSize) + 1}-${Math.min(pagination.page * pagination.pageSize, pagination.total)}개 표시
      </div>
    `;
  }

  // 로딩 상태 표시
  showLoadingState() {
    document.getElementById('loadingState').style.display = 'flex';
    document.getElementById('emptyState').style.display = 'none';
    document.getElementById('eventsTableBody').innerHTML = '';
    document.getElementById('pagination').innerHTML = '';
  }

  // 빈 상태 표시
  showEmptyState() {
    document.getElementById('loadingState').style.display = 'none';
    document.getElementById('emptyState').style.display = 'block';
    document.getElementById('eventsTableBody').innerHTML = '';
    document.getElementById('pagination').innerHTML = '';
  }

  // 새 이벤트 생성 모달 표시
  showCreateModal() {
    this.isEditing = false;
    this.currentEvent = null;
    
    document.getElementById('modalTitle').textContent = '이벤트 작성';
    document.getElementById('submitBtn').textContent = '저장';
    
    // 폼 초기화
    document.getElementById('eventForm').reset();
    document.getElementById('preview').innerHTML = '<p class="text-gray-500 italic">내용을 입력하면 미리보기가 표시됩니다.</p>';
    
    document.getElementById('eventModal').classList.remove('hidden');
  }

  // 이벤트 수정 모달 표시
  async editEvent(id) {
    try {
      const response = await fetch(`/api/events/${id}`);
      const event = await response.json();

      if (event.error) {
        this.showToast('오류', event.message, 'error');
        return;
      }

      this.isEditing = true;
      this.currentEvent = event;
      
      document.getElementById('modalTitle').textContent = '이벤트 수정';
      document.getElementById('submitBtn').textContent = '저장';
      
      // 폼 데이터 채우기
      document.getElementById('eventTitle').value = event.title || '';
      document.getElementById('eventSlug').value = event.slug || '';
      document.getElementById('eventStatus').value = event.status || 'draft';
      document.getElementById('eventStartDate').value = event.start_date || '';
      document.getElementById('eventEndDate').value = event.end_date || '';
      document.getElementById('eventThumbnail').value = event.thumbnail_url || '';
      document.getElementById('eventTags').value = event.tags || '';
      document.getElementById('eventContent').value = event.content || '';
      
      // 미리보기 업데이트
      this.updatePreview();
      
      document.getElementById('eventModal').classList.remove('hidden');
      
    } catch (error) {
      console.error('이벤트 로드 실패:', error);
      this.showToast('오류', '이벤트를 불러올 수 없습니다.', 'error');
    }
  }

  // 이벤트 삭제
  async deleteEvent(id) {
    if (!confirm('정말로 이 이벤트를 삭제하시겠습니까?')) {
      return;
    }

    try {
      const response = await fetch(`/api/events/${id}`, {
        method: 'DELETE'
      });

      const result = await response.json();

      if (result.error) {
        this.showToast('오류', result.message, 'error');
        return;
      }

      this.showToast('성공', '이벤트가 삭제되었습니다.', 'success');
      this.loadEvents(this.currentPage);
      
    } catch (error) {
      console.error('이벤트 삭제 실패:', error);
      this.showToast('오류', '이벤트 삭제에 실패했습니다.', 'error');
    }
  }

  // 이벤트 저장 (생성 또는 수정)
  async saveEvent() {
    const formData = {
      title: document.getElementById('eventTitle').value.trim(),
      slug: document.getElementById('eventSlug').value.trim(),
      status: document.getElementById('eventStatus').value,
      start_date: document.getElementById('eventStartDate').value,
      end_date: document.getElementById('eventEndDate').value,
      thumbnail_url: document.getElementById('eventThumbnail').value.trim(),
      tags: document.getElementById('eventTags').value.trim(),
      content: document.getElementById('eventContent').value.trim()
    };

    // 기본 유효성 검사
    if (!formData.title) {
      this.showToast('오류', '제목을 입력해주세요.', 'error');
      return;
    }

    if (!formData.content) {
      this.showToast('오류', '내용을 입력해주세요.', 'error');
      return;
    }

    if (!formData.start_date || !formData.end_date) {
      this.showToast('오류', '시작일과 종료일을 입력해주세요.', 'error');
      return;
    }

    if (new Date(formData.start_date) > new Date(formData.end_date)) {
      this.showToast('오류', '시작일은 종료일보다 이전이어야 합니다.', 'error');
      return;
    }

    try {
      const url = this.isEditing ? `/api/events/${this.currentEvent.id}` : '/api/events';
      const method = this.isEditing ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method: method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      const result = await response.json();

      if (result.error) {
        this.showToast('오류', result.message, 'error');
        return;
      }

      this.showToast('성공', result.message, 'success');
      this.hideModal();
      this.loadEvents(this.currentPage);
      
    } catch (error) {
      console.error('이벤트 저장 실패:', error);
      this.showToast('오류', '이벤트 저장에 실패했습니다.', 'error');
    }
  }

  // 모달 숨기기
  hideModal() {
    document.getElementById('eventModal').classList.add('hidden');
  }

  // 미리보기 업데이트
  updatePreview() {
    const content = document.getElementById('eventContent').value;
    const preview = document.getElementById('preview');
    
    if (content.trim()) {
      try {
        preview.innerHTML = marked.parse(content);
      } catch (error) {
        preview.innerHTML = '<p class="text-red-500">마크다운 파싱 오류</p>';
      }
    } else {
      preview.innerHTML = '<p class="text-gray-500 italic">내용을 입력하면 미리보기가 표시됩니다.</p>';
    }
  }

  // 토스트 알림 표시
  showToast(title, message, type = 'info') {
    const toast = document.getElementById('toast');
    const icon = document.getElementById('toastIcon');
    const messageEl = document.getElementById('toastMessage');

    // 아이콘 설정
    if (type === 'success') {
      icon.innerHTML = '<svg class="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>';
    } else if (type === 'error') {
      icon.innerHTML = '<svg class="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>';
    } else {
      icon.innerHTML = '<svg class="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>';
    }

    messageEl.textContent = message;
    
    toast.classList.remove('hidden');
    
    // 3초 후 숨기기
    setTimeout(() => {
      toast.classList.add('hidden');
    }, 3000);
  }

  // 유틸리티 함수들
  escapeHtml(unsafe) {
    return unsafe
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  formatDate(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return `${date.getFullYear()}.${(date.getMonth() + 1).toString().padStart(2, '0')}.${date.getDate().toString().padStart(2, '0')}`;
  }

  formatDateTime(dateTimeString) {
    if (!dateTimeString) return '-';
    const date = new Date(dateTimeString);
    return `${date.getFullYear()}.${(date.getMonth() + 1).toString().padStart(2, '0')}.${date.getDate().toString().padStart(2, '0')} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
  }

  getStatusClass(status) {
    switch (status) {
      case 'published': return 'badge--published';
      case 'draft': return 'badge--draft';
      case 'archived': return 'badge--archived';
      default: return 'badge--draft';
    }
  }

  badge(status){
    const map = {
      published: { cls:'badge badge--published', label:'발행됨' },
      draft:     { cls:'badge badge--draft',     label:'초안' },
      archived:  { cls:'badge badge--archived',  label:'보관' },
    };
    const b = map[status] || map.draft;
    return `<span class="${b.cls}">${b.label}</span>`;
  }

  getStatusText(status) {
    switch (status) {
      case 'published': return '발행됨';
      case 'draft': return '초안';
      case 'archived': return '보관';
      default: return '초안';
    }
  }
}

// 전역 함수들
function showEventsView() {
  // 이벤트 관리 화면 표시 (현재는 이미 표시되어 있음)
}

function showCreateModal() {
  eventAdmin.showCreateModal();
}

function hideModal() {
  eventAdmin.hideModal();
}

function loadEvents() {
  eventAdmin.loadEvents();
}

function updatePreview() {
  eventAdmin.updatePreview();
}

// 인스턴스 생성
const eventAdmin = new EventAdmin();