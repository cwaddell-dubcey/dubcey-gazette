(function(){
  var D = DC, $ = D.$, esc = D.esc, arr = D.arr, num = D.num, helm = D.helm;
  var IW = { questionable:'Q', doubtful:'D', out:'O', 'injured reserve':'IR', suspended:'SUS' };
  var S = { me:'', q:'', pos:'ALL', fa:'1', vw:'ov', wf:1, wt:0, tmf:'', lim:100, wp:{}, ws:{}, rows:[], own:{}, pts:{}, inj:{}, faab:'', bye:{}, opp:{}, proj:{}, salary:{} };
  D.shell('players').then(function(me){ S.me = me.franchise || ''; if(S.rows.length) list(); });

  Promise.all([D.api('freeAgents').catch(function(){ return null; }), D.api('rosters'), D.api('injuries', 'r=2').catch(function(){ return null; }), D.api('leagueStandings').catch(function(){ return null; })]).then(function(r){
    var fa = arr(r[0] && r[0].freeAgents && r[0].freeAgents.leagueUnit && r[0].freeAgents.leagueUnit.player).map(function(p){ return p.id; });
    S.salary = {}; arr(r[1] && r[1].rosters && r[1].rosters.franchise).forEach(function(f){ arr(f.player).forEach(function(p){ S.own[p.id] = f.id; S.salary[p.id] = num(p.salary); }); });
    arr(r[2] && r[2].injuries && r[2].injuries.injury).forEach(function(i){ S.inj[i.id] = IW[String(i.status || '').toLowerCase()] || ''; });
    arr(r[3] && r[3].leagueStandings && r[3].leagueStandings.franchise).forEach(function(f){ if(f.id === S.me) S.faab = f.bbidbalance || ''; S['b' + f.id] = f.bbidbalance; });
    S.fas = fa;
    var ids = fa.concat(Object.keys(S.own));
    // league salary list also covers free agents (e.g. dropped players keep their price)
    return D.api('salaries').catch(function(){ return null; }).then(function(sj){
      arr(sj && sj.salaries && sj.salaries.leagueUnit && sj.salaries.leagueUnit.player).forEach(function(p){ var v = num(p.salary); if(v && !S.salary[p.id]) S.salary[p.id] = v; });
      return D.players(ids);
    }).then(function(){
      return D.scores('YTD', ids);
    }).then(function(ps){
      S.pts = ps || {};
      S.rows = ids.map(function(id){ var i = D.pinfo(id); return { id:id, n:i[0], pos:i[1], tm:i[2], own:S.own[id] || '', p:S.pts[id] || 0, sal:S.salary[id] || 0 }; }).filter(function(r){ return D.OURPOS[r.pos] || r.own; });
      list(); trend(); season(); if(S.view === 'top') top(); if(S.view === 'news') news();
      S.watch = {}; S.bait = {};
      D.me().then(function(me){ if(!me || !me.franchise) return;
        D.api('myWatchList').then(function(j){ arr(j && j.myWatchList && j.myWatchList.player).forEach(function(p){ S.watch[p.id] = 1; }); list(); }).catch(function(){});
        D.api('tradeBait').then(function(j){ arr(j && j.tradeBaits && j.tradeBaits.tradeBait).forEach(function(b){ String(b.willGiveUp || '').split(',').forEach(function(id){ if(id) S.bait[id] = b.franchise_id; }); }); list(); }).catch(function(){});
      });
      D.api('liveScoring').then(function(j){
        var cur = num(j && j.liveScoring && j.liveScoring.week) || 1; S.wk = S.wk || cur; var ws = []; for(var w = 1; w <= cur; w++) ws.push(w);
        return Promise.all(ws.map(function(w){ return D.scores(w, ids).then(function(o){ return [w, o || {}]; }); }));
      }).then(function(L){ L.forEach(function(x){ Object.keys(x[1]).forEach(function(id){ (S.wp[id] = S.wp[id] || {})[x[0]] = num(x[1][id]); }); }); list(); }).catch(function(){});
    });
  }).catch(function(){ $('plist').innerHTML = '<div class="ld mono">PLAYERS AREN\u2019T AVAILABLE RIGHT NOW.</div>'; });

  function trend(){
    Promise.all([D.api('topAdds').catch(function(){ return null; }), D.api('topDrops').catch(function(){ return null; })]).then(function(r){
      var A = D.arr(r[0] && r[0].topAdds && r[0].topAdds.player).slice(0, 40), Dr = D.arr(r[1] && r[1].topDrops && r[1].topDrops.player).slice(0, 40);
      if(!A.length && !Dr.length) return;
      return D.players(A.concat(Dr).map(function(x){ return x.id; })).then(function(){
        function rows(L, add){ return L.filter(function(x){ return D.OURPOS[D.pinfo(x.id)[1]]; }).slice(0, 10).map(function(x){ var i = D.pinfo(x.id), own = S.own[x.id];
          return '<div class="tr2"><span class="pos ' + esc(i[1]) + '">' + esc(i[1] || '\u2013') + '</span>' + D.face(x.id, i[1], i[2]) + '<button type="button" class="pnb" data-card="' + esc(x.id) + '"><b>' + esc(i[0]) + D.ij(x.id) + '</b><i class="mono">' + D.tlogo(i[2]) + esc(i[2]) + '</i></button><span class="pc2 mono ' + (add ? 'up' : 'dn') + '">' + (add ? '+' : '\u2212') + esc(String(x.percent || '').replace(/^[-+]/, '')) + '%</span>' +
            (own ? '<img src="' + helm(own) + '" alt="" title="' + esc(D.NAME[own]) + '">' : '<button class="btn sm" type="button" data-add="' + esc(x.id) + '">ADD</button>') + '</div>'; }).join(''); }
        $('tadd').innerHTML = '<div class="bar mono"><span>HOT ACROSS MFL</span><span>MOST ADDED</span></div>' + (rows(A, 1) || '<div class="ld mono">NO DATA</div>');
        $('tdrop').innerHTML = '<div class="bar mono"><span>COLD ACROSS MFL</span><span>MOST DROPPED</span></div>' + (rows(Dr, 0) || '<div class="ld mono">NO DATA</div>');
        $('trend').hidden = false;
      });
    });
  }
  // season stats (ESPN box scores, summed by week), MFL-wide % owned / % added
  var COLS = {
    ALL:[['p', 'PTS'], ['ppg', 'PPG'], ['proj', 'PROJ'], ['opp', 'OPP'], ['bye', 'BYE'], ['own', '% OWN'], ['add', '% ADD'], ['sal', 'SALARY']],
    QB:[['p', 'PTS'], ['ppg', 'PPG'], ['cmp', 'CMP'], ['att', 'ATT'], ['py', 'PASS YDS'], ['pt', 'PASS TD'], ['int', 'INT'], ['ry', 'RUSH YDS'], ['rt', 'RUSH TD'], ['proj', 'PROJ'], ['opp', 'OPP'], ['own', '% OWN'], ['add', '% ADD']],
    RB:[['p', 'PTS'], ['ppg', 'PPG'], ['car', 'CAR'], ['ry', 'RUSH YDS'], ['rt', 'RUSH TD'], ['tgt', 'TGT'], ['rec', 'REC'], ['cy', 'REC YDS'], ['ct', 'REC TD'], ['proj', 'PROJ'], ['opp', 'OPP'], ['own', '% OWN'], ['add', '% ADD']],
    WR:[['p', 'PTS'], ['ppg', 'PPG'], ['tgt', 'TGT'], ['rec', 'REC'], ['cy', 'REC YDS'], ['ct', 'REC TD'], ['ry', 'RUSH YDS'], ['proj', 'PROJ'], ['opp', 'OPP'], ['own', '% OWN'], ['add', '% ADD']]
  };
  COLS.TE = COLS.WR;
  S.sort = 'p'; S.st = {}; S.gp = {}; S.pown = {}; S.padd = {};
  var EX = { GBP:'GB', KCC:'KC', NEP:'NE', NOS:'NO', SFO:'SF', TBB:'TB', LVR:'LV', JAC:'JAX', WAS:'WSH' };
  function nk(n){ return String(n || '').toLowerCase().replace(/[.'\u2019]/g, '').replace(/\s+(jr|sr|ii|iii|iv|v)$/, '').replace(/[^a-z ]/g, '').replace(/\s+/g, ' ').trim(); }
  function keyOf(id){ var i = D.pinfo(id), n = String(i[0] || ''), m = /^(.*?),\s*(.*)$/.exec(n); if(m) n = m[2] + ' ' + m[1]; var t = String(i[2] || '').toUpperCase(); return nk(n) + '|' + (EX[t] || t); }
  function season(){
    var no = function(){ return null; };
    D.api('liveScoring').catch(no).then(function(j){
      var w = num(j && j.liveScoring && j.liveScoring.week) || 1; S.wk = w;
      return Promise.all([D.api('topOwns').catch(no), D.api('topAdds').catch(no), D.LOCAL ? null : fetch('/data/fa').then(function(x){ return x.ok ? x.json() : null; }).catch(no), D.api('nflByeWeeks').catch(no), D.api('nflSchedule', 'W=' + w).catch(no), D.api('projectedScores', 'W=' + w).catch(no)]);
    }).then(function(r){
      arr(r[0] && r[0].topOwns && r[0].topOwns.player).forEach(function(x){ S.pown[x.id] = num(x.percent); });
      arr(r[1] && r[1].topAdds && r[1].topAdds.player).forEach(function(x){ S.padd[x.id] = num(x.percent); });
      var F = r[2] || {}; Object.keys(F).forEach(function(id){ var v = F[id]; if(v[0] != null) S.pown[id] = v[0]; if(v[1] != null) S.padd[id] = v[1]; if(v[2] != null) S.proj[id] = v[2]; if(v[3] && !S.salary[id]){ S.salary[id] = v[3]; S.rows.forEach(function(r){ if(r.id === id) r.sal = v[3]; }); } });
      arr(r[3] && r[3].nflByeWeeks && r[3].nflByeWeeks.team).forEach(function(t){ S.bye[t.id] = num(t.bye_week); });
      arr(r[4] && r[4].nflSchedule && r[4].nflSchedule.matchup).forEach(function(m){ var T = arr(m.team), k = num(m.kickoff) * 1000; if(T.length !== 2) return;
        var when = k ? new Date(k).toLocaleString('en-US', { timeZone:'America/New_York', weekday:'short', hour:'numeric', minute:'2-digit' }).replace(':00', '') : '';
        T.forEach(function(t, i){ var o = T[1 - i]; S.opp[t.id] = { o:(t.isHome === '1' ? 'vs ' : '@ ') + o.id, w:when }; }); });
      arr(r[5] && r[5].projectedScores && r[5].projectedScores.playerScore).forEach(function(x){ if(x.score !== '' && S.proj[x.id] == null) S.proj[x.id] = num(x.score); });
      list();
    });
    if(D.LOCAL) return;
    D.api('liveScoring').then(function(j){
      var cur = num(j && j.liveScoring && j.liveScoring.week), ws = []; for(var w = 1; w <= cur; w++) ws.push(w);
      return Promise.all(ws.map(function(w){ return fetch('/data/espn?raw=1&W=' + w).then(function(x){ return x.json(); }).catch(function(){ return {}; }); }));
    }).then(function(W){
      var T = {}, G = {};
      (W || []).forEach(function(o, i){ S.ws[i + 1] = o || {}; });
      (W || []).forEach(function(o){ Object.keys(o || {}).forEach(function(k){ var v = o[k]; if(!v || typeof v !== 'object') return; var t = T[k] = T[k] || {}; Object.keys(v).forEach(function(f){ t[f] = (t[f] || 0) + num(v[f]); }); G[k] = (G[k] || 0) + 1; }); });
      S.rows.forEach(function(r){ var k = keyOf(r.id); if(T[k]){ S.st[r.id] = T[k]; S.gp[r.id] = G[k]; } });
      list(); if(S.view === 'top') top();
    }).catch(function(){});
  }
  var TAIL = [['opp', 'OPP'], ['stat', 'STATUS'], ['bye', 'BYE'], ['sal', 'SALARY']];
  var VW = {
    pass:[['p', 'PTS'], ['ppg', 'AVG'], ['cmp', 'CMP'], ['att', 'ATT'], ['py', 'PASS YDS'], ['pt', 'PASS TD'], ['int', 'INT'], ['car', 'CAR'], ['ry', 'RUSH YDS'], ['rt', 'RUSH TD']],
    rush:[['p', 'PTS'], ['ppg', 'AVG'], ['car', 'CAR'], ['ry', 'RUSH YDS'], ['rt', 'RUSH TD'], ['tgt', 'TGT'], ['rec', 'REC'], ['cy', 'REC YDS'], ['ct', 'REC TD']],
    rec:[['p', 'PTS'], ['ppg', 'AVG'], ['tgt', 'TGT'], ['rec', 'REC'], ['cy', 'REC YDS'], ['ct', 'REC TD'], ['car', 'CAR'], ['ry', 'RUSH YDS'], ['rt', 'RUSH TD']]
  };
  function range(){ var a = [], t = S.wt || S.wk || 1; for(var w = Math.min(S.wf, t); w <= t; w++) a.push(w); return a; }
  function full(){ return S.wf === 1 && (!S.wt || S.wt === S.wk); }
  function cols(){
    if(S.vw === 'wk') return [['p', 'PTS'], ['ppg', 'AVG']].concat(range().map(function(w){ return ['w' + w, String(w)]; })).concat(TAIL);
    if(VW[S.vw]) return VW[S.vw].concat(TAIL);
    return COLS[S.pos] || COLS.ALL;
  }
  function rp(r){ if(full() && !Object.keys(S.wp).length) return r.p; var W = S.wp[r.id] || {}, t = 0; range().forEach(function(w){ t += W[w] || 0; }); return Object.keys(S.wp).length ? t : r.p; }
  function gpR(r){ var W = S.wp[r.id], n = 0; if(W){ range().forEach(function(w){ if(W[w]) n++; }); return n; } return S.gp[r.id] || 0; }
  function rs(r, k){ if(!Object.keys(S.ws).length) { var t0 = S.st[r.id]; return t0 ? t0[k] || 0 : null; } var key = keyOf(r.id), t = 0, any = false; range().forEach(function(w){ var o = S.ws[w] && S.ws[w][key]; if(o){ any = true; t += num(o[k]); } }); return any ? t : null; }
  function ctl(){
    var t = S.wk || 1, o = ''; for(var w = 1; w <= t; w++) o += '<option' + (w === S.wf ? ' selected' : '') + '>' + w + '</option>';
    var o2 = ''; for(var w2 = 1; w2 <= t; w2++) o2 += '<option' + (w2 === (S.wt || t) ? ' selected' : '') + '>' + w2 + '</option>';
    if($('wf').innerHTML !== o) $('wf').innerHTML = o; if($('wt').innerHTML !== o2) $('wt').innerHTML = o2;
    if($('ownf').options.length < 4) $('ownf').insertAdjacentHTML('beforeend', '<option value="w">\u2605 My watch list</option>');
    if($('ownf').options.length < 5) $('ownf').insertAdjacentHTML('beforeend', '<optgroup label="Dubcey teams">' + D.IDS.map(function(id){ return '<option value="' + id + '">' + esc(D.NAME[id]) + '</option>'; }).join('') + '</optgroup>');
    $('ownf').value = S.fa;
    if($('tmf').options.length < 2){ var T = {}; S.rows.forEach(function(r){ if(r.tm && r.tm !== 'FA') T[r.tm] = 1; }); $('tmf').innerHTML = '<option value="">Any team</option>' + Object.keys(T).sort().map(function(x){ return '<option>' + x + '</option>'; }).join(''); }
    $('f2n').textContent = full() ? 'SEASON' : 'WEEKS ' + S.wf + '\u2013' + (S.wt || t);
  }
  function val(r, k){
    if(k === 'p') return rp(r);
    if(k === 'ppg'){ var g = gpR(r); return g ? rp(r) / g : null; }
    if(/^w\d+$/.test(k)){ var w = +k.slice(1); if(S.bye[r.tm] === w) return -1; var W = S.wp[r.id]; return W && W[w] != null ? W[w] : null; }
    if(k === 'stat') return r.own ? (D.SHORT[r.own] || r.own) : '';
    if(k === 'own') return S.pown[r.id] != null ? S.pown[r.id] : null;
    if(k === 'add') return S.padd[r.id] != null ? S.padd[r.id] : null;
    if(k === 'proj') return S.proj && S.proj[r.id] != null ? S.proj[r.id] : null;
    if(k === 'bye') return S.bye && S.bye[r.tm] ? S.bye[r.tm] : null;
    if(k === 'opp') return S.opp && S.opp[r.tm] ? (S.bye && S.bye[r.tm] === S.wk ? -1 : 0) : (r.tm && r.tm !== 'FA' && S.bye && S.bye[r.tm] === S.wk ? -1 : null);
    if(k === 'sal') return r.sal != null ? r.sal : null;
    return rs(r, k);
  }
  function fmt(v, k, r){ if(/^w\d+$/.test(k)) return v === -1 ? '<em class="by">B</em>' : v == null ? '\u2013' : D.pts(v); if(k === 'stat') return v ? esc(String(v).toUpperCase()) : '<em class="fa2">FA</em>'; if(k === 'opp'){ var o = r && S.opp[r.tm]; return o ? esc(o.o) + '<i>' + esc(o.w.toUpperCase()) + '</i>' : (v === -1 ? 'BYE' : '\u2013'); } if(v == null) return '\u2013'; if(k === 'proj') return v.toFixed(2); if(k === 'bye') return String(v); if(k === 'sal') return '$' + v; if(k === 'own' || k === 'add') return (Math.round(v * 10) / 10) + '%'; if(k === 'ppg') return v.toFixed(1); if(k === 'p') return D.pts(v); return String(Math.round(v)); }
  var SH = { stat:'STATUS', proj:'PROJ', opp:'OPP', bye:'BYE', sal:'SALARY', p:'PTS', ppg:'PPG', cmp:'CMP', att:'ATT', py:'PASS YDS', pt:'PASS TD', int:'INT', car:'CAR', ry:'RUSH YDS', rt:'RUSH TD', tgt:'TGT', rec:'REC', cy:'REC YDS', ct:'REC TD', own:'OWN', add:'ADD' };
  function star(id){ if(!S.me) return ''; var on = S.watch && S.watch[id]; return '<button type="button" class="wstar' + (on ? ' on' : '') + '" data-watch="' + esc(id) + '" title="' + (on ? 'Remove from watch list' : 'Add to watch list') + '" aria-label="Watch list">' + (on ? '\u2605' : '\u2606') + '</button>'; }
  function phone(R, C){
    var sk = S.sort, big = sk === 'p' ? 'p' : sk;
    $('plist').innerHTML = '<div class="pmsort mono"><span>SORT</span>' + C.map(function(c){ return '<button type="button" data-sort="' + c[0] + '" class="' + (c[0] === sk ? 'on' : '') + '">' + c[1] + '</button>'; }).join('') + '</div>' +
      (R.map(function(r){
        var line = C.filter(function(c){ return c[0] !== big && c[0] !== 'p' && val(r, c[0]) != null; }).slice(0, 4).map(function(c){ return '<span><b>' + fmt(val(r, c[0]), c[0], r) + '</b> ' + SH[c[0]] + '</span>'; }).join('');
        return '<div class="pm"><span class="pos ' + esc(r.pos) + '">' + esc(r.pos || '\u2013') + '</span>' +
          '<button type="button" class="pmn" data-card="' + esc(r.id) + '"><b>' + esc(r.n) + D.ij(r.id) + (S.bait && S.bait[r.id] ? '<span class="blk mono">BLOCK</span>' : '') + '</b><i class="mono">' + D.tlogo(r.tm) + esc(r.tm) + (sk !== 'p' ? ' \u00b7 ' + D.pts(r.p) + ' PTS' : '') + '</i>' + (line ? '<u class="mono">' + line + '</u>' : '') + '</button>' +
          '<div class="pmv"><b>' + fmt(val(r, big), big, r) + '</b><span class="mono">' + SH[big] + '</span></div>' + (S.me ? star(r.id) : '<span></span>') +
          (r.own ? '<a class="pma" href="' + D.href('teams', 'f=' + r.own) + '" title="' + esc(D.NAME[r.own]) + '"><img src="' + helm(r.own) + '" alt=""></a>' : '<button class="pma add mono" type="button" data-add="' + esc(r.id) + '" aria-label="Add ' + esc(r.n) + '">+</button>') + '</div>';
      }).join('') || '<div class="ld mono">NO PLAYERS MATCH</div>') +
      '<div class="fnote mono"><span>TAP A PLAYER FOR GAME LOGS</span><span>% OWN / ADD FROM MFL</span></div>';
  }
  var MQ = window.matchMedia('(max-width:760px)'); if(MQ.addEventListener) MQ.addEventListener('change', function(){ if(S.rows.length) list(); });
  function list(){
    var q = S.q.toLowerCase(), C = cols();
    if(!C.some(function(c){ return c[0] === S.sort; })) S.sort = 'p';
    var R = S.rows.filter(function(r){ return (S.fa === '0' || (S.fa === 'w' ? !!(S.watch && S.watch[r.id]) : S.fa === '1' ? !r.own : S.fa === 'r' ? !!r.own : r.own === S.fa)) && (S.pos === 'ALL' || r.pos === S.pos) && (!S.tmf || r.tm === S.tmf) && (!q || r.n.toLowerCase().indexOf(q) > -1 || r.tm.toLowerCase() === q); })
      .sort(function(a, b){ var x = val(a, S.sort), y = val(b, S.sort); if(typeof x === 'string' || typeof y === 'string') return String(x || 'zz').localeCompare(String(y || 'zz')); return (y == null ? -1 : y) - (x == null ? -1 : x) || val(b, 'p') - val(a, 'p'); }).slice(0, S.lim);
    [].forEach.call(document.querySelectorAll('[data-pos]'), function(b){ b.classList.toggle('on', b.getAttribute('data-pos') === S.pos); });
    [].forEach.call(document.querySelectorAll('[data-fa]'), function(b){ b.classList.toggle('on', b.getAttribute('data-fa') === S.fa); });
    $('cnt').textContent = R.length + (R.length === S.lim ? '+' : '') + ' PLAYERS'; ctl();
    if(window.matchMedia('(max-width:760px)').matches){ phone(R, C); return; }
    $('plist').innerHTML = '<div class="ptw"><table class="ptab"><thead><tr><th class="l mono">PLAYER</th><th class="mono act"></th>' + C.map(function(c){ return '<th class="mono' + (c[0] === S.sort ? ' on' : '') + '"><button type="button" data-sort="' + c[0] + '">' + c[1] + (c[0] === S.sort ? ' \u25be' : '') + '</button></th>'; }).join('') + '</tr></thead><tbody>' +
      (R.map(function(r){
        return '<tr><td class="l"><div class="ptn"><span class="pos ' + esc(r.pos) + '">' + esc(r.pos || '\u2013') + '</span>' + D.face(r.id, r.pos, r.tm) + '<button type="button" class="pnb" data-card="' + esc(r.id) + '"><b>' + esc(r.n) + D.ij(r.id) + (S.bait && S.bait[r.id] ? '<span class="blk mono">ON THE BLOCK</span>' : '') + '</b><i class="mono">' + D.tlogo(r.tm) + esc(r.tm) + '</i></button>' + star(r.id) + '</div></td>' +
          '<td class="act">' + (r.own ? '<a class="ow2" href="' + D.href('teams', 'f=' + r.own) + '" title="' + esc(D.NAME[r.own]) + '"><img src="' + helm(r.own) + '" alt=""></a>' : '<button class="btn sm" type="button" data-add="' + esc(r.id) + '">ADD</button>') + '</td>' +
          C.map(function(c){ return '<td class="mono' + (c[0] === S.sort ? ' on' : '') + (c[0] === 'p' ? ' pp' : '') + '">' + fmt(val(r, c[0]), c[0], r) + '</td>'; }).join('') + '</tr>';
      }).join('') || '<tr><td colspan="' + (C.length + 2) + '"><div class="ld mono">NO PLAYERS MATCH</div></td></tr>') + '</tbody></table></div>' +
      '<div class="fnote mono"><span>TAP A PLAYER FOR GAME LOGS \u00b7 TAP A COLUMN TO SORT</span><span>% OWN / % ADD ACROSS ALL MFL LEAGUES \u00b7 PROJ = MFL PROJECTION FOR WEEK ' + (S.wk || '') + '</span></div>';
  }
  function sheet(html){
    var v = document.createElement('div'); v.className = 'veil';
    v.innerHTML = '<div class="sheet" role="dialog" aria-modal="true">' + html + '</div>';
    document.body.appendChild(v);
    v.addEventListener('click', function(e){ if(e.target === v || e.target.closest('[data-x]')) v.remove(); });
    return v;
  }
  function card(id){
    var i = D.pinfo(id), own = S.own[id], ij = S.inj[id];
    sheet('<div class="bar mono"><span>PLAYER CARD</span><button type="button" data-x aria-label="Close">\u00d7</button></div>' +
      '<div class="pc"><div class="pch">' + D.face(id, i[1], i[2], 1) + '<div><span class="pos ' + esc(i[1]) + '">' + esc(i[1]) + '</span><h2>' + esc(i[0]) + D.ij(id) + '</h2><span class="mono">' + esc(i[2]) + (ij ? ' · <em>' + ij + '</em>' : '') + '</span></div></div>' +
      '<div class="pcs"><div><b>' + D.pts(S.pts[id] || 0) + '</b><span class="mono">SEASON PTS</span></div><div><b>' + (own ? esc(D.SHORT[own]) : 'FA') + '</b><span class="mono">' + (own ? 'ROSTERED BY' : 'AVAILABLE') + '</span></div></div>' +
      (!own ? '<div style="padding:0 22px 22px"><button class="btn" type="button" data-add="' + esc(id) + '" data-x>ADD THIS PLAYER</button></div>' : '') + '</div>');
  }
  function add(id){
    if(!S.me){ D.signIn(); return; }
    var i = D.pinfo(id);
    D.addWindow(i[2]).then(function(w){ addSheet(id, w); });
  }
  function addSheet(id, w){
    var i = D.pinfo(id), mine = S.rows.filter(function(r){ return r.own === S.me; }).sort(function(a, b){ return a.p - b.p; }), fa = w.mode === 'fa';
    var v = sheet('<div class="bar mono"><span>' + (fa ? 'FREE AGENT PICKUP' : 'BLIND BID WAIVER CLAIM') + '</span><button type="button" data-x aria-label="Close">\u00d7</button></div>' +
      '<form class="cl"><div class="pch">' + D.face(id, i[1], i[2], 1) + '<div><span class="pos ' + esc(i[1]) + '">' + esc(i[1]) + '</span><h2>' + esc(i[0]) + D.ij(id) + '</h2><span class="mono">' + esc(i[2]) + ' · ' + D.pts(S.pts[id] || 0) + ' PTS</span></div></div>' +
      '<div class="awin mono ' + w.mode + '">' + D.addWhy(w) + '</div>' +
      (fa ? '' : '<label class="mono">YOUR BID' + (S.faab ? ' · ' + esc(S.faab) + ' LEFT' : '') + '<input name="bid" type="number" min="0" step="1" value="1" inputmode="numeric" required></label>') +
      '<label class="mono">DROP<select name="drop"><option value="">Nobody (if you have room)</option>' + mine.map(function(r){ return '<option value="' + esc(r.id) + '">' + esc(r.pos + ' · ' + r.n + ' (' + D.pts(r.p) + ')') + '</option>'; }).join('') + '</select></label>' +
      '<div class="err" hidden></div><button class="btn" type="submit">' + (fa ? 'ADD NOW' : 'SUBMIT BID') + '</button><div class="fine mono">' + (fa ? 'THE ADD IS FINAL AS SOON AS MFL ACCEPTS IT.' : 'CHECK OR CHANGE YOUR BIDS UNDER MY TEAM \u2192 WAIVERS.') + '</div></form>');
    var f = v.querySelector('form'), err = v.querySelector('.err');
    f.addEventListener('submit', function(e){
      e.preventDefault(); var b = f.querySelector('button[type=submit]'); b.disabled = true; err.hidden = true;
      var go = fa ? D.act('fcfsWaiver', f.drop.value ? { ADD:id, DROP:f.drop.value } : { ADD:id }) : D.act('blindBidWaiverRequest', { PICKS:id + '_' + num(f.bid.value) + '_' + (f.drop.value || '0000') });
      go.then(function(r){
        if(r && r.ok){ v.remove(); toast(r.demo ? 'PREVIEW ONLY \u2014 NOT SENT' : fa ? i[0].toUpperCase() + ' ADDED' : 'BID IN FOR ' + i[0].toUpperCase()); }
        else { err.textContent = (r && r.error) || 'MFL didn\u2019t accept that.'; err.hidden = false; b.disabled = false; }
      });
    });
  }
  function toast(m){ var t = $('toast'); t.textContent = m; t.hidden = false; clearTimeout(t._h); t._h = setTimeout(function(){ t.hidden = true; }, 4000); }

  // ---------- top scorers: top 20 at each position across the league ----------
  var TP = [['QB', 'Quarterbacks'], ['RB', 'Running Backs'], ['WR', 'Wide Receivers'], ['TE', 'Tight Ends']];
  function hv(){ return location.hash === '#top' ? 'top' : location.hash === '#news' ? 'news' : 'list'; }
  S.view = hv();
  function view(){
    [].forEach.call(document.querySelectorAll('#ptabs [data-v]'), function(a){ a.classList.toggle('on', a.getAttribute('data-v') === S.view); });
    $('vlist').hidden = S.view !== 'list'; $('vtop').hidden = S.view !== 'top'; $('vnews').hidden = S.view !== 'news';
    if(S.view === 'top' && S.rows.length) top();
    if(S.view === 'news' && S.rows.length) news();
  }
  function top(){
    var all = [], own = {};
    var sec = TP.map(function(P){
      var R = S.rows.filter(function(r){ return r.pos === P[0] && r.p > 0; }).sort(function(a, b){ return b.p - a.p; }).slice(0, 20);
      if(!R.length) return '';
      all = all.concat(R);
      var max = R[0].p, L = R[0], cnt = {}, fa = 0;
      R.forEach(function(r){ if(r.own){ cnt[r.own] = (cnt[r.own] || 0) + 1; own[r.own] = (own[r.own] || 0) + 1; } else fa++; });
      var ppg = function(r){ return S.gp[r.id] ? (r.p / S.gp[r.id]).toFixed(1) : ''; };
      var tag = function(r){ return r.own ? '<a class="tsow" href="' + D.href('teams', 'f=' + r.own) + '" title="' + esc(D.NAME[r.own]) + '"><img src="' + helm(r.own) + '" alt=""></a>' : '<button type="button" class="tsfa mono" data-add="' + esc(r.id) + '" title="Free agent: add">FA +</button>'; };
      return '<section class="card tsec ' + P[0] + '"><div class="tshd"><span class="pos ' + P[0] + '">' + P[0] + '</span><h2>Top 20 ' + P[1] + '</h2><span class="mono">' + D.Y + ' SEASON POINTS</span></div>' +
        '<div class="tslead"><div class="tsface">' + D.face(L.id, L.pos, L.tm, 1) + '</div><div class="tsli"><span class="mono">NO. 1 ' + P[0] + '</span><button type="button" class="pnb" data-card="' + esc(L.id) + '"><b>' + esc(L.n) + D.ij(L.id) + '</b></button><i class="mono">' + D.tlogo(L.tm) + esc(L.tm) + (L.own ? ' \u00b7 ' + esc(D.SHORT[L.own]).toUpperCase() : ' \u00b7 FREE AGENT') + '</i></div><div class="tslv"><b>' + D.pts(L.p) + '</b><span class="mono">PTS' + (ppg(L) ? ' \u00b7 ' + ppg(L) + ' PPG' : '') + '</span></div>' + tag(L) + '</div>' +
        '<ol class="tsl">' + R.slice(1).map(function(r, i){
          return '<li><span class="tsr mono">' + (i + 2) + '</span>' + D.face(r.id, r.pos, r.tm) + '<button type="button" class="tsn" data-card="' + esc(r.id) + '"><b>' + esc(r.n) + D.ij(r.id) + '</b><i class="mono">' + esc(r.tm) + (ppg(r) ? ' \u00b7 ' + ppg(r) + ' PPG' : '') + '</i></button><div class="tsb"><i style="width:' + Math.max(4, r.p / max * 100).toFixed(1) + '%"></i></div><span class="tsp mono">' + D.pts(r.p) + '</span>' + tag(r) + '</li>';
        }).join('') + '</ol>' +
        '<div class="tsft mono"><span>WHO HAS THEM</span><div>' + Object.keys(cnt).sort(function(a, b){ return cnt[b] - cnt[a]; }).map(function(id){ return '<span title="' + esc(D.NAME[id]) + '"><img src="' + helm(id) + '" alt="">' + cnt[id] + '</span>'; }).join('') + (fa ? '<span class="fa">FA ' + fa + '</span>' : '') + '</div></div></section>';
    }).join('');
    if(!all.length){ $('vtop').innerHTML = '<div class="card"><div class="ld mono">NO POINTS SCORED YET THIS SEASON.</div></div>'; return; }
    var T = D.IDS.map(function(id){ return { id:id, n:own[id] || 0, pts:all.filter(function(r){ return r.own === id; }).reduce(function(a, r){ return a + r.p; }, 0) }; }).sort(function(a, b){ return b.n - a.n || b.pts - a.pts; });
    var mx = Math.max.apply(null, T.map(function(t){ return t.n; })) || 1, nFA = all.filter(function(r){ return !r.own; }).length;
    $('vtop').innerHTML = '<section class="card tsum"><div class="bar mono"><span>WHO OWNS THE TOP TALENT</span><span>TOP 20 QB \u00b7 RB \u00b7 WR \u00b7 TE = ' + all.length + ' PLAYERS' + (nFA ? ' \u00b7 ' + nFA + ' ON WAIVERS' : '') + '</span></div><div class="tsg">' +
      T.map(function(t){ return '<a class="tst" href="' + D.href('teams', 'f=' + t.id) + '"><img src="' + helm(t.id) + '" alt=""><b>' + esc(D.SHORT[t.id]) + '</b><div class="tsb"><i style="width:' + (t.n / mx * 100).toFixed(1) + '%"></i></div><span class="mono">' + t.n + '</span></a>'; }).join('') + '</div></section>' +
      '<div class="tsgrid">' + sec + '</div>';
  }
  // ---------- news + injuries: Dubcey-rostered players plus the top 60 free agents ----------
  var NW = null, NF = 'all';
  function scope(){ var fa = S.rows.filter(function(r){ return !r.own && D.OURPOS[r.pos]; }).sort(function(a, b){ return b.p - a.p; }).slice(0, 60), M = {}; S.rows.forEach(function(r){ if(r.own) M[r.id] = r; }); fa.forEach(function(r){ M[r.id] = r; }); return M; }
  function news(){
    if(!NW){ $('vnews').innerHTML = '<div class="ld mono">LOADING NEWS\u2026</div>'; NW = Promise.all([D.LOCAL ? Promise.resolve([]) : fetch('/data/news').then(function(x){ return x.ok ? x.json() : []; }).catch(function(){ return []; }), D.api('injuries', 'r=2').catch(function(){ return null; })]); }
    NW.then(function(r){
      var M = scope(), N = (Array.isArray(r[0]) ? r[0] : []).filter(function(n){ return M[n.id]; });
      var I = arr(r[1] && r[1].injuries && r[1].injuries.injury).filter(function(i){ return M[i.id] && !/^probable$/i.test(i.status || ''); });
      if(NF === 'mine') { N = N.filter(function(n){ return M[n.id].own === S.me; }); I = I.filter(function(i){ return M[i.id].own === S.me; }); }
      if(NF === 'fa') { N = N.filter(function(n){ return !M[n.id].own; }); I = I.filter(function(i){ return !M[i.id].own; }); }
      var who = function(r){ return r.own ? '<a class="nwo" href="' + D.href('teams', 'f=' + r.own) + '" title="' + esc(D.NAME[r.own]) + '"><img src="' + helm(r.own) + '" alt=""></a>' : '<button type="button" class="tsfa mono" data-add="' + esc(r.id) + '">FA +</button>'; };
      var seg = '<div class="seg mono nwf"><button type="button" data-nf="all" class="' + (NF === 'all' ? 'on' : '') + '">ALL</button>' + (S.me ? '<button type="button" data-nf="mine" class="' + (NF === 'mine' ? 'on' : '') + '">MY TEAM</button>' : '') + '<button type="button" data-nf="fa" class="' + (NF === 'fa' ? 'on' : '') + '">FREE AGENTS</button></div>';
      var ord = { 'injured reserve':0, out:1, doubtful:2, questionable:3, suspended:1 };
      I.sort(function(a, b){ return (ord[String(a.status).toLowerCase()] != null ? ord[String(a.status).toLowerCase()] : 4) - (ord[String(b.status).toLowerCase()] != null ? ord[String(b.status).toLowerCase()] : 4); });
      $('vnews').innerHTML = '<div class="nwtop">' + seg + '<span class="mono">DUBCEY-ROSTERED PLAYERS + TOP 60 FREE AGENTS</span></div><div class="nwg">' +
        '<article class="card"><div class="bar mono"><span>PLAYER NEWS \u00b7 LAST 3 DAYS</span><span>' + N.length + ' ITEMS</span></div>' + (N.map(function(n){ var p = M[n.id];
          return '<div class="nwi">' + D.face(p.id, p.pos, p.tm) + '<div><div class="nwh"><span class="pos ' + esc(p.pos) + '">' + esc(p.pos) + '</span><button type="button" class="pnb" data-card="' + esc(p.id) + '"><b>' + esc(p.n) + D.ij(p.id) + '</b></button><i class="mono">' + esc(p.tm) + ' \u00b7 ' + esc(String(n.ago || '').toUpperCase()) + '</i></div><h4>' + esc(n.head) + '</h4>' + (n.body ? '<p>' + esc(n.body) + '</p>' : '') + (n.src ? '<span class="nws mono">' + esc(n.src) + '</span>' : '') + '</div>' + who(p) + '</div>'; }).join('') || '<div class="ld mono">NO RECENT NEWS FOR THESE PLAYERS.</div>') + '</article>' +
        '<article class="card"><div class="bar mono"><span>INJURY REPORT</span><span>' + I.length + ' PLAYERS</span></div>' + (I.map(function(i){ var p = M[i.id], k = D.injCode(i.status);
          return '<div class="nji"><span class="ij mono">' + esc(k || i.status) + '</span>' + D.face(p.id, p.pos, p.tm) + '<div><button type="button" class="pnb" data-card="' + esc(p.id) + '"><b>' + esc(p.n) + '</b></button><i class="mono">' + esc(p.pos) + ' \u00b7 ' + esc(p.tm) + (i.details ? ' \u00b7 ' + esc(String(i.details).toUpperCase()) : '') + '</i></div>' + who(p) + '</div>'; }).join('') || '<div class="ld mono">NO INJURIES LISTED.</div>') + '</article></div>';
    });
  }
  document.addEventListener('click', function(e){ var b = e.target.closest('[data-nf]'); if(b){ NF = b.getAttribute('data-nf'); news(); } });
  window.addEventListener('hashchange', function(){ S.view = hv(); view(); });
  view();

  $('q').addEventListener('input', function(){ S.q = this.value.trim(); list(); });
  $('vw').addEventListener('change', function(){ S.vw = this.value; S.sort = 'p'; if(S.vw === 'pass' && S.pos === 'ALL') S.pos = 'QB'; list(); });
  $('wf').addEventListener('change', function(){ S.wf = +this.value; if(S.wt && S.wt < S.wf) S.wt = S.wf; list(); });
  $('wt').addEventListener('change', function(){ S.wt = +this.value; if(S.wf > S.wt) S.wf = S.wt; list(); });
  $('tmf').addEventListener('change', function(){ S.tmf = this.value; list(); });
  $('ownf').addEventListener('change', function(){ S.fa = this.value; list(); });
  $('lim').addEventListener('change', function(){ S.lim = +this.value; list(); });
  document.addEventListener('click', function(e){
    var wt = e.target.closest('[data-watch]'); if(wt){ var wid = wt.getAttribute('data-watch'), on = S.watch[wid]; if(on) delete S.watch[wid]; else S.watch[wid] = 1; list();
      D.act('myWatchList', on ? { REMOVE:wid } : { ADD:wid }).then(function(r){ if(!(r && r.ok)){ if(on) S.watch[wid] = 1; else delete S.watch[wid]; list(); toast((r && r.error) || 'MFL DIDN\u2019T SAVE THAT', true); } }); return; }
    var so = e.target.closest('[data-sort]'); if(so){ S.sort = so.getAttribute('data-sort'); list(); return; }
    var p = e.target.closest('[data-pos]'); if(p){ S.pos = p.getAttribute('data-pos'); list(); return; }
    var fa = e.target.closest('[data-fa]'); if(fa){ S.fa = fa.getAttribute('data-fa'); list(); return; }
    var a = e.target.closest('[data-add]'); if(a){ var id = a.getAttribute('data-add'); setTimeout(function(){ add(id); }, 0); return; }

  });
})();
