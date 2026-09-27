/* =============================================================
   Brewtopia Coffee — scroll + 3D
   - WebGL (three r128): the hero cup and the drinks glass
   - CSS 3D: the walk-in corridor, the food ring, the reel fan
   ============================================================= */
(() => {
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const smooth = t => t * t * (3 - 2 * t);
  const range = (v, a, b) => clamp((v - a) / (b - a));
  const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isMobile = () => innerWidth < 900;
  const hasGSAP = !!(window.gsap && window.ScrollTrigger);
  if (hasGSAP) gsap.registerPlugin(ScrollTrigger);

  /* ---------------- loader ---------------- */
  document.body.classList.add('is-loading');
  const loadNum = $('#loadNum');
  const imgs = $$('img').filter(i => i.loading !== 'lazy');
  let loaded = 0, shown = 0;
  const total = Math.max(imgs.length, 1);
  imgs.forEach(im => {
    if (im.complete) loaded++;
    else { im.addEventListener('load', () => loaded++); im.addEventListener('error', () => loaded++); }
  });
  const minTime = performance.now() + 1500;
  (function tick() {
    const target = Math.min(100, (loaded / total) * 100);
    shown += (target - shown) * 0.12 + 0.4;
    shown = Math.min(shown, target, 100);
    loadNum.textContent = String(Math.floor(shown)).padStart(2, '0');
    if (shown >= 99.5 && performance.now() > minTime) return finishLoad();
    requestAnimationFrame(tick);
  })();
  setTimeout(() => { if (document.body.classList.contains('is-loading')) finishLoad(); }, 7000);
  function finishLoad() {
    if (!document.body.classList.contains('is-loading')) return;
    loadNum.textContent = '100';
    $('#loader').classList.add('done');
    document.body.classList.remove('is-loading');
    heroIntro();
    setTimeout(() => $('#loader').remove(), 1300);
  }
  function heroIntro() {
    const lines = $$('.hero__title .ln > span');
    if (hasGSAP && !REDUCED) {
      gsap.to(lines, { y: 0, duration: 1.3, ease: 'expo.out', stagger: 0.09, delay: 0.25 });
      gsap.from('.hero__facts li', { y: 30, opacity: 0, duration: 1, ease: 'expo.out', stagger: 0.08, delay: 0.6 });
      gsap.from('.hero__copy .eyebrow, .hero__hint', { opacity: 0, duration: 1, delay: 0.5 });
    } else lines.forEach(l => (l.style.transform = 'none'));
    if (stage) stage.intro = 0.0001; // kicks cup settle animation
  }

  /* ---------------- nav ---------------- */
  const nav = $('#nav');
  const darkSections = $$('.drinks, .reels, .visit, .foot');
  let lastY = scrollY;
  function navUpdate() {
    const y = scrollY, probe = 40;
    const onDark = darkSections.some(s => { const r = s.getBoundingClientRect(); return r.top <= probe && r.bottom > probe; });
    nav.classList.toggle('on-dark', onDark);
    nav.classList.toggle('solid', y > innerHeight * 0.6);
    nav.classList.toggle('hide', y > lastY + 4 && y > innerHeight);
    if (y < lastY - 4) nav.classList.remove('hide');
    lastY = y;
  }
  addEventListener('scroll', navUpdate, { passive: true });
  navUpdate();

  /* =============================================================
     WEBGL STAGE
     ============================================================= */
  let stage = null;
  if (window.THREE && !REDUCED) {
    try { stage = buildStage(); } catch (e) { console.warn('3D disabled:', e); $('#stage').style.display = 'none'; document.documentElement.classList.add('no-webgl'); }
  } else { $('#stage').style.display = 'none'; document.documentElement.classList.add('no-webgl'); }
  // three.js can build a renderer yet get no context on blocklisted GPUs
  if (stage && !stage.ok) { stage = null; $('#stage').style.display = 'none'; document.documentElement.classList.add('no-webgl'); }

  function buildStage() {
    const canvas = $('#stage');
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(devicePixelRatio, isMobile() ? 1.5 : 2));

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(32, 1, 0.05, 100);

    // lights: warm key like the café's pendant lamps, blush fill from the walls
    scene.add(new THREE.HemisphereLight(0xfff4e6, 0xb88a78, 0.42));
    const key = new THREE.DirectionalLight(0xffe2c2, 0.95); key.position.set(3, 6, 4); scene.add(key);
    const fill = new THREE.DirectionalLight(0xf2c3b4, 0.3); fill.position.set(-5, 2, 2); scene.add(fill);
    const rim = new THREE.DirectionalLight(0xffffff, 0.45); rim.position.set(-2, 3, -5); scene.add(rim);

    /* ---------- textures (drawn, not downloaded) ---------- */
    function latteTexture() {
      const c = document.createElement('canvas'); c.width = c.height = 512;
      const g = c.getContext('2d');
      const grd = g.createRadialGradient(256, 256, 40, 256, 256, 256);
      grd.addColorStop(0, '#8a5230'); grd.addColorStop(0.7, '#6b3a1c'); grd.addColorStop(1, '#43210d');
      g.fillStyle = grd; g.fillRect(0, 0, 512, 512);
      // crema speckle
      for (let i = 0; i < 1400; i++) {
        g.fillStyle = `rgba(${60 + Math.random() * 40},${25 + Math.random() * 20},10,${Math.random() * 0.12})`;
        g.beginPath(); g.arc(Math.random() * 512, Math.random() * 512, Math.random() * 2.2, 0, 7); g.fill();
      }
      // tulip: nested crescents, each carved by the next push of milk, then a heart on top
      const milk = '#f4e7d6', crema = '#6b3a1c';
      [[338, 150, 78], [282, 122, 64], [232, 96, 52], [190, 72, 40]].forEach(([y, rx, ry]) => {
        g.fillStyle = milk; g.beginPath(); g.ellipse(256, y, rx, ry, 0, 0, 7); g.fill();
        g.fillStyle = crema; g.beginPath(); g.ellipse(256, y - ry * 0.42, rx * 0.9, ry * 0.8, 0, 0, 7); g.fill();
      });
      g.fillStyle = milk;
      g.beginPath(); g.moveTo(256, 176); g.bezierCurveTo(206, 150, 214, 104, 256, 118); g.bezierCurveTo(298, 104, 306, 150, 256, 176); g.fill();
      g.strokeStyle = milk; g.lineWidth = 4; g.beginPath(); g.moveTo(256, 172); g.lineTo(256, 408); g.stroke();
      const tex = new THREE.CanvasTexture(c); tex.anisotropy = 4;
      return tex;
    }
    function tileTexture() {
      // the café floor: terracotta + cream geometric tiles
      const c = document.createElement('canvas'); c.width = c.height = 256;
      const g = c.getContext('2d');
      g.fillStyle = '#f2eadf'; g.fillRect(0, 0, 256, 256);
      g.fillStyle = '#e6cbb9';
      g.beginPath(); g.moveTo(128, 8); g.lineTo(248, 128); g.lineTo(128, 248); g.lineTo(8, 128); g.closePath(); g.fill();
      g.fillStyle = '#f2eadf';
      g.beginPath(); g.moveTo(128, 60); g.lineTo(196, 128); g.lineTo(128, 196); g.lineTo(60, 128); g.closePath(); g.fill();
      g.fillStyle = '#d4a590';
      g.beginPath(); g.arc(128, 128, 22, 0, 7); g.fill();
      [[0, 0], [256, 0], [0, 256], [256, 256]].forEach(([x, y]) => { g.beginPath(); g.arc(x, y, 30, 0, 7); g.fill(); });
      g.strokeStyle = 'rgba(80,40,25,.25)'; g.lineWidth = 2; g.strokeRect(0, 0, 256, 256);
      const tex = new THREE.CanvasTexture(c);
      tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.repeat.set(18, 18); tex.anisotropy = 8;
      return tex;
    }
    function softDot(alpha = 1) {
      const c = document.createElement('canvas'); c.width = c.height = 128;
      const g = c.getContext('2d');
      const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64);
      grd.addColorStop(0, `rgba(255,255,255,${alpha})`); grd.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = grd; g.fillRect(0, 0, 128, 128);
      return new THREE.CanvasTexture(c);
    }

    /* ---------- HERO: the Brewtopia cup ---------- */
    const hero = new THREE.Group(); scene.add(hero);
    const cup = new THREE.Group(); hero.add(cup);

    const glaze = new THREE.MeshStandardMaterial({ color: 0x163a78, roughness: 0.22, metalness: 0.1 });
    const porcelain = new THREE.MeshStandardMaterial({ color: 0xf8f3ea, roughness: 0.35 });

    // cup body — a lathe profile shaped like a wide flat-white cup
    const prof = [];
    const H = 0.78;
    for (let i = 0; i <= 24; i++) {
      const t = i / 24;
      const r = 0.34 + 0.34 * Math.pow(t, 0.72) + 0.02 * Math.sin(t * Math.PI);
      prof.push(new THREE.Vector2(r, t * H));
    }
    const outer = new THREE.Mesh(new THREE.LatheGeometry(prof, 72), glaze);
    const inner = new THREE.Mesh(new THREE.LatheGeometry(prof.map(p => new THREE.Vector2(p.x - 0.035, p.y + 0.02)), 72), porcelain);
    inner.material = porcelain.clone(); inner.material.side = THREE.BackSide;
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.3, 0.05, 48), glaze); base.position.y = -0.02;
    const lip = new THREE.Mesh(new THREE.TorusGeometry(0.68, 0.02, 12, 96), porcelain); lip.rotation.x = Math.PI / 2; lip.position.y = H;
    const handle = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.045, 16, 40, Math.PI * 1.25), glaze);
    handle.position.set(0.74, 0.4, 0); handle.rotation.z = -Math.PI * 0.62;
    const latte = new THREE.Mesh(new THREE.CircleGeometry(0.62, 72), new THREE.MeshStandardMaterial({ map: latteTexture(), roughness: 0.55 }));
    latte.rotation.x = -Math.PI / 2; latte.rotation.z = Math.PI * 0.12; latte.position.y = H - 0.07;
    cup.add(outer, inner, base, lip, handle, latte);

    // saucer
    const sProf = [new THREE.Vector2(0, 0), new THREE.Vector2(0.55, 0.0), new THREE.Vector2(0.95, 0.05), new THREE.Vector2(1.18, 0.14), new THREE.Vector2(1.2, 0.16)];
    const saucer = new THREE.Mesh(new THREE.LatheGeometry(sProf, 72), new THREE.MeshStandardMaterial({ color: 0xf6efe4, roughness: 0.3, side: THREE.DoubleSide }));
    saucer.position.y = -0.08; hero.add(saucer);
    const spoon = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.7, 12),
      new THREE.MeshStandardMaterial({ color: 0xc9c2b8, metalness: 0.9, roughness: 0.25 }));
    spoon.rotation.set(Math.PI / 2, 0, 0.9); spoon.position.set(-0.78, 0.0, 0.42); hero.add(spoon);

    // floor & contact shadow
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), new THREE.MeshStandardMaterial({ map: tileTexture(), roughness: 0.8 }));
    floor.rotation.x = -Math.PI / 2; floor.position.y = -0.1; hero.add(floor);
    const shadow = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 3.4), new THREE.MeshBasicMaterial({ map: softDot(0.55), color: 0x2a1208, transparent: true, depthWrite: false }));
    shadow.rotation.x = -Math.PI / 2; shadow.position.y = -0.095; hero.add(shadow);
    scene.fog = new THREE.Fog(0xf6efe5, 5, 12);

    // steam — soft sprites drifting up and curling
    const steamTex = softDot(0.9);
    const steam = [];
    for (let i = 0; i < 22; i++) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: steamTex, color: 0xffffff, transparent: true, opacity: 0, depthWrite: false }));
      s.userData = { seed: Math.random() * 10, speed: 0.18 + Math.random() * 0.2, life: Math.random() };
      cup.add(s); steam.push(s);
    }

    /* ---------- DRINKS: one glass, four moods ---------- */
    const bar = new THREE.Group(); bar.visible = false; scene.add(bar);
    const GH = 2.1, GR = 0.62;
    const glassProf = [new THREE.Vector2(0.001, 0), new THREE.Vector2(GR - 0.06, 0), new THREE.Vector2(GR - 0.02, 0.03), new THREE.Vector2(GR, 0.12), new THREE.Vector2(GR + 0.08, GH)];
    const glass = new THREE.Mesh(new THREE.LatheGeometry(glassProf, 72), new THREE.MeshPhysicalMaterial({
      color: 0xffffff, roughness: 0.04, metalness: 0, transparent: true, opacity: 0.16, clearcoat: 1, clearcoatRoughness: 0.05, side: THREE.DoubleSide, depthWrite: false
    }));
    const glassBase = new THREE.Mesh(new THREE.CylinderGeometry(GR - 0.03, GR - 0.05, 0.14, 48), new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.05, transparent: true, opacity: 0.35, clearcoat: 1 }));
    glassBase.position.y = 0.07;
    const rimLine = new THREE.Mesh(new THREE.TorusGeometry(GR + 0.08, 0.008, 8, 96), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.5 }));
    rimLine.rotation.x = Math.PI / 2; rimLine.position.y = GH;
    // liquid = two stacked cylinders we recolour and resize
    const liqMat = () => new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.25, transparent: true, opacity: 0.94, clearcoat: 0.6 });
    const lowGeo = new THREE.CylinderGeometry(1, 1, 1, 64); lowGeo.translate(0, 0.5, 0);
    const low = new THREE.Mesh(lowGeo, liqMat());
    const high = new THREE.Mesh(lowGeo, liqMat());
    const foam = new THREE.Mesh(new THREE.CircleGeometry(1, 64), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9 }));
    foam.rotation.x = -Math.PI / 2;
    // ice
    const iceMat = new THREE.MeshPhysicalMaterial({ color: 0xeaf6ff, roughness: 0.12, transparent: true, opacity: 0.55, clearcoat: 1 });
    const ice = [];
    for (let i = 0; i < 6; i++) {
      const cube = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.34, 0.34), iceMat);
      cube.userData = { a: (i / 6) * Math.PI * 2, r: i % 2 ? 0.28 : 0.12, h: 0.0 + (i % 3) * 0.26, s: Math.random() * 6 };
      bar.add(cube); ice.push(cube);
    }
    // coaster (the terracotta of the floor)
    const coaster = new THREE.Mesh(new THREE.CylinderGeometry(1.05, 1.05, 0.04, 64), new THREE.MeshStandardMaterial({ color: 0x3a2418, roughness: 0.6 }));
    coaster.position.y = -0.02;
    const gShadow = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 3.6), new THREE.MeshBasicMaterial({ map: softDot(0.6), color: 0x000000, transparent: true, depthWrite: false }));
    gShadow.rotation.x = -Math.PI / 2; gShadow.position.y = -0.045;
    const hl = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.22, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
    const hi1 = new THREE.Mesh(new THREE.CylinderGeometry(GR + 0.085, GR + 0.005, GH - 0.2, 32, 1, true, -0.95, 0.16), hl); hi1.position.y = GH / 2 + 0.05;
    const hi2 = new THREE.Mesh(new THREE.CylinderGeometry(GR + 0.085, GR + 0.005, GH - 0.2, 32, 1, true, 0.55, 0.06), hl.clone()); hi2.material.opacity = 0.14; hi2.position.y = GH / 2 + 0.05;
    const highlights = new THREE.Group(); highlights.add(hi1, hi2);
    bar.add(gShadow, coaster, low, high, foam, glass, glassBase, rimLine, highlights);

    const C = h => new THREE.Color(h);
    // bottom colour, top colour, split (0-1 of fill), foam colour, ice amount
    const moods = [
      { low: C(0x2a1206), high: C(0x4e2410), split: 0.72, foam: C(0x6a3517), ice: 1 },   // cold brew
      { low: C(0xeee6d8), high: C(0x6f9a3a), split: 0.55, foam: C(0x8fb356), ice: 1 },   // iced matcha
      { low: C(0x3a1f7a), high: C(0x86a55a), split: 0.6, foam: C(0xb9cf92), ice: 0.7 },  // purple haze
      { low: C(0xebdcc4), high: C(0x4a220c), split: 0.62, foam: C(0xb88455), ice: 1 }    // iced latte
    ];
    const FILL = GH * 0.8;
    function setMood(f) {
      const i = Math.floor(clamp(f, 0, 3.999)), t = smooth(range(f - i, 0.7, 1));
      const a = moods[i], b = moods[Math.min(i + 1, 3)];
      low.material.color.copy(a.low).lerp(b.low, t);
      high.material.color.copy(a.high).lerp(b.high, t);
      foam.material.color.copy(a.foam).lerp(b.foam, t);
      const split = lerp(a.split, b.split, t);
      // a small "slosh" through the change
      const slosh = Math.sin(t * Math.PI) * 0.12;
      const lowH = FILL * split * (1 - slosh * 0.6), highH = FILL - lowH;
      const radAt = y => GR - 0.03 + (0.08 * y) / GH;
      low.position.y = 0.14; low.scale.set(radAt(0.14), lowH, radAt(0.14));
      high.position.y = 0.14 + lowH; high.scale.set(radAt(0.14 + lowH), highH, radAt(0.14 + lowH));
      foam.position.y = 0.14 + FILL + 0.002; const fr = radAt(0.14 + FILL) - 0.005; foam.scale.set(fr, fr, 1);
      const iceAmt = lerp(a.ice, b.ice, t);
      ice.forEach((c, k) => { c.visible = k / ice.length < iceAmt; });
      return i;
    }

    /* ---------- state driven by scroll ---------- */
    const S = { hero: 0, drinks: -1, enter: 1, mode: 'hero', intro: 0, mx: 0, my: 0 };
    let W = 0, Hh = 0;
    function resize() {
      W = innerWidth; Hh = innerHeight;
      renderer.setSize(W, Hh, false);
      camera.aspect = W / Hh; camera.updateProjectionMatrix();
    }
    addEventListener('resize', resize); resize();
    addEventListener('pointermove', e => { S.mx = e.clientX / W - 0.5; S.my = e.clientY / Hh - 0.5; }, { passive: true });

    const drinksEl = document.querySelector('.drinks');
    const clock = new THREE.Clock();
    let running = true;
    const tmpLook = new THREE.Vector3();

    function frame() {
      const t = clock.getElapsedTime();
      if (S.intro > 0 && S.intro < 1) S.intro = Math.min(1, S.intro + 0.012);
      const intro = smooth(S.intro || 0);
      const mob = isMobile();
      // decide the scene from where the drinks section actually is (robust on mobile)
      const dr = drinksEl.getBoundingClientRect();
      S.mode = dr.top < Hh ? 'bar' : 'hero';
      S.enter = clamp(1 - dr.top / Hh);
      // keep the glass inside the drinks section: clip the canvas to its visible band
      if (S.mode === 'bar') canvas.style.clipPath = `inset(${Math.max(0, dr.top).toFixed(0)}px 0 ${Math.max(0, Hh - dr.bottom).toFixed(0)}px 0)`;
      else if (canvas.style.clipPath) canvas.style.clipPath = '';

      if (S.mode === 'hero') {
        renderer.setClearColor(0x000000, 0); canvas.style.zIndex = 1; hero.visible = true; bar.visible = false; scene.fog.color.set(0xf6efe5); scene.fog.near = 7; scene.fog.far = 16;
        const p = S.hero;
        const cx = mob ? 0 : 0.95, cz = mob ? 0.2 : 0;
        hero.position.set(cx, mob ? -0.55 : -0.35, cz);
        cup.rotation.y = -0.5 + p * 1.6 + S.mx * 0.25 + (1 - intro) * -1.2;
        hero.position.y += (1 - intro) * -0.6;
        // camera: three-quarter → overhead → into the crema
        const orbit = smooth(range(p, 0, 0.62));
        const dive = smooth(range(p, 0.55, 1));
        const ang = lerp(0.35, 0.05, orbit);
        const dist = lerp(mob ? 7.6 : 6.2, 3.4, orbit);
        const elev = lerp(1.7, 4.6, orbit);
        const target = new THREE.Vector3(cx - (mob ? 0 : lerp(1.55, 0, orbit)), lerp(0.35, 0.4, orbit) + hero.position.y + 0.35, cz);
        let px = target.x + Math.sin(ang) * dist + S.mx * 0.3 * (1 - p);
        let py = elev + S.my * -0.2 * (1 - p);
        let pz = target.z + Math.cos(ang) * dist;
        // dive: fly straight down onto the latte
        const top = new THREE.Vector3(cx, hero.position.y + H + (mob ? 2.6 : 2.1), cz + 0.001);
        px = lerp(px, top.x, dive); py = lerp(py, top.y, dive); pz = lerp(pz, top.z, dive);
        camera.position.set(px, py, pz);
        tmpLook.copy(target).lerp(new THREE.Vector3(cx, hero.position.y + H - 0.1, cz), dive);
        camera.lookAt(tmpLook);
        camera.fov = lerp(32, 36, dive); camera.updateProjectionMatrix();
        // steam
        steam.forEach(s => {
          const u = s.userData; u.life += 0.004 * (1 + u.speed);
          if (u.life > 1) u.life = 0;
          const l = u.life;
          s.position.set(Math.sin(t * 0.8 + u.seed + l * 5) * 0.18 * l, H + 0.05 + l * 1.5, Math.cos(t * 0.6 + u.seed) * 0.12 * l);
          const sc = 0.25 + l * 0.7; s.scale.set(sc, sc, sc);
          s.material.opacity = Math.sin(l * Math.PI) * 0.18 * intro * (1 - dive);
        });
      } else {
        renderer.setClearColor(0x000000, 0); canvas.style.zIndex = 3; hero.visible = false; bar.visible = true; scene.fog.near = 30; scene.fog.far = 60;
        const q = clamp(S.drinks, 0, 1);
        const f = q * 4;
        setMood(f);
        const gx = mob ? 0 : 0;
        const rise = 1 - smooth(clamp(S.enter));
        bar.position.set(gx, (mob ? 0 : -0.9) - rise * 4.5, 0);
        bar.rotation.y = q * Math.PI * 2.2 + t * 0.15 + S.mx * 0.4;
        highlights.rotation.y = -bar.rotation.y;
        bar.rotation.z = Math.sin(t * 0.7) * 0.02;
        ice.forEach(c => {
          const u = c.userData;
          c.position.set(Math.cos(u.a + t * 0.2) * u.r, 0.14 + FILL - 0.3 - u.h + Math.sin(t * 1.3 + u.s) * 0.03, Math.sin(u.a + t * 0.2) * u.r);
          c.rotation.set(u.s + t * 0.1, u.s * 2, u.s);
        });
        const camY = mob ? 1.0 : 1.35;
        camera.position.set(S.mx * -0.4, camY + S.my * 0.3, mob ? 14 : 6.4);
        camera.fov = 32; camera.updateProjectionMatrix();
        camera.lookAt(0, mob ? 0.05 : 0.35, 0);
      }
      renderer.render(scene, camera);
    }
    // visible only while the hero or the bar is on screen — measured, not event-driven
    (function loop() {
      const d = drinksEl.getBoundingClientRect();
      const on = d.bottom > 0 && document.querySelector('.hero').getBoundingClientRect().top < innerHeight;
      if (on !== running) { running = on; canvas.style.opacity = on ? 1 : 0; }
      if (running) frame();
      requestAnimationFrame(loop);
    })();

    return {
      ok: !!renderer.getContext(),
      S,
      set running(v) { running = v; canvas.style.opacity = v ? 1 : 0; },
      get intro() { return S.intro; }, set intro(v) { S.intro = v; }
    };
  }

  /* =============================================================
     SCROLL CHOREOGRAPHY
     ============================================================= */
  if (!hasGSAP || REDUCED) {
    if (stage) { stage.S.hero = 0; stage.intro = 1; }
    staticFallbacks();
    return;
  }

  // ---- hero: cup orbit + dive ----
  const heroLines = $$('.hero__title .ln');
  ScrollTrigger.create({
    trigger: '.hero', start: 'top top', end: 'bottom bottom', scrub: true,
    onUpdate: s => {
      const p = s.progress;
      if (stage) { stage.S.hero = p; stage.S.mode = 'hero'; }
      heroLines.forEach((l, i) => {
        const k = range(p, 0.08 + i * 0.05, 0.4 + i * 0.05);
        l.style.transform = `translateY(${-k * 120}px)`; l.style.opacity = 1 - k;
      });
      $('.hero__facts').style.opacity = 1 - range(p, 0.1, 0.3);
      $('.hero__hint').style.opacity = 1 - range(p, 0.02, 0.12);
      $('.hero__dive').style.opacity = range(p, 0.78, 0.96);
    }
  });

  // ---- drinks: glass moods ----
  const drinkEls = $$('.drink'), dpEls = $$('.dp');
  const drinkIdx = $('#drinkIdx'), drinkBar = $('#drinkBar');
  let curDrink = -1;
  ScrollTrigger.create({
    trigger: '.drinks', start: 'top top', end: 'bottom bottom', scrub: true,
    onToggle: s => { if (stage) stage.S.mode = s.isActive ? 'bar' : (s.direction < 0 ? 'hero' : stage.S.mode); },
    onUpdate: s => {
      const q = s.progress;
      if (stage) { stage.S.drinks = q; stage.S.mode = 'bar'; }
      const i = Math.min(3, Math.floor(q * 4 + 0.15));
      drinkBar.style.width = (q * 100) + '%';
      if (i !== curDrink) {
        curDrink = i;
        drinkEls.forEach(d => d.classList.toggle('is-on', +d.dataset.i === i));
        dpEls.forEach(d => d.classList.toggle('is-on', +d.dataset.i === i));
        drinkIdx.textContent = String(i + 1).padStart(2, '0');
      }
    }
  });
  ScrollTrigger.create({
    trigger: '.drinks', start: 'top bottom', end: 'top top', scrub: true,
    onUpdate: s => { if (stage) { stage.S.enter = s.progress; stage.S.drinks = 0; stage.S.mode = 'bar'; } },
    onLeaveBack: () => { if (stage) stage.S.mode = 'hero'; }
  });
  // WebGL only needs to run while the hero or the bar is on screen

  // ---- space: a stack of café photos — each arrives, holds, then passes ----
  // Only transform + opacity change per frame, so it stays smooth on any machine.
  const world = $('#roomWorld'), panels = $$('.panel', world), meter = $('#roomM');
  const list = $('#spaceList'), intro = $('.space__intro');
  const N = panels.length;
  $('#roomN').textContent = String(N).padStart(2, '0');
  panels.forEach((p, i) => {
    const li = document.createElement('li');
    li.textContent = p.querySelector('figcaption').textContent;
    list.appendChild(li);
  });
  const items = $$('li', list);
  const sides = panels.map((p, i) => (i === 0 || i === N - 1) ? 0 : (i % 2 ? -1 : 1));
  let spaceP = 0, lastActive = -1;
  function renderRoom() {
    const mob = isMobile();
    const pos = spaceP * (N - 1), k = Math.floor(pos), fr = pos - k;
    const eff = k + smooth(range(fr, 0.4, 1));             // hold for the first 40% of each step
    panels.forEach((p, i) => {
      const d = i - eff;                                    // >0 waiting behind, 0 in front, <0 gone past
      let ez, o;
      if (d >= 0) { ez = -d * 560; o = d < 1.6 ? 1 : clamp(1 - (d - 1.6) / 0.8); }
      else { ez = -d * 1100; o = clamp(1 + d / 0.45); }
      const sd = sides[i];
      p.style.transform = `translate3d(${sd * (mob ? 3 : 1.6)}vw,0,${ez.toFixed(1)}px) rotateZ(${sd * 2}deg)`;
      p.style.opacity = o.toFixed(3);
      p.style.visibility = o < 0.01 ? 'hidden' : 'visible';
      p.style.zIndex = String(100 - i);
    });
    const active = Math.min(N - 1, Math.round(eff));
    if (active !== lastActive) {
      lastActive = active;
      items.forEach((li, i) => li.classList.toggle('is-on', i === active));
      meter.textContent = String(active + 1).padStart(2, '0');
    }
    if (mob) {
      intro.style.opacity = 1 - range(spaceP, 0.03, 0.1);
      intro.style.transform = `translateY(${-range(spaceP, 0.03, 0.1) * 40}px)`;
    } else { intro.style.opacity = ''; intro.style.transform = ''; }
  }
  ScrollTrigger.create({ trigger: '.space', start: 'top top', end: 'bottom bottom', scrub: 0.5, onUpdate: s => { spaceP = s.progress; renderRoom(); } });
  addEventListener('resize', renderRoom);
  renderRoom();

  // ---- kitchen: rotating ring (scroll + drag with inertia) ----
  const spin = $('#ringSpin'), cards = $$('.card', spin);
  const step = 360 / cards.length;
  cards.forEach((c, i) => { c.style.transform = `rotateY(${i * step}deg) translateZ(var(--r))`; });
  let ringScroll = 0, drag = 0, vel = 0, dragging = false, lastX = 0;
  function renderRing() {
    const rot = -ringScroll * 300 + drag;
    spin.style.transform = `translateZ(calc(var(--r, 560px) * -0.3)) rotateX(-9deg) rotateY(${rot}deg)`;
    // lift the card facing us
    cards.forEach((c, i) => {
      let a = ((i * step + rot) % 360 + 360) % 360; if (a > 180) a -= 360;
      const f = Math.cos(a * Math.PI / 180);
      c.style.opacity = (0.55 + 0.45 * Math.max(0, f)).toFixed(3);
    });
  }
  ScrollTrigger.create({ trigger: '.kitchen', start: 'top bottom', end: 'bottom top', scrub: 0.8, onUpdate: s => { ringScroll = s.progress; renderRing(); } });
  const ring = $('#ring');
  ring.addEventListener('pointerdown', e => { dragging = true; lastX = e.clientX; vel = 0; ring.setPointerCapture(e.pointerId); });
  ring.addEventListener('pointermove', e => { if (!dragging) return; const dx = e.clientX - lastX; lastX = e.clientX; drag += dx * 0.25; vel = dx * 0.25; renderRing(); });
  const end = () => { dragging = false; };
  ring.addEventListener('pointerup', end); ring.addEventListener('pointercancel', end);
  (function inertia() { if (!dragging && Math.abs(vel) > 0.02) { drag += vel; vel *= 0.94; renderRing(); } requestAnimationFrame(inertia); })();
  renderRing();

  // ---- reels: the fan opens as it scrolls in ----
  const fan = $('#fan');
  gsap.fromTo(fan, { '--spread': '6%', '--turn': '0deg', '--tilt': '0deg' }, {
    '--spread': isMobile() ? '44%' : '62%', '--turn': isMobile() ? '-10deg' : '-14deg', '--tilt': isMobile() ? '2deg' : '3deg',
    ease: 'none', scrollTrigger: { trigger: '.reels', start: 'top 80%', end: 'top 10%', scrub: 0.6 }
  });
  $$('.phone', fan).forEach(p => {
    p.addEventListener('mouseenter', () => { p.style.transform += ' translateY(-18px) scale(1.04)'; p.style.zIndex = 5; });
    p.addEventListener('mouseleave', () => { p.style.transform = ''; p.style.zIndex = ''; });
  });
  videoOnView();

  const foot = $('.foot');
  new IntersectionObserver(([e]) => foot.classList.toggle('is-live', e.isIntersecting)).observe(foot);

  // ---- small parallax touches ----

  gsap.utils.toArray('.stack').forEach((el, i) => {
    gsap.fromTo(el, { y: 60 + i * 30 }, { y: -40 - i * 20, ease: 'none', scrollTrigger: { trigger: '.happening', start: 'top bottom', end: 'bottom top', scrub: true } });
  });
  gsap.fromTo('.visit__bg', { yPercent: -6 }, { yPercent: 6, ease: 'none', scrollTrigger: { trigger: '.visit', start: 'top bottom', end: 'bottom top', scrub: true } });
  gsap.utils.toArray('.happening__text > *, .word__quotes li, .visit__card > *, .reels__head > *').forEach(el => {
    gsap.from(el, { y: 36, opacity: 0, duration: 1, ease: 'expo.out', scrollTrigger: { trigger: el, start: 'top 88%' } });
  });
  gsap.from('.word__score b', { textContent: 0, snap: { textContent: 0.1 }, duration: 1.6, ease: 'power2.out', scrollTrigger: { trigger: '.word', start: 'top 75%' },
    onUpdate() { const b = $('.word__score b'); b.textContent = (+b.textContent).toFixed(1); } });

  addEventListener('load', () => ScrollTrigger.refresh());

  /* ---------------- helpers ---------------- */
  function videoOnView() {
    const vids = $$('video[data-src]');
    const io = new IntersectionObserver(entries => entries.forEach(en => {
      const v = en.target;
      if (en.isIntersecting) {
        if (!v.src) v.src = v.dataset.src;
        v.play().catch(() => {});
      } else v.pause();
    }), { threshold: 0.25 });
    vids.forEach(v => io.observe(v));
  }
  function staticFallbacks() {
    $$('.drink, .dp').forEach(d => d.classList.add('is-on'));
    videoOnView();
  }
})();
