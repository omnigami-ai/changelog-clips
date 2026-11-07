// Fixed native moment. Adapt config, captures and fields; keep native state changes intact.
(() => {
  const C = window.CLIP;
  const FAMILY = { '4:3': [1200, 900], '1:1': [1080, 1080], '4:5': [1080, 1350] };
  const held = C.heldShapes || {};
  for (const [shape, reason] of Object.entries(held)) if (!FAMILY[shape] || !String(reason).trim()) throw Error('A held shape needs a valid size and measured reason');
  const SIZES = Object.fromEntries(Object.entries(FAMILY).filter(([shape]) => !held[shape]));
  if (!Object.keys(SIZES).length) throw Error('All shapes are held; deliver the measurements and report instead of a movie');
  const T = { hover: .86, press: 1.2, change: 1.3, depart: 1.5, clear: 1.5, exit: 2.05, resetLabel: 6.1, reset: 6.4, end: 6.7, ...C.timing };
  const canvas = document.querySelector('canvas');
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  const images = {}, prepared = {};
  const sequence = C.sequence || [];
  const animated = C.animations?.found?.length > 0;
  const nativeEnd = T.change + (animated ? C.animations.duration : 0);
  let ready = false;
  const load = src => kit.loadImage(src);
  const clamp = p => Math.max(0, Math.min(1, p));
  // Pointer tracks follow the measured curved approach, with a quiet rest before pressing.
  const ease = p => { p = clamp(p); return p * p * (3 - 2 * p); };
  const mix = (a, b, p) => a + (b - a) * p;

  function layout(size) {
    const [W, H] = SIZES[size], top = size === '4:3' ? 0 : 150;
    const cssW = C.box[2], cssH = C.box[3];
    const scale = Math.min(W * .7 / cssW, (H - top) * .82 / cssH);
    const w = Math.ceil(cssW * scale), h = Math.ceil(cssH * scale);
    return { W, H, top, scale, x: Math.round((W - w) / 2), y: Math.round(top + (H - top - h) / 2), w, h };
  }

  function clearAt(l) {
    if (!(C.clearOnExit ?? C.kind === 'comparison')) return Math.max(T.clear, nativeEnd);
    const tx = l.x + C.target[0] * l.scale, right = l.x + C.targetRight * l.scale;
    let lo = 0, hi = 1;
    for (let i = 0; i < 30; i++) { const mid = (lo + hi) / 2; if (mix(tx, l.W + 45, ease(mid)) <= right) lo = mid; else hi = mid; }
    return Math.max(nativeEnd, T.depart + hi * (T.exit - T.depart));
  }

  function nativeState(t, l) {
    if (t >= T.reset || t < T.hover) return 'before';
    if (t < T.press) return 'hover';
    if (t < T.change) return 'pressed';
    if (animated && t < nativeEnd) return sequence[Math.min(sequence.length - 1, Math.floor((t - T.change) * C.animations.fps))];
    if (t < clearAt(l)) return 'changed';
    return 'result';
  }

  // One whole native surface; the film never reconstructs or moves its rows.
  function paintNative(l, state) {
    const c = prepared[l.W + ':' + l.H][state];
    const radius = C.radius == null ? (C.kind === 'appearance' ? 24 : 20 * l.scale) : C.radius * l.scale;
    ctx.save();
    ctx.shadowColor = 'rgba(47,34,20,.13)'; ctx.shadowBlur = 28; ctx.shadowOffsetY = 12;
    ctx.fillStyle = C.grounds[state]; ctx.beginPath(); ctx.roundRect(l.x, l.y, c.width, c.height, radius); ctx.fill();
    ctx.restore();
    ctx.save(); ctx.beginPath(); ctx.roundRect(l.x, l.y, c.width, c.height, radius); ctx.clip();
    ctx.drawImage(c, l.x, l.y); ctx.restore();
    ctx.strokeStyle = 'rgba(75,54,33,.12)'; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.roundRect(l.x, l.y, c.width, c.height, radius); ctx.stroke();
  }

  function paintText(text, x, baseline, width, maxSize, weight, align = 'left') {
    let size = maxSize;
    ctx.textAlign = align; ctx.textBaseline = 'alphabetic';
    do { ctx.font = `${weight} ${size}px ${C.font?.family || 'Figtree'}`; if (ctx.measureText(text).width <= width) break; size -= .5; } while (size > 24);
    ctx.fillText(text, x, baseline);
  }

  // The tip follows the real target; a thin white edge keeps it visible in either theme.
  function paintPointer(t, l) {
    if (t < .2 || t >= T.exit) return;
    const target = [l.x + C.target[0] * l.scale, l.y + C.target[1] * l.scale];
    let x, y;
    if (t < T.hover) {
      const p = ease((t - .2) / (T.hover - .2));
      x = mix(l.W + 45, target[0], p); y = mix(target[1] - 85, target[1], p) - 12 * Math.sin(Math.PI * p);
    } else if (t < T.depart) [x, y] = target;
    else {
      const p = ease((t - T.depart) / (T.exit - T.depart));
      x = mix(target[0], l.W + 45, p); y = mix(target[1], target[1] + 60, p) + 8 * Math.sin(Math.PI * p);
    }
    ctx.save(); ctx.translate(x, y); ctx.scale(l.W / 1200, l.W / 1200);
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, 29); ctx.lineTo(7.4, 22.4); ctx.lineTo(12, 34);
    ctx.lineTo(17.2, 31.7); ctx.lineTo(12.8, 20.8); ctx.lineTo(23.2, 20.8); ctx.closePath();
    ctx.fillStyle = '#17191F'; ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 2; ctx.lineJoin = 'round';
    ctx.stroke(); ctx.fill(); ctx.restore();
  }

  function seek(t, values = {}) {
    if (!ready) throw Error('Call prepare before seek');
    const v = { ...window.template.defaults(), ...values }, l = layout(v.size);
    if (canvas.width !== l.W || canvas.height !== l.H) { canvas.width = l.W; canvas.height = l.H; }
    ctx.reset(); ctx.imageSmoothingQuality = 'high';
    ctx.fillStyle = C.paper; ctx.fillRect(0, 0, l.W, l.H);
    paintNative(l, nativeState(t, l));
    if (l.top) { ctx.fillStyle = C.ink || '#17191F'; paintText(v.title, 64, 92, l.W - 128, 38, 600); }
    paintPointer(t, l);
    if (t >= T.resetLabel) {
      ctx.fillStyle = C.ink || '#17191F'; ctx.globalAlpha = clamp((t - T.resetLabel) / .1);
      paintText(v.reset, l.W / 2, l.H - 25, l.W - 128, 42, 600, 'center'); ctx.globalAlpha = 1;
    }
    return canvas;
  }

  window.template = {
    name: C.title, fps: 30, duration: T.end, sizes: SIZES,
    fields: [
      { id: 'title', type: 'text', label: 'Release title (social)', maxLength: 28 },
      { id: 'reset', type: 'text', label: 'Replay label', maxLength: 14 },
    ],
    defaults: () => ({ size: Object.keys(SIZES)[0], title: C.title, reset: 'Demo reset' }),
    keyTimes: [0, .2, T.hover, T.press, T.change, T.clear, T.exit, 3.5, T.resetLabel, T.reset - .1, T.reset, T.end - .05],
    cuts: [T.change, T.reset], shutters: [],
    uiChanges: values => {
      const l = layout(values.size || Object.keys(SIZES)[0]);
      return [T.press, T.change, clearAt(l), T.reset].map(t => ({ t, rect: [l.x - 3, l.y - 3, l.w + 6, l.h + 6], frames: t === T.change && animated ? Math.ceil(C.animations.duration * 30) + 6 : 6 }));
    },
    async prepare() {
      if (ready) return;
      const font = new FontFace(C.font?.family || 'Figtree', `url(${C.font?.file || 'fonts/figtree-variable.ttf'})`, { weight: C.font?.weight || '300 900' });
      document.fonts.add(await font.load());
      await Promise.all([document.fonts.load(`600 42px ${C.font?.family || 'Figtree'}`), document.fonts.load(`600 38px ${C.font?.family || 'Figtree'}`)]);
      await document.fonts.ready;
      for (const [state, capture] of Object.entries(C.captures)) images[state] = await load('captures/' + capture.file);
      // Integer, CPU-backed whole-surface caches eliminate lazy first-scaled-draw changes.
      for (const size of Object.keys(SIZES)) {
        const l = layout(size), cache = prepared[l.W + ':' + l.H] = {};
        for (const [state, im] of Object.entries(images)) {
          const capture = C.captures[state];
          const c = document.createElement('canvas'); c.width = Math.ceil(capture.rect[2] * l.scale); c.height = Math.ceil(capture.rect[3] * l.scale);
          const g = c.getContext('2d', { willReadFrequently: true }); g.reset(); g.imageSmoothingQuality = 'high';
          g.drawImage(im, 0, 0, c.width, c.height); cache[state] = c;
        }
      }
      ready = true;
    },
    seek,
    selfChecks(values = {}) {
      const l = layout(values.size || Object.keys(SIZES)[0]);
      return [
        { name: 'Paper surround keeps 70% width and at least 9% vertical padding', ok: l.w <= l.W * .7 + 1 && l.y - l.top >= (l.H - l.top) * .09 - 1 && l.H - l.y - l.h >= (l.H - l.top) * .09 - 1 },
        { name: 'Native motion has complete captured frames', ok: !animated || sequence.length === C.animations.frames && sequence.every(id => C.captures[id]) },
        { name: 'Result reads for at least 4.2 seconds before replay', ok: T.resetLabel - clearAt(l) >= (C.minResultHold ?? 4.2) },
        ...(C.primaryTextPx ? [{ name: 'Primary captured text reaches 12px at 358px viewing width', ok: C.primaryTextPx * l.scale * 358 / l.W >= 12 }] : []),
        { name: 'Demo reset is announced before the reset', ok: T.reset - T.resetLabel >= .29 },
        { name: 'Demo replay label is editable, nonempty and fits', ok: !!String(values.reset ?? 'Demo reset').trim() },
      ];
    },
  };
})();
