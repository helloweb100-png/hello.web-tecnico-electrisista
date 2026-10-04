/* =====================================================================
   TECNICO ELECTRICISTA - SCRIPT PRINCIPAL
   ---------------------------------------------------------------------
   Orden:
   1. Utilidades y configuracion
   2. Enlaces de WhatsApp
   3. Header, menu movil y navegacion activa
   4. Visor de fotos, FAQ y formulario (no dependen de GSAP)
   5. Campo electrico del hero (canvas)
   6. Preloader
   7. Movimiento con GSAP + ScrollTrigger (+ Lenis)
   8. Arranque
   Regla: si GSAP o Lenis no cargan, el sitio sigue siendo 100% usable.
   ===================================================================== */
(() => {
    'use strict';

    /* ------------------------------------------------------------------
       1. UTILIDADES
       ------------------------------------------------------------------ */
    const $ = (sel, ctx = document) => ctx.querySelector(sel);
    const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));
    const root = document.documentElement;
    const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    const hasGSAP = typeof window.gsap !== 'undefined' && typeof window.ScrollTrigger !== 'undefined';

    let lenis = null;

    /* ------------------------------------------------------------------
       2. ENLACES DE WHATSAPP (mensaje precargado por sintoma)
       ------------------------------------------------------------------ */
    function initWhatsAppLinks() {
        $$('[data-wa-text]').forEach((link) => {
            const base = link.getAttribute('href').split('?')[0];
            link.setAttribute('href', base + '?text=' + encodeURIComponent(link.dataset.waText));
        });
    }

    /* ------------------------------------------------------------------
       3. HEADER, MENU MOVIL, NAVEGACION ACTIVA
       ------------------------------------------------------------------ */
    function initHeader() {
        const header = $('#site-header');

        // Estado "scrolled" con IntersectionObserver (sin listeners de scroll)
        const sentinel = document.createElement('div');
        sentinel.setAttribute('aria-hidden', 'true');
        sentinel.style.cssText = 'position:absolute;top:0;left:0;width:1px;height:48px;pointer-events:none;';
        document.body.prepend(sentinel);
        new IntersectionObserver(([entry]) => {
            header.classList.toggle('is-scrolled', !entry.isIntersecting);
        }).observe(sentinel);

        // Enlace activo segun la seccion visible
        const links = $$('a[data-nav]');
        const map = new Map(links.map((a) => [a.getAttribute('href').slice(1), a]));
        const spy = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (!entry.isIntersecting) return;
                links.forEach((a) => a.classList.remove('is-active'));
                const active = map.get(entry.target.id);
                if (active) active.classList.add('is-active');
            });
        }, { rootMargin: '-45% 0px -50% 0px' });
        map.forEach((_, id) => { const section = document.getElementById(id); if (section) spy.observe(section); });
    }

    function initMenu() {
        const toggle = $('#menu-toggle');
        const menu = $('#mobile-menu');
        if (!toggle || !menu) return { close() {} };

        const setOpen = (open) => {
            menu.classList.toggle('is-open', open);
            toggle.setAttribute('aria-expanded', String(open));
            toggle.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú');
            root.classList.toggle('menu-open', open);
            if (open) menu.removeAttribute('inert'); else menu.setAttribute('inert', '');
            if (lenis) { open ? lenis.stop() : lenis.start(); }
        };

        toggle.addEventListener('click', () => setOpen(!menu.classList.contains('is-open')));
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && menu.classList.contains('is-open')) { setOpen(false); toggle.focus(); }
        });
        window.matchMedia('(min-width: 1024px)').addEventListener('change', (e) => { if (e.matches) setOpen(false); });

        return { close: () => setOpen(false), isOpen: () => menu.classList.contains('is-open') };
    }

    // Anclas: scroll suave con Lenis si existe, nativo si no
    function initAnchors(menu) {
        document.addEventListener('click', (e) => {
            const link = e.target.closest('a[href^="#"]');
            if (!link) return;
            const hash = link.getAttribute('href');
            if (hash.length < 2) return;
            const target = document.querySelector(hash);
            if (!target) return;

            if (menu.isOpen && menu.isOpen()) menu.close();
            if (lenis) {
                e.preventDefault();
                lenis.scrollTo(target, { offset: -64, duration: 1.5 });
                history.replaceState(null, '', hash);
            }
        });
    }

    /* ------------------------------------------------------------------
       4. VISOR DE FOTOS, FAQ, FORMULARIO
       ------------------------------------------------------------------ */
    function initLightbox() {
        const box = $('#lightbox');
        if (!box) return;
        const img = $('#lightbox-img');
        const cap = $('#lightbox-cap');

        $$('[data-lightbox]').forEach((btn) => {
            btn.addEventListener('click', () => {
                if (typeof box.showModal !== 'function') { window.open(btn.dataset.full, '_blank'); return; }
                img.src = btn.dataset.full;
                img.alt = $('img', btn).alt;
                cap.textContent = btn.dataset.caption || '';
                root.classList.add('lb-open');
                if (lenis) lenis.stop();
                box.showModal();
            });
        });

        box.addEventListener('click', (e) => {
            if (e.target === box || e.target.closest('.lightbox__close')) box.close();
        });
        box.addEventListener('close', () => {
            root.classList.remove('lb-open');
            if (lenis) lenis.start();
            img.removeAttribute('src');
        });
    }

    function initFaq() {
        const items = $$('.faq__item');
        const duration = reduceMotion ? 0 : 420;
        const ease = 'cubic-bezier(.16,1,.3,1)';
        const refresh = () => { if (hasGSAP) setTimeout(() => ScrollTrigger.refresh(), duration + 60); };

        const openItem = (item) => {
            const panel = $('.faq__a', item);
            item.open = true;
            if (duration) panel.animate([{ height: '0px', opacity: 0 }, { height: panel.scrollHeight + 'px', opacity: 1 }], { duration, easing: ease });
            refresh();
        };
        const closeItem = (item) => {
            const panel = $('.faq__a', item);
            if (!duration) { item.open = false; refresh(); return; }
            const anim = panel.animate([{ height: panel.offsetHeight + 'px', opacity: 1 }, { height: '0px', opacity: 0 }], { duration: duration * 0.8, easing: ease, fill: 'forwards' });
            anim.onfinish = () => { item.open = false; anim.cancel(); refresh(); };
        };

        items.forEach((item) => {
            $('summary', item).addEventListener('click', (e) => {
                e.preventDefault();
                if (item.open) { closeItem(item); return; }
                items.forEach((other) => { if (other !== item && other.open) closeItem(other); });
                openItem(item);
            });
        });
    }

    function initForm() {
        const form = $('#wa-form');
        if (!form) return;
        const number = form.dataset.waNumber;
        const status = $('#form-status');
        const rules = {
            nombre: 'Escribe tu nombre.',
            servicio: 'Selecciona qué necesitas.',
            zona: 'Indica tu colonia o municipio.'
        };

        const validate = (field) => {
            const error = $('#' + field.id + '-err');
            const invalid = !field.value.trim();
            field.setAttribute('aria-invalid', String(invalid));
            if (error) error.textContent = invalid ? rules[field.name] : '';
            return !invalid;
        };

        const required = Object.keys(rules).map((name) => form.elements[name]);
        required.forEach((field) => {
            field.addEventListener('blur', () => validate(field));
            field.addEventListener('input', () => { if (field.getAttribute('aria-invalid') === 'true') validate(field); });
        });

        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const results = required.map(validate);
            const firstBad = required[results.indexOf(false)];
            if (firstBad) { firstBad.focus(); return; }

            const data = new FormData(form);
            const lines = [
                'Hola, soy ' + data.get('nombre').trim() + '.',
                'Necesito: ' + data.get('servicio') + '.',
                'Urgencia: ' + data.get('urgencia') + '.',
                'Zona: ' + data.get('zona').trim() + '.'
            ];
            const details = (data.get('detalles') || '').trim();
            if (details) lines.push('Detalles: ' + details);

            const url = 'https://wa.me/' + number + '?text=' + encodeURIComponent(lines.join('\n'));
            const win = window.open(url, '_blank');
            if (win) win.opener = null;

            status.innerHTML = '';
            status.append('Abrimos WhatsApp con tu mensaje listo. Si no se abrió, ');
            const again = document.createElement('a');
            again.href = url;
            again.target = '_blank';
            again.rel = 'noopener noreferrer';
            again.textContent = 'toca aquí';
            status.append(again, '.');
        });
    }

    /* ------------------------------------------------------------------
       5. CAMPO ELECTRICO DEL HERO (canvas)
       - Trazas de circuito con pulsos de energia viajando por ellas
       - Rayos automaticos entre nodos
       - Arco corto del nodo mas cercano hacia el cursor
       - Rayo mayor al hacer clic en el hero
       Pausa cuando el hero sale de pantalla o la pestana se oculta.
       ------------------------------------------------------------------ */
    function initHeroField() {
        const hero = $('#inicio');
        const canvas = $('#hero-canvas');
        const flash = $('.hero__flash');
        if (!hero || !canvas || !canvas.getContext) return;

        const ctx = canvas.getContext('2d');
        const ACC = '240,190,46';
        const CORE = '255,246,214';
        const DIRS = [[1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1], [1, -1]];
        const rand = (a, b) => a + Math.random() * (b - a);
        const pick = (arr) => arr[(Math.random() * arr.length) | 0];

        const layer = document.createElement('canvas');
        const lctx = layer.getContext('2d');

        let W = 0, H = 0, DPR = 1, grid = 68;
        let traces = [], nodes = [], pulses = [], bolts = [];
        let rafId = 0, last = 0, nextAuto = 0, running = false, inView = true;
        let lastArc = 0;

        /* --- construccion de trazas --- */
        function build() {
            const rect = hero.getBoundingClientRect();
            W = Math.max(1, rect.width);
            H = Math.max(1, rect.height);
            DPR = Math.min(window.devicePixelRatio || 1, W < 700 ? 1.5 : 1.75);
            canvas.width = layer.width = Math.round(W * DPR);
            canvas.height = layer.height = Math.round(H * DPR);

            grid = W < 700 ? 52 : 68;
            traces = []; nodes = []; pulses = []; bolts = [];
            const cols = Math.floor(W / grid);
            const rows = Math.floor(H / grid);
            const count = W < 700 ? 16 : 34;

            for (let i = 0; i < count; i++) {
                let gx = (Math.random() * cols) | 0;
                let gy = (Math.random() * rows) | 0;
                let d = (Math.random() * 8) | 0;
                const pts = [[gx * grid + grid / 2, gy * grid + grid / 2]];
                const segments = 4 + ((Math.random() * 7) | 0);
                for (let s = 0; s < segments; s++) {
                    d = (d + pick([0, 0, 1, -1, 2, -2]) + 8) % 8;
                    const len = 1 + ((Math.random() * 3) | 0);
                    const nx = gx + DIRS[d][0] * len;
                    const ny = gy + DIRS[d][1] * len;
                    if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) break;
                    gx = nx; gy = ny;
                    pts.push([gx * grid + grid / 2, gy * grid + grid / 2]);
                }
                if (pts.length < 3) continue;
                const cum = [0];
                for (let k = 1; k < pts.length; k++) {
                    cum.push(cum[k - 1] + Math.hypot(pts[k][0] - pts[k - 1][0], pts[k][1] - pts[k - 1][1]));
                }
                traces.push({ pts, cum, total: cum[cum.length - 1] });
                nodes.push(pts[0], pts[pts.length - 1]);
            }

            // Capa estatica (trazas y nodos): se dibuja una sola vez
            lctx.setTransform(DPR, 0, 0, DPR, 0, 0);
            lctx.clearRect(0, 0, W, H);
            lctx.lineJoin = 'round';
            lctx.lineCap = 'round';
            traces.forEach((t) => {
                lctx.beginPath();
                t.pts.forEach((p, i) => (i ? lctx.lineTo(p[0], p[1]) : lctx.moveTo(p[0], p[1])));
                lctx.strokeStyle = 'rgba(' + ACC + ',.11)';
                lctx.lineWidth = 1.2;
                lctx.stroke();
                [t.pts[0], t.pts[t.pts.length - 1]].forEach((p) => {
                    lctx.beginPath();
                    lctx.arc(p[0], p[1], 3.4, 0, 6.2832);
                    lctx.strokeStyle = 'rgba(' + ACC + ',.3)';
                    lctx.stroke();
                    lctx.beginPath();
                    lctx.arc(p[0], p[1], 1.1, 0, 6.2832);
                    lctx.fillStyle = 'rgba(' + ACC + ',.5)';
                    lctx.fill();
                });
            });

            const pulseCount = W < 700 ? 9 : 20;
            for (let i = 0; i < pulseCount && traces.length; i++) pulses.push(newPulse(true));
        }

        function newPulse(randomStart) {
            const trace = pick(traces);
            const dir = Math.random() < 0.5 ? 1 : -1;
            return {
                trace, dir,
                d: randomStart ? rand(0, trace.total) : (dir === 1 ? 0 : trace.total),
                speed: rand(110, 280),
                len: rand(70, 150)
            };
        }

        function pointAt(trace, dist) {
            const d = Math.max(0, Math.min(trace.total, dist));
            const cum = trace.cum;
            let i = 1;
            while (i < cum.length - 1 && cum[i] < d) i++;
            const seg = cum[i] - cum[i - 1] || 1;
            const t = (d - cum[i - 1]) / seg;
            const a = trace.pts[i - 1], b = trace.pts[i];
            return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
        }

        /* --- rayos --- */
        function jagged(x1, y1, x2, y2) {
            let pts = [[x1, y1], [x2, y2]];
            let disp = Math.hypot(x2 - x1, y2 - y1) * 0.2;
            for (let it = 0; it < 6; it++) {
                const next = [pts[0]];
                for (let j = 1; j < pts.length; j++) {
                    const a = pts[j - 1], b = pts[j];
                    const dx = b[0] - a[0], dy = b[1] - a[1];
                    const l = Math.hypot(dx, dy) || 1;
                    const o = (Math.random() - 0.5) * disp;
                    next.push([(a[0] + b[0]) / 2 - (dy / l) * o, (a[1] + b[1]) / 2 + (dx / l) * o], b);
                }
                pts = next;
                disp *= 0.55;
            }
            return pts;
        }

        function addBolt(x1, y1, x2, y2, opts) {
            const o = Object.assign({ life: 0.34, width: 1, branches: true }, opts);
            const main = jagged(x1, y1, x2, y2);
            const paths = [{ pts: main, w: o.width }];
            if (o.branches) {
                const n = 1 + ((Math.random() * 2) | 0);
                const length = Math.hypot(x2 - x1, y2 - y1);
                for (let k = 0; k < n; k++) {
                    const p = main[(main.length * rand(0.25, 0.75)) | 0];
                    const ang = Math.atan2(y2 - y1, x2 - x1) + (Math.random() < 0.5 ? -1 : 1) * rand(0.5, 0.95);
                    const bl = length * rand(0.14, 0.28);
                    paths.push({ pts: jagged(p[0], p[1], p[0] + Math.cos(ang) * bl, p[1] + Math.sin(ang) * bl), w: o.width * 0.55 });
                }
            }
            bolts.push({ paths, life: o.life, age: 0 });
            if (bolts.length > 8) bolts.shift();
        }

        function triggerFlash() {
            if (!flash) return;
            flash.classList.remove('is-on');
            void flash.offsetWidth;
            flash.classList.add('is-on');
        }

        function autoStrike() {
            if (nodes.length < 2) return;
            if (Math.random() < 0.34) {
                // Descarga grande desde arriba hacia un nodo
                const n = pick(nodes);
                addBolt(rand(W * 0.2, W * 0.95), -10, n[0], n[1], { life: 0.42 });
                triggerFlash();
            } else {
                const a = pick(nodes);
                const near = nodes.filter((n) => { const d = Math.hypot(n[0] - a[0], n[1] - a[1]); return d > 90 && d < 380; });
                if (near.length) { const b = pick(near); addBolt(a[0], a[1], b[0], b[1], { life: 0.3 }); }
            }
        }

        function pointerArc(clientX, clientY) {
            const now = performance.now();
            if (now - lastArc < 240 || !nodes.length) return;
            const rect = hero.getBoundingClientRect();
            const x = clientX - rect.left, y = clientY - rect.top;
            let best = null, bestD = 300;
            for (const n of nodes) {
                const d = Math.hypot(n[0] - x, n[1] - y);
                if (d < bestD) { bestD = d; best = n; }
            }
            if (best && bestD > 24) { addBolt(best[0], best[1], x, y, { life: 0.17, width: 0.8, branches: false }); lastArc = now; }
        }

        /* --- dibujo --- */
        function drawPulse(p) {
            const steps = 10;
            const head = p.d, tail = p.d - p.dir * p.len;
            for (let i = 0; i < steps; i++) {
                const a = pointAt(p.trace, tail + (head - tail) * (i / steps));
                const b = pointAt(p.trace, tail + (head - tail) * ((i + 1) / steps));
                ctx.beginPath();
                ctx.moveTo(a[0], a[1]);
                ctx.lineTo(b[0], b[1]);
                ctx.strokeStyle = 'rgba(' + ACC + ',' + (((i + 1) / steps) * 0.9).toFixed(3) + ')';
                ctx.lineWidth = 1.2 + i * 0.13;
                ctx.stroke();
            }
            const h = pointAt(p.trace, head);
            ctx.beginPath(); ctx.arc(h[0], h[1], 7, 0, 6.2832); ctx.fillStyle = 'rgba(' + ACC + ',.16)'; ctx.fill();
            ctx.beginPath(); ctx.arc(h[0], h[1], 2.1, 0, 6.2832); ctx.fillStyle = 'rgba(' + CORE + ',.95)'; ctx.fill();
        }

        function drawBolt(b) {
            const fade = Math.pow(1 - b.age / b.life, 0.8);
            const alpha = fade * rand(0.6, 1);
            b.paths.forEach((path) => {
                [[9, 0.1, ACC], [4, 0.3, ACC], [1.6, 0.95, CORE]].forEach(([width, a, color]) => {
                    ctx.beginPath();
                    path.pts.forEach((pt, i) => (i ? ctx.lineTo(pt[0], pt[1]) : ctx.moveTo(pt[0], pt[1])));
                    ctx.strokeStyle = 'rgba(' + color + ',' + (a * alpha).toFixed(3) + ')';
                    ctx.lineWidth = width * path.w;
                    ctx.stroke();
                });
            });
        }

        function render(dt, ts) {
            ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
            ctx.globalCompositeOperation = 'source-over';
            ctx.clearRect(0, 0, W, H);
            ctx.drawImage(layer, 0, 0, W, H);

            ctx.globalCompositeOperation = 'lighter';
            ctx.lineJoin = 'round';
            ctx.lineCap = 'round';

            pulses.forEach((p, i) => {
                p.d += p.dir * p.speed * dt;
                const out = p.dir === 1 ? p.d - p.len > p.trace.total : p.d + p.len < 0;
                if (out) pulses[i] = newPulse(false);
                else drawPulse(p);
            });

            for (let i = bolts.length - 1; i >= 0; i--) {
                const b = bolts[i];
                b.age += dt;
                if (b.age >= b.life) { bolts.splice(i, 1); continue; }
                drawBolt(b);
            }

            if (ts > nextAuto) { autoStrike(); nextAuto = ts + rand(1900, 4200); }
        }

        function frame(ts) {
            rafId = requestAnimationFrame(frame);
            const dt = Math.min(0.05, (ts - last) / 1000 || 0.016);
            last = ts;
            render(dt, ts);
        }

        function start() { if (running || reduceMotion) return; running = true; last = performance.now(); rafId = requestAnimationFrame(frame); }
        function stop() { running = false; cancelAnimationFrame(rafId); }
        function sync() { (inView && !document.hidden) ? start() : stop(); }

        /* --- eventos --- */
        build();
        if (reduceMotion) { render(0, 0); }
        else { nextAuto = performance.now() + 1500; }

        let resizeTimer;
        new ResizeObserver(() => {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(() => { build(); if (reduceMotion) render(0, 0); }, 150);
        }).observe(hero);

        new IntersectionObserver(([entry]) => { inView = entry.isIntersecting; sync(); }).observe(hero);
        document.addEventListener('visibilitychange', sync);

        if (!reduceMotion) {
            hero.addEventListener('pointermove', (e) => { if (e.pointerType === 'mouse') pointerArc(e.clientX, e.clientY); }, { passive: true });
            hero.addEventListener('pointerdown', (e) => {
                if (e.target.closest('a, button, input, select, textarea, summary')) return;
                const rect = hero.getBoundingClientRect();
                const x = e.clientX - rect.left, y = e.clientY - rect.top;
                addBolt(x + rand(-120, 120), -10, x, y, { life: 0.5, width: 1.25 });
                triggerFlash();
            });
            sync();
        }
    }

    /* ------------------------------------------------------------------
       6. PRELOADER
       ------------------------------------------------------------------ */
    function runPreloader(onOpen) {
        const pre = $('#preloader');
        if (!pre) { onOpen(); return; }

        root.classList.add('is-loading');
        const countEl = $('#preloader-count');
        const arc = $('.preloader__arc', pre);
        const CIRC = 2 * Math.PI * 52;
        const loaded = document.readyState === 'complete'
            ? Promise.resolve()
            : new Promise((resolve) => window.addEventListener('load', resolve, { once: true }));

        const close = () => { pre.remove(); root.classList.remove('is-loading'); };

        // Sin GSAP o con movimiento reducido: salida simple
        if (!hasGSAP || reduceMotion) {
            Promise.race([loaded.then(() => wait(reduceMotion ? 0 : 300)), wait(4000)]).then(() => {
                pre.style.transition = 'opacity .3s';
                pre.style.opacity = '0';
                return wait(300);
            }).then(() => { close(); onOpen(); });
            return;
        }

        const state = { v: 0 };
        const paint = () => {
            countEl.textContent = Math.round(state.v);
            arc.style.strokeDashoffset = CIRC * (1 - state.v / 100);
        };
        const climb = gsap.to(state, { v: 90, duration: 1.7, ease: 'power2.out', onUpdate: paint });

        Promise.race([Promise.all([loaded, wait(1800)]), wait(5500)]).then(() => {
            climb.kill();
            gsap.timeline({ onComplete: close })
                .to(state, { v: 100, duration: 0.4, ease: 'power1.out', onUpdate: paint })
                .to('.preloader__core', { scale: 0.86, opacity: 0, duration: 0.45, ease: 'power2.in' }, '+=0.15')
                .add('open')
                .add(() => { root.classList.remove('is-loading'); onOpen(); }, 'open')
                .to('.preloader__shutter--top', { yPercent: -101, duration: 1.05, ease: 'power4.inOut' }, 'open')
                .to('.preloader__shutter--bottom', { yPercent: 101, duration: 1.05, ease: 'power4.inOut' }, 'open');
        });
    }

    /* ------------------------------------------------------------------
       7. MOVIMIENTO: GSAP + SCROLLTRIGGER (+ LENIS)
       ------------------------------------------------------------------ */
    function splitWords(el) {
        const walk = (node) => {
            if (node.nodeType === 3) {
                const frag = document.createDocumentFragment();
                node.textContent.split(/(\s+)/).forEach((part) => {
                    if (!part) return;
                    if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(' ')); return; }
                    const w = document.createElement('span');
                    const inner = document.createElement('span');
                    w.className = 'w';
                    inner.className = 'wi';
                    inner.textContent = part;
                    w.appendChild(inner);
                    frag.appendChild(w);
                });
                node.replaceWith(frag);
            } else if (node.nodeType === 1) {
                Array.from(node.childNodes).forEach(walk);
            }
        };
        walk(el);
    }

    function initSmoothScroll() {
        if (!(hasGSAP && finePointer && !reduceMotion && typeof window.Lenis !== 'undefined')) return;
        lenis = new window.Lenis({
            duration: 1.2,
            easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
            smoothWheel: true
        });
        lenis.on('scroll', ScrollTrigger.update);
        gsap.ticker.add((time) => lenis.raf(time * 1000));
        gsap.ticker.lagSmoothing(0);
        lenis.stop(); // arranca al abrirse el preloader
    }

    function prepareHeroIntro() {
        gsap.set('.site-header', { yPercent: -100, opacity: 0 });
        gsap.set('.hero__title .line__in', { yPercent: 120 });
        gsap.set('[data-hero-in]', { y: 28, opacity: 0 });
        gsap.set('#hero-figure', { opacity: 0, y: 50 });
        gsap.set('.hero__frame', { clipPath: 'inset(14% 8% 14% 8% round 20px)' });
    }

    function playHeroIntro() {
        const tl = gsap.timeline({ defaults: { ease: 'expo.out' }, onComplete: () => { startRotator(); initHeroParallax(); } });
        tl.to('.site-header', { yPercent: 0, opacity: 1, duration: 1.1, clearProps: 'transform' }, 0)
          .to('.hero .eyebrow', { y: 0, opacity: 1, duration: 1 }, 0.05)
          .to('.hero__title .line__in', { yPercent: 0, duration: 1.4, stagger: 0.14 }, 0.12)
          .to('.hero__sub', { y: 0, opacity: 1, duration: 1.1 }, 0.5)
          .to('.hero__actions', { y: 0, opacity: 1, duration: 1.1 }, 0.62)
          .to('#hero-figure', { y: 0, opacity: 1, duration: 1.6 }, 0.3)
          .to('.hero__frame', { clipPath: 'inset(0% 0% 0% 0% round 20px)', duration: 1.6, clearProps: 'clipPath' }, 0.3);
    }

    // Palabra rotativa del titular (comunica los tres tipos de cliente)
    function startRotator() {
        const words = $$('#rot .rot__w');
        if (words.length < 2) return;
        gsap.set(words, { autoAlpha: 0, yPercent: 110 });
        gsap.set(words[0], { autoAlpha: 1, yPercent: 0 });
        let i = 0;
        const next = () => {
            const current = words[i];
            i = (i + 1) % words.length;
            const incoming = words[i];
            gsap.timeline({ onComplete: () => gsap.delayedCall(2.3, next) })
                .to(current, { yPercent: -110, autoAlpha: 0, duration: 0.7, ease: 'expo.inOut' })
                .fromTo(incoming, { yPercent: 110, autoAlpha: 0 }, { yPercent: 0, autoAlpha: 1, duration: 0.85, ease: 'expo.out' }, '-=0.45');
        };
        gsap.delayedCall(2.4, next);
    }

    // Foto del hero se inclina levemente con el cursor
    function initHeroParallax() {
        if (!finePointer) return;
        const hero = $('#inicio');
        const fig = $('#hero-figure');
        const xTo = gsap.quickTo(fig, 'x', { duration: 0.9, ease: 'power3' });
        const yTo = gsap.quickTo(fig, 'y', { duration: 0.9, ease: 'power3' });
        hero.addEventListener('pointermove', (e) => {
            const r = hero.getBoundingClientRect();
            xTo(((e.clientX - r.left) / r.width - 0.5) * -22);
            yTo(((e.clientY - r.top) / r.height - 0.5) * -16);
        }, { passive: true });
    }

    function initScrollMotion() {
        gsap.registerPlugin(ScrollTrigger);
        ScrollTrigger.config({ ignoreMobileResize: true });

        // Barra de progreso (corriente que avanza)
        const bar = $('.progress__bar');
        ScrollTrigger.create({ start: 0, end: 'max', onUpdate: (self) => { bar.style.transform = 'scaleX(' + self.progress + ')'; } });

        // Titulares palabra por palabra
        $$('.split').forEach(splitWords);
        gsap.set('.split .wi', { yPercent: 115 });
        ScrollTrigger.batch('.split', {
            start: 'top 88%',
            once: true,
            onEnter: (batch) => batch.forEach((h) => gsap.to($$('.wi', h), { yPercent: 0, duration: 1.1, ease: 'expo.out', stagger: 0.045 }))
        });

        // Entradas generales
        gsap.set('[data-reveal]', { y: 36, opacity: 0 });
        ScrollTrigger.batch('[data-reveal]', {
            start: 'top 90%',
            once: true,
            batchMax: 6,
            interval: 0.1,
            onEnter: (batch) => {
                batch.forEach((el) => { el.style.transition = 'none'; });
                gsap.to(batch, {
                    y: 0, opacity: 1, duration: 1.1, ease: 'expo.out', stagger: 0.08, overwrite: true, clearProps: 'transform,opacity',
                    onComplete: () => batch.forEach((el) => { el.style.transition = ''; })
                });
            }
        });

        // Paralaje suave en fotos
        $$('.tile__media img, [data-parallax]').forEach((img) => {
            gsap.fromTo(img, { yPercent: -4 }, {
                yPercent: 4, ease: 'none',
                scrollTrigger: { trigger: img.parentElement, start: 'top bottom', end: 'bottom top', scrub: true }
            });
        });

        // Linea de proceso: la corriente baja por la linea y enciende cada nodo
        const timeline = $('#timeline');
        if (timeline) {
            ScrollTrigger.create({
                trigger: timeline, start: 'top 72%', end: 'bottom 62%',
                onUpdate: (self) => timeline.style.setProperty('--p', self.progress.toFixed(3))
            });
            $$('.timeline__item', timeline).forEach((item) => {
                ScrollTrigger.create({
                    trigger: item, start: 'top 68%',
                    onEnter: () => item.classList.add('is-active'),
                    onLeaveBack: () => item.classList.remove('is-active')
                });
            });
        }

        // Galeria: en escritorio el scroll vertical mueve la galeria en horizontal
        const mm = gsap.matchMedia();
        mm.add('(min-width: 1024px)', () => {
            const section = $('.works');
            const track = $('#works-track');
            if (!section || !track) return;
            track.style.overflow = 'visible';
            track.style.scrollSnapType = 'none';
            const gutter = parseFloat(getComputedStyle(track).paddingLeft) || 32;
            const distance = () => Math.max(0, track.scrollWidth - track.clientWidth + gutter);

            gsap.to(track, {
                x: () => -distance(),
                ease: 'none',
                scrollTrigger: {
                    trigger: section, start: 'top top', end: () => '+=' + distance(),
                    pin: true, scrub: 1, anticipatePin: 1, invalidateOnRefresh: true
                }
            });
            return () => { track.style.overflow = ''; track.style.scrollSnapType = ''; };
        });

        // Mapa de cobertura entra con revelado
        gsap.from('.coverage__map', {
            clipPath: 'inset(0 0 12% 0)', ease: 'none',
            scrollTrigger: { trigger: '.coverage', start: 'top bottom', end: 'top 40%', scrub: true }
        });
    }

    // Efectos de puntero (solo mouse): foco que sigue al cursor y botones magneticos
    function initPointerFx() {
        if (!finePointer || reduceMotion) return;

        $$('[data-spot]').forEach((el) => {
            let queued = false;
            el.addEventListener('pointermove', (e) => {
                if (queued) return;
                queued = true;
                requestAnimationFrame(() => {
                    const r = el.getBoundingClientRect();
                    el.style.setProperty('--mx', (e.clientX - r.left) + 'px');
                    el.style.setProperty('--my', (e.clientY - r.top) + 'px');
                    queued = false;
                });
            }, { passive: true });
        });

        if (!hasGSAP) return;
        $$('[data-magnetic]').forEach((el) => {
            const xTo = gsap.quickTo(el, 'x', { duration: 0.6, ease: 'power3' });
            const yTo = gsap.quickTo(el, 'y', { duration: 0.6, ease: 'power3' });
            el.addEventListener('pointermove', (e) => {
                const r = el.getBoundingClientRect();
                xTo((e.clientX - (r.left + r.width / 2)) * 0.22);
                yTo((e.clientY - (r.top + r.height / 2)) * 0.32);
            });
            el.addEventListener('pointerleave', () => { xTo(0); yTo(0); });
        });
    }

    /* ------------------------------------------------------------------
       8. ARRANQUE
       ------------------------------------------------------------------ */
    function init() {
        initWhatsAppLinks();
        initHeader();
        const menu = initMenu();
        initLightbox();
        initFaq();
        initForm();
        initHeroField();

        if (hasGSAP && !reduceMotion) {
            initSmoothScroll();
            initAnchors(menu);
            prepareHeroIntro();
            initScrollMotion();
            initPointerFx();
            runPreloader(() => {
                if (lenis) lenis.start();
                playHeroIntro();
            });
            const refresh = () => ScrollTrigger.refresh();
            window.addEventListener('load', refresh, { once: true });
            if (document.fonts && document.fonts.ready) document.fonts.ready.then(refresh);
        } else {
            initAnchors(menu);
            initPointerFx();
            runPreloader(() => {});
        }
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();
