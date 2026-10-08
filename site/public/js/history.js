(function(){
  var D = DC, $ = D.$, esc = D.esc;
  var H = null, ME = '';
  var S = { tab:'champions', team:'', a:'', b:'', rc:'game', yr:'' };
  var CATS = [['game', 'SINGLE GAME'], ['season', 'SEASON'], ['career', 'CAREER'], ['playoffs', 'POSTSEASON'], ['player', 'PLAYERS'], ['milestone', 'MILESTONES']];
  function hash(){ var p = (location.hash || '#champions').slice(1).split('/'); S.tab = p[0] || 'champions'; if(p[1]){ if(S.tab === 'teams') S.team = p[1]; if(S.tab === 'records') S.rc = p[1]; if(S.tab === 'standings') S.yr = p[1]; if(S.tab === 'h2h'){ S.a = p[1]; S.b = p[2] || S.b; } } }
  hash();

  D.shell('history').then(function(me){ ME = me.franchise || ''; if(!S.team) S.team = ME; if(!S.a) S.a = ME; if(H) draw(); });
  fetch('data/history.json').then(function(r){ return r.json(); }).then(function(j){ H = j; draw(); }).catch(function(){ $('hb').innerHTML = '<div class="ld mono">COULDN\u2019T OPEN THE TROPHY ROOM.</div>'; });

  function idOf(n){ return H.n2id[n] || ''; }
  function hl(n){ var id = idOf(n); return id ? D.helm(id) : n === 'DD Allstars' ? 'h/helmet-ddallstars.webp' : 'h/logo.webp'; }
  function now(n){ var id = idOf(n); return id && D.NAME[id] !== n ? D.NAME[id] : ''; }
  function rec(a){ return a[0] + '-' + a[1] + (a[2] ? '-' + a[2] : ''); }
  function pct(a){ var g = a[0] + a[1] + a[2]; return g ? ((a[0] + a[2] / 2) / g).toFixed(3).replace(/^0/, '') : '\u2013'; }
  function cnt(){ var c = {}; H.champs.forEach(function(x){ var id = idOf(x[1]) || x[1]; c[id] = (c[id] || 0) + 1; }); return c; }
  function rail(sel, attr, mark){
    return '<div class="hrail">' + D.IDS.map(function(id){ var m = mark ? mark(id) : ''; return '<button type="button" class="' + (id === sel ? 'on' : '') + (m ? ' ' + m : '') + '" ' + attr + '="' + id + '" title="' + esc(D.NAME[id]) + '"><img src="' + D.helm(id) + '" alt="' + esc(D.NAME[id]) + '"><span class="mono">' + esc(D.SHORT[id]) + '</span></button>'; }).join('') + '</div>';
  }

  function draw(){
    [].forEach.call(document.querySelectorAll('#htabs a'), function(a){ a.classList.toggle('on', a.getAttribute('data-t') === S.tab); });
    ({ champions:champions, teams:teams, h2h:h2h, records:records, standings:standings }[S.tab] || champions)();
  }

  /* ---------- champions ---------- */
  function champions(){
    var top = H.champs[0], c = cnt(), rows = [];
    for(var i = 1; i < H.champs.length; i += 6) rows.push(H.champs.slice(i, i + 6));
    var lb = Object.keys(c).sort(function(a, b){ return c[b] - c[a]; });
    $('hb').innerHTML =
      '<article class="card champ"><div class="ph"><img src="' + hl(top[1]) + '" alt=""><div class="cw"><div class="kick mono">DEFENDING CHAMPIONS</div><b class="yr">' + top[0] + '</b><b class="cn">' + esc(top[1]) + '</b><span class="mono">' + (idOf(top[1]) ? (c[idOf(top[1])] || 1) + ' TITLES ALL-TIME' : '') + '</span></div></div></article>' +
      '<div class="cmain"><div class="wall">' + rows.map(function(r){
        return '<div class="wrow"><div class="row6">' + r.map(function(x){ var id = idOf(x[1]), n2 = now(x[1]);
          return '<a class="trophy" href="' + (id ? '#teams/' + id : '#champions') + '" title="' + esc(x[1]) + '"><img src="' + hl(x[1]) + '" alt=""><span class="nm3">' + esc(x[1]) + '</span>' + (n2 ? '<span class="now mono">NOW ' + esc(D.SHORT[id]) + '</span>' : '') + '</a>';
        }).join('') + '</div><div class="plank"><div class="row6">' + r.map(function(x){ return '<span class="plate">' + x[0] + '</span>'; }).join('') + '</div></div></div>';
      }).join('') + '</div>' +
      '<aside class="box lb"><div class="bar mono"><span>MOST TITLES</span><span>SINCE 2001</span></div>' + lb.map(function(k, i){
        var id = D.NAME[k] ? k : '', yrs = H.champs.filter(function(x){ return (idOf(x[1]) || x[1]) === k; }).map(function(x){ return x[0]; }).sort();
        return '<a class="lbr" href="' + (id ? '#teams/' + id : '#champions') + '"><img src="' + (id ? D.helm(id) : hl(k)) + '" alt=""><div><b>' + esc(id ? D.NAME[id] : k) + '</b><span class="mono">' + yrs.join(' · ') + '</span></div><em>' + c[k] + '</em></a>';
      }).join('') + '</aside></div>';
  }

  /* ---------- trophy case ---------- */
  function teams(){
    var id = S.team || D.IDS[0], T = H.team[id]; if(!T) return;
    var names = H.lineage[id] || [], titles = T.titles || [];
    function nameIn(y){ for(var i = 0; i < names.length; i++){ var r = names[i][1].split('-'), a = +r[0], b = +(r[1] || r[0]); if(y >= a && y <= b) return names[i][0]; } return ''; }
    var best = T.seasons.slice().sort(function(a, b){ return parseFloat(b[2]) - parseFloat(a[2]); })[0];
    $('hb').innerHTML = rail(id, 'data-team') +
      '<div class="case"><div class="cpnl"><div class="shf"><img src="' + D.helm(id) + '" alt=""><span class="plate">' + titles.length + (titles.length === 1 ? ' TITLE' : ' TITLES') + '</span></div>' +
      '<div class="inf"><div><div class="kk mono">SINCE ' + esc((names[names.length - 1] || ['', '2001'])[1].split('-')[0]) + '</div><div class="tn">' + esc(D.NAME[id]) + '</div></div>' +
      (titles.length ? '<div class="cups">' + titles.map(function(y){ return '<span class="cup mono">\ud83c\udfc6 ' + y + '</span>'; }).join('') + '</div>' : '<div class="tl mono">STILL CHASING THE FIRST ONE</div>') +
      '<div class="cnt" style="grid-template-columns:repeat(3,1fr)"><div><b>' + esc(T.reg[0]) + '</b><span class="mono">REG SEASON</span></div><div><b>' + esc(T.post[0]) + '</b><span class="mono">PLAYOFFS</span></div><div><b>' + esc(T.reg[1]) + '</b><span class="mono">WIN PCT</span></div></div>' +
      (best ? '<div class="tl mono">BEST SEASON · ' + esc(best[0]) + ' · ' + esc(best[1]) + '</div>' : '') +
      (names.length > 1 ? '<div class="aka"><div class="kk mono">ALSO KNOWN AS</div>' + names.slice(1).map(function(n){ return '<div><b>' + esc(n[0]) + '</b><span class="mono">' + esc(n[1]) + '</span></div>'; }).join('') + '</div>' : '') +
      '</div></div>' +
      '<div class="tled"><div class="lh"><span class="t">Season by Season</span><a class="btn ghost2" href="#h2h/' + id + '">HEAD-TO-HEAD \u2192</a></div><div class="sx">' +
      '<table class="ht"><thead><tr><th>YEAR</th><th class="l">TEAM NAME</th><th>W-L</th><th>PCT</th><th>PF</th><th>PA</th><th>SEED</th><th>PLAYOFFS</th><th class="l">NOTES</th></tr></thead><tbody>' +
      T.seasons.map(function(s){ var ch = /League Champion/.test(s[7]);
        return '<tr class="' + (ch ? 'gold' : '') + '"><td class="y">' + esc(s[0]) + '</td><td class="l">' + esc(nameIn(+s[0])) + '</td><td class="b">' + esc(s[1]) + '</td><td>' + esc(s[2]) + '</td><td>' + esc(s[3]) + '</td><td>' + esc(s[4]) + '</td><td>' + esc(s[5]) + '</td><td>' + esc(s[6]) + '</td><td class="l nt">' + (ch ? '\ud83c\udfc6 ' : '') + esc(s[7]) + '</td></tr>';
      }).join('') + '</tbody></table></div></div></div>';
  }

  /* ---------- head to head ---------- */
  function h2h(){
    var a = S.a || D.IDS[0], b = S.b && S.b !== a ? S.b : '', T = H.team[a];
    var top = '<div class="h2pick"><div><div class="sub mono">TEAM A</div>' + rail(a, 'data-ha') + '</div><div><div class="sub mono">TEAM B</div>' + rail(b, 'data-hb', function(id){ return id === a ? 'dim' : ''; }) + '</div></div>';
    var res = '';
    if(b){
      var r = T.h2h[b] || [0, 0, 0, 0, 0], p = T.h2hp[b] || [0, 0, 0, 0, 0], g = r[0] + r[1] + r[2], lead = r[0] === r[1] ? 'DEAD EVEN' : (r[0] > r[1] ? D.SHORT[a] : D.SHORT[b]).toUpperCase() + ' LEADS';
      res = '<article class="card mu"><div class="ph"><img class="hl a" src="' + D.helm(a) + '" alt=""><img class="hl b" src="' + D.helm(b) + '" alt="">' +
        '<div class="sb"><div class="nums"><b class="' + (r[0] >= r[1] ? 'w' : '') + '">' + r[0] + '</b><i></i><b class="' + (r[1] >= r[0] ? 'w' : '') + '">' + r[1] + '</b></div><span class="st2 mono">' + lead + (r[2] ? ' · ' + r[2] + ' TIE' : '') + '</span></div></div>' +
        '<div class="names"><div><b>' + esc(D.NAME[a]) + '</b></div><div><b>' + esc(D.NAME[b]) + '</b></div></div>' +
        '<div class="h2s"><div><span class="mono">REGULAR SEASON</span><b>' + rec(r) + '</b></div><div><span class="mono">PLAYOFFS</span><b>' + (p[0] + p[1] ? rec(p) : '\u2013') + '</b></div><div><span class="mono">AVG SCORE</span><b>' + (g ? D.pts(Math.round(r[3] / g * 10) / 10) + ' \u2013 ' + D.pts(Math.round(r[4] / g * 10) / 10) : '\u2013') + '</b></div><div><span class="mono">TOTAL POINTS</span><b>' + (g ? Math.round(r[3]).toLocaleString() + ' \u2013 ' + Math.round(r[4]).toLocaleString() : '\u2013') + '</b></div></div></article>';
    }
    if(b && H.games){
      var gl = H.games.filter(function(g){ return (g[2] === a && g[3] === b) || (g[2] === b && g[3] === a); }).reverse();
      res += '<article class="card" style="margin-top:26px"><div class="bar mono"><span>EVERY GAME</span><span>' + gl.length + ' ON RECORD · 2006\u201309 LOST</span></div><div class="sx"><table class="ht"><thead><tr><th class="l">SEASON</th><th>WK</th><th class="l">WINNER</th><th>SCORE</th><th>MARGIN</th></tr></thead><tbody>' +
        gl.map(function(g){ var w = g[4] >= g[5] ? g[2] : g[3], hi = Math.max(g[4], g[5]), lo = Math.min(g[4], g[5]);
          return '<tr><td class="l y">' + g[0] + '</td><td>' + g[1] + '</td><td class="l"><span class="tn3"><img src="' + D.helm(w) + '" alt=""><b>' + esc(D.SHORT[w]) + '</b></span></td><td class="b">' + D.pts(hi) + ' \u2013 ' + D.pts(lo) + '</td><td>' + D.pts(Math.round((hi - lo) * 100) / 100) + '</td></tr>'; }).join('') +
        '</tbody></table></div></article>';
    }
    var vs = D.IDS.filter(function(id){ return id !== a; }).map(function(id){ return { id:id, r:T.h2h[id] || [0, 0, 0, 0, 0], p:T.h2hp[id] || [0, 0, 0, 0, 0] }; }).sort(function(x, y){ return parseFloat(pct(y.r)) - parseFloat(pct(x.r)); });
    res += '<article class="card" style="margin:26px 0 44px"><div class="bar mono"><span>' + esc(D.NAME[a]).toUpperCase() + ' VS EVERYONE</span><span>BEST RECORD FIRST</span></div><div class="sx"><table class="ht"><thead><tr><th class="l">OPPONENT</th><th>REG</th><th>PCT</th><th>PLAYOFFS</th><th>PF</th><th>PA</th></tr></thead><tbody>' +
      vs.map(function(x){ return '<tr class="ck2' + (x.id === b ? ' gold' : '') + '" data-hb="' + x.id + '"><td class="l"><span class="tn3"><img src="' + D.helm(x.id) + '" alt=""><b>' + esc(D.NAME[x.id]) + '</b></span></td><td class="b">' + rec(x.r) + '</td><td>' + pct(x.r) + '</td><td>' + (x.p[0] + x.p[1] ? rec(x.p) : '\u2013') + '</td><td>' + Math.round(x.r[3]).toLocaleString() + '</td><td>' + Math.round(x.r[4]).toLocaleString() + '</td></tr>'; }).join('') + '</tbody></table></div></article>';
    $('hb').innerHTML = top + (b ? '' : '<div class="hint2 mono">PICK TEAM B TO SEE THE SERIES</div>') + res;
  }

  /* ---------- records / standings tables ---------- */
  function table(t, wide){
    var ti = t.team, cols = t.c, vi = cols.indexOf('W') > -1 ? cols.indexOf('W') : (cols[0] === '#' ? 1 : ti + 1);
    return '<article class="card rt' + (wide ? ' wide' : '') + '"><div class="bar mono"><span>' + esc(t.t) + '</span></div><div class="sx"><table class="ht"><thead><tr>' + cols.map(function(c, i){ return '<th class="' + (i === ti ? 'l' : '') + '">' + esc(c) + '</th>'; }).join('') + '</tr></thead><tbody>' +
      t.r.map(function(r, k){ return '<tr class="' + (k === 0 && /^1/.test(String(r[0])) ? 'gold' : '') + '">' + r.map(function(v, i){
        if(i === ti){ var n2 = now(v); return '<td class="l"><span class="tn3"><img src="' + hl(v) + '" alt=""><b>' + esc(v) + (n2 ? '<i class="mono">NOW ' + esc(D.SHORT[idOf(v)]) + '</i>' : '') + '</b></span></td>'; }
        return '<td class="' + (i === vi ? 'b' : '') + '">' + esc(v) + '</td>'; }).join('') + '</tr>'; }).join('') +
      '</tbody></table></div></article>';
  }
  function records(){
    var L = H.records[S.rc] || H.records.game;
    $('hb').innerHTML = '<div class="seg mono hseg">' + CATS.map(function(c){ return '<a href="#records/' + c[0] + '" class="' + (c[0] === S.rc ? 'on' : '') + '">' + c[1] + '</a>'; }).join('') + '</div>' +
      '<div class="rgrid">' + L.map(function(t){ return table(t, t.c.length > 6); }).join('') + '</div>';
  }
  function standings(){
    var ys = Object.keys(H.standings).sort(function(a, b){ return b - a; }); if(!S.yr) S.yr = ys[0];
    var L = S.yr === 'all' ? [H.alltime] : (H.standings[S.yr] || []);
    $('hb').innerHTML = '<div class="weeks hyrs"><a href="#standings/all" class="' + (S.yr === 'all' ? 'on' : '') + '">ALL-TIME</a>' + ys.map(function(y){ return '<a href="#standings/' + y + '" class="' + (y === S.yr ? 'on' : '') + '">' + y + '</a>'; }).join('') + '</div>' +
      '<div class="rgrid one">' + L.map(function(t){ return table(t, true); }).join('') + '</div>';
  }

  window.addEventListener('hashchange', function(){ hash(); if(H){ draw(); window.scrollTo(0, 0); } });
  document.addEventListener('click', function(e){
    var t = e.target.closest('[data-team]'); if(t){ S.team = t.getAttribute('data-team'); history.replaceState(null, '', '#teams/' + S.team); draw(); return; }
    var a = e.target.closest('[data-ha]'); if(a){ S.a = a.getAttribute('data-ha'); if(S.b === S.a) S.b = ''; history.replaceState(null, '', '#h2h/' + S.a + (S.b ? '/' + S.b : '')); draw(); return; }
    var b = e.target.closest('[data-hb]'); if(b){ var id = b.getAttribute('data-hb'); if(id === (S.a || D.IDS[0])) return; S.b = id; history.replaceState(null, '', '#h2h/' + (S.a || D.IDS[0]) + '/' + id); draw(); }
  });
})();
