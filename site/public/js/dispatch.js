(function(){
  var D = DC, num = D.num, $ = D.$, esc = D.esc, arr = D.arr, helm = D.helm;
  var AWID = { "Team of the Week":"0004", "Biggest Bust":"0012", "Luckiest Win":"0005" };
  var C = null, w = new URLSearchParams(location.search).get('w');
  D.shell('dispatch');
  document.addEventListener('click', function(e){
    var sh = e.target.closest('[data-share]'); if(sh){ e.preventDefault(); e.stopPropagation(); share(sh); return; }
    var c = e.target.closest('.st,.tk'); if(c){ c.classList.toggle('open'); return; }
    var b = e.target.closest('[data-w]'); if(b){ e.preventDefault(); w = b.getAttribute('data-w'); draw(); history.replaceState(null, '', D.href('dispatch', 'w=' + w)); window.scrollTo(0, 0); }
  });
  D.api('liveScoring').then(function(j){
    var cw = num(j && j.liveScoring && j.liveScoring.week) || 1;
    Promise.all([D.previews(cw), D.column().catch(function(){ return null; })]).then(function(R){ var P = R[0], WP = (R[1] && R[1].previews && R[1].previews[cw]) || {}; if(!P.length) return; P.forEach(function(p){ p.txt = WP[p.a + '-' + p.h] || null; }); P.sort(function(x, y){ return (y.txt ? 1 : 0) - (x.txt ? 1 : 0); }); $('prevH').textContent = 'Week ' + cw + ' Previews'; $('prev').innerHTML = P.map(D.previewCard).join(''); $('prevSec').hidden = false; }).catch(function(){});
    D.power(cw).then(function(PR){ if(!PR.week) return; var s = D.powerStory(PR);
      $('powS').innerHTML = '<div class="card pwst"><div class="pwsh"><img src="' + helm(s.id) + '" alt=""><div><div class="kick mono">' + s.kick + '</div><h2>' + s.head + '</h2><p>' + s.body + '</p></div></div><ol>' + s.top5.map(function(t){ return '<li><b class="mono">' + t.rk + '</b><img src="' + helm(t.id) + '" alt=""><span>' + esc(D.SHORT[t.id]) + '</span><i class="mono ' + (t.mv > 0 ? 'up' : t.mv < 0 ? 'dn' : '') + '">' + (t.mv > 0 ? '\u25b2' + t.mv : t.mv < 0 ? '\u25bc' + (-t.mv) : '\u2013') + '</i></li>'; }).join('') + '</ol></div>';
      $('powSec').hidden = false; }).catch(function(){});
  }).catch(function(){});
  D.column().then(function(c){ C = c; draw(); }).catch(function(){ $('disp').innerHTML = '<div class="ld mono">THE DISPATCH IS ON ITS WAY.</div>'; });

  function shb(k, i){ return '<button type="button" class="shr mono" data-share="' + k + ':' + i + '" aria-label="Share as an image">SHARE \u2197</button>'; }

  /* ---------- share a story or take as a 1080x1350 image (group-chat sized) ---------- */
  function wrap(x, t, max){ var w = String(t).split(/\s+/), L = [], cur = ''; w.forEach(function(word){ var tr = cur ? cur + ' ' + word : word; if(x.measureText(tr).width > max && cur){ L.push(cur); cur = word; } else cur = tr; }); if(cur) L.push(cur); return L; }
  function fit(x, t, font, size, min, max, lines){ var f, L, s0; do { s0 = size; f = font.replace('#', size + 'px'); x.font = f; L = wrap(x, t, max); size -= 2; } while(L.length > lines && size >= min); return { f:f, L:L.slice(0, lines), lh:Math.round(s0 * 1.18) }; }
  function img(src){ return new Promise(function(res){ var i = new Image(); i.onload = function(){ res(i); }; i.onerror = function(){ res(null); }; i.src = src; }); }
  function card(o){
    var Wd = 1080, Ht = 1350, cv = document.createElement('canvas'); cv.width = Wd; cv.height = Ht; var x = cv.getContext('2d');
    return Promise.all([document.fonts ? Promise.all(['64px "Alfa Slab One"', '64px "Shrikhand"', '34px "Zilla Slab"', '700 26px "Courier Prime"'].map(function(f){ return document.fonts.load(f).catch(function(){}); })) : null, img(o.helm)]).then(function(r){
      var hm = r[1], L0 = 64, PW = Wd - 128, pad = 56, mw = PW - 2 * pad, py = 600, pb = Ht - 110;
      x.fillStyle = '#102542'; x.fillRect(0, 0, Wd, Ht);
      x.globalAlpha = .05; x.fillStyle = '#F7EFDB'; for(var i = -Ht; i < Wd; i += 30){ x.beginPath(); x.moveTo(i, 0); x.lineTo(i + 12, 0); x.lineTo(i + 12 + Ht, Ht); x.lineTo(i + Ht, Ht); x.fill(); } x.globalAlpha = 1;
      x.fillStyle = '#c8282d'; x.fillRect(0, 0, Wd, 14);
      x.textAlign = 'center'; x.fillStyle = '#F7EFDB'; x.font = '64px "Shrikhand", cursive'; x.fillText('Dubcey Chronicle', Wd / 2, 118);
      x.fillStyle = '#E0A72B'; x.font = '700 26px "Courier Prime", monospace'; x.fillText(o.top, Wd / 2, 166);
      if(hm){ var hh = 360, hw = hm.width / hm.height * hh; if(hw > 640){ hw = 640; hh = hw * hm.height / hm.width; } x.shadowColor = 'rgba(0,0,0,.45)'; x.shadowOffsetX = 6; x.shadowOffsetY = 8; x.drawImage(hm, (Wd - hw) / 2, 210 + (360 - hh) / 2, hw, hh); x.shadowColor = 'transparent'; x.shadowOffsetX = 0; x.shadowOffsetY = 0; }
      x.fillStyle = '#c8282d'; x.fillRect(L0 + 12, py + 12, PW, pb - py);
      x.fillStyle = '#F7EFDB'; x.fillRect(L0, py, PW, pb - py);
      x.strokeStyle = '#102542'; x.lineWidth = 4; x.strokeRect(L0, py, PW, pb - py);
      x.textAlign = 'left'; var y = py + 66, X = L0 + pad;
      x.fillStyle = '#c8282d'; x.font = '700 26px "Courier Prime", monospace'; x.fillText(String(o.kick || '').toUpperCase().slice(0, 60), X, y); y += 14;
      var hd = fit(x, o.head, '# "Alfa Slab One", serif', 64, 38, mw, 4); x.fillStyle = '#102542'; x.font = hd.f; hd.L.forEach(function(l){ y += hd.lh; x.fillText(l, X, y); });
      y += 24; x.fillStyle = '#D9CDA9'; x.fillRect(X, y, mw, 3); y += 8;
      var room = pb - 40 - y, bd = null; for(var sz = 36; sz >= 22; sz -= 2){ bd = fit(x, o.dek, '# "Zilla Slab", serif', sz, sz, mw, 999); if(bd.L.length * bd.lh <= room) break; }
      var nl = Math.max(1, Math.floor(room / bd.lh)); if(bd.L.length > nl){ bd.L = bd.L.slice(0, nl); bd.L[nl - 1] = bd.L[nl - 1].replace(/\s*\S*$/, '') + '\u2026'; }
      x.fillStyle = '#2A3442'; x.font = bd.f; bd.L.forEach(function(l){ y += bd.lh; x.fillText(l, X, y); });
      x.textAlign = 'center'; x.fillStyle = '#9FB4CC'; x.font = '700 24px "Courier Prime", monospace'; x.fillText(o.url, Wd / 2, Ht - 40);
      return new Promise(function(res){ cv.toBlob(res, 'image/png'); });
    });
  }
  function share(b){
    var p = b.getAttribute('data-share').split(':'), W = C.weeks[w], o;
    if(p[0] === 's'){ var st = arr(W.dispatch)[+p[1]]; if(!st) return; o = { helm:helm(st.id), kick:st.kick, head:st.head, dek:st.dek }; }
    else o = { helm:helm(p[1]), kick:'Around the League \u00b7 Week ' + w, head:D.NAME[p[1]] || p[1], dek:(W.takes || {})[p[1]] || '' };
    o.top = 'THE DISPATCH \u00b7 WEEK ' + w; o.url = 'DUBCEY.PARTY/DISPATCH?W=' + w;
    var lbl = b.textContent; b.disabled = true; b.textContent = 'MAKING IMAGE\u2026';
    card(o).then(function(blob){
      if(!blob) throw 0;
      var name = 'dubcey-wk' + w + '-' + String(o.head).toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40) + '.png', file = window.File ? new File([blob], name, { type:'image/png' }) : null;
      if(file && navigator.canShare && navigator.canShare({ files:[file] })) return navigator.share({ files:[file], title:o.head }).catch(function(){});
      var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); setTimeout(function(){ URL.revokeObjectURL(a.href); a.remove(); }, 4000);
    }).catch(function(){ alert('Couldn\u2019t make the image.'); }).then(function(){ b.disabled = false; b.textContent = lbl; });
  }

  function draw(){
    var ks = Object.keys(C.weeks || {}).filter(function(k){ return C.weeks[k] && (arr(C.weeks[k].dispatch).length || C.weeks[k].takes); }).sort(function(a, b){ return b - a; });
    if(!ks.length) return;
    if(!w || ks.indexOf(w) < 0) w = ks[0];
    $('weeks').innerHTML = ks.slice().reverse().map(function(k){ return '<a class="' + (k === w ? 'on' : '') + '" href="' + D.href('dispatch', 'w=' + k) + '" data-w="' + k + '">' + k + '</a>'; }).join('');
    $('k').textContent = 'THE DISPATCH · WEEK ' + w;
    var W = C.weeks[w], Dp = arr(W.dispatch);
    if(Dp.length){
      var lead = Dp[0];
      $('disp').innerHTML = '<div class="bar mono"><span>WEEK ' + esc(w) + '</span><span>' + Dp.length + ' STORIES</span></div>' +
        '<div class="lead"><div class="tx"><div class="kick mono">' + esc(lead.kick) + '</div><h1>' + esc(lead.head) + '</h1><p>' + esc(lead.dek) + '</p>' + shb('s', 0) + '</div><div class="ph"><img src="' + helm(lead.id) + '" alt=""></div></div>' +
        '<div class="stories">' + Dp.slice(1).map(function(s, i){ return '<div class="st open"><img src="' + helm(s.id) + '" alt=""><div><div class="kick mono">' + esc(s.kick) + '</div><h2>' + esc(s.head) + '</h2><p>' + esc(s.dek) + '</p>' + shb('s', i + 1) + '</div></div>'; }).join('') + '</div>';
      $('disp').hidden = false;
    } else $('disp').hidden = true;
    var T = W.takes || {}, ids = Object.keys(T);
    $('takesSec').hidden = !ids.length;
    $('takes').innerHTML = ids.map(function(id){ return '<div class="tk open"><div class="th"><img src="' + helm(id) + '" alt=""><b>' + esc(D.NAME[id] || id) + '</b><span class="plate"></span></div><p>' + esc(T[id]) + '</p>' + shb('t', id) + '</div>'; }).join('');
    var aw = W.awards || {}, ak = Object.keys(aw);
    $('awards').hidden = !ak.length;
    $('awards').innerHTML = '<div class="bar mono"><span>WEEK ' + esc(w) + ' AWARDS</span></div>' + ak.map(function(k){ var A = D.award(aw[k]), id = A.id || AWID[k]; return '<div class="aw">' + (id ? '<img src="' + helm(id) + '" alt="">' : '<span></span>') + '<b class="mono">' + esc(k) + '</b><span>' + esc(A.text) + '</span></div>'; }).join('');
  }
})();
