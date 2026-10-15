(function(){
  var D = DC, $ = D.$, esc = D.esc, arr = D.arr, num = D.num;
  var S = { w:+((/[?&]w=(\d+)/.exec(location.search) || [])[1] || 0), cur:0, open:{}, own:{}, data:null };
  D.shell('nfl');
  var MX = { GB:'GBP', KC:'KCC', NE:'NEP', NO:'NOS', SF:'SFO', TB:'TBB', LV:'LVR', JAX:'JAC', WSH:'WAS' };
  function nk(n){ return String(n || '').toLowerCase().replace(/[.'\u2019]/g, '').replace(/\s+(jr|sr|ii|iii|iv|v)$/, '').replace(/[^a-z ]/g, '').replace(/\s+/g, ' ').trim(); }

  // which Dubcey team owns each NFL player (matched by name + NFL team)
  D.api('rosters').then(function(j){
    var O = {}; arr(j && j.rosters && j.rosters.franchise).forEach(function(f){ arr(f.player).forEach(function(p){ O[p.id] = f.id; }); });
    var ids = Object.keys(O);
    return D.players(ids).then(function(){
      ids.forEach(function(id){ var i = D.pinfo(id), nm = String(i[0] || ''), m = /^(.*?),\s*(.*)$/.exec(nm); if(m) nm = m[2] + ' ' + m[1]; S.own[nk(nm) + '|' + String(i[2] || '').toUpperCase()] = { f:O[id], id:id }; });
      if(S.data) draw();
    });
  }).catch(function(){});

  // default week: last week's results until Tuesday 8 p.m. ET, then the upcoming week (Week 1 opens Tue Sep 8, 2026)
  function defWeek(){
    var et = new Date(new Date().toLocaleString('en-US', { timeZone:'America/New_York' })), start = new Date(2026, 8, 8, 20, 0);
    return Math.max(1, Math.min(18, Math.floor((et - start) / 604800000) + 1));
  }
  if(!S.w) S.w = defWeek(); S.cur = defWeek();
  function load(){
    $('games').innerHTML = '<div class="ld mono">LOADING GAMES\u2026</div>';
    fetch('/data/nflgames' + (S.w ? '?W=' + S.w : '')).then(function(r){ return r.json(); }).then(function(d){
      if(!d || !d.games || !d.games.length) throw 0;
      S.data = d;
      weeks(); draw(); fillML(d);
    }).catch(function(){ $('games').innerHTML = '<div class="ld mono">NFL GAMES AREN\u2019T AVAILABLE RIGHT NOW.</div>'; });
  }
  // moneylines straight from ESPN in the browser, in case the server copy comes back without them
  function fillML(d){
    var miss = d.games.filter(function(g){ return g.state === 'pre' && (!g.odds || (g.odds.mlA == null && g.odds.mlH == null)); }); if(!miss.length) return;
    fetch('https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard?dates=' + D.Y + '&seasontype=2&week=' + (d.week || S.w)).then(function(r){ return r.json(); }).then(function(sb){
      if(S.data !== d) return; var hit = 0;
      (sb.events || []).forEach(function(ev){ var g = miss.filter(function(x){ return String(x.id) === String(ev.id); })[0]; if(!g) return;
        var od = (((ev.competitions || [])[0] || {}).odds || [])[0]; if(!od) return; var m = od.moneyline || {};
        function pk(){ for(var i = 0; i < arguments.length; i++){ var x = arguments[i]; if(x != null && x !== '' && x !== 'OFF') return x; } return null; }
        function sd(t, s){ var z = m[s] || {}; return pk(t && t.moneyLine, z.close && z.close.odds, z.open && z.open.odds); }
        g.odds = g.odds || { line:od.details || '', ou:od.overUnder != null ? od.overUnder : '' };
        g.odds.mlA = sd(od.awayTeamOdds, 'away'); g.odds.mlH = sd(od.homeTeamOdds, 'home'); if(g.odds.mlA != null || g.odds.mlH != null) hit = 1; });
      if(hit) draw();
    }).catch(function(){});
  }
  function weeks(){
    var h = ''; for(var i = 1; i <= Math.max(18, S.cur); i++) h += '<a class="' + (i === S.w ? 'on' : '') + '" href="' + D.href('nfl', 'w=' + i) + '" data-w="' + i + '">' + i + '</a>';
    $('weeks').innerHTML = h; $('nk').textContent = 'AROUND THE NFL \u00b7 WEEK ' + S.w;
  }
  function owner(name, ab){ var o = S.own[nk(name) + '|' + (MX[ab] || ab)]; return o ? '<a class="nown" href="' + D.href('teams', 'f=' + o.f) + '" title="' + esc(D.NAME[o.f]) + '"><img src="' + D.helm(o.f) + '" alt=""></a>' : '<span class="nown"></span>'; }
  var COLS = { passing:['C/ATT', 'YDS', 'TD', 'INT'], rushing:['CAR', 'YDS', 'TD', 'LONG'], receiving:['REC', 'YDS', 'TD', 'TGTS'] };
  function table(cat, c, ab){
    if(!c || !c.rows.length) return '';
    var L = c.labels.map(function(x){ return String(x).toUpperCase(); }), want = COLS[cat].filter(function(k){ return L.indexOf(k) > -1; });
    return '<table class="nbx"><thead><tr><th class="mono">' + cat.toUpperCase() + '</th>' + want.map(function(k){ return '<th class="mono">' + k + '</th>'; }).join('') + '</tr></thead><tbody>' +
      c.rows.map(function(r){ return '<tr><td>' + owner(r[0], ab) + '<span>' + esc(r[0]) + '</span></td>' + want.map(function(k){ return '<td class="mono">' + esc(r[2 + L.indexOf(k)]) + '</td>'; }).join('') + '</tr>'; }).join('') + '</tbody></table>';
  }
  function side(t, win, live){ return '<div class="nsd' + (win ? ' w' : '') + '"><img src="' + esc(t.logo || D.nflLogo(t.ab)) + '" alt=""><b>' + esc(t.name || t.ab) + '</b><i class="mono">' + esc(t.rec || '') + '</i><em>' + (live ? esc(t.score) : '') + '</em></div>'; }
  function ml(v){ if(v == null || v === '') return '\u2013'; var s = String(v).trim(); if(/^EVEN$/i.test(s)) return 'EVEN'; var n = parseFloat(s.replace(/[^\d.+-]/g, '')); if(isNaN(n)) return '\u2013'; return (n > 0 ? '+' : '') + n; }
  function lines(g){
    var o = g.odds;
    if(!o && !g.tv) return '';
    return '<div class="nodds mono">' +
      '<div><span>SPREAD</span><b>' + esc(o && o.line ? o.line : '\u2013') + '</b></div>' +
      '<div><span>MONEYLINE</span><b>' + (o ? esc(g.away.ab) + ' ' + ml(o.mlA) + ' \u00b7 ' + esc(g.home.ab) + ' ' + ml(o.mlH) : '\u2013') + '</b></div>' +
      '<div><span>TOTAL</span><b>' + (o && o.ou !== '' ? 'O/U ' + esc(o.ou) : '\u2013') + '</b></div>' +
      '<div><span>TV</span><b>' + esc(g.tv || '\u2013') + '</b></div></div>';
  }
  function draw(){
    $('games').innerHTML = S.data.games.map(function(g){
      var live = g.state !== 'pre', a = num(g.away.score), h = num(g.home.score), fin = g.state === 'post', op = S.open[g.id];
      var when = live ? g.detail : new Date(g.kick).toLocaleString('en-US', { timeZone:'America/New_York', weekday:'short', hour:'numeric', minute:'2-digit' }) + ' ET';
      var hasBox = Object.keys(g.box || {}).length;
      return '<article class="card ng' + (op ? ' open' : '') + '"><button type="button" class="nhd" data-g="' + esc(g.id) + '"' + (hasBox ? '' : ' disabled') + '>' +
        '<div class="nst mono"><span class="' + (g.state === 'in' ? 'lv' : '') + '">' + esc(String(when).toUpperCase()) + '</span>' + (hasBox ? '<span>' + (op ? 'HIDE' : 'BOX SCORE') + ' ' + (op ? '\u25b4' : '\u25be') + '</span>' : '') + '</div>' +
        side(g.away, fin && a > h, live) + side(g.home, fin && h > a, live) + '</button>' + lines(g) +
        (op && hasBox ? '<div class="nbody">' + [g.away, g.home].map(function(t){ var B = g.box[t.ab] || {};
          return '<div class="nteam"><div class="ntt mono"><img src="' + esc(t.logo || D.nflLogo(t.ab)) + '" alt="">' + esc(t.name || t.ab) + '</div>' + table('passing', B.passing, t.ab) + table('rushing', B.rushing, t.ab) + table('receiving', B.receiving, t.ab) + '</div>';
        }).join('') + '</div>' : '') + '</article>';
    }).join('');
  }
  document.addEventListener('click', function(e){
    var w = e.target.closest('[data-w]'); if(w){ e.preventDefault(); S.w = +w.getAttribute('data-w'); S.open = {}; history.replaceState(null, '', D.href('nfl', 'w=' + S.w)); weeks(); load(); return; }
    var g = e.target.closest('[data-g]'); if(g){ var id = g.getAttribute('data-g'); S.open[id] = !S.open[id]; draw(); }
  });
  load();
  setInterval(function(){ if(!document.hidden && S.data && S.data.games.some(function(g){ return g.state === 'in'; })) fetch('/data/nflgames?W=' + S.w).then(function(r){ return r.json(); }).then(function(d){ if(d && d.games) { S.data = d; draw(); } }).catch(function(){}); }, 60000);
})();
