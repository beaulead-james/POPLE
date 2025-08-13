// Load more functionality for events grid
function initializeLoadMore() {
  const STEP = 6;

  // 여러 섹션에 재사용: .events-grid 클래스를 가진 모든 컨테이너에 적용
  const grids = document.querySelectorAll('.events-grid');

  grids.forEach((GRID) => {
    // 카드: 그리드의 직계 자식들을 카드로 간주 (마크업이 바뀌어도 안전)
    const items = Array.from(GRID.children);
    if (!items.length) return;

    // 이미 처리된 그리드는 건너뛰기
    if (GRID.dataset.loadMoreInitialized) return;
    GRID.dataset.loadMoreInitialized = 'true';

    // 초기 6개만 노출
    items.forEach((el, idx) => {
      if (idx >= STEP) el.style.display = 'none';
    });

    // 숨겨진 아이템이 없으면 더보기 버튼 불필요
    const hiddenItems = items.filter((el, idx) => idx >= STEP);
    if (hiddenItems.length === 0) return;

    // 더보기 버튼 생성
    const btnWrap = document.createElement('div');
    btnWrap.className = 'load-more-wrapper';
    btnWrap.style.display = 'flex';
    btnWrap.style.justifyContent = 'center';
    btnWrap.style.marginTop = '2rem';

    const btn = document.createElement('button');
    btn.className = 'load-more-btn';
    btn.textContent = '더보기';
    btn.style.padding = '0.875rem 1.75rem';
    btn.style.borderRadius = '0.75rem';
    btn.style.fontWeight = '600';
    btn.style.border = 'none';
    btn.style.cursor = 'pointer';
    btn.style.background = 'linear-gradient(90deg, #0A84FF, #00B894)';
    btn.style.color = '#fff';
    btn.style.boxShadow = '0 8px 20px rgba(10, 132, 255, 0.25)';
    btn.style.transition = 'all 0.3s ease';
    btn.style.fontSize = '0.95rem';

    // 호버 효과
    btn.addEventListener('mouseenter', () => {
      btn.style.transform = 'translateY(-2px)';
      btn.style.boxShadow = '0 12px 24px rgba(10, 132, 255, 0.35)';
    });

    btn.addEventListener('mouseleave', () => {
      btn.style.transform = 'translateY(0)';
      btn.style.boxShadow = '0 8px 20px rgba(10, 132, 255, 0.25)';
    });

    // 클릭 이벤트
    btn.addEventListener('click', () => {
      const hidden = items.filter(el => el.style.display === 'none');
      const toShow = hidden.slice(0, STEP);
      
      toShow.forEach(el => {
        el.style.display = '';
        // 부드러운 나타남 효과
        el.style.opacity = '0';
        el.style.transform = 'translateY(20px)';
        
        requestAnimationFrame(() => {
          el.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
          el.style.opacity = '1';
          el.style.transform = 'translateY(0)';
        });
      });

      // 남은 숨김 아이템 없으면 버튼 제거
      const remainingHidden = items.filter(el => el.style.display === 'none');
      if (remainingHidden.length === 0) {
        btnWrap.style.transition = 'opacity 0.3s ease';
        btnWrap.style.opacity = '0';
        setTimeout(() => btnWrap.remove(), 300);
      }
    });

    btnWrap.appendChild(btn);
    GRID.parentElement.appendChild(btnWrap);
  });
}

// 전역 함수로 등록
window.initializeLoadMore = initializeLoadMore;

// DOM이 준비되었을 때 실행 (fallback)
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeLoadMore);
} else {
  // DOM이 이미 로드된 경우 바로 실행
  initializeLoadMore();
}