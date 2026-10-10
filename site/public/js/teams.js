(function(){
  var D = DC, $ = D.$, esc = D.esc, arr = D.arr, num = D.num, helm = D.helm;
  var PO = { QB:1, RB:2, WR:3, TE:4, PK:5, K:5, Def:6, DEF:6 };
  var PFULL = { QB:'Quarterbacks', RB:'Running Backs', WR:'Wide Receivers', TE:'Tight Ends', PK:'Kickers', K:'Kickers', Def:'Defense', DEF:'Defense' };
  var IW = { questionable:'Q', doubtful:'D', out:'O', 'injured reserve':'IR', ir:'IR', suspended:'SUS', probable:'P' };
  var qs = new URLSearchParams(location.search);
  var S = { sel:D.NAME[qs.get('f')] ? qs.get('f') : '', cmp:'', pick:false, d:null, me:'' };
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

  function ledger(x, compact){
    return x.groups.map(function(g){
      return '<div class="gh"><span class="pos ' + esc(g.pos) + '">' + esc(g.pos || 'OTH') + '</span><span class="gn">' + esc(PFULL[g.pos] || g.pos || 'Other') + '</span><span class="gs mono">' + g.items.length + ' · ' + money(g.sal) + '</span></div>' +
        g.items.map(function(p){
          return '<div class="lr' + (compact ? ' c' : '') + '"><div class="pn">' + D.face(p.id, p.pos, p.tm) + '<span class="nm" data-card="' + esc(p.id) + '">' + esc(p.n) + '</span><span class="tmk mono">' + D.tlogo(p.tm) + esc(p.tm) + '</span>' + (p.inj ? '<span class="ij mono">' + esc(p.inj) + '</span>' : '') + (p.tag ? '<span class="tg mono">' + p.tag + '</span>' : '') + '</div>' +
            '<span class="pt mono">' + (p.pts || '\u2013') + '</span>' + (compact ? '' : '<span class="by mono">' + esc(p.bye || '\u2013') + '</span>') + '<span class="sl">' + money(p.sal) + '</span></div>';
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
    if(S.pick && !cmp) led += '<div class="hint mono">PICK A TEAM TO COMPARE WITH ' + esc(D.SHORT[f]).toUpperCase() + '</div>';
    if(cmp){
      var y = team(cmp);
      var th = function(id, xx){ return '<div class="th2"><img src="' + helm(id) + '" alt=""><div><b>' + esc(D.NAME[id]) + '</b><span class="mono">' + (d.REC[id] ? esc(d.REC[id]) + ' · ' : '') + money(xx.tot) + ' SALARY</span></div></div>'; };
      led += '<div class="two"><div>' + th(f, x) + ledger(x, true) + '</div><div>' + th(cmp, y) + ledger(y, true) + '</div></div>';
    } else {
      led += '<div class="lr hd mono"><span>PLAYER</span><span>PTS</span><span>BYE</span><span>SALARY</span></div>' + ledger(x, false);
    }
    $('tr').innerHTML = '<div class="trail">' + rail + '</div><div class="tpnl">' + pnl + '</div><div class="tled">' + led + '</div>';
  }
  function IDS(){ var o = Object.keys(S.d.REC); return o.length === 12 ? D.IDS.slice().sort(function(a, b){ return o.indexOf(a) - o.indexOf(b); }) : D.IDS; }

  document.addEventListener('click', function(e){
    if(!S.d) return;
    if(e.target.closest('[data-cmp]')){ if(S.pick || S.cmp){ S.pick = false; S.cmp = ''; } else S.pick = true; draw(); return; }
    var b = e.target.closest('button[data-f]'); if(!b) return;
    var id = b.getAttribute('data-f');
    if(S.pick || S.cmp){ if(id !== S.sel){ S.cmp = id; S.pick = false; draw(); } return; }
    S.sel = id; draw();
    history.replaceState(null, '', D.href('teams', 'f=' + id));
    if(window.innerWidth <= 760) window.scrollTo({ top:0, behavior:'smooth' });
  });
})();
