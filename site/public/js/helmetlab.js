/* Helmet Lab: the Dubcey Helmet Generator, on the site.
   Anyone can design and download. A signed-in owner can add the design to their team as an ALTERNATE helmet
   (never replacing or deleting the main one), pick which of their helmets the site shows, and keep designs in a locker.
   The Dubcey patch is always on, same spot, same size. */
(function(){
  var D = DC, $ = D.$, esc = D.esc;
  var DIR = 'lab/layers/';

  /* ---------- the helmet: parts, palette, patterns, fonts (from the generator) ---------- */
  var PARTS = [
    { id:'shell', label:'Helmet shell', file:'helmet-shell.png', group:'Shell', def:'#C8102E' },
    { id:'stripe', label:'Center stripe', file:'stripe.png', group:'Shell', def:'#F2F2F0' },
    { id:'facemask', label:'Facemask', file:'face-mask.png', group:'Facemask', def:'#17181A' },
    { id:'facemaskClip', label:'Facemask clips', file:'face-mask-clip.png', group:'Facemask', def:'#2A2C2F' },
    { id:'chinStrap', label:'Chinstrap', file:'chin-strap.png', group:'Chinstrap', def:'#17181A' },
    { id:'chinStrap2', label:'Chinstrap webbing', file:'chin-strap-2.png', group:'Chinstrap', def:'#1F2124' },
    { id:'chinPad', label:'Chin cup', file:'chin-pad.png', group:'Chinstrap', def:'#17181A' },
    { id:'chinPadInterior', label:'Chin cup liner', file:'chin-pad-interior.png', group:'Chinstrap', def:'#3A3D42' },
    { id:'strapCap', label:'Strap cap', file:'chip-stap-cap.png', group:'Chinstrap', def:'#17181A' },
    { id:'strapBuckle', label:'Strap buckle', file:'chip-stap-clip.png', group:'Chinstrap', def:'#17181A' },
    { id:'strapClip', label:'Strap clip', file:'strap-clip.png', group:'Chinstrap', def:'#17181A' },
    { id:'interior', label:'Interior', file:'interior.png', group:'Interior', def:'#15171A' },
    { id:'frontPad', label:'Front pad', file:'front-pad.png', group:'Interior', def:'#1C1F23' },
    { id:'backPad', label:'Back pad', file:'back-pad.png', group:'Interior', def:'#1C1F23' },
    { id:'hardware', label:'Hardware', file:'metal-parts.png', group:'Hardware', def:'#B9BEC4' },
    { id:'visorMount', label:'Visor mount', file:'visor-connection.png', group:'Hardware', def:'#2A2C2F' },
    { id:'visorClip', label:'Visor clip', file:'visor-clip.png', group:'Hardware', def:'#17181A' },
    { id:'visor', label:'Visor tint', file:'visor-tint.png', group:'Visor', def:'#1A1D21' }
  ];
  var BY_ID = {}; PARTS.forEach(function(p){ BY_ID[p.id] = p; });
  var GROUPS = ['Shell', 'Facemask', 'Chinstrap', 'Interior', 'Hardware', 'Visor'];
  var SHADES = ['shadows0.png', 'shadows1.png', 'shadows2.png', 'shadows.png', 'shadows-2.png', 'lighting.png', 'lighting-2.png', 'reflections.png', 'reflections-2.png', 'highlights.png', 'specular.png'];
  var PALETTE = [
    ['#F2F2F0','White'],['#D8DADB','Pearl'],['#C9CCCE','Silver'],['#A7ADB2','Metallic silver'],['#8A8F93','Graphite'],['#4A4E53','Charcoal'],['#2B2A28','Gunmetal'],['#17181A','Black'],
    ['#0B1220','Midnight'],['#12233F','Navy'],['#1C2D6B','Dark royal'],['#1B3FA8','Royal'],['#4682B4','Steel blue'],['#2F6FD0','Carolina'],['#74A9DC','Columbia'],['#B9D9EB','Ice blue'],
    ['#005A5B','Deep teal'],['#0E6E6B','Teal'],['#00A5B5','Aqua'],['#7FD1AE','Mint'],['#1E8A45','Kelly'],['#0F5132','Forest'],['#1F3A2D','Hunter'],['#4A5335','Olive'],
    ['#8DC63F','Lime'],['#D4F000','Volt'],['#F4D03F','Yellow'],['#FFCB05','Maize'],['#F4A300','Amber'],['#C9A227','Gold'],['#BFA46F','Vegas gold'],['#9C7C38','Old gold'],
    ['#E35205','Orange'],['#BF5700','Burnt orange'],['#FF6A13','Blaze'],['#F2665E','Coral'],['#C8102E','Scarlet'],['#9E1B32','Cardinal'],['#841617','Crimson'],['#7C0A02','Brick'],
    ['#6B1F2A','Maroon'],['#4E1A26','Wine'],['#E0218A','Hot pink'],['#E29AB8','Rose'],['#B4A7D6','Lavender'],['#7A4FB5','Violet'],['#4B2E83','Purple'],['#2E1A47','Plum'],
    ['#EDE2C8','Cream'],['#C3B091','Khaki'],['#C49A6C','Tan'],['#B87333','Copper'],['#8C6A3E','Bronze'],['#5A3A22','Brown'],['#3B2416','Chocolate'],['#8A9A80','Sage'],
    ['#B76E79','Rose gold'],['#E5D3B3','Champagne'],['#D4AF37','Metallic gold'],['#5C6B7A','Slate'],['#A9B8C9','Frost'],['#0072CE','Electric blue'],['#39FF14','Neon green'],['#FF3EA5','Neon pink']
  ];
  var PATTERNS = [
    { key:'none', label:'None' }, { key:'carbon', label:'Carbon', base:22 }, { key:'camo', label:'Camo', base:300, two:true, raster:true }, { key:'digital', label:'Digi camo', base:240, two:true },
    { key:'tiger', label:'Tiger', base:320, raster:true }, { key:'honeycomb', label:'Honeycomb', base:36 }, { key:'scales', label:'Scales', base:46 }, { key:'houndstooth', label:'Hounds', base:34 },
    { key:'chevron', label:'Chevron', base:64 }, { key:'pinstripe', label:'Pinstripe', base:26 }, { key:'checker', label:'Checker', base:52 }, { key:'diamond', label:'Tread plate', base:42 },
    { key:'stars', label:'Stars', base:130 }, { key:'fade', label:'Fade' }
  ];
  var PAT_BY = {}; PATTERNS.forEach(function(p){ PAT_BY[p.key] = p; });
  var FONTS = [
    { key:'archivo', label:'Archivo', css:"700 {S}px 'Archivo Black'" }, { key:'anton', label:'Anton', css:'400 {S}px Anton' }, { key:'bebas', label:'Bebas', css:"400 {S}px 'Bebas Neue'" },
    { key:'oswald', label:'Oswald', css:'700 {S}px Oswald' }, { key:'graduate', label:'Collegiate', css:'400 {S}px Graduate' }, { key:'slab', label:'Slab', css:"400 {S}px 'Alfa Slab One'" }
  ];
  var FONT_BY = {}; FONTS.forEach(function(f){ FONT_BY[f.key] = f; });
  var PRESETS = [
    { name:'Scarlet', finish:'gloss', colors:{ shell:'#C8102E', stripe:'#F2F2F0', facemask:'#17181A', facemaskClip:'#2A2C2F', hardware:'#B9BEC4' } },
    { name:'Midnight', finish:'satin', colors:{ shell:'#0B1220', stripe:'#C9A227', facemask:'#0B1220', facemaskClip:'#1A1E28', hardware:'#8A8F93' } },
    { name:'Forest', finish:'gloss', colors:{ shell:'#0F5132', stripe:'#EDE2C8', facemask:'#EDE2C8', facemaskClip:'#C9CCCE', hardware:'#B9BEC4' } },
    { name:'Chrome', finish:'chrome', colors:{ shell:'#C9CCCE', stripe:'#17181A', facemask:'#17181A', facemaskClip:'#2A2C2F', hardware:'#D8DADB' } },
    { name:'Matte', finish:'matte', colors:{ shell:'#2B2A28', stripe:'#E35205', facemask:'#2B2A28', facemaskClip:'#3A3D42', hardware:'#4A4E53' } },
    { name:'Carbon', finish:'gloss', colors:{ shell:'#4A4E53', stripe:'#C8102E', facemask:'#17181A', facemaskClip:'#2A2C2F', hardware:'#B9BEC4' }, pattern:{ type:'carbon', color:'#17181A', opacity:0.94, scale:1 } },
    { name:'Woodland', finish:'matte', colors:{ shell:'#8A9A80', stripe:'#2B2A28', facemask:'#2B2A28', facemaskClip:'#3A3D42', hardware:'#4A4E53' }, pattern:{ type:'camo', color:'#4A5335', color2:'#3B2416', opacity:1, scale:1 } },
    { name:'Hounds', finish:'satin', colors:{ shell:'#9E1B32', stripe:'#F2F2F0', facemask:'#F2F2F0', facemaskClip:'#C9CCCE', hardware:'#B9BEC4' }, pattern:{ type:'houndstooth', color:'#F2F2F0', opacity:0.22, scale:1 } },
    { name:'Viper', finish:'gloss', colors:{ shell:'#1E8A45', stripe:'#17181A', facemask:'#17181A', facemaskClip:'#2A2C2F', hardware:'#B9BEC4' }, pattern:{ type:'scales', color:'#0F5132', opacity:0.9, scale:1 }, flake:true }
  ];
  var FINISHES = { gloss:{ label:'Gloss', spec:1, refl:0.85, high:1 }, satin:{ label:'Satin', spec:0.55, refl:0.5, high:0.72 }, matte:{ label:'Matte', spec:0.1, refl:0.14, high:0.34 }, chrome:{ label:'Chrome', spec:1, refl:1, high:1 } };
  var STACK = [
    { kind:'part', id:'interior' }, { kind:'part', id:'backPad' }, { kind:'part', id:'frontPad' }, { kind:'part', id:'shell' }, { kind:'pattern' }, { kind:'flake' }, { kind:'logo' }, { kind:'badge' }, { kind:'texts' },
    { kind:'part', id:'stripe', flag:'stripeOn' }, { kind:'part', id:'chinPadInterior' }, { kind:'part', id:'chinPad' }, { kind:'part', id:'chinStrap' }, { kind:'part', id:'chinStrap2' },
    { kind:'part', id:'strapCap' }, { kind:'part', id:'strapBuckle' }, { kind:'part', id:'strapClip' }, { kind:'visor' }, { kind:'part', id:'facemask' }, { kind:'part', id:'facemaskClip' },
    { kind:'part', id:'hardware' }, { kind:'part', id:'visorMount' }, { kind:'part', id:'visorClip' },
    { kind:'shade', file:'shadows0.png', blend:'multiply', op:1 }, { kind:'shade', file:'shadows1.png', blend:'multiply', op:1 }, { kind:'shade', file:'shadows2.png', blend:'multiply', op:1 },
    { kind:'shade', file:'shadows.png', blend:'multiply', op:1 }, { kind:'shade', file:'shadows-2.png', blend:'multiply', op:1 }, { kind:'shade', file:'lighting.png', blend:'multiply', op:1 },
    { kind:'shade', file:'lighting-2.png', blend:'multiply', op:1 }, { kind:'shade', file:'reflections.png', blend:'screen', fin:'refl' }, { kind:'shade', file:'reflections-2.png', blend:'screen', fin:'refl' },
    { kind:'shade', file:'highlights.png', blend:'screen', fin:'high' }, { kind:'shade', file:'specular.png', blend:'screen', fin:'spec' }
  ];
  var HIT_ORDER = ['visorClip', 'visorMount', 'hardware', 'facemaskClip', 'facemask', 'strapClip', 'strapBuckle', 'strapCap', 'chinPadInterior', 'chinPad', 'chinStrap2', 'chinStrap', 'stripe', 'shell', 'frontPad', 'backPad', 'interior'];
  var W = 1600, H = 900;
  // the league patch: fixed, never optional
  var BADGE = { x:470, y:600, w:74, ratio:343 / 300 };
  var DESIGN_KEYS = ['colors', 'finish', 'stripeOn', 'visorOn', 'visorOpacity', 'logo', 'flake', 'texts', 'pattern'];

  function seeded(seed){ var s = seed >>> 0; return function(){ s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
  function hexRgb(hex){ var h = String(hex).replace('#', ''); return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]; }
  function rgba(hex, a){ var c = hexRgb(hex); return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + a + ')'; }
  function shade(hex, amt){ var c = hexRgb(hex), t = Math.abs(amt), to = amt < 0 ? 0 : 255; return 'rgb(' + c.map(function(v){ return Math.round(v + (to - v) * t); }).join(',') + ')'; }
  function lum(hex){ var c = hexRgb(hex).map(function(v){ v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; }
  function periodicNoise(n, rnd){ var g = []; for(var i = 0; i < n * n; i++) g.push(rnd()); function at(i, j){ return g[(((j % n) + n) % n) * n + (((i % n) + n) % n)]; }
    return function(u, v){ var x = u * n, y = v * n, x0 = Math.floor(x), y0 = Math.floor(y), fx = x - x0, fy = y - y0, sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy), a = at(x0, y0), b = at(x0 + 1, y0), c = at(x0, y0 + 1), d = at(x0 + 1, y0 + 1); return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy; }; }
  function fbm(seed, n0, oct){ var rnd = seeded(seed), fns = []; for(var i = 0; i < oct; i++) fns.push(periodicNoise(n0 << i, rnd)); return function(u, v){ var t = 0, w = 0, amp = 1; fns.forEach(function(f){ t += f(u, v) * amp; w += amp; amp *= 0.5; }); return t / w; }; }
  function hex2(n){ return ('0' + n.toString(16)).slice(-2); }
  function toHex(r, g, b){ return ('#' + hex2(r) + hex2(g) + hex2(b)).toUpperCase(); }
  function lighten(hex, amt){ var c = hexRgb(hex); return c.map(function(v){ return Math.round(v + (255 - v) * amt); }); }
  function nameOf(hex){ var m = PALETTE.filter(function(p){ return p[0].toLowerCase() === String(hex).toLowerCase(); })[0]; return m ? m[1] : 'Custom'; }
  function defaults(){ var o = {}; PARTS.forEach(function(p){ o[p.id] = p.def; }); return o; }
  function freshPattern(){ return { type:'none', color:'#17181A', color2:'#4A5335', scale:1, angle:0, opacity:0.85 }; }
  function freshLogo(){ return { src:null, name:'', x:0, y:0, scale:1, rot:0, opacity:1, blend:'normal', inkMode:'original', ink:'#F2F2F0', swaps:[], knockout:true, tol:38, flipX:false }; }
  function freshText(){ return { value:'DUBCEY', font:'archivo', size:90, tracking:4, x:40, y:-20, rot:0, color:'#F2F2F0', outline:'#17181A', outlineW:0 }; }
  function clone(o){ return JSON.parse(JSON.stringify(o)); }

  /* ---------- state ---------- */
  var ST = { colors:defaults(), finish:'gloss', stripeOn:true, visorOn:true, visorOpacity:0.45, logo:freshLogo(), flake:{ on:false, amount:0.5 }, pattern:freshPattern(), texts:[] };
  var UI = { sel:'shell', tab:'color', at:0, ready:false, me:{}, fid:'', lab:null, busy:false, name:'' };
  var UNDO = [], REDO = [], lastPush = 0;
  function design(){ var o = {}; DESIGN_KEYS.forEach(function(k){ o[k] = ST[k]; }); return clone(o); }
  function change(fn, quiet){ var now = Date.now(); if(now - lastPush > 600){ UNDO.push(design()); if(UNDO.length > 80) UNDO.shift(); REDO = []; } lastPush = now; fn(ST); schedule(); draft(); if(!quiet) panel(); }
  function apply(snap){ ST = { colors:Object.assign(defaults(), snap.colors || {}), finish:snap.finish || 'gloss', stripeOn:snap.stripeOn !== false, visorOn:snap.visorOn !== false, visorOpacity:snap.visorOpacity || 0.45,
    flake:Object.assign({ on:false, amount:0.5 }, snap.flake || {}), pattern:Object.assign(freshPattern(), snap.pattern || {}), texts:(snap.texts || []).map(function(t){ return Object.assign(freshText(), t); }), logo:Object.assign(freshLogo(), snap.logo || {}) };
    UI.at = 0; if(ST.logo.src) loadImg(ST.logo.src).then(schedule, function(){}); schedule(); panel(); }
  function undo(){ if(!UNDO.length) return; REDO.push(design()); var d = UNDO.pop(); lastPush = 0; apply(d); say('Undo'); }
  function redo(){ if(!REDO.length) return; UNDO.push(design()); var d = REDO.pop(); lastPush = 0; apply(d); say('Redo'); }
  // the design in progress survives a refresh (this browser only)
  function draft(){ clearTimeout(draft.t); draft.t = setTimeout(function(){ try{ localStorage.setItem('dcHelmDraft', JSON.stringify(design())); }catch(e){} }, 800); }
  function say(t){ $('zlsay').textContent = t; [].forEach.call(document.querySelectorAll('.zltoast'), function(x){ x.remove(); }); var n = document.createElement('div'); n.className = 'zltoast mono'; n.textContent = t; document.body.appendChild(n); setTimeout(function(){ n.remove(); }, 2400); }

  /* ---------- images ---------- */
  var IMGS = {}, CACHE = {}, gen = 0;
  function loadImg(src){ if(CACHE[src]) return CACHE[src]; CACHE[src] = new Promise(function(res, rej){ var i = new Image(); i.onload = function(){ IMGS[src] = i; gen++; res(i); }; i.onerror = function(){ delete CACHE[src]; rej(new Error('missing ' + src)); }; i.src = src; }); return CACHE[src]; }

  /* ---------- rendering (ported from the generator) ---------- */
  var scratch = document.createElement('canvas'), decal = document.createElement('canvas'), PT = {}, TILES = {}, SOLID = new WeakMap(), artKey = '', artCanvas = null, vcv = null;
  scratch.width = W; scratch.height = H;
  function patternTile(type, a, b, size){
    var key = type + '|' + a + '|' + b + '|' + size; if(PT[key]) return PT[key];
    var keys = Object.keys(PT); if(keys.length > 40) keys.slice(0, 20).forEach(function(k){ delete PT[k]; });
    var s = size, cv = document.createElement('canvas'), w = s, h = s; if(type === 'honeycomb') h = Math.round(s * Math.sqrt(3) / 3);
    cv.width = w; cv.height = h; var c = cv.getContext('2d'), rnd = seeded(7331), i, j, x, y;
    if(type === 'carbon'){ var cell = s / 2;
      for(j = 0; j < 2; j++) for(i = 0; i < 2; i++){ x = i * cell; y = j * cell; var horiz = (i + j) % 2 === 0, g = horiz ? c.createLinearGradient(0, y, 0, y + cell) : c.createLinearGradient(x, 0, x + cell, 0);
        g.addColorStop(0, shade(a, -0.55)); g.addColorStop(0.45, shade(a, 0.2)); g.addColorStop(0.6, shade(a, 0.12)); g.addColorStop(1, shade(a, -0.55)); c.fillStyle = g; c.fillRect(x, y, cell, cell);
        c.strokeStyle = 'rgba(0,0,0,0.22)'; c.lineWidth = Math.max(0.6, cell * 0.035);
        for(var k = 1; k < 4; k++){ c.beginPath(); if(horiz){ c.moveTo(x, y + cell * k / 4); c.lineTo(x + cell, y + cell * k / 4); } else { c.moveTo(x + cell * k / 4, y); c.lineTo(x + cell * k / 4, y + cell); } c.stroke(); } }
    } else if(type === 'camo' || type === 'tiger'){
      var id = c.createImageData(w, h), d = id.data, A = hexRgb(a), B = hexRgb(b);
      if(type === 'camo'){ var n1 = fbm(11, 3, 3), n2 = fbm(29, 3, 3), n3 = fbm(53, 4, 3), e = Math.max(24, s * 0.35);
        for(y = 0; y < h; y++) for(x = 0; x < w; x++){ var u = x / w, v = y / h, q = (y * w + x) * 4;
          var va = Math.min(1, Math.max(0, (n1(u, v) - 0.53) * e)), vb = Math.min(1, Math.max(0, (n2(u, v) - 0.55) * e)), vk = Math.min(1, Math.max(0, (n3(u, v) - 0.66) * e)), r = 0, gg = 0, bb = 0, al = 0, t;
          if(vb > 0){ r = B[0]; gg = B[1]; bb = B[2]; al = vb; }
          if(va > 0){ t = va; r = r * (1 - t) + A[0] * t; gg = gg * (1 - t) + A[1] * t; bb = bb * (1 - t) + A[2] * t; al = Math.max(al, va); }
          if(vk > 0){ t = vk; r = r * (1 - t) + 23 * t; gg = gg * (1 - t) + 24 * t; bb = bb * (1 - t) + 26 * t; al = Math.max(al, vk); }
          d[q] = r; d[q + 1] = gg; d[q + 2] = bb; d[q + 3] = Math.round(al * 255); }
      } else { var w1 = fbm(71, 3, 3), w2 = fbm(97, 4, 2), e2 = 6 * Math.max(1, s / 120);
        for(y = 0; y < h; y++) for(x = 0; x < w; x++){ var u2 = x / w, v2 = y / h, q2 = (y * w + x) * 4, tt = Math.sin(2 * Math.PI * (4 * u2 + 1.1 * w1(u2, v2))), th = 0.25 + 0.95 * w2(u2, v2), al2 = Math.min(1, Math.max(0, (tt - th) * e2));
          d[q2] = A[0]; d[q2 + 1] = A[1]; d[q2 + 2] = A[2]; d[q2 + 3] = Math.round(al2 * 255); } }
      c.putImageData(id, 0, 0);
    } else if(type === 'digital'){ var m1 = fbm(11, 3, 3), m2 = fbm(29, 3, 3), m3 = fbm(53, 4, 3), G = 48, cs = s / G;
      for(j = 0; j < G; j++) for(i = 0; i < G; i++){ var uu = (i + 0.5) / G, vv = (j + 0.5) / G, col = null; if(m3(uu, vv) > 0.64) col = '#17181A'; else if(m1(uu, vv) > 0.52) col = a; else if(m2(uu, vv) > 0.54) col = b; if(!col) continue; c.fillStyle = col; c.fillRect(Math.floor(i * cs), Math.floor(j * cs), Math.ceil(cs), Math.ceil(cs)); }
    } else if(type === 'honeycomb'){ var rr = s / 3, hh = h;
      function hex(cx, cy, r0){ c.beginPath(); for(var k2 = 0; k2 < 6; k2++){ var an = Math.PI / 3 * k2, px = cx + r0 * Math.cos(an), py = cy + r0 * Math.sin(an); if(k2) c.lineTo(px, py); else c.moveTo(px, py); } c.closePath(); }
      [[0, 0], [3 * rr, 0], [0, hh], [3 * rr, hh], [1.5 * rr, hh / 2], [1.5 * rr, -hh / 2], [1.5 * rr, 1.5 * hh], [-1.5 * rr, hh / 2], [4.5 * rr, hh / 2]].forEach(function(p){ hex(p[0], p[1], rr * 0.98);
        var g2 = c.createRadialGradient(p[0] - rr * 0.25, p[1] - rr * 0.3, 0, p[0], p[1], rr); g2.addColorStop(0, rgba(a, 0)); g2.addColorStop(1, rgba(a, 0.35)); c.fillStyle = g2; c.fill(); c.strokeStyle = a; c.lineWidth = Math.max(1, rr * 0.17); c.stroke(); });
    } else if(type === 'scales'){ var R = s / 2;
      for(var row = -1; row <= 2; row++){ var yy = row * s / 2, off = (row % 2 !== 0) ? s / 2 : 0;
        for(var cl = -1; cl <= 1; cl++){ var xx = cl * s + off; c.beginPath(); c.arc(xx, yy, R, 0, Math.PI * 2); c.globalCompositeOperation = 'destination-out'; c.fillStyle = '#000'; c.fill(); c.globalCompositeOperation = 'source-over';
          var g3 = c.createRadialGradient(xx, yy - R * 0.35, R * 0.1, xx, yy, R); g3.addColorStop(0, rgba(a, 0.05)); g3.addColorStop(0.7, rgba(a, 0.35)); g3.addColorStop(1, rgba(a, 0.85)); c.fillStyle = g3; c.fill(); c.strokeStyle = shade(a, -0.35); c.lineWidth = Math.max(0.8, s * 0.035); c.stroke(); } }
    } else if(type === 'houndstooth'){ var un = s / 8; c.fillStyle = a;
      for(y = 0; y < 8; y++) for(x = 0; x < 8; x++){ var warp = ((x - y + 8) % 4) < 2, dark = warp ? (x % 8) < 4 : (y % 8) < 4; if(dark) c.fillRect(Math.floor(x * un), Math.floor(y * un), Math.ceil(un), Math.ceil(un)); }
    } else if(type === 'chevron'){ c.strokeStyle = a; c.lineWidth = s * 0.17; c.lineJoin = 'miter';
      for(var kk = -1; kk <= 1; kk++){ var oy = kk * s; c.beginPath(); c.moveTo(-s / 2, oy + s * 0.7); c.lineTo(0, oy + s * 0.3); c.lineTo(s / 2, oy + s * 0.7); c.lineTo(s, oy + s * 0.3); c.lineTo(1.5 * s, oy + s * 0.7); c.stroke(); }
    } else if(type === 'pinstripe'){ c.fillStyle = a; var lw = Math.max(1, s * 0.09); c.fillRect(s / 2 - lw / 2, 0, lw, s);
    } else if(type === 'checker'){ c.fillStyle = a; c.fillRect(0, 0, s / 2, s / 2); c.fillRect(s / 2, s / 2, s / 2, s / 2);
    } else if(type === 'diamond'){
      var lz = function(x0, y0, ang){ c.save(); c.translate(x0, y0); c.rotate(ang); c.beginPath(); c.ellipse(0, 0, s * 0.19, s * 0.07, 0, 0, Math.PI * 2); var g4 = c.createLinearGradient(0, -s * 0.07, 0, s * 0.07); g4.addColorStop(0, shade(a, 0.55)); g4.addColorStop(0.5, a); g4.addColorStop(1, shade(a, -0.5)); c.fillStyle = g4; c.fill(); c.restore(); };
      lz(s / 4, s / 4, Math.PI / 4); lz(3 * s / 4, s / 4, -Math.PI / 4); lz(s / 4, 3 * s / 4, -Math.PI / 4); lz(3 * s / 4, 3 * s / 4, Math.PI / 4);
    } else if(type === 'stars'){ c.fillStyle = a;
      for(var n = 0; n < 7; n++){ var sx = rnd() * s, sy = rnd() * s, sr = s * (0.035 + rnd() * 0.06), rot = rnd() * Math.PI;
        for(var ox = -1; ox <= 1; ox++) for(var oy2 = -1; oy2 <= 1; oy2++){ c.beginPath(); for(var k3 = 0; k3 < 10; k3++){ var r3 = k3 % 2 ? sr * 0.42 : sr, an3 = rot + k3 * Math.PI / 5, px3 = sx + ox * s + r3 * Math.sin(an3), py3 = sy + oy2 * s - r3 * Math.cos(an3); if(k3) c.lineTo(px3, py3); else c.moveTo(px3, py3); } c.closePath(); c.fill(); } }
    }
    PT[key] = cv; return cv;
  }
  function fillPattern(c, P, w, h, S){
    if(P.type === 'fade'){ var ang = (P.angle || 0) * Math.PI / 180, cx = 800 * S, cy = 560 * S, len = 360 * S * P.scale, dx = Math.cos(ang) * len, dy = Math.sin(ang) * len, g = c.createLinearGradient(cx - dx, cy - dy, cx + dx, cy + dy);
      g.addColorStop(0, rgba(P.color, 1)); g.addColorStop(0.35, rgba(P.color, 0.85)); g.addColorStop(1, rgba(P.color, 0)); c.fillStyle = g; c.fillRect(0, 0, w, h); return; }
    var def = PAT_BY[P.type]; if(!def || !def.base) return;
    var tilePx = Math.max(4, def.base * P.scale * S), cap = def.raster ? 640 : 1400, size = Math.min(cap, Math.max(8, Math.ceil(tilePx / 8) * 8)), tile = patternTile(P.type, P.color, P.color2 || P.color, size), pat = c.createPattern(tile, 'repeat'), k = tilePx / size;
    if(pat.setTransform && window.DOMMatrix) pat.setTransform(new DOMMatrix().translateSelf(800 * S, 560 * S).rotateSelf(P.angle || 0).scaleSelf(k, k));
    c.fillStyle = pat; c.fillRect(0, 0, w, h);
  }
  function patternThumb(cv, type, a, b, shell){
    var key = type + a + b + shell; if(cv._k === key) return; cv._k = key; cv.width = 112; cv.height = 80; var c = cv.getContext('2d'); c.fillStyle = shell; c.fillRect(0, 0, 112, 80);
    if(type === 'none') return;
    if(type === 'fade'){ var g = c.createLinearGradient(0, 0, 112, 0); g.addColorStop(0, a); g.addColorStop(1, rgba(a, 0)); c.fillStyle = g; c.fillRect(0, 0, 112, 80); return; }
    var def = PAT_BY[type], size = Math.max(16, Math.round(def.base * (def.base > 100 ? 0.45 : 1.1))); c.globalAlpha = type === 'houndstooth' ? 0.7 : 1; c.fillStyle = c.createPattern(patternTile(type, a, b, size), 'repeat'); c.fillRect(0, 0, 112, 80); c.globalAlpha = 1;
  }
  // colors sitting on the art's outer border = a baked-in background (white card, fake transparency checkerboard)
  function backgroundColors(d, w, h){
    var bins = {};
    function note(x, y){ var i = (y * w + x) * 4; if(d[i + 3] < 128) return; var key = (d[i] >> 4) + ',' + (d[i + 1] >> 4) + ',' + (d[i + 2] >> 4), b = bins[key] || (bins[key] = { n:0, r:0, g:0, b:0 }); b.n++; b.r += d[i]; b.g += d[i + 1]; b.b += d[i + 2]; }
    var step = Math.max(1, Math.round(Math.min(w, h) / 160)), x, y;
    for(x = 0; x < w; x += step){ note(x, 0); note(x, h - 1); note(x, Math.min(h - 1, 2)); note(x, Math.max(0, h - 3)); }
    for(y = 0; y < h; y += step){ note(0, y); note(w - 1, y); note(Math.min(w - 1, 2), y); note(Math.max(0, w - 3), y); }
    var tot = Object.keys(bins).reduce(function(a, k){ return a + bins[k].n; }, 0); if(!tot) return [];
    return Object.keys(bins).map(function(k){ return bins[k]; }).sort(function(a, b){ return b.n - a.n; }).slice(0, 3).filter(function(b){ return b.n / tot > 0.12; }).map(function(b){ return [Math.round(b.r / b.n), Math.round(b.g / b.n), Math.round(b.b / b.n)]; });
  }
  function decalArt(img, L){
    var key = [L.src && L.src.length, L.knockout, L.tol, L.inkMode, L.ink, JSON.stringify(L.swaps || [])].join('|');
    if(artKey === key) return artCanvas;
    if(!L.knockout && L.inkMode === 'original'){ artKey = key; artCanvas = null; return null; }
    var dw = img.width, dh = img.height; decal.width = dw; decal.height = dh;
    var c = decal.getContext('2d'); c.globalCompositeOperation = 'source-over'; c.clearRect(0, 0, dw, dh); c.drawImage(img, 0, 0);
    if(L.knockout){ var kid = c.getImageData(0, 0, dw, dh), kd = kid.data, bg = backgroundColors(kd, dw, dh);
      if(bg.length){ var tol = L.tol * L.tol * 3; for(var i = 0; i < kd.length; i += 4){ if(!kd[i + 3]) continue; for(var k = 0; k < bg.length; k++){ var dr = kd[i] - bg[k][0], dg = kd[i + 1] - bg[k][1], db = kd[i + 2] - bg[k][2]; if(dr * dr + dg * dg + db * db < tol){ kd[i + 3] = 0; break; } } } c.putImageData(kid, 0, 0); } }
    if(L.inkMode === 'flat'){ c.globalCompositeOperation = 'source-in'; c.fillStyle = L.ink; c.fillRect(0, 0, dw, dh); c.globalCompositeOperation = 'source-over'; artKey = key; artCanvas = decal; return decal; }
    var act = L.inkMode === 'swap' ? (L.swaps || []).filter(function(s){ return s.hide || (s.to && s.to.toLowerCase() !== s.from.toLowerCase()); }) : [];
    if(act.length){ var id = c.getImageData(0, 0, dw, dh), d = id.data, T = act.map(function(s){ var f = hexRgb(s.from), t = hexRgb(s.to || s.from); return { hide:!!s.hide, f:f, t:t }; });
      for(var j = 0; j < d.length; j += 4){ if(d[j + 3] < 8) continue; var best = -1, bd = 1e9; for(var q = 0; q < T.length; q++){ var e = (d[j] - T[q].f[0]) * (d[j] - T[q].f[0]) + (d[j + 1] - T[q].f[1]) * (d[j + 1] - T[q].f[1]) + (d[j + 2] - T[q].f[2]) * (d[j + 2] - T[q].f[2]); if(e < bd){ bd = e; best = q; } }
        if(best >= 0 && bd < 7000){ if(T[best].hide) d[j + 3] = 0; else { d[j] = T[best].t[0]; d[j + 1] = T[best].t[1]; d[j + 2] = T[best].t[2]; } } }
      c.putImageData(id, 0, 0); }
    artKey = key; artCanvas = decal; return decal;
  }
  function paletteOf(img, L){
    var n = 160, cv = document.createElement('canvas'); cv.width = n; cv.height = Math.max(1, Math.round(n * img.height / img.width)); var c = cv.getContext('2d'); c.drawImage(img, 0, 0, cv.width, cv.height);
    var d = c.getImageData(0, 0, cv.width, cv.height).data, i, k;
    if(L.knockout !== false){ var bg = backgroundColors(d, cv.width, cv.height), tol = (L.tol || 38) * (L.tol || 38) * 3; for(i = 0; i < d.length; i += 4) for(k = 0; k < bg.length; k++){ var dr = d[i] - bg[k][0], dg = d[i + 1] - bg[k][1], db = d[i + 2] - bg[k][2]; if(dr * dr + dg * dg + db * db < tol){ d[i + 3] = 0; break; } } }
    var bins = {}, op = 0; for(i = 0; i < d.length; i += 4){ if(d[i + 3] < 128) continue; op++; var key = (d[i] >> 5) + ',' + (d[i + 1] >> 5) + ',' + (d[i + 2] >> 5), b = bins[key] || (bins[key] = { n:0, r:0, g:0, b:0 }); b.n++; b.r += d[i]; b.g += d[i + 1]; b.b += d[i + 2]; }
    return Object.keys(bins).map(function(k2){ return bins[k2]; }).sort(function(a, b){ return b.n - a.n; }).slice(0, 6).filter(function(b){ return b.n / Math.max(1, op) > 0.02; })
      .map(function(b){ var hx = toHex(Math.round(b.r / b.n), Math.round(b.g / b.n), Math.round(b.b / b.n)); return { from:hx, to:hx, hide:false, share:b.n / Math.max(1, op) }; });
  }
  function flakeTile(px, block, rgb){
    var key = px + '|' + block + '|' + rgb.join(','); if(TILES[key]) return TILES[key];
    var cv = document.createElement('canvas'); cv.width = px; cv.height = px; var c = cv.getContext('2d'), id = c.createImageData(px, px), d = id.data, seed = 20260912, cells = Math.ceil(px / block);
    function rnd(){ seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; }
    for(var cy = 0; cy < cells; cy++) for(var cx = 0; cx < cells; cx++){ if(rnd() > 0.34) continue; var t = rnd(), a = Math.round(26 + t * t * t * 210), warm = rnd() < 0.22;
      for(var y = 0; y < block; y++){ var py = cy * block + y; if(py >= px) break; for(var x = 0; x < block; x++){ var pxx = cx * block + x; if(pxx >= px) break; var i = (py * px + pxx) * 4; d[i] = warm ? 255 : rgb[0]; d[i + 1] = warm ? 250 : rgb[1]; d[i + 2] = warm ? 235 : rgb[2]; d[i + 3] = a; } } }
    c.putImageData(id, 0, 0); TILES[key] = cv; return cv;
  }
  function drawTracked(c, str, cx, cy, tr, stroke){ var ch = str.split(''), tot = 0, ws = ch.map(function(x){ var w = c.measureText(x).width; tot += w + tr; return w; }); tot -= tr; var x = cx - tot / 2; ch.forEach(function(k, i){ if(stroke) c.strokeText(k, x, cy); c.fillText(k, x, cy); x += ws[i] + tr; }); }
  function solidMask(img){ var c = SOLID.get(img); if(c) return c; c = document.createElement('canvas'); c.width = img.naturalWidth || img.width; c.height = img.naturalHeight || img.height; var x = c.getContext('2d'); x.drawImage(img, 0, 0); var id = x.getImageData(0, 0, c.width, c.height), d = id.data, mx = 0, i; for(i = 3; i < d.length; i += 4) if(d[i] > mx) mx = d[i]; var k = mx ? 255 / mx : 1; for(i = 3; i < d.length; i += 4) d[i] = Math.min(255, d[i] * k); x.putImageData(id, 0, 0); SOLID.set(img, c); return c; }
  function visorArt(mask, out, outH, color, op){
    var cv = vcv || (vcv = document.createElement('canvas')); if(cv.width !== out || cv.height !== outH){ cv.width = out; cv.height = outH; }
    var c = cv.getContext('2d'), k = out / 1600, x0 = 947 * k, x1 = 1184 * k, y0 = 279 * k, y1 = 574 * k, w = x1 - x0, hh = y1 - y0, g;
    c.globalCompositeOperation = 'source-over'; c.globalAlpha = 1; c.clearRect(0, 0, out, outH); c.globalAlpha = op; c.fillStyle = color; c.fillRect(x0, y0, w, hh); c.globalAlpha = 1;
    g = c.createLinearGradient(x0, 0, x1, 0); g.addColorStop(0, 'rgba(0,0,0,0.42)'); g.addColorStop(0.35, 'rgba(0,0,0,0.12)'); g.addColorStop(0.6, 'rgba(0,0,0,0)'); c.fillStyle = g; c.fillRect(x0, y0, w, hh);
    g = c.createLinearGradient(x0 + w * 0.3, y0, x1, y1 - hh * 0.25); [[0, 0], [0.42, 0], [0.62, 0.5], [0.8, 0.22], [0.93, 0.08], [1, 0.55]].forEach(function(s){ g.addColorStop(s[0], 'rgba(255,255,255,' + s[1] + ')'); }); c.fillStyle = g; c.fillRect(x0, y0, w, hh);
    g = c.createLinearGradient(0, y0, 0, y1); g.addColorStop(0, 'rgba(255,255,255,0.18)'); g.addColorStop(0.3, 'rgba(255,255,255,0)'); g.addColorStop(1, 'rgba(0,0,0,0.18)'); c.fillStyle = g; c.fillRect(x0, y0, w, hh);
    c.globalCompositeOperation = 'destination-in'; c.drawImage(mask, 0, 0, out, outH); c.globalCompositeOperation = 'source-over'; return cv;
  }
  function paint(ctx, o){
    o = o || {}; var out = W, outH = H, S = 1, snap = o.snap || ST, fin = FINISHES[snap.finish] || FINISHES.gloss, sctx = scratch.getContext('2d');
    ctx.imageSmoothingQuality = 'high'; sctx.imageSmoothingQuality = 'high'; ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
    if(o.transparent) ctx.clearRect(0, 0, out, outH);
    else { var g = ctx.createRadialGradient(out * 0.5, outH * 0.42, 0, out * 0.5, outH * 0.42, out * 0.66); g.addColorStop(0, '#4A4B50'); g.addColorStop(0.5, '#38393D'); g.addColorStop(1, '#2A2B2E'); ctx.fillStyle = g; ctx.fillRect(0, 0, out, outH); }
    function img(f){ return IMGS[DIR + f]; }
    function tint(file, color){ var im = img(file); if(!im) return null; if(/visor-tint/.test(file)) im = solidMask(im); sctx.globalCompositeOperation = 'source-over'; sctx.globalAlpha = 1; sctx.clearRect(0, 0, out, outH); sctx.drawImage(im, 0, 0, out, outH); sctx.globalCompositeOperation = 'source-in'; sctx.fillStyle = color; sctx.fillRect(0, 0, out, outH); return scratch; }
    function clipToShell(){ var sh = img('helmet-shell.png'); if(!sh) return false; sctx.globalAlpha = 1; sctx.globalCompositeOperation = 'destination-in'; sctx.drawImage(sh, 0, 0, out, outH); return true; }
    function fresh(){ sctx.globalCompositeOperation = 'source-over'; sctx.globalAlpha = 1; sctx.clearRect(0, 0, out, outH); }
    var visorBox = null, visorAlpha = null;
    STACK.forEach(function(layer){
      if(layer.flag && !snap[layer.flag]) return;
      ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
      if(layer.kind === 'part'){ var sc = tint(BY_ID[layer.id].file, snap.colors[layer.id]); if(sc) ctx.drawImage(sc, 0, 0); }
      else if(layer.kind === 'visor'){ if(!snap.visorOn) return; var vi = img('visor-tint.png'); if(!vi) return; ctx.drawImage(visorArt(solidMask(vi), out, outH, snap.colors.visor, snap.visorOpacity), 0, 0); if(o.transparent) visorBox = [940, 272, 252, 310]; }
      else if(layer.kind === 'shade'){ if(visorBox && !visorAlpha) visorAlpha = ctx.getImageData(visorBox[0], visorBox[1], visorBox[2], visorBox[3]).data; var si = img(layer.file); if(!si) return; ctx.globalCompositeOperation = layer.blend; ctx.globalAlpha = layer.fin != null ? fin[layer.fin] : layer.op; ctx.drawImage(si, 0, 0, out, outH); }
      else if(layer.kind === 'pattern'){ var P = snap.pattern; if(!P || !P.type || P.type === 'none') return; fresh(); fillPattern(sctx, P, out, outH, S); if(!clipToShell()) return; ctx.globalAlpha = P.opacity; ctx.drawImage(scratch, 0, 0); }
      else if(layer.kind === 'flake'){ var F = snap.flake; if(!F || !F.on) return; fresh(); sctx.fillStyle = sctx.createPattern(flakeTile(256, 2, lighten(snap.colors.shell, 0.78)), 'repeat'); sctx.fillRect(0, 0, out, outH); if(!clipToShell()) return; ctx.globalCompositeOperation = 'screen'; ctx.globalAlpha = F.amount; ctx.drawImage(scratch, 0, 0); }
      else if(layer.kind === 'badge'){ var bi = IMGS[DIR + 'badge-d.png']; if(!bi) return; var bw = BADGE.w, bh = bw * BADGE.ratio; fresh(); sctx.drawImage(bi, BADGE.x - bw / 2, BADGE.y - bh / 2, bw, bh); if(!clipToShell()) return; ctx.drawImage(scratch, 0, 0); }
      else if(layer.kind === 'logo'){ var L = snap.logo; if(!L || !L.src) return; var li = IMGS[L.src]; if(!li) return; var art = decalArt(li, L) || li, dw = out * 0.28 * L.scale, dh = dw * (li.height / li.width);
        fresh(); sctx.save(); sctx.translate(out * 0.47 + L.x * (W / 1120), outH * 0.44 + L.y * (W / 1120)); sctx.rotate(L.rot * Math.PI / 180); if(L.flipX) sctx.scale(-1, 1); sctx.globalAlpha = L.opacity; sctx.drawImage(art, 0, 0, art.width, art.height, -dw / 2, -dh / 2, dw, dh); sctx.restore();
        if(!clipToShell()) return; ctx.globalCompositeOperation = L.blend === 'normal' ? 'source-over' : L.blend; ctx.drawImage(scratch, 0, 0); }
      else if(layer.kind === 'texts'){ var list = (snap.texts || []).filter(function(t){ return t.value; }); if(!list.length) return; fresh(); sctx.textBaseline = 'middle'; sctx.textAlign = 'left';
        list.forEach(function(t){ var f = FONT_BY[t.font] || FONTS[0]; sctx.save(); sctx.translate(out * 0.47 + t.x * (W / 1120), outH * 0.44 + t.y * (W / 1120)); sctx.rotate(t.rot * Math.PI / 180); sctx.font = f.css.replace('{S}', String(Math.round(t.size))); sctx.fillStyle = t.color;
          if(t.outlineW > 0){ sctx.strokeStyle = t.outline; sctx.lineWidth = t.outlineW; sctx.lineJoin = 'round'; } drawTracked(sctx, t.value, 0, 0, t.tracking, t.outlineW > 0); sctx.restore(); });
        if(!clipToShell()) return; ctx.drawImage(scratch, 0, 0); }
    });
    if(visorAlpha){ var id = ctx.getImageData(visorBox[0], visorBox[1], visorBox[2], visorBox[3]), d = id.data; for(var i = 3; i < d.length; i += 4) d[i] = visorAlpha[i]; ctx.putImageData(id, visorBox[0], visorBox[1]); }
    if(o.transparent){ fresh(); PARTS.forEach(function(p){ if(p.id === 'visor' && !snap.visorOn) return; var im = img(p.file); if(im && p.id === 'visor') im = solidMask(im); if(im) sctx.drawImage(im, 0, 0, out, outH); });
      ctx.globalCompositeOperation = 'destination-in'; ctx.drawImage(scratch, 0, 0); ctx.globalCompositeOperation = 'source-over'; }
    ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
  }
  var raf = 0;
  function schedule(){ if(raf) return; raf = requestAnimationFrame(function(){ raf = 0; var cv = $('zlcv'); if(cv && UI.ready) paint(cv.getContext('2d')); }); }
  // the helmet cut out and framed like every other helmet on the site (480×359, transparent)
  function frame(type){
    var big = document.createElement('canvas'); big.width = W; big.height = H; paint(big.getContext('2d'), { transparent:true });
    var d = big.getContext('2d').getImageData(0, 0, W, H).data, l = W, t = H, r = -1, b = -1;
    for(var y = 0; y < H; y += 2) for(var x = 0; x < W; x += 2) if(d[(y * W + x) * 4 + 3] > 24){ if(x < l) l = x; if(x > r) r = x; if(y < t) t = y; if(y > b) b = y; }
    if(r < 0){ l = 0; t = 0; r = W - 1; b = H - 1; }
    var cw = r - l + 2, ch = b - t + 2, FW = 480, FH = 359, s = Math.min(FW / cw, FH / ch), dw = Math.round(cw * s), dh = Math.round(ch * s), c = document.createElement('canvas'); c.width = FW; c.height = FH;
    var cx = c.getContext('2d'); cx.imageSmoothingQuality = 'high'; cx.drawImage(big, l, t, cw, ch, Math.round((FW - dw) / 2), Math.round((FH - dh) / 2), dw, dh);
    return c.toDataURL(type || 'image/webp', 0.9);
  }
  function hitTest(nx, ny){
    if(nx < 0 || ny < 0 || nx > 1 || ny > 1) return null; var x = Math.min(399, Math.round(nx * 400)), y = Math.min(224, Math.round(ny * 225));
    hitTest.c = hitTest.c || {};
    for(var i = 0; i < HIT_ORDER.length; i++){ var id = HIT_ORDER[i]; if(id === 'stripe' && !ST.stripeOn) continue; var cv = hitTest.c[id];
      if(!cv){ var im = IMGS[DIR + BY_ID[id].file]; if(!im) continue; cv = document.createElement('canvas'); cv.width = 400; cv.height = 225; cv.getContext('2d').drawImage(im, 0, 0, 400, 225); hitTest.c[id] = cv; }
      if(cv.getContext('2d').getImageData(x, y, 1, 1).data[3] > 24) return id; }
    return null;
  }

  /* ---------- the panel ---------- */
  function sw(hex, cur, attrs){ var on = String(hex).toLowerCase() === String(cur).toLowerCase(); return '<button type="button" class="zlsw' + (on ? ' on' : '') + '" style="background:' + hex + '" title="' + esc(nameOf(hex)) + '" aria-label="' + esc(nameOf(hex) + ' ' + hex) + '" ' + attrs + '></button>'; }
  function slider(label, path, val, min, max, step, show){ return '<label class="zlsl"><span class="mono">' + label + '</span><input type="range" min="' + min + '" max="' + max + '" step="' + step + '" value="' + val + '" data-set="' + path + '"><b class="mono" data-show="' + path + '">' + show + '</b></label>'; }
  function seg(list, cur, attr){ return '<div class="zlseg">' + list.map(function(x){ return '<button type="button" class="mono' + (x[0] === cur ? ' on' : '') + '" ' + attr + '="' + x[0] + '"' + (x[2] ? ' title="' + esc(x[2]) + '"' : '') + '>' + x[1] + '</button>'; }).join('') + '</div>'; }
  function fmt(path, v){ if(/opacity|amount|scale/i.test(path) && !/size/.test(path)) return Math.round(v * 100) + '%'; if(/rot|angle/.test(path)) return v + '°'; return String(v); }
  function sec(t, body){ return '<div class="zlsec"><div class="zlh mono">' + t + '</div>' + body + '</div>'; }

  function panel(){
    [].forEach.call(document.querySelectorAll('#zltabs button'), function(b){ b.classList.toggle('on', b.getAttribute('data-t') === UI.tab); b.setAttribute('aria-pressed', b.getAttribute('data-t') === UI.tab); });
    var p = BY_ID[UI.sel] || PARTS[0]; $('zlpart').textContent = 'EDITING: ' + p.label.toUpperCase() + ' · ' + nameOf(ST.colors[p.id]).toUpperCase();
    var h = '';
    if(UI.tab === 'color'){
      var cur = ST.colors[UI.sel];
      h = sec('PARTS', GROUPS.map(function(g){ return '<div class="zlgrp"><span class="mono">' + g.toUpperCase() + '</span>' + PARTS.filter(function(x){ return x.group === g; }).map(function(x){
          return '<button type="button" class="zlpt' + (x.id === UI.sel ? ' on' : '') + '" data-part="' + x.id + '"><i style="background:' + ST.colors[x.id] + '"></i>' + esc(x.label) + '</button>'; }).join('') + '</div>'; }).join('')) +
        sec(esc(p.label.toUpperCase()) + ' · ' + esc(nameOf(cur).toUpperCase()), '<div class="zlpal">' + PALETTE.map(function(c){ return sw(c[0], cur, 'data-color="' + c[0] + '"'); }).join('') + '</div>' +
          '<div class="zlrow"><input type="color" value="' + cur + '" data-set="colors.' + UI.sel + '" aria-label="Custom color"><input type="text" class="mono zlhex" value="' + cur.toUpperCase() + '" data-hex aria-label="Hex code" maxlength="7"><button type="button" class="btn ghost2" data-a="colorgroup">PAINT THE WHOLE ' + p.group.toUpperCase() + '</button></div>') +
        sec('FINISH', seg(Object.keys(FINISHES).map(function(k){ return [k, FINISHES[k].label.toUpperCase()]; }), ST.finish, 'data-finish') +
          '<div class="zlchk"><label><input type="checkbox" data-tog="stripeOn"' + (ST.stripeOn ? ' checked' : '') + '> Center stripe</label><label><input type="checkbox" data-tog="visorOn"' + (ST.visorOn ? ' checked' : '') + '> Visor</label><label><input type="checkbox" data-tog="flake.on"' + (ST.flake.on ? ' checked' : '') + '> Metal flake</label></div>' +
          (ST.visorOn ? slider('VISOR TINT', 'visorOpacity', ST.visorOpacity, 0.05, 1, 0.01, fmt('opacity', ST.visorOpacity)) : '') + (ST.flake.on ? slider('FLAKE', 'flake.amount', ST.flake.amount, 0.1, 1, 0.01, fmt('amount', ST.flake.amount)) : '')) +
        sec('QUICK STARTS', '<div class="zlpre">' + PRESETS.map(function(x, i){ return '<button type="button" data-preset="' + i + '"><i style="background:linear-gradient(135deg,' + x.colors.shell + ' 50%,' + x.colors.stripe + ' 50%)"></i><span class="mono">' + x.name.toUpperCase() + '</span></button>'; }).join('') + '</div>');
    } else if(UI.tab === 'pattern'){
      var P = ST.pattern, def = PAT_BY[P.type] || PATTERNS[0];
      h = sec('PATTERN', '<div class="zlpats">' + PATTERNS.map(function(x){ return '<button type="button" class="' + (x.key === P.type ? 'on' : '') + '" data-pat="' + x.key + '"><canvas data-thumb="' + x.key + '" width="112" height="80"></canvas><span class="mono">' + x.label.toUpperCase() + '</span></button>'; }).join('') + '</div>');
      if(P.type !== 'none') h += sec('PATTERN COLOR · ' + esc(nameOf(P.color).toUpperCase()), '<div class="zlpal">' + PALETTE.map(function(c){ return sw(c[0], P.color, 'data-patc="' + c[0] + '"'); }).join('') + '</div><div class="zlrow"><input type="color" value="' + P.color + '" data-set="pattern.color" aria-label="Pattern color"></div>') +
        (def.two ? sec('SECOND COLOR · ' + esc(nameOf(P.color2).toUpperCase()), '<div class="zlpal">' + PALETTE.map(function(c){ return sw(c[0], P.color2, 'data-patc2="' + c[0] + '"'); }).join('') + '</div><div class="zlrow"><input type="color" value="' + P.color2 + '" data-set="pattern.color2" aria-label="Second pattern color"></div>') : '') +
        sec('ADJUST', slider('SCALE', 'pattern.scale', P.scale, 0.3, 3, 0.01, fmt('scale', P.scale)) + slider('ANGLE', 'pattern.angle', P.angle, -90, 90, 1, fmt('angle', P.angle)) + slider('STRENGTH', 'pattern.opacity', P.opacity, 0.05, 1, 0.01, fmt('opacity', P.opacity)));
    } else if(UI.tab === 'decal'){
      var L = ST.logo;
      h = sec('LOGO', '<label class="zlup"><input type="file" accept="image/*" data-logo hidden><span class="btn">' + (L.src ? 'REPLACE THE LOGO' : 'UPLOAD A LOGO') + '</span><span class="mono">' + (L.src ? esc(L.name || 'logo') : 'PNG WITH TRANSPARENCY WORKS BEST. A WHITE BACKGROUND GETS KNOCKED OUT.') + '</span></label>' + (L.src ? '<button type="button" class="btn ghost2" data-a="clearlogo">REMOVE THE LOGO</button>' : ''));
      if(L.src) h += sec('PLACEMENT', slider('SIZE', 'logo.scale', L.scale, 0.2, 2.5, 0.01, fmt('scale', L.scale)) + slider('LEFT / RIGHT', 'logo.x', L.x, -400, 400, 1, L.x) + slider('UP / DOWN', 'logo.y', L.y, -300, 300, 1, L.y) + slider('ROTATE', 'logo.rot', L.rot, -180, 180, 1, fmt('rot', L.rot)) + slider('OPACITY', 'logo.opacity', L.opacity, 0.1, 1, 0.01, fmt('opacity', L.opacity)) +
          '<div class="zlchk"><label><input type="checkbox" data-tog="logo.flipX"' + (L.flipX ? ' checked' : '') + '> Flip it</label><label><input type="checkbox" data-tog="logo.knockout"' + (L.knockout ? ' checked' : '') + '> Knock out the background</label></div>' + (L.knockout ? slider('KNOCKOUT', 'logo.tol', L.tol, 5, 120, 1, L.tol) : '')) +
        sec('HOW IT SITS', seg([['normal', 'SOLID', 'An opaque decal'], ['multiply', 'PAINT', 'Sinks into the shell color'], ['screen', 'REFLECT', 'Glows like chrome vinyl']], L.blend, 'data-blend')) +
        sec('INK', seg([['original', 'AS-IS'], ['flat', 'ONE COLOR'], ['swap', 'PER COLOR']], L.inkMode, 'data-ink') +
          (L.inkMode === 'flat' ? '<div class="zlpal">' + PALETTE.filter(function(x, i){ return i % 2 === 0; }).map(function(c){ return sw(c[0], L.ink, 'data-inkc="' + c[0] + '"'); }).join('') + '</div><div class="zlrow"><input type="color" value="' + L.ink + '" data-set="logo.ink" aria-label="Ink color"></div>' : '') +
          (L.inkMode === 'swap' ? '<div class="zlswaps">' + (L.swaps || []).map(function(s, i){ return '<div class="zlswap"><i style="background:' + s.from + '"></i><span class="mono">' + Math.round(s.share * 100) + '% →</span><input type="color" value="' + (s.to || s.from) + '" data-swap="' + i + '" aria-label="Replace ' + s.from + '"' + (s.hide ? ' disabled' : '') + '><label class="mono"><input type="checkbox" data-swaphide="' + i + '"' + (s.hide ? ' checked' : '') + '> HIDE</label></div>'; }).join('') + '</div>' : ''));
    } else if(UI.tab === 'text'){
      var T = ST.texts, t = T[UI.at];
      h = sec('LETTERING', '<div class="zltl">' + T.map(function(x, i){ return '<button type="button" class="mono' + (i === UI.at ? ' on' : '') + '" data-tsel="' + i + '">' + esc(x.value || '(blank)') + '</button>'; }).join('') + '<button type="button" class="btn ghost2" data-a="addtext">+ ADD TEXT</button></div>');
      if(t) h += sec('TEXT', '<div class="zlrow"><input type="text" class="zltx" value="' + esc(t.value) + '" data-set="texts.' + UI.at + '.value" maxlength="24" aria-label="Text"><button type="button" class="btn ghost2" data-a="deltext">DELETE</button></div>' +
          seg(FONTS.map(function(f){ return [f.key, f.label.toUpperCase()]; }), t.font, 'data-font')) +
        sec('PLACEMENT', slider('SIZE', 'texts.' + UI.at + '.size', t.size, 20, 260, 1, t.size) + slider('SPACING', 'texts.' + UI.at + '.tracking', t.tracking, -10, 40, 1, t.tracking) + slider('LEFT / RIGHT', 'texts.' + UI.at + '.x', t.x, -400, 400, 1, t.x) + slider('UP / DOWN', 'texts.' + UI.at + '.y', t.y, -300, 300, 1, t.y) + slider('ROTATE', 'texts.' + UI.at + '.rot', t.rot, -180, 180, 1, fmt('rot', t.rot))) +
        sec('COLOR', '<div class="zlrow"><label class="mono zlcl">FILL <input type="color" value="' + t.color + '" data-set="texts.' + UI.at + '.color"></label><label class="mono zlcl">OUTLINE <input type="color" value="' + t.outline + '" data-set="texts.' + UI.at + '.outline"></label></div>' + slider('OUTLINE', 'texts.' + UI.at + '.outlineW', t.outlineW, 0, 20, 1, t.outlineW));
    } else h = savePanel();
    $('zlp').innerHTML = h;
    if(UI.tab === 'pattern') [].forEach.call(document.querySelectorAll('canvas[data-thumb]'), function(c){ patternThumb(c, c.getAttribute('data-thumb'), ST.pattern.color, ST.pattern.color2, ST.colors.shell); });
  }

  /* ---------- saving ---------- */
  function savePanel(){
    var me = UI.me, signed = !!me.franchise, fid = UI.fid, lab = UI.lab;
    var h = sec('TAKE IT WITH YOU', '<div class="zlrow"><button type="button" class="btn" data-a="download">DOWNLOAD PNG</button></div><p class="zlp">The helmet cut out on a clear background, sized like every other helmet on the site.</p>');
    if(!signed) return h + sec('PUT IT ON YOUR TEAM', '<p class="zlp">Sign in with your team account to add this helmet to your team and keep designs in your locker.</p>');
    h += sec('PUT IT ON ' + esc((D.NAME[fid] || 'YOUR TEAM').toUpperCase()), (me.commish ? '<label class="zlsel mono">TEAM <select data-fid>' + D.IDS.map(function(id){ return '<option value="' + id + '"' + (id === fid ? ' selected' : '') + '>' + esc(D.NAME[id]) + '</option>'; }).join('') + '</select></label>' : '') +
      '<p class="zlp">New helmets go in as <b>alternates</b>. Your main helmet stays. Alternates can’t be deleted here, so make it one you like.</p>' +
      '<div class="zlrow"><input type="text" class="zltx" placeholder="Name it (optional)" maxlength="40" data-name value="' + esc(UI.name) + '" aria-label="Helmet name"></div>' +
      '<div class="zlrow"><button type="button" class="btn" data-a="addalt"' + (UI.busy ? ' disabled' : '') + '>ADD AS AN ALTERNATE</button><label class="mono zlcl"><input type="checkbox" data-usenow checked> WEAR IT NOW</label></div>');
    if(lab){ var alts = lab.alts || [], use = lab.use || '';
      h += sec('WHICH HELMET THE SITE SHOWS', '<div class="zlwear">' +
        '<button type="button" class="' + (use === 'main' ? 'on' : '') + '" data-use="main"><img src="' + D.helmPool(fid, true)[0] + '" alt=""><span class="mono">MAIN</span></button>' +
        alts.map(function(a, i){ return '<button type="button" class="' + (use === a.k ? 'on' : '') + '" data-use="' + esc(a.k) + '"><img src="' + esc(D.LOCAL ? (localStorage.getItem('dcImg:' + a.k) || '') : a.url) + '" alt=""><span class="mono">' + esc((a.name || 'ALT ' + (i + 1)).toUpperCase()) + '</span></button>'; }).join('') +
        (alts.length ? '<button type="button" class="zlrot' + (!use ? ' on' : '') + '" data-use=""><span class="mono">ROTATE<br>WEEKLY</span></button>' : '') + '</div>' +
        '<p class="zlp">' + (alts.length ? 'Pick one to wear every week, or let them rotate. The Commish can still pin a helmet for a special week.' : 'No alternates yet. Add one above.') + '</p>');
      h += sec('YOUR LOCKER', '<div class="zlrow"><button type="button" class="btn ghost2" data-a="locker">SAVE THIS DESIGN</button></div><p class="zlp">Saved designs can be reopened and changed later. They don’t show on the site until you add them as an alternate.</p>' +
        '<div class="zllock">' + (lab.designs || []).map(function(x){ return '<div class="zlli"><b>' + esc(x.name) + '</b><span class="mono">' + new Date(x.ts).toLocaleDateString('en-US', { month:'short', day:'numeric' }).toUpperCase() + '</span><button type="button" class="mono" data-open="' + esc(x.id) + '">OPEN</button><button type="button" class="mono" data-del="' + esc(x.id) + '">DELETE</button></div>'; }).join('') + '</div>');
    } else h += '<div class="ld mono">OPENING YOUR LOCKER…</div>';
    return h;
  }
  function api(method, body){
    var url = '/data/helmet-lab?f=' + UI.fid;
    if(D.LOCAL) return localApi(method, body);
    return fetch(url, method === 'GET' ? { credentials:'same-origin', cache:'no-store' } : { method:'POST', credentials:'same-origin', headers:{ 'Content-Type':'application/json' }, body:JSON.stringify(body) })
      .then(function(r){ return r.json(); }).then(function(j){ if(!j.ok) throw j.error || 'That didn’t work.'; return j; });
  }
  // the site's demo mode keeps everything in this browser
  function localApi(method, b){
    return D.content('teams').then(function(T){ T = T || {}; var t = T[UI.fid] = T[UI.fid] || {}, L = []; try{ L = JSON.parse(localStorage.getItem('dcHL:' + UI.fid) || '[]'); }catch(e){}
      if(method === 'GET') return { ok:true, alts:t.alts || [], use:t.use || '', designs:L };
      if(b.action === 'alt'){ t.alts = t.alts || []; var used = t.alts.map(function(a){ return a.k; }), n = 1; while(used.indexOf(UI.fid + '_' + n) > -1) n++; var k = UI.fid + '_' + n;
        try{ localStorage.setItem('dcImg:' + k, b.img); }catch(e){ throw 'Too big for the preview.'; } t.alts.push({ k:k, url:'local', lab:1, name:b.name || '' }); if(b.use) t.use = k; return D.save('teams', T).then(function(){ return { ok:true, alts:t.alts, use:t.use || '' }; }); }
      if(b.action === 'use'){ if(b.use) t.use = b.use; else delete t.use; return D.save('teams', T).then(function(){ return { ok:true, use:t.use || '' }; }); }
      if(b.action === 'del') L = L.filter(function(x){ return x.id !== b.id; }); else L = [{ id:String(Date.now()), name:b.name || 'Untitled', ts:Date.now(), snap:b.snap }].concat(L).slice(0, 12);
      try{ localStorage.setItem('dcHL:' + UI.fid, JSON.stringify(L)); }catch(e){ throw 'Too big for the preview.'; } return { ok:true, designs:L };
    });
  }
  function loadLab(){ UI.lab = null; if(!UI.fid) return; api('GET').then(function(j){ UI.lab = j; if(UI.tab === 'save') panel(); }, function(e){ UI.lab = { alts:[], designs:[], err:String(e) }; if(UI.tab === 'save') panel(); }); }
  function setUse(k){ UI.busy = true; api('POST', { action:'use', use:k }).then(function(j){ UI.lab.use = j.use; UI.busy = false; say(k === 'main' ? 'Wearing the main helmet.' : k ? 'Wearing that alternate every week.' : 'Alternates rotate weekly.'); panel(); }, function(e){ UI.busy = false; say(String(e)); }); }

  /* ---------- events ---------- */
  function setPath(path, v){ var ks = path.split('.'), o = ST; for(var i = 0; i < ks.length - 1; i++){ o[ks[i]] = Array.isArray(o[ks[i]]) ? o[ks[i]].slice() : Object.assign({}, o[ks[i]]); o = o[ks[i]]; } o[ks[ks.length - 1]] = v; }
  function getPath(path){ return path.split('.').reduce(function(o, k){ return o == null ? o : o[k]; }, ST); }
  document.addEventListener('input', function(e){
    var el = e.target; if(!el.closest || !el.closest('.zlwrap')) return;
    var p = el.getAttribute('data-set');
    if(p){ var v = el.type === 'range' ? +el.value : el.value; if(p === 'visorOpacity' || /^(logo|pattern|flake|texts)/.test(p) || /^colors/.test(p)) change(function(){ setPath(p, v); if(p === 'logo.tol'){ var im = IMGS[ST.logo.src]; if(im) ST.logo = Object.assign({}, ST.logo, { swaps:paletteOf(im, ST.logo) }); } }, true);
      var sh = document.querySelector('[data-show="' + p + '"]'); if(sh) sh.textContent = fmt(p, v);
      if(/^colors/.test(p)){ var hx = document.querySelector('[data-hex]'); if(hx) hx.value = String(v).toUpperCase(); }
      if(/\.value$/.test(p)){ var tb = document.querySelector('[data-tsel="' + UI.at + '"]'); if(tb) tb.textContent = v || '(blank)'; }
      return; }
    if(el.hasAttribute('data-hex')){ var x = el.value.trim(); x = x.charAt(0) === '#' ? x : '#' + x; if(/^#[0-9a-f]{6}$/i.test(x)) change(function(){ setPath('colors.' + UI.sel, x.toUpperCase()); }, true); return; }
    if(el.hasAttribute('data-swap')){ var i = +el.getAttribute('data-swap'), val = el.value; change(function(){ var L = Object.assign({}, ST.logo); L.swaps = L.swaps.map(function(s, k){ return k === i ? Object.assign({}, s, { to:val }) : s; }); ST.logo = L; }, true); return; }
    if(el.hasAttribute('data-name')) UI.name = el.value;
  });
  document.addEventListener('change', function(e){
    var el = e.target; if(!el.closest || !el.closest('.zlwrap')) return;
    if(el.hasAttribute('data-set') && el.type !== 'range' && el.type !== 'text') return panel();
    var tg = el.getAttribute('data-tog'); if(tg) return change(function(){ setPath(tg, el.checked); if(tg === 'logo.knockout'){ var im = IMGS[ST.logo.src]; if(im) ST.logo = Object.assign({}, ST.logo, { swaps:paletteOf(im, ST.logo) }); } });
    if(el.hasAttribute('data-swaphide')){ var i = +el.getAttribute('data-swaphide'); return change(function(){ var L = Object.assign({}, ST.logo); L.swaps = L.swaps.map(function(s, k){ return k === i ? Object.assign({}, s, { hide:el.checked }) : s; }); ST.logo = L; }); }
    if(el.hasAttribute('data-fid')){ UI.fid = el.value; loadLab(); return panel(); }
    if(el.hasAttribute('data-logo') && el.files && el.files[0]){ var f = el.files[0], r = new FileReader();
      r.onload = function(){ var im0 = new Image(); im0.onload = function(){
          // keep logos small enough to save: longest side 900px
          var k = Math.min(1, 900 / Math.max(im0.width, im0.height)), c = document.createElement('canvas'); c.width = Math.round(im0.width * k); c.height = Math.round(im0.height * k); c.getContext('2d').drawImage(im0, 0, 0, c.width, c.height);
          var src = c.toDataURL('image/png'); loadImg(src).then(function(img){ change(function(){ var L = freshLogo(); L.src = src; L.name = f.name; L.swaps = paletteOf(img, L); ST.logo = Object.assign({}, ST.logo, { src:src, name:f.name, swaps:L.swaps, knockout:true, tol:38, inkMode:'original' }); }); say('Logo on.'); }); };
        im0.onerror = function(){ say('Couldn’t read that image.'); }; im0.src = r.result; };
      r.readAsDataURL(f); }
  });
  document.addEventListener('click', function(e){
    var b = e.target.closest && e.target.closest('button'); if(!b || !b.closest('.zlwrap, .zlstage')) return;
    var a = b.getAttribute('data-a'), v;
    if((v = b.getAttribute('data-t'))){ UI.tab = v; if(v === 'save' && UI.fid && !UI.lab) loadLab(); return panel(); }
    if((v = b.getAttribute('data-part'))){ UI.sel = v; return panel(); }
    if((v = b.getAttribute('data-color'))) return change(function(){ setPath('colors.' + UI.sel, v); if(UI.sel === 'visor') ST.visorOn = true; });
    if((v = b.getAttribute('data-finish'))) return change(function(){ ST.finish = v; });
    if((v = b.getAttribute('data-preset')) != null){ var pr = PRESETS[+v]; return change(function(){ ST.colors = Object.assign({}, ST.colors, pr.colors); ST.finish = pr.finish; ST.pattern = Object.assign(freshPattern(), pr.pattern || {}); ST.flake = Object.assign({}, ST.flake, { on:!!pr.flake }); }); }
    if((v = b.getAttribute('data-pat'))){ var P0 = ST.pattern, pd = PAT_BY[v]; return change(function(){ var np = Object.assign({}, P0, { type:v }); if(P0.type === 'none' && v !== 'none'){ np.color = lum(ST.colors.shell) > 0.25 ? '#17181A' : ST.colors.stripe; np.opacity = v === 'carbon' ? 0.92 : (pd.two ? 1 : 0.6); } ST.pattern = np; }); }
    if((v = b.getAttribute('data-patc'))) return change(function(){ setPath('pattern.color', v); });
    if((v = b.getAttribute('data-patc2'))) return change(function(){ setPath('pattern.color2', v); });
    if((v = b.getAttribute('data-blend'))) return change(function(){ setPath('logo.blend', v); });
    if((v = b.getAttribute('data-ink'))) return change(function(){ setPath('logo.inkMode', v); });
    if((v = b.getAttribute('data-inkc'))) return change(function(){ setPath('logo.ink', v); setPath('logo.inkMode', 'flat'); });
    if((v = b.getAttribute('data-font'))) return change(function(){ setPath('texts.' + UI.at + '.font', v); });
    if((v = b.getAttribute('data-tsel')) != null){ UI.at = +v; return panel(); }
    if(b.hasAttribute('data-use')) return setUse(b.getAttribute('data-use'));
    if((v = b.getAttribute('data-open'))){ var it = (UI.lab.designs || []).filter(function(x){ return x.id === v; })[0]; if(it){ UNDO.push(design()); apply(it.snap); UI.name = it.name; say('Opened ' + it.name + '.'); } return; }
    if((v = b.getAttribute('data-del'))){ if(b.getAttribute('data-arm') !== '1'){ b.setAttribute('data-arm', '1'); b.textContent = 'SURE?'; return; } return api('POST', { action:'del', id:v }).then(function(j){ UI.lab.designs = j.designs; panel(); }, function(err){ say(String(err)); }); }
    if(a === 'undo') return undo();
    if(a === 'redo') return redo();
    if(a === 'surprise') return surprise();
    if(a === 'colorgroup'){ var g = BY_ID[UI.sel].group, col = ST.colors[UI.sel]; return change(function(){ var c = Object.assign({}, ST.colors); PARTS.forEach(function(x){ if(x.group === g) c[x.id] = col; }); ST.colors = c; }); }
    if(a === 'clearlogo') return change(function(){ ST.logo = freshLogo(); });
    if(a === 'addtext'){ change(function(){ ST.texts = ST.texts.concat([freshText()]); }); UI.at = ST.texts.length - 1; return panel(); }
    if(a === 'deltext'){ change(function(){ ST.texts = ST.texts.filter(function(x, i){ return i !== UI.at; }); }); UI.at = Math.max(0, UI.at - 1); return panel(); }
    if(a === 'download'){ var l = document.createElement('a'); l.download = 'dubcey-helmet-' + ST.colors.shell.replace('#', '').toLowerCase() + '.png'; l.href = frame('image/png'); l.click(); return; }
    if(a === 'addalt'){ if(UI.busy) return; UI.busy = true; panel(); var use = document.querySelector('[data-usenow]');
      return api('POST', { action:'alt', img:frame('image/webp'), name:UI.name.trim(), use:!!(use && use.checked) }).then(function(j){ UI.busy = false; UI.lab.alts = j.alts; UI.lab.use = j.use; say('Added to ' + (D.SHORT[UI.fid] || 'your team') + '. ' + (use && use.checked ? 'You’re wearing it now.' : '')); panel(); }, function(err){ UI.busy = false; say(String(err)); panel(); }); }
    if(a === 'locker') return api('POST', { action:'save', name:UI.name.trim() || ('Design ' + ((UI.lab.designs || []).length + 1)), snap:design() }).then(function(j){ UI.lab.designs = j.designs; say('Saved to your locker.'); panel(); }, function(err){ say(String(err)); });
  });
  // click the helmet to pick the part under the cursor
  document.addEventListener('click', function(e){ if(e.target.id !== 'zlcv') return; var r = e.target.getBoundingClientRect(), id = hitTest((e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height); if(id){ UI.sel = id; UI.tab = 'color'; panel(); } });
  window.addEventListener('keydown', function(e){ if(!(e.metaKey || e.ctrlKey)) return; var t = e.target; if(t && (t.tagName === 'TEXTAREA' || (t.tagName === 'INPUT' && /^(text|)$/.test(t.type || '')))) return; var k = (e.key || '').toLowerCase(); if(k === 'z' && !e.shiftKey){ e.preventDefault(); undo(); } else if((k === 'z' && e.shiftKey) || k === 'y'){ e.preventDefault(); redo(); } });

  function surprise(){
    var pick = function(a){ return a[Math.floor(Math.random() * a.length)]; }, all = PALETTE.map(function(p){ return p[0]; }), neutrals = ['#F2F2F0', '#C9CCCE', '#8A8F93', '#4A4E53', '#17181A'];
    var shell = pick(all), con = all.filter(function(c){ return Math.abs(lum(c) - lum(shell)) > 0.22; }), stripe = pick(con.length ? con : neutrals), mask = pick([stripe, shell, '#17181A', '#F2F2F0', '#8A8F93', pick(con.length ? con : neutrals)]);
    change(function(){ ST.colors = Object.assign({}, ST.colors, { shell:shell, stripe:stripe, facemask:mask, facemaskClip:lum(mask) > 0.3 ? '#C9CCCE' : '#2A2C2F', hardware:pick(['#B9BEC4', '#D8DADB', '#8A8F93', '#C9A227']) });
      ST.finish = pick(['gloss', 'gloss', 'satin', 'matte', 'chrome']); var pt = freshPattern();
      if(Math.random() < 0.35){ var p = pick(PATTERNS.filter(function(x){ return x.key !== 'none'; })); pt = Object.assign(pt, { type:p.key, color:pick([stripe, '#17181A']), color2:pick(con.length ? con : neutrals), opacity:p.key === 'carbon' ? 0.92 : (p.two ? 1 : 0.35 + Math.random() * 0.45), angle:p.key === 'pinstripe' || p.key === 'chevron' ? pick([0, 0, 45, -30]) : 0 }); }
      ST.pattern = pt; ST.stripeOn = Math.random() < 0.8; ST.flake = Object.assign({}, ST.flake, { on:Math.random() < 0.25 }); });
    say('Surprise build.');
  }

  /* ---------- start ---------- */
  try{ var dr = JSON.parse(localStorage.getItem('dcHelmDraft') || 'null'); if(dr && dr.colors) apply(dr); }catch(e){}
  panel();
  var files = PARTS.map(function(p){ return p.file; }).concat(SHADES).concat(['badge-d.png']);
  Promise.all([Promise.all(files.map(function(f){ return loadImg(DIR + f); })), Promise.all(FONTS.map(function(f){ return document.fonts ? document.fonts.load(f.css.replace('{S}', '64')).catch(function(){}) : null; }))])
    .then(function(){ UI.ready = true; $('zlld').hidden = true; schedule(); }, function(){ UI.ready = true; $('zlld').textContent = 'SOME PARTS DIDN’T LOAD — TRY A REFRESH'; schedule(); });
  if(ST.logo.src) loadImg(ST.logo.src).then(schedule, function(){});
  D.shell('helmets').then(function(me){ UI.me = me || {}; UI.fid = UI.me.franchise || ''; $('zltop').textContent = UI.fid ? 'DESIGNING FOR ' + (D.NAME[UI.fid] || '').toUpperCase() : 'SIGN IN TO SAVE TO YOUR TEAM'; if(UI.tab === 'save') loadLab(); panel(); });
})();
