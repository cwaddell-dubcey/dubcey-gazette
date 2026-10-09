(function(){
  var D = DC, $ = D.$, esc = D.esc, arr = D.arr, num = D.num, helm = D.helm;
  var S = { tab:(location.hash || '#season').slice(1), team:'', W:null, rec:{}, order:[], lg:{}, cal:null };
  D.shell('schedule').then(function(me){ if(!S.team && me.franchise){ S.team = me.franchise; if(S.W) draw(); } });
  function no(){ return null; }
  Promise.all([D.api('schedule'), D.records(), D.api('league').catch(no)]).then(function(r){
    S.W = arr(r[0] && r[0].schedule && r[0].schedule.weeklySchedule).map(function(w){
      return { n:num(w.week), ms:arr(w.matchup).map(function(m){ return arr(m.franchise).map(function(f){ return { id:f.id, s:f.score != null && f.score !== '' ? num(f.score) : null, res:f.result }; }); }).filter(function(m){ return m.length === 2; }) };
    }).filter(function(w){ return w.ms.length; }).sort(function(a, b){ return a.n - b.n; });
    S.rec = r[1].rec; S.order = r[1].order; S.lg = (r[2] && r[2].league) || {};
    draw();
  }).catch(function(){ $('sb2').innerHTML = '<div class="ld mono">THE SCHEDULE ISN\u2019T AVAILABLE RIGHT NOW.</div>'; });

  function nm(id, s){ return id === 'AVG' ? (s ? 'Play-In' : 'Play-In Week · free-for-all') : (s ? D.SHORT[id] : D.NAME[id]) || id; }
  function played(w){ return w.ms.some(function(m){ return m[0].s != null || m[1].s != null; }); }
  function draw(){
    [].forEach.call(document.querySelectorAll('#stabs a'), function(a){ a.classList.toggle('on', a.getAttribute('data-t') === S.tab); });
    if(S.tab === 'playoffs') return playoffs();
    if(S.tab === 'calendar') return calendar();
    season();
  }

  /* ---------- season ---------- */
  function season(){
    var last = 0; S.W.forEach(function(w){ if(played(w)) last = w.n; });
    var rail = '<div class="hrail r13"><button type="button" class="' + (S.team ? '' : 'on') + ' all mono" data-st="">ALL<br>GAMES</button>' + D.IDS.map(function(id){ return '<button type="button" class="' + (id === S.team ? 'on' : '') + '" data-st="' + id + '" title="' + esc(D.NAME[id]) + '"><img src="' + helm(id) + '" alt=""><span class="mono">' + esc(D.SHORT[id]) + '</span></button>'; }).join('') + '</div>';
    var body;
    if(S.team){
      var t = S.team, w = 0, l = 0;
      body = '<article class="card"><div class="bar mono"><span>' + esc(D.NAME[t]).toUpperCase() + '</span><span>' + esc(S.rec[t] || '') + '</span></div>' + S.W.map(function(wk){
        var m = wk.ms.filter(function(x){ return x[0].id === t || x[1].id === t; })[0]; if(!m) return '<div class="sg2"><span class="wk mono">WK ' + wk.n + '</span><span class="bye mono">BYE</span></div>';
        var me = m[0].id === t ? m[0] : m[1], op = m[0].id === t ? m[1] : m[0], done = me.s != null && op.s != null, res = done ? (me.s > op.s ? 'W' : me.s < op.s ? 'L' : 'T') : '';
        if(res === 'W') w++; if(res === 'L') l++;
        return '<a class="sg2' + (wk.n === last + 1 ? ' nxt' : '') + '" href="' + (done || op.id === 'AVG' ? D.href('scores', 'w=' + wk.n) : D.href('teams', 'f=' + op.id)) + '"><span class="wk mono">WK ' + wk.n + '</span><span class="tn3"><img src="' + helm(op.id) + '" alt=""><b>' + esc(nm(op.id)) + '</b>' + (D.div(t) && D.div(t) === D.div(op.id) ? '<img class="dmini" src="img/div-' + D.div(t).k + '-badge.webp" alt="Divisional Matchup" title="Divisional Matchup">' : '') + '</span><span class="rr mono">' + (done ? '' : esc(op.id === 'AVG' ? '' : S.rec[op.id] || '')) + '</span>' +
          (done ? '<span class="res ' + res + '">' + (op.id === 'AVG' ? '' : res) + '</span><span class="sc">' + D.pts(me.s) + (op.id === 'AVG' ? '' : ' \u2013 ' + D.pts(op.s)) + '</span><span class="mono rr">' + w + '-' + l + '</span>' : '<span class="res">' + (wk.n === last + 1 ? '<i class="mono">NEXT</i>' : '') + '</span><span class="sc"></span><span></span>') + '</a>';
      }).join('') + '</article>';
    } else {
      body = '<div class="wkgrid">' + S.W.map(function(wk){
        var done = played(wk);
        var avg = wk.ms.every(function(m){ return m[0].id === 'AVG' || m[1].id === 'AVG'; });
        if(avg){ var tm = wk.ms.map(function(m){ return m[0].id === 'AVG' ? m[1] : m[0]; }).sort(function(x, y){ return (y.s || 0) - (x.s || 0); });
          return '<article class="card wkc' + (wk.n === last + 1 ? ' nxt' : '') + '"><div class="bar mono"><span>WEEK ' + wk.n + '</span><span>PLAY-IN \u00b7 FREE-FOR-ALL</span></div><div class="ffa">' + tm.map(function(x, i){ return '<span class="sd' + '' + '"><img src="' + helm(x.id) + '" alt=""><b>' + esc(nm(x.id, 1)) + '</b><i class="mono">' + (done ? D.pts(x.s) : esc(S.rec[x.id] || '')) + '</i></span>'; }).join('') + '</div><div class="note mono">SPECIAL PLAY-IN WEEK BEFORE THE PLAYOFFS. DOESN\u2019T COUNT TOWARD RECORDS.</div></article>'; }
        return '<article class="card wkc' + (wk.n === last + 1 ? ' nxt' : '') + '"><div class="bar mono"><span>WEEK ' + wk.n + '</span><span>' + (done ? 'FINAL' : wk.n === last + 1 ? 'NEXT UP' : avg ? 'FREE-FOR-ALL' : '') + '</span></div>' + wk.ms.map(function(m){
          var a = m[0], b = m[1];
          function side(x, y){ var won = done && x.s > y.s; return '<span class="sd' + (won ? ' w' : '') + '"><img src="' + helm(x.id) + '" alt=""><b>' + esc(nm(x.id, 1)) + '</b><i class="mono">' + (done ? D.pts(x.s) : esc(S.rec[x.id] || '')) + '</i></span>'; }
          return '<a class="gm" href="' + D.href('scores', 'w=' + wk.n) + '">' + side(a, b) + side(b, a) + '</a>';
        }).join('') + '</article>';
      }).join('') + '</div>';
    }
    $('sb2').innerHTML = rail + body + '<div style="height:44px"></div>';
    var nx = document.querySelector('.wkc.nxt'); if(nx && !S.team && S._scrolled !== 1){ S._scrolled = 1; }
  }

  /* ---------- playoffs ---------- */
  function playoffs(){
    var cut = num(S.lg.playoffTeams) || 6, lastReg = num(S.lg.lastRegularSeasonWeek) || 14;
    $('sb2').innerHTML = '<div class="ld mono">LOADING THE BRACKET\u2026</div>';
    D.api('playoffBrackets').then(function(j){
      var B = arr(j && j.playoffBrackets && j.playoffBrackets.playoffBracket);
      if(!B.length) throw 0;
      return Promise.all(B.map(function(b){ return D.api('playoffBracket', 'BRACKET_ID=' + b.id).then(function(x){ return { b:b, d:x && x.playoffBracket }; }); }));
    }).then(function(list){
      var html = list.map(function(x){
        var R = arr(x.d && x.d.playoffRound); if(!R.length) return '';
        return '<article class="card brk"><div class="bar mono"><span>' + esc(x.b.name || 'PLAYOFFS').toUpperCase() + '</span><span>' + (x.b.startWeek ? 'STARTS WEEK ' + esc(x.b.startWeek) : '') + '</span></div><div class="rounds" style="grid-template-columns:repeat(' + R.length + ',minmax(0,1fr))">' + R.map(function(r, i){
          return '<div class="rnd"><div class="sub mono">' + (i === R.length - 1 ? 'FINAL' : 'ROUND ' + (i + 1)) + (r.week ? ' \u00b7 WK ' + esc(r.week) : '') + '</div>' + arr(r.playoffGame).map(function(g){
            function sd(s){ s = s || {}; var id = s.franchise_id; var nm = id ? esc(D.SHORT[id] || id) : s.winner_of_game ? 'Winner G' + esc(s.winner_of_game) : s.loser_of_game ? 'Loser G' + esc(s.loser_of_game) : 'TBD';
              return '<span class="sd"><i class="mono sd2">' + esc(s.seed || '') + '</i>' + (id ? '<img src="' + helm(id) + '" alt="">' : '<span class="ph2"></span>') + '<b>' + nm + '</b><i class="mono">' + (s.points != null ? D.pts(s.points) : '') + '</i></span>'; }
            return '<div class="gm2">' + sd(g.away) + sd(g.home) + '</div>';
          }).join('') + '</div>';
        }).join('') + '</div></article>';
      }).join('');
      if(!html) throw 0;
      $('sb2').innerHTML = html + '<div style="height:44px"></div>';
    }).catch(function(){
      var o = S.order.length ? S.order : D.IDS;
      $('sb2').innerHTML = '<article class="card"><div class="bar mono"><span>PLAYOFF PICTURE</span><span>IF THE SEASON ENDED TODAY</span></div>' + o.map(function(id, i){
        return '<a class="pp2' + (i === cut - 1 ? ' cut' : '') + (i < cut ? ' in' : '') + '" href="' + D.href('teams', 'f=' + id) + '"><b class="n2">' + (i + 1) + '</b><span class="tn3"><img src="' + helm(id) + '" alt=""><b>' + esc(D.NAME[id]) + '</b></span><span class="mono rr">' + esc(S.rec[id] || '') + '</span><span class="mono tg2">' + (i < cut ? 'IN' : i < cut + 2 ? 'BUBBLE' : '') + '</span></a>';
      }).join('') + '<div class="note mono">TOP ' + cut + ' MAKE IT. THE REAL BRACKET SHOWS HERE ONCE MFL SETS IT AFTER WEEK ' + lastReg + '.</div></article><div style="height:44px"></div>';
    });
  }

  /* ---------- calendar: month grid (phones get a day-by-day list) ---------- */
  var TZ = 'America/New_York';
  function ymd(t){ var p = {}; new Intl.DateTimeFormat('en-US', { timeZone:TZ, year:'numeric', month:'2-digit', day:'2-digit' }).formatToParts(new Date(t)).forEach(function(x){ p[x.type] = x.value; }); return p.year + '-' + p.month + '-' + p.day; }
  function hm(t){ return new Date(t).toLocaleTimeString('en-US', { timeZone:TZ, hour:'numeric', minute:'2-digit' }).replace(' AM', ' a.m.').replace(' PM', ' p.m.').replace(':00 ', ' '); }
  function tone(s){ s = String(s || ''); return /no add|no trade|trade deadline/i.test(s) ? 'r' : /process|bid|waiver run|fcfs/i.test(s) && !/put all/i.test(s) ? 'g' : /unlock/i.test(s) ? 'y' : /put all|free agents on waivers/i.test(s) ? 'k' : /injur/i.test(s) ? 'r' : /draft|auction|keeper/i.test(s) ? 'b' : 'k'; }
  function short(t, end){ t = String(t || '');
    if(/no add/i.test(t)) return end ? 'ADD/DROPS OPEN' : 'ADD/DROPS LOCK';
    if(/no trade/i.test(t)) return end ? 'TRADES REOPEN' : 'TRADES CLOSE';
    if(/process|blind bid|waiver run/i.test(t)) return 'WAIVERS RUN';
    if(/unlock/i.test(t)) return 'PLAYERS UNLOCK';
    if(/put all free agents/i.test(t)) return 'FREE AGENTS \u2192 WAIVERS';
    return t.toUpperCase(); }
  function tm(t){ return new Date(t).toLocaleTimeString('en-US', { timeZone:TZ, hour:'numeric', minute:'2-digit' }).replace(':00', '').replace(' AM', 'A').replace(' PM', 'P'); }
  function calendar(){
    if(S.cal){ return drawCal(); }
    $('sb2').innerHTML = '<div class="ld mono">LOADING THE CALENDAR\u2026</div>';
    var nflReq = D.LOCAL ? fetch('demo/nflScheduleAll.json').then(function(r){ return r.json(); }) : D.api('nflSchedule', 'W=ALL');
    Promise.all([D.api('calendar').catch(no), D.content('calendar').catch(no), nflReq.catch(no)]).then(function(r){
      var DAY = {}, add = function(k, it){ (DAY[k] = DAY[k] || { ev:[] }).ev.push(it); };
      arr(r[0] && r[0].calendar && r[0].calendar.event).forEach(function(e){
        var s = num(e.start_time) * 1000, en = num(e.end_time) * 1000, t = e.title || String(e.type || '').replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, function(c){ return c.toUpperCase(); });
        if(!s) return;
        var range = en && en - s > 6e4;
        add(ymd(s), { t:s, lbl:short(t), tm:tm(s), full:t + (range ? ' starts' : '') + ' at ' + hm(s), tone:tone(t), raw:t });
        if(range && en - s < 30 * 864e5) add(ymd(en), { t:en, lbl:short(t, 1), tm:tm(en), full:t + ' ends at ' + hm(en), tone:/no add|no trade/i.test(t) ? 'g2' : tone(t), raw:t });
      });
      arr(r[1]).forEach(function(e){ var t = Date.parse(e.date + 'T' + (e.time || '12:00') + ':00'); if(t) add(e.date, { t:t, lbl:String(e.title).toUpperCase(), tm:e.time ? tm(t) : '', full:e.title, tone:tone(e.title), raw:e.title }); });
      var N = r[2] && (r[2].fullNflSchedule ? arr(r[2].fullNflSchedule.nflSchedule) : r[2].nflSchedule ? [r[2].nflSchedule] : []);
      arr(N).forEach(function(w){
        var c = {}, first = Infinity;
        arr(w.matchup).forEach(function(m){ var t = num(m.kickoff) * 1000; if(!t) return; var k = ymd(t); c[k] = (c[k] || 0) + 1; if(t < first) first = t; });
        Object.keys(c).forEach(function(k){ (DAY[k] = DAY[k] || { ev:[] }).nfl = { w:w.week, n:c[k] }; });
        if(first < Infinity){ // Friday injury report, the day after the week's first game
          var f = new Date(first); for(var i = 0; i < 4; i++){ var k2 = ymd(f.getTime() + i * 864e5); if(new Date(k2 + 'T12:00:00Z').getUTCDay() === 5){ (DAY[k2] = DAY[k2] || { ev:[] }).inj = 1; break; } }
        }
      });
      Object.keys(DAY).forEach(function(k){ DAY[k].ev.sort(function(a, b){ return a.t - b.t; }); });
      var now = ymd(Date.now()), all = [];
      Object.keys(DAY).forEach(function(k){ DAY[k].ev.forEach(function(e){ all.push(e); }); });
      all.sort(function(a, b){ return a.t - b.t; });
      S.cal = { DAY:DAY, today:now, m:now.slice(0, 7), nextW:all.filter(function(e){ return e.tone === 'g' && e.t > Date.now(); })[0], dl:all.filter(function(e){ return /no trade|trade deadline/i.test(e.raw) && e.t > Date.now(); })[0] };
      drawCal();
    });
  }
  function drawCal(){
    var C = S.cal, y = +C.m.slice(0, 4), mo = +C.m.slice(5, 7), first = new Date(Date.UTC(y, mo - 1, 1)), days = new Date(Date.UTC(y, mo, 0)).getUTCDate(), lead = first.getUTCDay();
    var title = first.toLocaleDateString('en-US', { month:'long', year:'numeric', timeZone:'UTC' });
    function key(d){ return y + '-' + String(mo).padStart(2, '0') + '-' + String(d).padStart(2, '0'); }
    function items(D2){
      var h = '';
      if(D2.nfl) h += '<li class="nf mono" title="' + D2.nfl.n + ' NFL game' + (D2.nfl.n === 1 ? '' : 's') + '"><b>WK ' + esc(D2.nfl.w) + '</b><span>' + D2.nfl.n + ' GAME' + (D2.nfl.n === 1 ? '' : 'S') + '</span></li>';
      if(D2.inj) h += '<li class="ir mono"><b>INJURY REPORT</b></li>';
      D2.ev.forEach(function(e){ h += '<li class="' + e.tone + ' mono" title="' + esc(e.full) + ' (ET)"><b>' + esc(e.lbl) + '</b>' + (e.tm ? '<span>' + esc(e.tm) + '</span>' : '') + '</li>'; });
      return h;
    }
    var cells = '', list = '';
    for(var i = 0; i < lead; i++) cells += '<div class="cgc x"></div>';
    for(var d = 1; d <= days; d++){
      var k = key(d), D2 = C.DAY[k] || { ev:[] }, it = items(D2), cls = k === C.today ? ' td' : k < C.today ? ' ps' : '';
      cells += '<div class="cgc' + cls + '"><b class="dn2">' + d + '</b>' + (it ? '<ul>' + it + '</ul>' : '') + '</div>';
      if(it) list += '<div class="cgl' + cls + '"><div class="cgd"><b>' + d + '</b><span class="mono">' + new Date(Date.UTC(y, mo - 1, d)).toLocaleDateString('en-US', { weekday:'short', timeZone:'UTC' }).toUpperCase() + '</span></div><ul>' + it + '</ul></div>';
    }
    var tail = (7 - (lead + days) % 7) % 7; for(var t = 0; t < tail; t++) cells += '<div class="cgc x"></div>';
    function when(e){ return e ? new Date(e.t).toLocaleDateString('en-US', { timeZone:TZ, weekday:'short', month:'short', day:'numeric' }) : '\u2013'; }
    $('sb2').innerHTML = '<div class="calhd">' +
      '<div class="box cd"><span class="mono">NEXT WAIVER RUN</span><b>' + when(C.nextW) + '</b><i class="mono">' + (C.nextW ? hm(C.nextW.t).toUpperCase() + ' ET' : 'NOT SCHEDULED') + '</i></div>' +
      '<div class="box cd"><span class="mono">TRADE DEADLINE</span><b>' + when(C.dl) + '</b><i class="mono">' + (C.dl ? Math.max(0, Math.ceil((C.dl.t - Date.now()) / 864e5)) + ' DAYS LEFT' : 'NOT SET') + '</i></div></div>' +
      '<article class="card cg"><div class="cgh"><button type="button" data-cm="-1" aria-label="Previous month">\u2039</button><h2>' + esc(title) + '</h2><button type="button" data-cm="1" aria-label="Next month">\u203a</button></div>' +
      '<div class="cgk mono"><span><i class="r"></i>LOCKS</span><span><i class="g"></i>WAIVERS &amp; REOPENS</span><span><i class="y"></i>UNLOCKS</span><span><i class="k"></i>OTHER</span><em>ALL TIMES EASTERN</em></div>' +
      '<div class="cgw mono"><span>SUN</span><span>MON</span><span>TUE</span><span>WED</span><span>THU</span><span>FRI</span><span>SAT</span></div><div class="cgg">' + cells + '</div>' +
      '<div class="cgm">' + (list || '<div class="ld mono">NOTHING THIS MONTH</div>') + '</div></article>';
  }
  document.addEventListener('click', function(e){ var b = e.target.closest('[data-cm]'); if(!b || !S.cal) return; var y = +S.cal.m.slice(0, 4), m = +S.cal.m.slice(5, 7) + +b.getAttribute('data-cm'); if(m < 1){ m = 12; y--; } if(m > 12){ m = 1; y++; } S.cal.m = y + '-' + String(m).padStart(2, '0'); drawCal(); });
  function kind(s){ s = String(s || ''); return /trade/i.test(s) ? 'TRADE' : /waiver|bbid|fcfs/i.test(s) ? 'WAIVERS' : /draft|auction|keeper/i.test(s) ? 'DRAFT' : 'LEAGUE'; }
  function no(){ return null; }

  window.addEventListener('hashchange', function(){ S.tab = (location.hash || '#season').slice(1); if(S.W) draw(); });
  document.addEventListener('click', function(e){ var b = e.target.closest('[data-st]'); if(b){ S.team = b.getAttribute('data-st'); season(); } });
})();
