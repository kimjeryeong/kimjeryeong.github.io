(() => {
  const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (s, el = document) => [...el.querySelectorAll(s)];

  // 제목 글자 하나씩 등장
  let n = 0;
  $('[data-split]').forEach(w => {
    w.setAttribute('aria-hidden', 'true');
    w.innerHTML = [...w.textContent].map(c => `<i style="--i:${n++}">${c}</i>`).join('');
  });

  // 공항 전광판처럼 글자가 넘어가는 효과
  const flap = el => {
    const to = el.dataset.flap, abc = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    if (calm) return;
    let step = 0;
    const t = setInterval(() => {
      el.textContent = [...to].map((c, i) =>
        c === ' ' || step > i * 2 + 6 ? c : abc[Math.random() * 26 | 0]).join('');
      if (step++ > to.length * 2 + 6) { clearInterval(t); el.textContent = to; }
    }, 45);
  };

  // 숫자 올라가기
  const count = el => {
    const to = +el.dataset.count, t0 = performance.now();
    if (calm) return;
    const tick = t => {
      const p = Math.min((t - t0) / 1200, 1);
      el.textContent = (to * (1 - Math.pow(1 - p, 3))).toFixed(1);
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
    // 화면이 가려져 애니메이션이 멈춰도 최종 숫자는 반드시 표시한다
    setTimeout(() => el.textContent = to.toFixed(1), 1500);
  };

  const io = new IntersectionObserver(es => es.forEach(e => {
    if (!e.isIntersecting) return;
    e.target.classList.add('in');
    $('[data-count]', e.target).forEach(count);
    if (e.target.matches('[data-flap]')) flap(e.target);
    io.unobserve(e.target);
  }), { threshold: .12 });
  $('[data-reveal],[data-flap]').forEach(el => io.observe(el));

  // 스크롤: 진행 막대, 항로, 패럴랙스, 현재 목차
  const bar = document.querySelector('.progress'), trail = document.querySelector('.trail');
  const plane = document.querySelector('.plane3d'), next = document.querySelector('.next');
  const links = $('.links a'), secs = links.map(a => document.querySelector(a.getAttribute('href')));
  const onScroll = () => {
    const max = document.documentElement.scrollHeight - innerHeight;
    bar.style.setProperty('--p', max > 0 ? Math.min(scrollY / max, 1) : 0);
    const r = trail.getBoundingClientRect();
    trail.style.setProperty('--t', Math.max(0, Math.min((innerHeight * .75 - r.top) / r.height, 1)));
    if (!calm) {
      plane.style.setProperty('--py', `${-Math.min(scrollY, 700) * .22}px`);
      next.style.setProperty('--ry', `${Math.max(-40, Math.min(next.getBoundingClientRect().top * .08, 40))}px`);
    }
    let cur = -1;
    secs.forEach((s, i) => { if (s.getBoundingClientRect().top < innerHeight * .4) cur = i; });
    links.forEach((a, i) => a.classList.toggle('on', i === cur));
  };
  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', onScroll);
  onScroll();

  // 마우스에 따라 기울어지는 3D 카드
  if (!calm && matchMedia('(pointer: fine)').matches) $('[data-tilt]').forEach(el => {
    el.addEventListener('pointermove', e => {
      const r = el.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5;
      el.style.transform = `perspective(1100px) rotateX(${-y * 6}deg) rotateY(${x * 8}deg)`;
    });
    el.addEventListener('pointerleave', () => el.style.transform = '');
  });

  // 3D 지구본: 부산 → 방콕, 쿠알라룸푸르
  const cv = document.getElementById('globe'), g = cv.getContext('2d');
  const rad = Math.PI / 180;
  const vec = (lat, lon) => [Math.cos(lat * rad) * Math.sin(lon * rad), Math.sin(lat * rad), Math.cos(lat * rad) * Math.cos(lon * rad)];
  const dots = Array.from({ length: 900 }, (_, i) => {
    const y = 1 - 2 * (i + .5) / 900, r = Math.sqrt(1 - y * y), a = i * 2.39996;
    return [r * Math.sin(a), y, r * Math.cos(a)];
  });
  const rings = [];
  for (let lat = -60; lat <= 60; lat += 30) rings.push(Array.from({ length: 73 }, (_, i) => vec(lat, i * 5)));
  for (let lon = 0; lon < 360; lon += 30) rings.push(Array.from({ length: 37 }, (_, i) => vec(i * 5 - 90, lon)));
  const city = { busan: vec(35.18, 129.08), bkk: vec(13.76, 100.5), kul: vec(3.14, 101.69) };
  const arc = (a, b) => {
    const w = Math.acos(a[0] * b[0] + a[1] * b[1] + a[2] * b[2]);
    return Array.from({ length: 61 }, (_, i) => {
      const t = i / 60, k = 1 + Math.sin(Math.PI * t) * .16;
      return a.map((v, j) => (v * Math.sin((1 - t) * w) + b[j] * Math.sin(t * w)) / Math.sin(w) * k);
    });
  };
  const arcs = [arc(city.busan, city.bkk), arc(city.busan, city.kul)];
  const labels = [['BUSAN', city.busan, 10, -8], ['BANGKOK', city.bkk, -82, -4], ['KUALA LUMPUR', city.kul, -60, 22]];
  let yaw = -112 * rad, drag = null, size = 0, visible = false, t = 0, offset = 0;
  const tilt = 18 * rad;
  const rot = p => {
    const x = p[0] * Math.cos(yaw) + p[2] * Math.sin(yaw), z = p[2] * Math.cos(yaw) - p[0] * Math.sin(yaw);
    return [x, p[1] * Math.cos(tilt) - z * Math.sin(tilt), p[1] * Math.sin(tilt) + z * Math.cos(tilt)];
  };
  const draw = () => {
    const w = cv.clientWidth, dpr = Math.min(devicePixelRatio || 1, 2);
    if (w !== size) { size = w; cv.width = cv.height = w * dpr; }
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, w, w);
    const c = w / 2, R = w * .41, P = p => [c + p[0] * R, c - p[1] * R, p[2]];
    const fill = g.createRadialGradient(c - R * .35, c - R * .4, R * .1, c, c, R);
    fill.addColorStop(0, '#2c4a8f'); fill.addColorStop(1, '#0a1533');
    g.fillStyle = fill; g.beginPath(); g.arc(c, c, R, 0, 7); g.fill();
    const line = (pts, style, width) => {
      g.strokeStyle = style; g.lineWidth = width; g.beginPath();
      let on = false;
      pts.forEach(p => {
        const [x, y, z] = P(rot(p));
        if (z < 0) { on = false; return; }
        on ? g.lineTo(x, y) : g.moveTo(x, y); on = true;
      });
      g.stroke();
    };
    rings.forEach(r => line(r, 'rgba(255,255,255,.13)', 1));
    dots.forEach(d => {
      const [x, y, z] = P(rot(d));
      if (z > 0) { g.fillStyle = `rgba(190,210,255,${.12 + z * .4})`; g.fillRect(x, y, 1.6, 1.6); }
    });
    arcs.forEach((a, i) => {
      line(a, '#f5c518', 2);
      const [x, y, z] = P(rot(a[Math.floor(((t * .006 + i * .5) % 1) * 60)]));
      if (z > 0) { g.fillStyle = '#fff'; g.beginPath(); g.arc(x, y, 4.5, 0, 7); g.fill(); }
    });
    g.font = '700 12px Pretendard Variable, sans-serif';
    labels.forEach(([name, p, dx, dy]) => {
      const [x, y, z] = P(rot(p));
      if (z < .15) return;
      g.fillStyle = '#f5c518'; g.beginPath(); g.arc(x, y, 4, 0, 7); g.fill();
      g.fillStyle = '#fff'; g.fillText(name, x + dx, y + dy);
    });
  };
  const loop = () => {
    if (!visible) return;
    t++;
    // 항로가 항상 보이도록 좌우로 천천히 흔든다
    if (!drag) { offset *= .985; yaw = -112 * rad + Math.sin(t * .006) * .45 + offset; }
    draw();
    requestAnimationFrame(loop);
  };
  new IntersectionObserver(([e]) => {
    const was = visible; visible = e.isIntersecting && !calm;
    if (visible && !was) loop();
  }).observe(cv);
  cv.addEventListener('pointerdown', e => { drag = { x: e.clientX, yaw }; cv.setPointerCapture(e.pointerId); });
  cv.addEventListener('pointermove', e => {
    if (!drag) return;
    yaw = drag.yaw + (e.clientX - drag.x) * .008;
    offset = yaw - (-112 * rad + Math.sin(t * .006) * .45);
    draw();
  });
  const release = () => drag = null;
  cv.addEventListener('pointerup', release);
  cv.addEventListener('pointercancel', release);
  addEventListener('resize', draw);
  draw();

  // 증서 크게 보기
  const z = document.getElementById('zoom'), zi = z.querySelector('img');
  $('.cert img').forEach(img => {
    img.tabIndex = 0;
    const open = () => { zi.src = img.src; zi.alt = img.alt; z.showModal(); };
    img.addEventListener('click', open);
    img.addEventListener('keydown', e => { if (e.key === 'Enter') open(); });
  });
  z.addEventListener('click', () => z.close());
})();
