(function(){
  var D = DC, $ = D.$, esc = D.esc, arr = D.arr, num = D.num, helm = D.helm;
  var mq = window.matchMedia('(max-width:760px)'); function NARROW(){ return mq.matches; }
  mq.addEventListener && mq.addEventListener('change', function(){ if(S.data) draw(); });
  var ORDER = { QB:1, RB:2, WR:3, TE:4, PK:5, K:5, Def:6, DEF:6 };
  var qs = new URLSearchParams(location.search);
  var S = { cur:0, w:+qs.get('w') || 0, sel:qs.has('m') ? +qs.get('m') : -1, data:null, rec:{}, me:'', benchOpen:false, timer:0, nfl:null };

  D.shell('scores').then(function(me){ S.me = me.franchise || ''; if(S.data) draw(); });
  D.records().then(function(r){ S.rec = r.rec; if(S.data) draw(); });

  function norm(j){
    var L = j && (j.liveScoring || j.weeklyResults);
    if(!L) return null;
    return { week:String(L.week || ''), ms:arr(L.matchup).map(function(m){
      return arr(m.franchise).map(function(f){
        var pl = arr((f.players && f.players.player) || f.player).map(function(p){ return { id:p.id, s:num(p.score), st:p.status === 'starter', sec:num(p.gameSecondsRemaining) }; });
        return { id:f.id, score:num(f.score), ytp:num(f.playersYetToPlay), cur:num(f.playersCurrentlyPlaying), sec:num(f.gameSecondsRemaining), pl:pl };
      });
    }).filter(function(m){ return m.length === 2; }) };
  }

  function load(first){
    var q = S.w && S.w !== S.cur ? 'W=' + S.w : '';
    return D.api('liveScoring', q).then(function(j){
      var d = norm(j); if(!d || !d.ms.length) throw 0;
      if(first){ S.cur = +d.week; if(!S.w) S.w = S.cur; }
      var ids = []; d.ms.forEach(function(m){ m.forEach(function(f){ f.pl.forEach(function(p){ ids.push(p.id); }); }); });
      return Promise.all([D.players(ids), nfl(S.w), S.w === S.cur ? projs(S.w, ids) : null]).then(function(){ S.data = d; draw(); schedule(); });
    }).catch(function(){
      if(S.w && S.w !== S.cur) return Promise.all([D.api('weeklyResults', 'W=' + S.w), nfl(S.w)]).then(function(x){ var d = norm(x[0]); if(!d) throw 0; S.data = d; draw(); });
      $('mu').innerHTML = '<div class="ld mono">SCORES AREN\u2019T AVAILABLE RIGHT NOW.</div>';
    });
  }
  // MFL projections for the current week; live projection = points so far + the unplayed share of the projection
  function projs(w, ids){
    if(S.pj && S.pjw === w) return Promise.resolve();
    return D.api('projectedScores', 'W=' + w + '&PLAYERS=' + ids.join(',')).then(function(j){
      var P = {}; arr(j && j.projectedScores && j.projectedScores.playerScore).forEach(function(x){ if(x.score !== '') P[x.id] = num(x.score); });
      S.pj = P; S.pjw = w;
    }).catch(function(){ S.pj = S.pj || {}; });
  }
  function hasProj(){ return S.w === S.cur && S.pj && S.pjw === S.w && Object.keys(S.pj).length; }
  function lproj(p){
    var pr = S.pj[p.id]; if(pr == null) return p.s;
    var g = S.nfl && S.nfl[D.pinfo(p.id)[2]], left = p.sec;
    if(g && g.kick > Date.now()) left = 3600;
    if(!left || left <= 0) return p.s;
    return p.s + pr * Math.min(1, left / 3600);
  }
  function tproj(f){ return f.pl.reduce(function(a, p){ return p.st ? a + lproj(p) : a; }, 0); }
  // NFL games for the week: who each team plays, kickoff, live clock and score
  function nfl(w){
    return D.api('nflSchedule', 'W=' + w).then(function(j){
      var M = {}; arr(j && j.nflSchedule && j.nflSchedule.matchup).forEach(function(m){
        var t = arr(m.team); if(t.length < 2) return;
        t.forEach(function(x, i){ var o = t[1 - i]; M[x.id] = { opp:o.id, home:x.isHome === '1', kick:num(m.kickoff) * 1000, sec:num(m.gameSecondsRemaining), my:x.score, their:o.score, pos:x.hasPossession === '1', rz:x.inRedZone === '1' }; });
      });
      S.nfl = M;
    }).catch(function(){ S.nfl = S.nfl || {}; });
  }
  function game(t){
    if(!S.nfl || !Object.keys(S.nfl).length) return '';
    var g = S.nfl[t]; if(!g) return t ? '<span class="gi">BYE</span>' : '';
    var vs = (g.home ? 'vs ' : '@ ') + '<img class="nl" src="' + D.nflLogo(g.opp) + '" alt="">' + esc(g.opp), now = Date.now(), sc = g.my != null && g.my !== '' ? num(g.my) + '\u2013' + num(g.their) : '';
    if(g.kick > now && !num(g.my) && !num(g.their)) return '<span class="gi">' + vs + ' \u00b7 ' + esc(new Date(g.kick).toLocaleString(undefined, { weekday:'short', hour:'numeric', minute:'2-digit' }).toUpperCase()) + '</span>';
    if(g.sec > 0 && S.w === S.cur){ var q = g.sec > 3600 ? 'OT' : 'Q' + Math.min(4, 4 - Math.floor((g.sec - 1) / 900)), c = g.sec > 3600 ? g.sec - 3600 : ((g.sec - 1) % 900) + 1;
      return '<span class="gi lv">' + vs + ' \u00b7 ' + q + ' ' + Math.floor(c / 60) + ':' + ('0' + (c % 60)).slice(-2) + (sc ? ' \u00b7 ' + sc : '') + (g.rz ? ' \u00b7 RED ZONE' : '') + '</span>'; }
    var wl = sc ? (num(g.my) > num(g.their) ? ' W' : num(g.my) < num(g.their) ? ' L' : ' T') : '';
    return '<span class="gi">' + vs + ' \u00b7 FINAL' + (sc ? ' ' + sc + wl : '') + '</span>';
  }
  function wantStats(m){
    var live = isLive(), ids = [];
    m.forEach(function(f){ f.pl.forEach(function(p){ if(p.st || S.benchOpen) ids.push(p.id); }); });
    var started = ids.filter(function(id){ var g = S.nfl && S.nfl[D.pinfo(id)[2]]; return !g || g.kick <= Date.now() || S.w < S.cur; });
    if(!started.length) return;
    D.stats(S.w, started, live).then(function(){
      [].forEach.call(document.querySelectorAll('.pr[data-p]'), function(el){ var s = D.statOf(S.w, el.getAttribute('data-p')), x = el.querySelector('.sx'); if(x){ var t = s || x.getAttribute('data-ph'); if(x.textContent !== t){ x.textContent = t; x.classList.toggle('none', !s); } } });
    });
  }
  function isLive(){ return S.data && S.w === S.cur && S.data.ms.some(function(m){ return m.some(function(f){ return f.sec > 0 && f.score > 0; }); }); }
  function schedule(){ clearTimeout(S.timer); if(isLive()) S.timer = setTimeout(function(){ if(!document.hidden) load(); else schedule(); }, 30000); }

  function weeks(){
    var h = ''; for(var i = 1; i <= Math.max(S.cur, 1); i++) h += '<a class="' + (i === S.w ? 'on' : '') + '" href="' + D.href('scores', 'w=' + i) + '" data-w="' + i + '">' + i + '</a>';
    $('weeks').innerHTML = h;
  }

  function draw(){
    var d = S.data; if(!d) return;
    weeks();
    var live = isLive(), started = d.ms.some(function(m){ return m.some(function(f){ return f.score > 0; }); });
    var status = live ? 'LIVE' : (started ? 'FINAL' : 'UPCOMING');
    $('wkK').textContent = 'SCOREBOARD · ' + status;
    $('wkH').textContent = 'Week ' + S.w;
    $('stat').innerHTML = live ? '<b class="live">\u25cf LIVE</b> · UPDATES EVERY 30 SEC' : (started ? 'FINAL SCORES' : 'GAMES NOT STARTED');
    if(S.sel < 0 || S.sel >= d.ms.length){ S.sel = 0; if(S.me) d.ms.forEach(function(m, k){ if(m[0].id === S.me || m[1].id === S.me) S.sel = k; }); }
    $('slate').innerHTML = d.ms.map(function(m, k){
      return '<button type="button" class="bug' + (k === S.sel ? ' on' : '') + '" data-m="' + k + '">' + m.map(function(f, i){
        var w = started && f.score > m[1 - i].score;
        return '<div class="s' + (w ? ' w' : '') + '"><img src="' + helm(f.id) + '" alt=""><b title="' + esc(D.NAME[f.id]) + '">' + esc(D.SHORT[f.id] || f.id) + (hasProj() && (live || !started) ? '<u class="mono">PROJ ' + D.pts(Math.round(tproj(f) * 10) / 10) + '</u>' : '') + '</b><i>' + (started ? D.pts(f.score) : esc(S.rec[f.id] || '')) + '</i></div>';
      }).join('') + '</button>';
    }).join('');
    matchup(d.ms[S.sel], live, started);
  }

  function rows(f, starters){
    var list = f.pl.filter(function(p){ return p.st === starters; }).map(function(p){ var i = D.pinfo(p.id); return { id:p.id, s:p.s, sec:p.sec, n:i[0], pos:i[1], tm:i[2] }; })
      .sort(function(a, b){ return ((ORDER[a.pos] || 9) - (ORDER[b.pos] || 9)) || (b.s - a.s); });
    var top = starters ? list.reduce(function(m, p){ return p.s > m ? p.s : m; }, 0) : -1, hp = hasProj();
    return { sum:list.reduce(function(a, p){ return a + p.s; }, 0), proj:hp ? list.reduce(function(a, p){ return a + lproj(p); }, 0) : null, html:list.map(function(p){
      var lv = S.w === S.cur && p.sec > 0 && p.sec < 3600;
      var sx = D.statOf(S.w, p.id), known = S.nfl && Object.keys(S.nfl).length, g = known && S.nfl[p.tm], ph = !g ? (known && p.tm ? 'BYE WEEK' : '\u2014') : (g.kick > Date.now() && S.w >= S.cur ? 'YET TO PLAY' : 'NO STATS');
      return '<div class="pr' + (top > 0 && p.s === top ? ' top' : '') + (lv ? ' on' : '') + '" data-p="' + esc(p.id) + '"><span class="pos ' + esc(p.pos) + '">' + esc(p.pos || '\u2013') + '</span>' +
        '<span class="hs" data-card="' + esc(p.id) + '"><img src="' + D.photo(p.id, p.tm, p.pos) + '" alt="" loading="lazy" onerror="this.onerror=null;this.src=\'' + D.nflLogo(p.tm) + '\';this.className=\'lg\'"></span>' +
        '<div style="min-width:0"><div class="n" data-card="' + esc(p.id) + '">' + esc(p.n) + '</div><div class="m mono"><img class="nl" src="' + D.nflLogo(p.tm) + '" alt="' + esc(p.tm) + '" title="' + esc(p.tm) + '">' + (game(p.tm) || esc(p.tm || '')) + '</div><div class="sx mono' + (sx ? '' : ' none') + '" data-ph="' + ph + '">' + esc(sx || ph) + '</div></div>' +
        '<span class="pcol"><span class="p' + (p.s ? '' : ' z') + '">' + D.pts(p.s) + '</span>' + (hp && S.pj[p.id] != null ? '<span class="pj mono">' + (p.s && Math.abs(lproj(p) - p.s) > .05 ? '\u2192 ' + D.pts(Math.round(lproj(p) * 10) / 10) : 'PROJ ' + D.pts(S.pj[p.id])) + '</span>' : '') + '</span></div>';
    }).join('') };
  }

  function matchup(m, live, started){
    var a = m[0], b = m[1];
    var ra = rows(a, true), rb = rows(b, true), ba = rows(a, false), bb = rows(b, false);
    function meta(f){ return live ? (f.ytp + ' YET TO PLAY · ' + f.cur + ' PLAYING') : (S.rec[f.id] ? S.rec[f.id] + ' RECORD' : ''); }
    function col(f, r, bn){
      return '<div><div class="grp mono"><span>STARTERS</span><span>' + D.pts(r.sum) + (r.proj != null ? ' <em>PROJ ' + D.pts(Math.round(r.proj * 10) / 10) + '</em>' : '') + '</span></div>' + r.html +
        (bn.html ? '<button type="button" class="bn mono" data-bench>' + (S.benchOpen ? 'HIDE BENCH' : 'BENCH') + '<span>' + D.pts(bn.sum) + ' PTS</span></button><div class="bench"' + (S.benchOpen ? '' : ' hidden') + '>' + bn.html + '</div>' : '') + '</div>';
    }
    $('mu').innerHTML =
      '<div class="ph"><img class="hl a" src="' + helm(a.id) + '" alt=""><img class="hl b" src="' + helm(b.id) + '" alt="">' +
      '<span class="plate a">' + esc(S.rec[a.id] || '') + '</span><span class="plate b">' + esc(S.rec[b.id] || '') + '</span>' +
      '</div><div class="sb"><div class="nums"><b class="' + (started && a.score >= b.score ? 'w' : '') + '">' + D.pts(a.score) + '</b><i></i><b class="' + (started && b.score >= a.score ? 'w' : '') + '">' + D.pts(b.score) + '</b></div>' +
      (hasProj() && (live || !started) ? (function(){ var pa = tproj(a), pb = tproj(b), sd = Math.max(25, Math.sqrt(pa + pb) * 2.2), z = (pa - pb) / sd, wa = Math.round(100 / (1 + Math.exp(-1.7 * z))); return '<div class="pjl mono"><span>PROJ ' + D.pts(Math.round(pa * 10) / 10) + '</span><b>' + wa + '% \u2013 ' + (100 - wa) + '%</b><span>PROJ ' + D.pts(Math.round(pb * 10) / 10) + '</span></div>'; })() : '') + '<span class="st2 mono' + (live ? ' live' : '') + '">' + (live ? '\u25cf LIVE' : started ? 'FINAL' : 'WEEK ' + S.w) + '</span>' + (D.div(a.id) && D.div(a.id) === D.div(b.id) ? D.divTag(a.id, 'Divisional Matchup') : '') + '</div>' +
      '<div class="names"><div><b>' + esc(D.NAME[a.id]) + '</b><span class="mono">' + esc(meta(a)) + '</span></div><div><b>' + esc(D.NAME[b.id]) + '</b><span class="mono">' + esc(meta(b)) + '</span></div></div>' +
      '<div class="cols">' + col(a, ra, ba) + col(b, rb, bb) + '</div>';
    wantStats(m);
  }

  document.addEventListener('click', function(e){
    var g = e.target.closest('[data-m]');
    if(g){ S.sel = +g.getAttribute('data-m'); draw(); history.replaceState(null, '', D.href('scores', 'w=' + S.w + '&m=' + S.sel)); return; }
    var w = e.target.closest('[data-w]');
    if(w){ e.preventDefault(); S.w = +w.getAttribute('data-w'); S.sel = -1; S.data = null; $('mu').innerHTML = '<div class="ld mono">LOADING WEEK ' + S.w + '\u2026</div>'; weeks(); history.replaceState(null, '', D.href('scores', 'w=' + S.w)); load(); return; }
    if(e.target.closest('[data-bench]')){ S.benchOpen = !S.benchOpen; draw(); }
  });
  document.addEventListener('visibilitychange', function(){ if(!document.hidden && isLive()) load(); });

  load(true);
})();
