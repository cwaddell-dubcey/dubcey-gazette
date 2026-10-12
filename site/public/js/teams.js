(function(){
  var D = DC, $ = D.$, esc = D.esc, arr = D.arr, num = D.num, helm = D.helm;
  var PO = { QB:1, RB:2, WR:3, TE:4, PK:5, K:5, Def:6, DEF:6 };
  var PFULL = { QB:'Quarterbacks', RB:'Running Backs', WR:'Wide Receivers', TE:'Tight Ends', PK:'Kickers', K:'Kickers', Def:'Defense', DEF:'Defense' };
  var IW = { questionable:'Q', doubtful:'D', out:'O', 'injured reserve':'IR', ir:'IR', suspended:'SUS', probable:'P' };
  var qs = new URLSearchParams(location.search);
  var S = { sel:D.NAME[qs.get('f')] ? qs.get('f') : '', cmp:'', pick:false, d:null, me:'', kp:false, keep:{} };
  try{ S.keep = JSON.parse(localStorage.getItem('dcKeep') || '{}') || {}; }catch(e){}
  function saveKeep(){ try{ localStorage.setItem('dcKeep', JSON.stringify(S.keep)); }catch(e){} }
  function kept(f, x){ var K = S.keep[f] || {}, on = x.pl.filter(function(p){ return K[p.id]; }), n = on.length, bump = n ? n + 1 : 0; return { list:on, n:n, bump:bump, cost:on.reduce(function(a, p){ return a + kSal(p, bump); }, 0) }; }
  // $0 in-season pickups: $10 with 3 or fewer keepers, then +$1 per extra keeper ($11 at 4, $12 at 5…)
  function kSal(p, bump){ return p.sal > 0 ? p.sal + bump : Math.max(10, bump + 6); }
  function money(v){ v = Math.round(v * 100) / 100; return '$' + (v % 1 ? v.toFixed(2) : v); }

  D.shell('teams').then(function(me){ S.me = me.franchise || ''; if(!S.sel){ S.sel = S.me || D.IDS[0]; if(S.d) draw(); } });

  function no(){ return null; }
  Promise.all([D.api('rosters'), D.api('league').catch(no), D.api('injuries', 'r=2').catch(no), D.api('nflByeWeeks').catch(no), D.records()]).then(function(r){
    var R = {}; arr(r[0] && r[0].rosters && r[0].rosters.franchise).forEach(function(f){ R[f.id] = arr(f.player); });
    var O = {};
    if(r[1] && r[1].league){ arr(r[1].league.franchises && r[1].league.franchises.franchise).forEach(function(f){ O[f.id] = f.owner_name || ''; }); }
    var INJ = {}; arr(r[2] && r[2].injuries && r[2].injuries.injury).forEach(function(i){ INJ[i.id] = IW[String(i.status || '').toLowerCase()] || ''; });
    var BYE = {}; arr(r[3] && r[3].nflByeWeeks && r[3].nflByeWeeks.team).forEach(function(b){ BYE[b.id] = b.bye_week; });
    var ids = []; Object.keys(R).forEach(function(k){ R[k].forEach(function(p){ ids.push(p.id); }); });
    S.d = { R:R, O:O, INJ:INJ, BYE:BYE, REC:r[4].rec, PTS:{} };
    if(!S.sel) S.sel = S.me || D.IDS[0];
    return D.players(ids).then(function(){ draw(); return D.api('playerScores', 'W=YTD&PLAYERS=' + ids.join(',')); }).then(function(ps){
      arr(ps && ps.playerScores && ps.playerScores.playerScore).forEach(function(s){ if(s.score !== '') S.d.PTS[s.id] = s.score; });
      draw();
    }).catch(function(){});
  }).catch(function(){ $('tr').innerHTML = '<div class="ld mono" style="grid-column:1/-1">ROSTERS AREN\u2019T AVAILABLE RIGHT NOW.</div>'; });

  function team(f){
    var d = S.d, pl = (d.R[f] || []).map(function(p){
      var i = D.pinfo(p.id), st = String(p.status || '');
      return { id:p.id, n:i[0], pos:i[1], tm:i[2], sal:num(p.salary), yr:p.contractYear, inj:(D.INJ[p.id] && D.INJ[p.id].k) || d.INJ[p.id] || '', tag:/INJURED/.test(st) ? 'IR' : /TAXI/.test(st) ? 'TAXI' : '', pts:d.PTS[p.id] != null ? D.pts(d.PTS[p.id]) : '', bye:d.BYE[i[2]] || '' };
    }).sort(function(a, b){ return ((PO[a.pos] || 9) - (PO[b.pos] || 9)) || (b.sal - a.sal); });
    var tot = pl.reduce(function(a, p){ return a + p.sal; }, 0), g = [], cur = null;
    pl.forEach(function(p){ if(!cur || cur.pos !== p.pos){ cur = { pos:p.pos, items:[], sal:0 }; g.push(cur); } cur.items.push(p); cur.sal += p.sal; });
    return { pl:pl, tot:tot, groups:g };
  }

  function ledger(x, compact, f){
    var K = f ? (S.keep[f] || {}) : null, kk = f ? kept(f, x) : null;
    return x.groups.map(function(g){
      return '<div class="gh"><span class="pos ' + esc(g.pos) + '">' + esc(g.pos || 'OTH') + '</span><span class="gn">' + esc(PFULL[g.pos] || g.pos || 'Other') + '</span><span class="gs mono">' + g.items.length + ' · ' + money(g.sal) + '</span></div>' +
        g.items.map(function(p){
          var on = K && K[p.id];
          return '<div class="lr' + (compact ? ' c' : '') + (K ? ' kp' + (on ? ' on' : '') : '') + '"' + (K ? ' data-keep="' + esc(p.id) + '"' : '') + '><div class="pn">' + (K ? '<span class="kbx" aria-hidden="true">' + (on ? '\u2713' : '') + '</span>' : '') + D.face(p.id, p.pos, p.tm) + '<span class="nm" data-card="' + esc(p.id) + '">' + esc(p.n) + '</span><span class="tmk mono">' + D.tlogo(p.tm) + esc(p.tm) + '</span>' + (p.inj ? '<span class="ij mono">' + esc(p.inj) + '</span>' : '') + (p.tag ? '<span class="tg mono">' + p.tag + '</span>' : '') + '</div>' +
            '<span class="pt mono">' + (p.pts || '\u2013') + '</span>' + (compact ? '' : '<span class="by mono">' + esc(p.bye || '\u2013') + '</span>') + '<span class="sl">' + (on ? '<s class="mono">' + money(p.sal) + '' + '</s>' + money(kSal(p, kk.bump)) : money(p.sal)) + '</span></div>';
        }).join('');
    }).join('');
  }

  function draw(){
    var d = S.d, f = S.sel, x = team(f), rec = d.REC[f] || '', cmp = S.cmp && S.cmp !== f ? S.cmp : '';
    var rail = IDS().map(function(id){
      var c = id === f ? 'on' : (id === cmp ? 'b' : '');
      return '<button type="button" class="' + c + '" data-f="' + id + '" title="' + esc(D.NAME[id]) + '">' + (cmp && c ? '<i class="mono">' + (c === 'on' ? 'A' : 'B') + '</i>' : '') + '<img src="' + helm(id) + '" alt="' + esc(D.NAME[id]) + '"><span class="pl"><em class="mono">' + esc(D.SHORT[id]) + '</em></span></button>';
    }).join('');
    var pnl = '<div class="shf"><img src="' + helm(f) + '" alt="">' + (rec ? '<span class="plate">' + esc(rec) + '</span>' : '') + '</div>' +
      '<div class="inf"><div><div class="kk mono">SEASON ' + D.Y + '</div><div class="tn">' + esc(D.NAME[f]) + '</div>' + (d.O[f] ? '<div class="ow mono">' + esc(d.O[f]) + '</div>' : '') + D.divTag(f, D.div(f) ? D.div(f).name + ' Division' : '') + '</div>' +
      '<div class="ct mono"><span>TOTAL SALARY</span><b>' + money(x.tot) + '</b></div>' +
      '<div class="cnt" style="grid-template-columns:repeat(' + Math.max(1, x.groups.length) + ',1fr)">' + x.groups.map(function(g){ return '<div><b>' + g.items.length + '</b><span class="mono">' + esc(g.pos || 'OTH') + '</span></div>'; }).join('') + '</div>' +
      '<div class="tl mono">' + x.pl.length + ' PLAYERS ON ROSTER</div></div>' + (D.div(f) && D.div(f).crest ? '<img class="dvwm ' + D.div(f).k + '" src="' + D.div(f).crest + '" alt="">' : '');
    var on = S.pick || cmp;
    var led = '<div class="lh"><span class="t">Roster</span><button type="button" class="btn' + (on ? ' cmpon' : ' ghost2') + '" data-cmp>' + (on ? 'CLOSE COMPARE \u00d7' : 'COMPARE +') + '</button></div>';
    led = led.replace('</button>', '</button>' + (on ? '' : '<button type="button" class="btn' + (S.kp ? ' cmpon' : ' ghost2') + '" data-kp>' + (S.kp ? 'DONE PLANNING \u00d7' : 'PLAN KEEPERS') + '</button>'));
    led = led.replace('<div class="lh"><span class="t">Roster</span>', '<div class="lh"><span class="t">Roster</span><span class="lhb">');
    led = led.replace(/(data-kp>[^<]*<\/button>|data-cmp>[^<]*<\/button>)(<\/div>)$/, '$1</span>$2');
    if(S.kp && !on && S.fut){
      var kk = kept(f, x), bud = S.fut[f] ? S.fut[f].budget : D.NEXT.base, left = bud - kk.cost;
      led += '<div class="kps"><div class="kpg"><div><span class="mono">KEEPING</span><b>' + kk.n + '</b></div><div><span class="mono">RAISE EACH</span><b>' + (kk.n ? '+$' + kk.bump : '\u2013') + '</b></div><div><span class="mono">KEEPER COST</span><b>$' + kk.cost + '</b></div><div class="hi"><span class="mono">LEFT FOR ' + D.NEXT.year + ' AUCTION</span><b class="' + (left < 0 ? 'bad' : '') + '">$' + left + '</b><i class="mono">OF $' + bud + '</i></div></div>' +
        '<div class="kpn mono"><span>TAP PLAYERS TO KEEP \u00b7 EACH KEEPER GOES UP $1 MORE THAN THE NUMBER KEPT</span>' + (kk.n ? '<button type="button" data-kclr>CLEAR</button>' : '') + '</div><div class="kpn2 mono">PLAN IS SAVED IN THIS BROWSER ONLY. IT ISN\u2019T SUBMITTED ANYWHERE.</div></div>';
    }
    if(S.pick && !cmp) led += '<div class="hint mono">PICK A TEAM TO COMPARE WITH ' + esc(D.SHORT[f]).toUpperCase() + '</div>';
    if(cmp){
      var y = team(cmp);
      var th = function(id, xx){ return '<div class="th2"><img src="' + helm(id) + '" alt=""><div><b>' + esc(D.NAME[id]) + '</b><span class="mono">' + (d.REC[id] ? esc(d.REC[id]) + ' · ' : '') + money(xx.tot) + ' SALARY</span></div></div>'; };
      led += '<div class="two"><div>' + th(f, x) + ledger(x, true) + '</div><div>' + th(cmp, y) + ledger(y, true) + '</div></div>';
    } else {
      led += '<div class="lr hd mono"><span>PLAYER</span><span>PTS</span><span>BYE</span><span>' + (S.kp ? D.NEXT.year + ' SALARY' : 'SALARY') + '</span></div>' + ledger(x, false, S.kp ? f : '');
    }
    if(!cmp && S.fut) led += futCard(f);
    if(S.fut) pnl += '<div class="fut2">' + futCard(f) + '</div>';
    $('tr').innerHTML = '<div class="trail">' + rail + '</div><div class="tpnl">' + pnl + '</div><div class="tled">' + led + '</div>';
  }
  D.future().then(function(m){ S.fut = D.futureCalc(m); if(S.d) draw(); });
  function lux(n){ var d = 250; return '$' + (Math.min(n, 10) * d / 10 + Math.max(0, n - 10) * d / 5); }
  function futCard(f){
    var N = D.NEXT, x = S.fut[f], b = x.budget, pct = function(v){ return Math.max(0, Math.min(100, (v - N.min) / (N.max - N.min) * 100)); };
    var over = b > N.max ? b - N.max : 0, under = b < N.min ? N.min - b : 0, room = Math.min(N.max - b, b - N.min);
    var picks = x.picks.slice().sort(function(a, b2){ return a === f ? -1 : b2 === f ? 1 : 0; });
    var kk = S.d ? kept(f, team(f)) : { n:0 };
    var kline = kk.n ? '<div class="futk mono"><span>PLANNED KEEPERS \u00b7 ' + kk.n + ' \u00b7 $' + kk.cost + '</span><b>$' + (b - kk.cost) + ' LEFT FOR THE AUCTION</b></div>' : '';
    return '<div class="fut"><div class="futh"><span class="t">' + N.year + ' Auction</span><span class="mono">STARTS AT $' + N.base + ' \u00b7 MUST LAND $' + N.min + '\u2013$' + N.max + '</span></div>' +
      '<div class="futg"><div class="futb"><span class="mono">' + N.year + ' BUDGET</span><b class="' + (b > N.base ? 'up' : b < N.base ? 'dn' : '') + '">$' + b + '</b><i class="mono">' + (b === N.base ? 'EVEN' : (b > N.base ? '+$' + (b - N.base) : '\u2212$' + (N.base - b)) + ' FROM TRADES') + '</i></div>' +
        '<div class="futr"><div class="futbar"><i style="left:' + pct(N.base) + '%" class="base"></i><b style="left:' + pct(b) + '%"></b></div><div class="futl mono"><span>$' + N.min + '</span><span>$' + N.base + '</span><span>$' + N.max + '</span></div>' +
        '<div class="futn mono ' + (over || under ? 'bad' : '') + '">' + (over ? '$' + over + ' OVER THE CAP \u00b7 MUST BE FIXED BEFORE THE AUCTION' : under ? '$' + under + ' UNDER THE FLOOR \u00b7 MUST BE FIXED BEFORE THE AUCTION' : '$' + Math.max(0, N.max - b) + ' MORE CAN COME IN \u00b7 $' + Math.max(0, b - N.min) + ' MORE CAN GO OUT' + (Math.min(20, N.max - b) > 0 ? '<br>LUXURY TAX CAN ADD UP TO $' + Math.min(20, N.max - b) + ' (' + lux(Math.min(20, N.max - b)) + ' IN EXTRA DUES)' : '<br>NO ROOM UNDER THE CAP FOR LUXURY TAX')) + '</div></div>' +
        kline + '<div class="futp"><span class="mono">' + N.year + ' ROOKIE PICKS</span>' + (picks.length ? picks.map(function(p){ return '<div><img src="' + helm(p) + '" alt=""><b>' + (p === f ? 'Own pick' : esc(D.SHORT[p]) + '\u2019s pick') + '</b></div>'; }).join('') : '<div class="none mono">NONE \u00b7 TRADED AWAY</div>') + '</div></div>' +
      (x.moves.length ? '<div class="futm">' + x.moves.slice().reverse().map(function(v){ return '<div><span class="mono">' + esc(new Date(v.m.date + 'T12:00:00').toLocaleDateString('en-US', { month:'short', day:'numeric' }).toUpperCase()) + '</span><img src="' + helm(v.other) + '" alt=""><b>' + (v.d > 0 ? 'From ' : 'To ') + esc(D.SHORT[v.other]) + (v.pick ? ' <em class="mono">+ ' + esc(D.SHORT[v.m.pick]) + ' ROOKIE PICK</em>' : '') + (v.m.note ? '<i>' + esc(v.m.note) + '</i>' : '') + '</b><strong class="mono ' + (v.d > 0 ? 'up' : 'dn') + '">' + (v.d > 0 ? '+$' + v.d : v.d < 0 ? '\u2212$' + (-v.d) : '$0') + '</strong></div>'; }).join('') + '</div>' : '<div class="futm"><div class="none mono">NO ' + N.year + ' MONEY TRADED YET</div></div>') + '</div>';
  }
  function IDS(){ var o = Object.keys(S.d.REC); return o.length === 12 ? D.IDS.slice().sort(function(a, b){ return o.indexOf(a) - o.indexOf(b); }) : D.IDS; }

  document.addEventListener('click', function(e){
    if(!S.d) return;
    if(e.target.closest('[data-cmp]')){ if(S.pick || S.cmp){ S.pick = false; S.cmp = ''; } else { S.pick = true; S.kp = false; } draw(); return; }
    if(e.target.closest('[data-kp]')){ S.kp = !S.kp; draw(); return; }
    if(e.target.closest('[data-kclr]')){ delete S.keep[S.sel]; saveKeep(); draw(); return; }
    var kr = e.target.closest('[data-keep]'); if(kr && !e.target.closest('[data-card]')){ var pid = kr.getAttribute('data-keep'), K = S.keep[S.sel] = S.keep[S.sel] || {}; if(K[pid]) delete K[pid]; else K[pid] = 1; saveKeep(); var y = window.scrollY; draw(); window.scrollTo(0, y); return; }
    var b = e.target.closest('button[data-f]'); if(!b) return;
    var id = b.getAttribute('data-f');
    if(S.pick || S.cmp){ if(id !== S.sel){ S.cmp = id; S.pick = false; draw(); } return; }
    S.sel = id; draw();
    history.replaceState(null, '', D.href('teams', 'f=' + id));
    if(window.innerWidth <= 760) window.scrollTo({ top:0, behavior:'smooth' });
  });
})();
