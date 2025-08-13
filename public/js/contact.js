(function(){
  const form = document.querySelector('#contact-form');
  if (!form) return;

  const pick = (names) => {
    for (const n of names) {
      const el = form.querySelector(`[name="${n}"]`) || form.querySelector(`#${n}`);
      if (el) return el;
    }
    return null;
  };

  const nameEl = pick(['name','username','contactName']);
  const emailEl = pick(['email','contactEmail']);
  const msgEl = pick(['message','content','contactMessage']);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = {
      name: nameEl ? nameEl.value.trim() : '',
      email: emailEl ? emailEl.value.trim() : '',
      message: msgEl ? msgEl.value.trim() : ''
    };
    if (!payload.name || !payload.email || !payload.message) {
      alert('이름/이메일/내용을 입력해 주세요.');
      return;
    }
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error(await res.text());
      alert('문의가 접수되었습니다. 빠르게 확인 후 답변드리겠습니다.');
      form.reset();
    } catch (err) {
      console.error(err);
      alert('문의 접수에 실패했습니다. 잠시 후 다시 시도해 주세요.');
    }
  });
})();