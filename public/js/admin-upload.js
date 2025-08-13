(function(){
  // DOM이 완전히 로드된 후에 실행
  function initUpload() {
    const urlInput = document.getElementById('eventThumbnail');
    if (!urlInput) {
      console.log('썸네일 입력 필드를 찾을 수 없습니다.');
      return;
    }

    // 이미 업로드 버튼이 있는지 확인
    if (urlInput.parentElement.querySelector('.upload-btn')) {
      return;
    }

    // 파일 업로드 버튼 생성
    const uploadBtn = document.createElement('button');
    uploadBtn.type = 'button';
    uploadBtn.className = 'upload-btn mt-2 w-full px-4 py-2 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-md text-sm font-medium text-blue-700 transition-colors flex items-center justify-center gap-2';
    uploadBtn.innerHTML = '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path></svg> 이미지 파일 업로드';

    // 숨겨진 파일 입력 필드 생성
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*';
    fileInput.style.display = 'none';

    // 버튼 클릭 시 파일 선택 창 열기
    uploadBtn.addEventListener('click', () => {
      fileInput.click();
    });

    // 파일 선택 시 업로드 처리
    fileInput.addEventListener('change', async () => {
      const file = fileInput.files[0];
      if (!file) return;

      // 업로드 중 표시
      uploadBtn.disabled = true;
      uploadBtn.className = 'upload-btn mt-2 w-full px-4 py-2 bg-yellow-50 border border-yellow-200 rounded-md text-sm font-medium text-yellow-700 transition-colors flex items-center justify-center gap-2';
      uploadBtn.innerHTML = '<svg class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> 업로드 중...';

      const formData = new FormData();
      formData.append('file', file);

      try {
        const res = await fetch('/admin/upload', { method: 'POST', body: formData });
        if (!res.ok) {
          const errorText = await res.text();
          throw new Error(errorText || '업로드 실패');
        }
        
        const data = await res.json();
        urlInput.value = data.url;
        
        // 성공 표시
        uploadBtn.className = 'upload-btn mt-2 w-full px-4 py-2 bg-green-50 border border-green-200 rounded-md text-sm font-medium text-green-700 transition-colors flex items-center justify-center gap-2';
        uploadBtn.innerHTML = '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg> 업로드 완료!';
        setTimeout(() => {
          uploadBtn.className = 'upload-btn mt-2 w-full px-4 py-2 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-md text-sm font-medium text-blue-700 transition-colors flex items-center justify-center gap-2';
          uploadBtn.innerHTML = '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path></svg> 이미지 파일 업로드';
          uploadBtn.disabled = false;
        }, 2000);
        
        console.log('파일 업로드 성공:', data.url);
      } catch (err) {
        console.error('업로드 오류:', err);
        alert('업로드 실패: ' + err.message);
        
        // 오류 표시
        uploadBtn.className = 'upload-btn mt-2 w-full px-4 py-2 bg-red-50 border border-red-200 rounded-md text-sm font-medium text-red-700 transition-colors flex items-center justify-center gap-2';
        uploadBtn.innerHTML = '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg> 업로드 실패';
        setTimeout(() => {
          uploadBtn.className = 'upload-btn mt-2 w-full px-4 py-2 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-md text-sm font-medium text-blue-700 transition-colors flex items-center justify-center gap-2';
          uploadBtn.innerHTML = '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path></svg> 이미지 파일 업로드';
          uploadBtn.disabled = false;
        }, 2000);
      }
    });

    // DOM에 추가
    urlInput.parentElement.appendChild(uploadBtn);
    urlInput.parentElement.appendChild(fileInput);
    
    console.log('파일 업로드 버튼이 추가되었습니다.');
  }

  // 페이지 로드 완료 후 초기화
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initUpload);
  } else {
    initUpload();
  }

  // 모달이 열릴 때마다 다시 초기화 (새로운 DOM 요소가 생성될 수 있으므로)
  const observer = new MutationObserver(function(mutations) {
    mutations.forEach(function(mutation) {
      if (mutation.type === 'childList') {
        mutation.addedNodes.forEach(function(node) {
          if (node.nodeType === 1 && (node.id === 'eventModal' || node.querySelector('#eventModal'))) {
            setTimeout(initUpload, 100); // 모달 렌더링 완료를 기다림
          }
        });
      }
    });
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
})();