/* Dubcey Media trade graphic maker (Press Desk → TRADE MAKER). Draws a 1600×1000 card on a canvas; download it or post it as a press photo. */
(function(){
  var D = DC, esc = D.esc;
  var W = 1600, H = 1000;
  var T = { tag:'BREAKING NEWS', sides:[{ f:'', pl:[], extra:'', photo:null, col:'' }, { f:'', pl:[], extra:'', photo:null, col:'' }] };
  var IMG = {};
  function img(src){ if(!src) return Promise.resolve(null); if(IMG[src]) return IMG[src]; return (IMG[src] = new Promise(function(res){ var i = new Image(); i.onload = function(){ res(i); }; i.onerror = function(){ res(null); }; i.src = src; })); }
  var FONTS = null;
  function fonts(){ if(!FONTS) FONTS = document.fonts && document.fonts.load ? Promise.all(['150px "Alfa Slab One"', '60px "Shrikhand"', '700 30px "Courier Prime"', '700 30px "Zilla Slab"'].map(function(f){ return document.fonts.load(f).catch(function(){}); })) : Promise.resolve(); return FONTS; }

  // a team's main color, read off its helmet
  var COL = {};
  function teamColor(f){
    if(COL[f]) return Promise.resolve(COL[f]);
    return img(D.helm(f)).then(function(i){
      var c = '#1B3A63';
      if(i){ try{
        var cv = document.createElement('canvas'); cv.width = 64; cv.height = 48; var x = cv.getContext('2d'); x.drawImage(i, 0, 0, 64, 48);
        var d = x.getImageData(0, 0, 64, 48).data, B = {}, best = null;
        for(var k = 0; k < d.length; k += 4){ if(d[k + 3] < 200) continue; var r = d[k], g = d[k + 1], b = d[k + 2], mx = Math.max(r, g, b), mn = Math.min(r, g, b), s = mx ? (mx - mn) / mx : 0; if(mx < 40 && s < .3) continue; if(mn > 200) continue;
          var key = (r >> 5) + ',' + (g >> 5) + ',' + (b >> 5), o = B[key] = B[key] || { n:0, r:0, g:0, b:0, s:0 }; o.n++; o.r += r; o.g += g; o.b += b; o.s += s; }
        Object.keys(B).forEach(function(k2){ var o = B[k2], sc = o.n * (.35 + o.s / o.n); if(!best || sc > best.sc) best = { sc:sc, r:o.r / o.n, g:o.g / o.n, b:o.b / o.n }; });
        if(best) c = 'rgb(' + Math.round(best.r) + ',' + Math.round(best.g) + ',' + Math.round(best.b) + ')';
      }catch(e){} }
      return (COL[f] = c);
    });
  }
  function rgb(c){ var m = /rgb\((\d+),(\d+),(\d+)\)/.exec(c); if(m) return [+m[1], +m[2], +m[3]]; m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(c || ''); return m ? [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)] : [27, 58, 99]; }
  function shade(c, k, a){ var v = rgb(c).map(function(x){ return Math.round(k < 1 ? x * k : x + (255 - x) * (k - 1)); }); return 'rgba(' + v.join(',') + ',' + (a == null ? 1 : a) + ')'; }
  function hex(c){ return '#' + rgb(c).map(function(x){ return ('0' + x.toString(16)).slice(-2); }).join(''); }
  function light(c){ var v = rgb(c); return (v[0] * .3 + v[1] * .59 + v[2] * .11) > 150; }

  function fit(x, t, max, font){ var s = max; x.font = font.replace('#', s); while(s > 11 && x.measureText(t).width > arguments[4]){ s -= 2; x.font = font.replace('#', s); } return s; }
  function poly(x, P){ x.beginPath(); P.forEach(function(p, i){ i ? x.lineTo(p[0], p[1]) : x.moveTo(p[0], p[1]); }); x.closePath(); }
  function cover(x, i, X, Y, w, h, fx){ var s = Math.max(w / i.width, h / i.height), iw = i.width * s, ih = i.height * s; x.drawImage(i, X + (w - iw) * (fx == null ? .5 : fx), Y + (h - ih) * .25, iw, ih); }
  function contain(x, i, X, Y, w, h, flip){ var s = Math.min(w / i.width, h / i.height), iw = i.width * s, ih = i.height * s, dx = X + (w - iw) / 2, dy = Y + (h - ih) / 2; x.save(); if(flip){ x.translate(dx + iw, dy); x.scale(-1, 1); x.drawImage(i, 0, 0, iw, ih); } else x.drawImage(i, dx, dy, iw, ih); x.restore(); }
  function pinfo(p){ var i = D.pinfo(p.id) || []; return { n:p.n || i[0] || '', pos:i[1] || '', tm:i[2] || '' }; }
  function nice(n){ var m = /^([^,]+),\s*(.+)$/.exec(n || ''); return (m ? m[2] + ' ' + m[1] : n || '').toUpperCase(); }

  function render(cv){
    var A = T.sides[0], B = T.sides[1];
    return Promise.all([fonts(), A.f ? teamColor(A.f) : '#1B3A63', B.f ? teamColor(B.f) : '#8E1D22', img(A.f ? D.helm(A.f) : ''), img(B.f ? D.helm(B.f) : ''), img(A.photo), img(B.photo), img('h/logo.webp'), img(D.PRESS_SM ? 'h/press-pass.webp' : '')]).then(function(R){
      var cA = A.col || R[1], cB = B.col || R[2], hA = R[3], hB = R[4], pA = R[5], pB = R[6], logo = R[7], pass = R[8];
      cv.width = W; cv.height = H; var x = cv.getContext('2d');
      var LS = [[0, 0], [858, 0], [742, H], [0, H]], RS = [[858, 0], [W, 0], [W, H], [742, H]];
      x.fillStyle = '#081322'; x.fillRect(0, 0, W, H);
      [[LS, cA, 0], [RS, cB, 1]].forEach(function(z){
        var g = x.createLinearGradient(z[2] ? W : 0, 0, z[2] ? 800 : 800, H);
        g.addColorStop(0, shade(z[1], .55)); g.addColorStop(.55, shade(z[1], .3)); g.addColorStop(1, shade(z[1], .12));
        poly(x, z[0]); x.fillStyle = g; x.fill();
      });
      // stadium-light glow + pinstripes
      x.save(); poly(x, [[0, 0], [W, 0], [W, H], [0, H]]); x.clip();
      for(var k = 0; k < W; k += 46){ x.fillStyle = 'rgba(255,255,255,.025)'; x.fillRect(k, 0, 2, H); }
      [[300, 120, cA], [1300, 120, cB]].forEach(function(o){ var g = x.createRadialGradient(o[0], o[1], 10, o[0], o[1], 640); g.addColorStop(0, shade(o[2], 1.5, .35)); g.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = g; x.fillRect(0, 0, W, H); });
      x.restore();
      // player photos (optional), clipped to each side and faded at the bottom
      [[pA, LS, 0], [pB, RS, 1]].forEach(function(z){ if(!z[0]) return; x.save(); poly(x, z[1]); x.clip(); x.globalAlpha = .96; cover(x, z[0], z[2] ? 742 : 0, 150, 858, H - 150, .5); x.globalAlpha = 1;
        var g = x.createLinearGradient(0, 560, 0, H); g.addColorStop(0, 'rgba(8,19,34,0)'); g.addColorStop(1, 'rgba(8,19,34,.92)'); x.fillStyle = g; x.fillRect(0, 0, W, H);
        var g2 = x.createLinearGradient(0, 120, 0, 330); g2.addColorStop(0, 'rgba(8,19,34,.85)'); g2.addColorStop(1, 'rgba(8,19,34,0)'); x.fillStyle = g2; x.fillRect(0, 0, W, 330); x.restore(); });
      // seam
      x.save(); x.strokeStyle = '#E0A72B'; x.lineWidth = 6; x.beginPath(); x.moveTo(858, 0); x.lineTo(742, H); x.stroke(); x.restore();
      // helmets: big in the middle of each side with no photo, smaller in the outer corner with one
      [[hA, pA, 0], [hB, pB, 1]].forEach(function(z){ if(!z[0]) return; x.save(); x.shadowColor = 'rgba(0,0,0,.55)'; x.shadowBlur = 30; x.shadowOffsetY = 14;
        if(z[1]) contain(x, z[0], z[2] ? W - 360 : 40, 190, 320, 240, z[2]); else contain(x, z[0], z[2] ? 960 : 120, 230, 520, 330, z[2]);
        x.restore(); });
      // team names
      [[A, 0, cA], [B, 1, cB]].forEach(function(z){ if(!z[0].f) return; var nm = D.NAME[z[0].f] || '', ph = z[1] ? pB : pA; x.save();
        var cx = ph ? (z[1] ? W - 200 : 200) : (z[1] ? 1210 : 390), cy = ph ? 470 : 588; x.translate(cx, cy); x.rotate(-.07);
        var s = fit(x, nm, ph ? 50 : 60, '#px "Shrikhand"', ph ? 340 : 560); x.textAlign = 'center'; x.textBaseline = 'middle';
        x.lineWidth = 8; x.strokeStyle = 'rgba(8,19,34,.85)'; x.strokeText(nm, 0, 0); x.fillStyle = '#E0A72B'; x.fillText(nm, 0, 0); x.restore(); });
      // header
      x.save(); x.textAlign = 'center';
      x.font = '700 24px "Courier Prime"'; x.fillStyle = '#F7EFDB'; x.letterSpacing = '8px'; x.fillText('DUBCEY FANTASY FOOTBALL', 800, 58); x.letterSpacing = '0px';
      x.font = '150px "Alfa Slab One"'; x.fillStyle = '#c8282d'; x.fillText('TRADE', 808, 208); x.fillStyle = '#F7EFDB'; x.fillText('TRADE', 800, 200);
      x.restore();
      // DUBCEY MEDIA tag (left) + headline tag (right)
      poly(x, [[0, 26], [330, 26], [300, 104], [0, 104]]); x.fillStyle = '#c8282d'; x.fill();
      if(pass){ x.save(); x.shadowColor = 'rgba(0,0,0,.4)'; x.shadowBlur = 8; contain(x, pass, 22, 14, 62, 100); x.restore(); }
      x.fillStyle = '#F7EFDB'; x.font = '36px "Alfa Slab One"'; x.fillText('DUBCEY', 94, 64); x.font = '700 22px "Courier Prime"'; x.letterSpacing = '6px'; x.fillText('MEDIA · RDPC', 96, 92); x.letterSpacing = '0px';
      var tg = (T.tag || '').toUpperCase().trim();
      if(tg){ x.font = '40px "Alfa Slab One"'; var tw = Math.min(400, x.measureText(tg).width + 70); poly(x, [[W - tw - 30, 26], [W, 26], [W, 104], [W - tw - 60, 104]]); x.fillStyle = '#c8282d'; x.fill(); x.fillStyle = '#F7EFDB'; x.textAlign = 'right'; fit(x, tg, 40, '#px "Alfa Slab One"', tw - 50); x.fillText(tg, W - 30, 80); x.textAlign = 'left'; }
      // swap arrows + shield on the seam
      function arrow(y, dir, col){ x.save(); x.translate(800, y); x.scale(dir, 1); x.fillStyle = col; x.shadowColor = 'rgba(0,0,0,.5)'; x.shadowBlur = 12; poly(x, [[-90, -16], [40, -16], [40, -40], [92, 0], [40, 40], [40, 16], [-90, 16]]); x.fill(); x.restore(); }
      arrow(330, 1, light(cA) ? hex(cA) : '#E0A72B'); arrow(420, -1, light(cB) ? hex(cB) : '#F7EFDB');
      if(logo){ x.save(); x.shadowColor = 'rgba(0,0,0,.6)'; x.shadowBlur = 24; contain(x, logo, 730, 470, 140, 175); x.restore(); }
      // player plates (what each side SENDS)
      [[A, 0], [B, 1]].forEach(function(z){
        var L = z[0].pl.map(pinfo), ex = (z[0].extra || '').trim(); if(!L.length && !ex) return;
        var rows = Math.min(4, L.length + (ex ? 1 : 0)), rh = rows >= 3 ? 58 : 70, ph = rows * rh + 46, top = 890 - ph;
        var P = z[1] ? [[790, top], [W - 30, top], [W - 30, 890], [770, 890]] : [[30, top], [800, top], [780, 890], [30, 890]];
        x.save(); poly(x, P); x.fillStyle = 'rgba(8,19,34,.88)'; x.fill(); x.strokeStyle = z[1] ? (light(cB) ? hex(cB) : shade(cB, 1.5)) : '#E0A72B'; x.lineWidth = 4; x.stroke(); x.restore();
        var X0 = z[1] ? W - 60 : 64; x.textAlign = z[1] ? 'right' : 'left'; var y = top + (rh === 70 ? 64 : 56), ns = rh === 70 ? 46 : 38;
        L.slice(0, ex ? 3 : 4).forEach(function(p){ fit(x, nice(p.n), ns, '#px "Alfa Slab One"', 660); x.fillStyle = '#F7EFDB'; x.fillText(nice(p.n), X0, y); x.font = '700 18px "Courier Prime"'; x.letterSpacing = '5px'; x.fillStyle = '#E0A72B'; x.fillText([p.pos, p.tm].filter(Boolean).join(' · '), X0, y + 22); x.letterSpacing = '0px'; y += rh; });
        if(ex){ fit(x, ex.toUpperCase(), rh === 70 ? 34 : 30, '#px "Alfa Slab One"', 660); x.fillStyle = '#F7EFDB'; x.fillText('+ ' + ex.toUpperCase(), X0, y); }
        x.textAlign = 'left';
      });
      // bottom line: who gets what
      x.fillStyle = '#081322'; x.fillRect(0, 912, W, 88); x.fillStyle = '#E0A72B'; x.fillRect(0, 912, W, 4);
      function gets(to, from){ var L = from.pl.map(function(p){ return nice(pinfo(p).n); }); if((from.extra || '').trim()) L.push(from.extra.trim().toUpperCase()); return (D.SHORT[to.f] || D.NAME[to.f] || 'TEAM').toUpperCase() + ' → GETS ' + (L.join(', ') || '—'); }
      x.font = '700 22px "Courier Prime"'; x.letterSpacing = '2px'; x.fillStyle = '#F7EFDB'; x.textAlign = 'center';
      var g1 = gets(A, B), g2 = gets(B, A); fit(x, g1, 22, '700 #px "Courier Prime"', 720); x.fillText(g1, 400, 966); fit(x, g2, 22, '700 #px "Courier Prime"', 720); x.fillText(g2, 1200, 966);
      x.fillStyle = '#2C4C78'; x.fillRect(799, 938, 2, 46); x.letterSpacing = '0px'; x.textAlign = 'left';
      return cv;
    });
  }

  function side(i){
    var s = T.sides[i];
    return '<div class="tmside"><div class="kick mono">' + (i ? 'RIGHT SIDE' : 'LEFT SIDE') + ' · TEAM AND WHAT IT SENDS</div>' +
      '<label class="mono">TEAM<select data-tmf="' + i + '"><option value="">— pick a team —</option>' + D.IDS.map(function(id){ return '<option value="' + id + '"' + (id === s.f ? ' selected' : '') + '>' + esc(D.NAME[id]) + '</option>'; }).join('') + '</select></label>' +
      '<div class="mono pdlab">PLAYERS IT SENDS</div><div class="pdpl">' + s.pl.map(function(p, k){ return '<span class="ptag pl">' + esc(p.n) + '<button type="button" data-tmrm="' + i + ':' + k + '" aria-label="Remove">×</button></span>'; }).join('') + '<div class="pdsrch"><input data-tmps="' + i + '" placeholder="Add a player…" autocomplete="off"><div class="pdsr" id="tmsr' + i + '"></div></div></div>' +
      '<label class="mono">ALSO SENDS (PICKS, CASH …)<input data-tmx="' + i + '" maxlength="40" value="' + esc(s.extra) + '" placeholder="2027 2nd round pick"></label>' +
      '<div class="tmrow"><label class="btn ghost2 sm">' + (s.photo ? 'REPLACE PLAYER PHOTO' : 'ADD PLAYER PHOTO') + '<input type="file" accept="image/*" data-tmph="' + i + '" hidden></label>' + (s.photo ? '<button type="button" class="btn ghost2 sm" data-tmnoph="' + i + '">NO PHOTO</button>' : '') +
      '<label class="mono tmcol">COLOR<input type="color" data-tmc="' + i + '" value="' + hex(s.col || COL[s.f] || (i ? '#8E1D22' : '#1B3A63')) + '"></label>' + (s.col ? '<button type="button" class="lnk mono" data-tmca="' + i + '">AUTO</button>' : '') + '</div></div>';
  }
  var ROOT = null, CV = null, tick = 0;
  function redraw(){ var n = ++tick; if(!CV) return; render(document.createElement('canvas')).then(function(c){ if(n !== tick || !CV) return; CV.width = c.width; CV.height = c.height; CV.getContext('2d').drawImage(c, 0, 0); }); }
  function form(){
    ROOT.querySelector('#tmform').innerHTML = '<label class="mono">TAG (TOP RIGHT)<input data-tmtag maxlength="24" value="' + esc(T.tag) + '" placeholder="BREAKING NEWS"></label><div class="tmsides">' + side(0) + side(1) + '</div>';
    D.pressDesk && D.pressDesk.players();
  }
  D.tradeMaker = function(root){
    ROOT = root;
    root.innerHTML = '<div class="trmk"><div class="tmprev card"><div class="bar mono"><span>TRADE GRAPHIC</span><span>1600 × 1000</span></div><canvas id="tmcv" width="1600" height="1000"></canvas>' +
      '<div class="pdact pad"><button class="btn" type="button" data-tmpost>POST TO PRESS PHOTOS</button><button class="btn ghost2" type="button" data-tmdl>DOWNLOAD PNG</button><button type="button" class="lnk mono" data-tmclr>START OVER</button></div></div>' +
      '<div class="pded card"><div class="bar mono"><span>BUILD IT</span><span>EVERYTHING UPDATES AS YOU GO</span></div><div class="ef pad" id="tmform"></div></div></div>';
    CV = root.querySelector('#tmcv'); form(); redraw();
  };
  function live(){ return ROOT && document.body.contains(ROOT.querySelector('#tmcv')); }
  function caption(){ var A = T.sides[0], B = T.sides[1]; function w(s){ var L = s.pl.map(function(p){ return nice(pinfo(p).n); }); if(s.extra) L.push(s.extra); return L.join(', ').toLowerCase().replace(/\b\w/g, function(c){ return c.toUpperCase(); }); } return 'Trade: ' + (D.SHORT[A.f] || 'A') + ' send ' + (w(A) || '—') + ' to ' + (D.SHORT[B.f] || 'B') + ' for ' + (w(B) || '—'); }

  document.addEventListener('click', function(e){
    if(!live()) return; var t = e.target, P = D.pressDesk;
    var rm = t.closest('[data-tmrm]'); if(rm){ var a = rm.getAttribute('data-tmrm').split(':'); T.sides[+a[0]].pl.splice(+a[1], 1); form(); redraw(); return; }
    var ad = t.closest('[data-tmadd]'); if(ad){ var b = ad.getAttribute('data-tmadd').split(':'), s = T.sides[+b[0]]; P.players().then(function(L){ var p = L.filter(function(q){ return q.id === b[1]; })[0]; if(p && !s.pl.some(function(q){ return q.id === p.id; })){ s.pl.push({ id:p.id, n:p.n }); if(!s.f && p.own) s.f = p.own; } form(); redraw(); var ip = document.querySelector('[data-tmps="' + b[0] + '"]'); if(ip) ip.focus(); }); return; }
    var np = t.closest('[data-tmnoph]'); if(np){ T.sides[+np.getAttribute('data-tmnoph')].photo = null; form(); redraw(); return; }
    var ca = t.closest('[data-tmca]'); if(ca){ T.sides[+ca.getAttribute('data-tmca')].col = ''; form(); redraw(); return; }
    if(t.closest('[data-tmclr]')){ T = { tag:'BREAKING NEWS', sides:[{ f:'', pl:[], extra:'', photo:null, col:'' }, { f:'', pl:[], extra:'', photo:null, col:'' }] }; form(); redraw(); return; }
    if(t.closest('[data-tmdl]')){ render(document.createElement('canvas')).then(function(c){ var a2 = document.createElement('a'); a2.download = 'dubcey-trade-' + [T.sides[0].f, T.sides[1].f].join('-') + '.png'; a2.href = c.toDataURL('image/png'); document.body.appendChild(a2); a2.click(); a2.remove(); }); return; }
    if(t.closest('[data-tmpost]')){
      var A = T.sides[0], B = T.sides[1]; if(!A.f || !B.f){ P.toast('PICK BOTH TEAMS', true); return; } if(!A.pl.length && !B.pl.length){ P.toast('ADD THE PLAYERS', true); return; }
      t.disabled = true; P.toast('POSTING…');
      render(document.createElement('canvas')).then(function(c){ return new Promise(function(res){ c.toBlob(res, 'image/webp', .9); }); }).then(function(blob){
        var id = P.uid('p'); return P.upload(blob, id, 1600).then(function(u){ var by = P.by();
          var item = { id:id, url:u, cap:caption(), players:A.pl.concat(B.pl).map(function(p){ return { id:p.id, n:p.n }; }), teams:[A.f, B.f], at:Date.now(), by:by.by, mid:by.mid };
          return P.update('pgfx', function(cur){ cur.items = [item].concat(cur.items || []).slice(0, 300); }, 'TRADE GRAPHIC POSTED'); });
      }).then(function(){ t.disabled = false; P.reload(); }).catch(function(m){ t.disabled = false; P.toast(typeof m === 'string' ? m : 'COULDN’T POST IT', true); });
    }
  });
  document.addEventListener('input', function(e){
    if(!live()) return; var t = e.target;
    if(t.matches('[data-tmtag]')){ T.tag = t.value; redraw(); }
    if(t.matches('[data-tmx]')){ T.sides[+t.getAttribute('data-tmx')].extra = t.value; redraw(); }
    if(t.matches('[data-tmc]')){ T.sides[+t.getAttribute('data-tmc')].col = t.value; redraw(); }
    if(t.matches('[data-tmps]')){ var i = t.getAttribute('data-tmps'), P = D.pressDesk; P.players().then(function(){ document.getElementById('tmsr' + i).innerHTML = P.find(t.value).map(function(p){ return '<button type="button" data-tmadd="' + i + ':' + esc(p.id) + '"><b>' + esc(p.n) + '</b><i class="mono">' + esc(p.pos + ' · ' + p.tm) + (p.own ? ' · ' + esc(D.SHORT[p.own]).toUpperCase() : '') + '</i></button>'; }).join(''); }); }
  });
  document.addEventListener('change', function(e){
    if(!live()) return; var t = e.target;
    if(t.matches('[data-tmf]')){ T.sides[+t.getAttribute('data-tmf')].f = t.value; T.sides[+t.getAttribute('data-tmf')].col = ''; teamColor(t.value).then(function(){ form(); redraw(); }); }
    if(t.matches('[data-tmph]') && t.files[0]){ var s = T.sides[+t.getAttribute('data-tmph')]; if(s.photo) URL.revokeObjectURL(s.photo); s.photo = URL.createObjectURL(t.files[0]); form(); redraw(); }
  });
})();
