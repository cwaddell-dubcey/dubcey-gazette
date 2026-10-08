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

  /* ---------- calendar ---------- */
  function calendar(){
    $('sb2').innerHTML = '<div class="ld mono">LOADING THE CALENDAR\u2026</div>';
    Promise.all([D.api('calendar').catch(no), D.content('calendar')]).then(function(r){
      var E = arr(r[0] && r[0].calendar && r[0].calendar.event).map(function(e){ var t = num(e.start_time) * 1000; return { t:t, end:num(e.end_time) * 1000, title:e.title || String(e.type || '').replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, function(c){ return c.toUpperCase(); }), kind:kind(e.title || e.type) }; }).filter(function(e){ return e.t; });
      arr(r[1]).forEach(function(e){ var t = Date.parse(e.date + 'T' + (e.time || '12:00') + ':00'); if(t) E.push({ t:t, title:e.title, kind:e.kind || kind(e.title), mine:1 }); });
      E.sort(function(a, b){ return a.t - b.t; });
      var now = Date.now(), up = E.filter(function(e){ return (e.end || e.t) >= now - 36e5; }), past = E.filter(function(e){ return (e.end || e.t) < now - 36e5; }).slice(-6).reverse();
      var dl = E.filter(function(e){ return e.kind === 'TRADE' && e.t >= now; })[0], wv = E.filter(function(e){ return e.kind === 'WAIVERS' && e.t >= now; })[0];
      function row(e){ var d = new Date(e.t); return '<div class="ev' + (e.t < now ? ' past' : '') + '"><div class="dt"><b>' + d.getDate() + '</b><span class="mono">' + d.toLocaleDateString(undefined, { month:'short' }).toUpperCase() + '</span></div><div><b>' + esc(e.title) + '</b><span class="mono">' + d.toLocaleDateString(undefined, { weekday:'long' }).toUpperCase() + ' \u00b7 ' + d.toLocaleTimeString(undefined, { hour:'numeric', minute:'2-digit' }) + '</span></div><span class="tag mono k' + e.kind.charAt(0) + '">' + e.kind + '</span></div>'; }
      $('sb2').innerHTML = '<div class="calhd">' +
        '<div class="box cd"><span class="mono">NEXT WAIVER RUN</span><b>' + (wv ? new Date(wv.t).toLocaleDateString(undefined, { weekday:'short', month:'short', day:'numeric' }) : '\u2013') + '</b><i class="mono">' + (wv ? new Date(wv.t).toLocaleTimeString(undefined, { hour:'numeric', minute:'2-digit' }) : 'NOT SCHEDULED') + '</i></div>' +
        '<div class="box cd"><span class="mono">TRADE DEADLINE</span><b>' + (dl ? new Date(dl.t).toLocaleDateString(undefined, { weekday:'short', month:'short', day:'numeric' }) : '\u2013') + '</b><i class="mono">' + (dl ? Math.ceil((dl.t - now) / 864e5) + ' DAYS LEFT' : 'NOT SET') + '</i></div></div>' +
        '<div class="duo" style="margin-top:20px"><article class="card"><div class="bar mono"><span>COMING UP</span><span>' + up.length + ' EVENTS</span></div>' + (up.map(row).join('') || '<div class="ld mono">NOTHING ON THE CALENDAR</div>') + '</article>' +
        '<article class="card"><div class="bar mono"><span>RECENTLY</span></div>' + (past.map(row).join('') || '<div class="ld mono">NOTHING YET</div>') + '</article></div>';
    });
  }
  function kind(s){ s = String(s || ''); return /trade/i.test(s) ? 'TRADE' : /waiver|bbid|fcfs/i.test(s) ? 'WAIVERS' : /draft|auction|keeper/i.test(s) ? 'DRAFT' : 'LEAGUE'; }
  function no(){ return null; }

  window.addEventListener('hashchange', function(){ S.tab = (location.hash || '#season').slice(1); if(S.W) draw(); });
  document.addEventListener('click', function(e){ var b = e.target.closest('[data-st]'); if(b){ S.team = b.getAttribute('data-st'); season(); } });
})();
