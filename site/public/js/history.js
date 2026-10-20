(function(){
  var D = DC, $ = D.$, esc = D.esc;
  var H = null, ME = '';
  var S = { tab:'champions', team:'', a:'', b:'', rc:'game', yr:'' };
  var CATS = [['game', 'SINGLE GAME'], ['season', 'SEASON'], ['career', 'CAREER'], ['playoffs', 'POSTSEASON'], ['player', 'PLAYERS'], ['milestone', 'MILESTONES']];
  function hash(){ var p = (location.hash || '#champions').slice(1).split('/'); S.tab = p[0] || 'champions'; if(p[1]){ if(S.tab === 'teams') S.team = p[1]; if(S.tab === 'records') S.rc = p[1]; if(S.tab === 'standings') S.yr = p[1]; if(S.tab === 'h2h'){ S.a = p[1]; S.b = p[2] || S.b; } } }
  hash();

  D.shell('history').then(function(me){ ME = me.franchise || ''; if(!S.team) S.team = ME; if(!S.a) S.a = ME; if(H) draw(); });
  fetch('data/history.json?v=20261015a').then(function(r){ return r.json(); }).then(function(j){ H = j; draw(); }).catch(function(){ $('hb').innerHTML = '<div class="ld mono">COULDN\u2019T OPEN THE TROPHY ROOM.</div>'; });

  function notes(s){ return String(s || '').split(/\s*,\s*/).filter(Boolean).map(function(n){
    var c = /league champion/i.test(n) ? 'ch' : /runner|finalist|2nd/i.test(n) ? 'ru' : /division/i.test(n) ? 'dv' : /toilet|last|sacko/i.test(n) ? 'lo' : '';
    return '<span class="nchip mono ' + c + '">' + esc(n.replace(/ Division Champion$/i, ' Div. Champ').replace(/^League Champion$/i, '\u2605 League Champion')) + '</span>'; }).join(''); }
  function idOf(n){ return H.n2id[n] || ''; }
  var RTTAG = '<span class="rtag mono" title="Season hosted on RT Sports">RT SPORTS YEARS</span>';
  function isRT(y){ return (H.rt || []).indexOf(+y) > -1; }
  // MFL stores franchise 0012 as "Bad Hombres" in every year; show the name it actually carried that season
  function yn(s, y){ y = parseInt(y, 10) || 0; s = String(s == null ? '' : s); if(!y || (y >= 2017 && y <= 2020) || s.indexOf('Bad Hombres') < 0) return s; var L = H.lineage['0012'] || [], nm = '';
    L.forEach(function(e){ var r = String(e[1]).split('-'), a = +r[0], b = +(r[1] || r[0]); if(y >= a && y <= b) nm = e[0]; }); return nm ? s.replace(/Bad Hombres(?!\))/g, nm) : s; }
  function rowYr(r, yc, ty){ if(yc > -1) return r[yc]; if(ty) return ty; for(var i = 0; i < r.length; i++){ var m = /^((19|20)\d{2})(,|$)/.exec(String(r[i])); if(m) return m[1]; } return ''; }
  function hl(n, y){ y = +y || 0; if(/^Bad Hombres\b/i.test(n) && !(y && (y < 2017 || y > 2020))) return 'h/helmet-badhombres.png'; return hl0(n); }
  function hl0(n){ if(/^Alcoholic All-?Stars\b/i.test(n)) return 'h/helmet-alcoholic.png'; if(/^The Box Socials\b/i.test(n)) return 'h/helmet-boxsocials.png'; if(/^18th Street Gangsters\b/i.test(n)) return 'h/helmet-18street.png'; if(/^River Terrace Crew\b/i.test(n)) return 'h/helmet-rtc.png'; if(/^The Fighting Moose\b/i.test(n)) return 'h/helmet-moose.png'; if(/^Swinging G-String\b/i.test(n)) return 'h/helmet-swingin.png'; if(/^Team Remix\b/i.test(n)) return 'h/helmet-teamremix.png'; if(/^Gnomes in Disguise\b/i.test(n)) return 'h/helmet-gnomes.png'; if(/^Bojangles Jive Turkeys\b/i.test(n)) return 'h/helmet-bojangles.png'; if(/^Bushw?h?ackers\b/i.test(n)) return 'h/helmet-bushwhackers.png'; if(/^Radioactive Rats\b/i.test(n)) return 'h/helmet-rats.png'; if(/^10\.5 Inch\b/i.test(n)) return 'h/helmet-105inch.png?v=2'; if(/Endzone Molesters/i.test(n)) return 'h/helmet-endzone.png'; if(/Prostate Playaz/i.test(n)) return 'h/helmet-prostate.png'; if(/Grundle Lickers/i.test(n)) return 'h/helmet-grundle.png'; if(/Super Hero Rescue Squadron/i.test(n)) return 'h/helmet-superhero.png'; if(/High Octane Bohemoths/i.test(n)) return 'h/helmet-hob.png'; if(/Cascadia Wet Bandidos/i.test(n)) return 'h/helmet-cascadia.png'; if(/Naptown Ryderz/i.test(n)) return 'h/helmet-naptown.png'; if(/Little Executive Rough Riders/i.test(n)) return 'h/helmet-lerr.png'; if(/Shaved Beavers/i.test(n)) return 'h/helmet-shavedbeavers.png'; if(/^(Big Pimpin['\u2019]? Pirates|BPP)\b/i.test(String(n).trim())) return 'h/helmet-bpp.png'; if(/^F\.?I\.?G\.?A\.?\b/i.test(n)) return 'h/helmet-figa.png'; if(/^God['\u2019]s Little Miracles(?!\s*\()/i.test(n)) return 'h/helmet-glm.png'; var id = idOf(n); return id ? D.helm(id) : n === 'DD Allstars' ? 'h/helmet-ddallstars.webp' : 'h/logo.webp'; }
  function now(n){ var id = idOf(n); return id && D.NAME[id] !== n ? D.NAME[id] : ''; }
  function rec(a){ return a[0] + '-' + a[1] + (a[2] ? '-' + a[2] : ''); }
  function pct(a){ var g = a[0] + a[1] + a[2]; return g ? ((a[0] + a[2] / 2) / g).toFixed(3).replace(/^0/, '') : '\u2013'; }
  function cnt(){ var c = {}; H.champs.forEach(function(x){ var id = idOf(x[1]) || x[1]; c[id] = (c[id] || 0) + 1; }); return c; }
  function rail(sel, attr, mark){
    return '<div class="hrail">' + D.IDS.map(function(id){ var m = mark ? mark(id) : ''; return '<button type="button" class="' + (id === sel ? 'on' : '') + (m ? ' ' + m : '') + '" ' + attr + '="' + id + '" title="' + esc(D.NAME[id]) + '"><img src="' + D.helm(id) + '" alt="' + esc(D.NAME[id]) + '"><span class="mono">' + esc(D.SHORT[id]) + '</span></button>'; }).join('') + '</div>';
  }

  function draw(){
    [].forEach.call(document.querySelectorAll('#htabs a'), function(a){ a.classList.toggle('on', a.getAttribute('data-t') === S.tab); });
    ({ champions:champions, teams:teams, h2h:h2h, records:records, standings:standings, defunct:defunct }[S.tab] || champions)();
  }

  /* ---------- champions ---------- */
  function champions(){
    var top = H.champs[0], c = cnt(), rows = [];
    var per = window.matchMedia('(max-width:760px)').matches ? 3 : 6;
    for(var i = 1; i < H.champs.length; i += per) rows.push(H.champs.slice(i, i + per));
    var lb = Object.keys(c).sort(function(a, b){ return c[b] - c[a]; });
    $('hb').innerHTML =
      '<article class="card champ"><div class="ph"><img src="' + hl(top[1], top[0]) + '" alt=""><div class="cw"><div class="kick mono">DEFENDING CHAMPIONS</div><b class="yr">' + top[0] + '</b><b class="cn">' + esc(top[1]) + '</b><span class="mono">' + (idOf(top[1]) ? (c[idOf(top[1])] || 1) + ' TITLES ALL-TIME' : '') + '</span></div></div></article>' +
      '<div class="cmain"><div class="wall">' + rows.map(function(r){
        return '<div class="wrow"><div class="row6">' + r.map(function(x){ var id = idOf(x[1]), n2 = now(x[1]);
          return '<a class="trophy" href="' + (id ? '#teams/' + id : '#champions') + '" title="' + esc(x[1]) + '"><img src="' + hl(x[1], x[0]) + '" alt=""><span class="nm3">' + esc(x[1]) + '</span>' + (n2 ? '<span class="now mono">NOW ' + esc(D.SHORT[id]) + '</span>' : '') + '</a>';
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
        return '<tr class="' + (ch ? 'gold' : '') + '"><td class="y">' + esc(s[0]) + (isRT(s[0]) ? '<i class="rtdot mono" title="RT Sports year">RT</i>' : '') + '</td><td class="l">' + esc(nameIn(+s[0])) + '</td><td class="b">' + esc(s[1]) + '</td><td>' + esc(s[2]) + '</td><td>' + esc(s[3]) + '</td><td>' + esc(s[4]) + '</td><td>' + esc(s[5]) + '</td><td>' + esc(s[6]) + '</td><td class="l nt">' + notes(s[7]) + '</td></tr>';
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
    var yc = -1; t.c.forEach(function(c, i){ if(yc < 0 && /^(year|season|yr)$/i.test(String(c).trim())) yc = i; });
    var ty = (/\b(19|20)\d{2}\b/.exec(t.t || '') || [''])[0];
    var ti = t.team, cols = t.c, vi = cols.indexOf('W') > -1 ? cols.indexOf('W') : (cols[0] === '#' ? 1 : ti + 1);
    // MFL milestone tables put the clinching game on its own row ("vs X, score" + "year, wk n"): fold it into the team row above
    var R = [];
    t.r.forEach(function(r){ var yr = rowYr(r, yc, ty); r = r.map(function(c){ return typeof c === 'string' ? yn(c, yr) : c; }); var v = String(r[ti] || ''); if(/^vs\.? /i.test(v) && R.length){ var p = R[R.length - 1]; p._sub = v.replace(/^vs\.? /i, 'vs ') + (r[vi] ? ' \u00b7 ' + r[vi] : ''); } else { R.push(r.slice()); } });
    return '<article class="card rt' + (wide ? ' wide' : '') + '"><div class="bar mono"><span>' + esc(t.t) + '</span></div><div class="sx"><table class="ht"><thead><tr>' + cols.map(function(c, i){ return '<th class="' + (i === ti ? 'l' : '') + '">' + esc(c) + '</th>'; }).join('') + '</tr></thead><tbody>' +
      R.map(function(r, k){ return '<tr class="' + (k === 0 && /^1/.test(String(r[0])) ? 'gold' : '') + '">' + r.map(function(v, i){
        if(i === ti){ var n2 = now(v); return '<td class="l"><span class="tn3"><img src="' + hl(v, yc > -1 ? r[yc] : ty) + '" alt=""><b>' + esc(v) + (n2 ? '<i class="mono">NOW ' + esc(D.SHORT[idOf(v)]) + '</i>' : '') + (r._sub ? '<i class="mono sub">' + esc(r._sub) + '</i>' : '') + '</b></span></td>'; }
        return '<td class="' + (i === vi ? 'b' : '') + '">' + esc(v) + '</td>'; }).join('') + '</tr>'; }).join('') +
      '</tbody></table></div></article>';
  }
  function records(){
    var L = H.records[S.rc] || H.records.game;
    $('hb').innerHTML = '<div class="seg mono hseg">' + CATS.map(function(c){ return '<a href="#records/' + c[0] + '" class="' + (c[0] === S.rc ? 'on' : '') + '">' + c[1] + '</a>'; }).join('') + '</div>' +
      '<div class="rgrid">' + L.map(function(t){ return table(t, t.c.length > 6); }).join('') + '</div>';
  }
  function alltime(){
    var n = function(v){ return parseFloat(String(v).replace(/,/g, '')) || 0; };
    var r = D.IDS.map(function(id){ var g = H.team[id] && H.team[id].reg; if(!g) return null; var w = String(g[0]).split('-').map(Number), a = [w[0] || 0, w[1] || 0, w[2] || 0];
      return [D.NAME[id], a[0], a[1], a[2], pct(a), Math.round(n(g[2])).toLocaleString('en-US'), Math.round(n(g[3])).toLocaleString('en-US')]; }).filter(Boolean)
      .sort(function(x, y){ return parseFloat(y[4]) - parseFloat(x[4]) || y[1] - x[1]; });
    return { t:'All-Time Standings \u00b7 Active Franchises', c:['Team', 'W', 'L', 'T', 'Pct', 'PF', 'PA'], team:0, r:r };
  }
  // franchises that never carried into a current MFL team, built from the season standings
  // defunct franchises that changed names: alias -> final name
  var DEFLINK = { 'Wishard Gun & Knife Club':'Bath Salt Zombies', "Swinging G-String":"F.I.G.A.", "The Little Asian Kids":"Naptown Ryderz", "The Roman Eagles":"Little Executive Rough Riders" };
  function defunctList(){
    var M = {}, n = function(v){ return parseFloat(String(v).replace(/,/g, '')) || 0; };
    Object.keys(H.standings).forEach(function(y){ (H.standings[y] || []).forEach(function(t){ var c = t.c, ix = function(k){ return c.indexOf(k); };
      t.r.forEach(function(r){ var raw = String(r[t.team] || ''); if(!raw || idOf(raw) || /^vs\.? /i.test(raw)) return; var nm = DEFLINK[raw] || raw;
        var o = M[nm] || (M[nm] = { n:nm, y:[], w:0, l:0, t:0, pf:0, pa:0, best:null, aka:{} }); if(raw !== nm) (o.aka[raw] = o.aka[raw] || []).push(+y);
        var w = +r[ix('W')] || 0, l = +r[ix('L')] || 0, tt = +r[ix('T')] || 0; o.y.push(+y); o.w += w; o.l += l; o.t += tt; o.pf += n(r[ix('PF')]); o.pa += n(r[ix('PA')]);
        var p = (w + tt / 2) / Math.max(1, w + l + tt); if(!o.best || p > o.best.p) o.best = { y:+y, p:p, rec:w + '-' + l + (tt ? '-' + tt : '') };
      }); }); });
    H.champs.forEach(function(x){ var k = DEFLINK[x[1]] || x[1]; if(M[k]) (M[k].ti = M[k].ti || []).push(x[0]); });
    return Object.keys(M).map(function(k){ var o = M[k]; o.y = o.y.filter(function(y, i, a){ return a.indexOf(y) === i; }).sort(); return o; }).sort(function(a, b){ return (b.ti || []).length - (a.ti || []).length || b.y.length - a.y.length || a.y[0] - b.y[0]; });
  }
  function span(ys){ var a = ys[0], b = ys[ys.length - 1]; return a === b ? String(a) : a + '\u2013' + b; }
  function defunct(){
    var L = defunctList();
    $('hb').innerHTML = '<div class="dfh mono"><span>' + L.length + ' FRANCHISES</span><span>GONE BUT NOT FORGOTTEN</span></div><div class="dfg">' + L.map(function(o){
      var img = hl(o.n, o.y[0]), none = /logo\.webp$/.test(img);
      return '<article class="dfc"><div class="dfi' + (none ? ' none' : '') + '">' + (none ? '<span class="mono">HELMET WANTED</span>' : '<img src="' + img + '" alt="">') + '</div><div class="dfb">' +
        '<div class="mono dfy">' + span(o.y) + ' \u00b7 ' + o.y.length + (o.y.length === 1 ? ' SEASON' : ' SEASONS') + '</div><h3>' + esc(o.n) + '</h3>' +
        (o.ti ? '<div class="dft">' + o.ti.map(function(y){ return '<span class="mono">\u2605 ' + y + '</span>'; }).join('') + '</div>' : '') +
        '<div class="dfs"><div><b>' + rec([o.w, o.l, o.t]) + '</b><span class="mono">RECORD</span></div><div><b>' + pct([o.w, o.l, o.t]) + '</b><span class="mono">PCT</span></div><div><b>' + Math.round(o.pf).toLocaleString('en-US') + '</b><span class="mono">PF</span></div></div>' +
        (Object.keys(o.aka).length ? '<div class="dfa"><span class="mono">ALSO KNOWN AS</span>' + Object.keys(o.aka).map(function(a){ var ys = o.aka[a].filter(function(y, i, l){ return l.indexOf(y) === i; }).sort(); return '<div><b>' + esc(a) + '</b><i class="mono">' + span(ys) + '</i></div>'; }).join('') + '</div>' : '') +
        (o.y.length > 1 && o.best ? '<div class="mono dfx">BEST \u00b7 ' + o.best.y + ' \u00b7 ' + o.best.rec + '</div>' : '') + '</div></article>';
    }).join('') + '</div>';
  }
  // season standings drawn like the main Standings page (division banners + grid rows)
  var SGT = '46px minmax(0,1fr) 84px 54px 92px 92px 80px 56px';
  function nf(v, whole){ return (whole ? Math.round(v) : Math.round(v * 100) / 100).toLocaleString('en-US', { maximumFractionDigits:2 }); }
  function nn(v){ return parseFloat(String(v).replace(/,/g, '')) || 0; }
  function divOf(t){ var k = String(t).toLowerCase().replace(/[^a-z]/g, ''); return D.DIVS.filter(function(d){ return k.indexOf(d.k) === 0 || k.indexOf(d.k.slice(0, 4)) > -1; })[0]; }
  function srow(o){
    var d = o.pf - o.pa, id = idOf(o.n), n2 = now(o.n);
    return '<a class="sr" href="' + (id ? '#teams/' + id : '#defunct') + '"><span class="rk">' + esc(o.rk) + '</span><span class="tn2"><img src="' + hl(o.n, o.y) + '" alt=""><span class="nm4"><b>' + esc(o.n) + '</b>' +
      ((o.tags || n2) ? '<span class="tg4">' + (o.tags || '') + (n2 ? '<i class="dvr mono">NOW ' + esc(D.SHORT[id] || n2) + '</i>' : '') + '</span>' : '') + '</span></span>' +
      '<span class="wl">' + o.w + '-' + o.l + (o.t ? '-' + o.t : '') + '</span><span>' + pct([o.w, o.l, o.t]) + '</span><span>' + nf(o.pf, o.whole) + '</span><span>' + nf(o.pa, o.whole) + '</span>' +
      '<span class="' + (d >= 0 ? 'up' : 'dn') + '">' + (d >= 0 ? '+' : '\u2212') + nf(Math.abs(d), o.whole) + '</span><span>' + esc(o.x == null ? '\u2013' : o.x) + '</span></a>';
  }
  function seasonCard(y){
    var L = H.standings[y] || [];
    return '<article class="card stand" style="--gt:' + SGT + '"><div class="bar mono"><span>' + y + ' REGULAR SEASON</span><span>SEED \u00b7 X = DIVISION CHAMP \u00b7 Y = PLAYOFFS</span></div>' + L.map(function(t){
      var c = t.c, ix = function(k){ return c.indexOf(k); }, dv = divOf(t.t), si = ix('Seed');
      var rows = t.r.filter(function(r){ return !/^vs\.? /i.test(String(r[t.team] || '')); }).map(function(r){
        var sd = String(si > -1 ? r[si] : ''), m = /\((\d+)\)/.exec(sd), tg = /^x/i.test(sd) ? '<i class="dlead mono">DIV CHAMP</i>' : /^y/i.test(sd) ? '<i class="dvr mono">PLAYOFFS</i>' : '';
        return srow({ n:yn(r[t.team], y), y:y, rk:m ? m[1] : '\u2013', w:+r[ix('W')] || 0, l:+r[ix('L')] || 0, t:+r[ix('T')] || 0, pf:nn(r[ix('PF')]), pa:nn(r[ix('PA')]), x:ix('Div W-L') > -1 ? r[ix('Div W-L')] : null, tags:tg });
      }).join('');
      var lead = t.r[0], head = dv ? D.divBanner(dv, lead ? '<span class="mono">' + (/^x/i.test(String(lead[si])) ? 'CHAMP' : 'LEADER') + '</span><img src="' + hl(yn(lead[t.team], y), y) + '" alt=""><b>' + esc(yn(lead[t.team], y)) + '</b><i class="mono">' + lead[ix('W')] + '-' + lead[ix('L')] + '</i>' : '')
        : '<div class="sdh mono">' + esc(t.t) + '</div>';
      return head + '<div class="sr hd mono"><span>SEED</span><span>TEAM</span><span>W-L</span><span>PCT</span><span>PF</span><span>PA</span><span>DIFF</span><span>DIV</span></div>' + rows;
    }).join('') + '</article>';
  }
  function allCard(){
    var c = cnt();
    var R = D.IDS.map(function(id){ var g = H.team[id] && H.team[id].reg; if(!g) return null; var w = String(g[0]).split('-').map(Number);
      return { id:id, whole:true, n:D.NAME[id], w:w[0] || 0, l:w[1] || 0, t:w[2] || 0, pf:nn(g[2]), pa:nn(g[3]), x:c[id] || 0 }; }).filter(Boolean)
      .sort(function(a, b){ return parseFloat(pct([b.w, b.l, b.t])) - parseFloat(pct([a.w, a.l, a.t])) || b.w - a.w; });
    return '<article class="card stand" style="--gt:' + SGT + '"><div class="bar mono"><span>ALL-TIME \u00b7 ACTIVE FRANCHISES</span><span>REGULAR SEASON \u00b7 EVERY NAME COUNTED</span></div>' +
      '<div class="sr hd mono"><span>#</span><span>TEAM</span><span>W-L</span><span>PCT</span><span>PF</span><span>PA</span><span>DIFF</span><span>TITLES</span></div>' +
      R.map(function(o, i){ o.rk = i + 1; o.tags = o.x ? '<i class="dlead mono">' + o.x + (o.x > 1 ? ' TITLES' : ' TITLE') + '</i>' : ''; o.x = o.x || '\u2013'; return srow(o); }).join('') + '</article>';
  }
  function standings(){
    var ys = Object.keys(H.standings).sort(function(a, b){ return b - a; }); if(!S.yr) S.yr = ys[0];
    var L = S.yr === 'all' ? [alltime()] : (H.standings[S.yr] || []);
    $('hb').innerHTML = '<div class="weeks hyrs"><a href="#standings/all" class="' + (S.yr === 'all' ? 'on' : '') + '">ALL-TIME</a>' + ys.map(function(y){ return '<a href="#standings/' + y + '" class="' + (y === S.yr ? 'on' : '') + (isRT(y) ? ' rty' : '') + '">' + y + '</a>'; }).join('') + '</div>' +
      (isRT(S.yr) ? '<div class="rtban">' + RTTAG + '<span>This season was played on RT Sports. Standings come from RT\u2019s final report.</span></div>' : '') +
      (S.yr === 'all' ? allCard() : seasonCard(S.yr));
  }

  window.addEventListener('hashchange', function(){ hash(); if(H){ draw(); window.scrollTo(0, 0); } });
  document.addEventListener('click', function(e){
    var t = e.target.closest('[data-team]'); if(t){ S.team = t.getAttribute('data-team'); history.replaceState(null, '', '#teams/' + S.team); draw(); return; }
    var a = e.target.closest('[data-ha]'); if(a){ S.a = a.getAttribute('data-ha'); if(S.b === S.a) S.b = ''; history.replaceState(null, '', '#h2h/' + S.a + (S.b ? '/' + S.b : '')); draw(); return; }
    var b = e.target.closest('[data-hb]'); if(b){ var id = b.getAttribute('data-hb'); if(id === (S.a || D.IDS[0])) return; S.b = id; history.replaceState(null, '', '#h2h/' + (S.a || D.IDS[0]) + '/' + id); draw(); }
  });
})();
