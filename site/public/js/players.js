(function(){
  var D = DC, $ = D.$, esc = D.esc, arr = D.arr, num = D.num, helm = D.helm;
  var IW = { questionable:'Q', doubtful:'D', out:'O', 'injured reserve':'IR', suspended:'SUS' };
  var S = { me:'', q:'', pos:'ALL', fa:true, rows:[], own:{}, pts:{}, inj:{}, faab:'' };
  D.shell('players').then(function(me){ S.me = me.franchise || ''; if(S.rows.length) list(); });

  Promise.all([D.api('freeAgents').catch(function(){ return null; }), D.api('rosters'), D.api('injuries', 'r=2').catch(function(){ return null; }), D.api('leagueStandings').catch(function(){ return null; })]).then(function(r){
    var fa = arr(r[0] && r[0].freeAgents && r[0].freeAgents.leagueUnit && r[0].freeAgents.leagueUnit.player).map(function(p){ return p.id; });
    arr(r[1] && r[1].rosters && r[1].rosters.franchise).forEach(function(f){ arr(f.player).forEach(function(p){ S.own[p.id] = f.id; }); });
    arr(r[2] && r[2].injuries && r[2].injuries.injury).forEach(function(i){ S.inj[i.id] = IW[String(i.status || '').toLowerCase()] || ''; });
    arr(r[3] && r[3].leagueStandings && r[3].leagueStandings.franchise).forEach(function(f){ if(f.id === S.me) S.faab = f.bbidbalance || ''; S['b' + f.id] = f.bbidbalance; });
    S.fas = fa;
    var ids = fa.concat(Object.keys(S.own));
    return D.players(ids).then(function(){
      return D.scores('YTD', ids);
    }).then(function(ps){
      S.pts = ps || {};
      S.rows = ids.map(function(id){ var i = D.pinfo(id); return { id:id, n:i[0], pos:i[1], tm:i[2], own:S.own[id] || '', p:S.pts[id] || 0 }; }).filter(function(r){ return D.OURPOS[r.pos] || r.own; });
      list(); trend(); season();
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
    ALL:[['p', 'PTS'], ['ppg', 'PPG'], ['own', '% OWN'], ['add', '% ADD']],
    QB:[['p', 'PTS'], ['ppg', 'PPG'], ['cmp', 'CMP'], ['att', 'ATT'], ['py', 'PASS YDS'], ['pt', 'PASS TD'], ['int', 'INT'], ['ry', 'RUSH YDS'], ['rt', 'RUSH TD'], ['own', '% OWN'], ['add', '% ADD']],
    RB:[['p', 'PTS'], ['ppg', 'PPG'], ['car', 'CAR'], ['ry', 'RUSH YDS'], ['rt', 'RUSH TD'], ['tgt', 'TGT'], ['rec', 'REC'], ['cy', 'REC YDS'], ['ct', 'REC TD'], ['own', '% OWN'], ['add', '% ADD']],
    WR:[['p', 'PTS'], ['ppg', 'PPG'], ['tgt', 'TGT'], ['rec', 'REC'], ['cy', 'REC YDS'], ['ct', 'REC TD'], ['ry', 'RUSH YDS'], ['own', '% OWN'], ['add', '% ADD']]
  };
  COLS.TE = COLS.WR;
  S.sort = 'p'; S.st = {}; S.gp = {}; S.pown = {}; S.padd = {};
  var EX = { GBP:'GB', KCC:'KC', NEP:'NE', NOS:'NO', SFO:'SF', TBB:'TB', LVR:'LV', JAC:'JAX', WAS:'WSH' };
  function nk(n){ return String(n || '').toLowerCase().replace(/[.'\u2019]/g, '').replace(/\s+(jr|sr|ii|iii|iv|v)$/, '').replace(/[^a-z ]/g, '').replace(/\s+/g, ' ').trim(); }
  function keyOf(id){ var i = D.pinfo(id), n = String(i[0] || ''), m = /^(.*?),\s*(.*)$/.exec(n); if(m) n = m[2] + ' ' + m[1]; var t = String(i[2] || '').toUpperCase(); return nk(n) + '|' + (EX[t] || t); }
  function season(){
    Promise.all([D.api('topOwns').catch(function(){ return null; }), D.api('topAdds').catch(function(){ return null; })]).then(function(r){
      arr(r[0] && r[0].topOwns && r[0].topOwns.player).forEach(function(x){ S.pown[x.id] = num(x.percent); });
      arr(r[1] && r[1].topAdds && r[1].topAdds.player).forEach(function(x){ S.padd[x.id] = num(x.percent); });
      list();
    });
    if(D.LOCAL) return;
    D.api('liveScoring').then(function(j){
      var cur = num(j && j.liveScoring && j.liveScoring.week), ws = []; for(var w = 1; w <= cur; w++) ws.push(w);
      return Promise.all(ws.map(function(w){ return fetch('/data/espn?raw=1&W=' + w).then(function(x){ return x.json(); }).catch(function(){ return {}; }); }));
    }).then(function(W){
      var T = {}, G = {};
      (W || []).forEach(function(o){ Object.keys(o || {}).forEach(function(k){ var v = o[k]; if(!v || typeof v !== 'object') return; var t = T[k] = T[k] || {}; Object.keys(v).forEach(function(f){ t[f] = (t[f] || 0) + num(v[f]); }); G[k] = (G[k] || 0) + 1; }); });
      S.rows.forEach(function(r){ var k = keyOf(r.id); if(T[k]){ S.st[r.id] = T[k]; S.gp[r.id] = G[k]; } });
      list();
    }).catch(function(){});
  }
  function val(r, k){
    if(k === 'p') return r.p;
    if(k === 'ppg') return S.gp[r.id] ? r.p / S.gp[r.id] : null;
    if(k === 'own') return S.pown[r.id] != null ? S.pown[r.id] : null;
    if(k === 'add') return S.padd[r.id] != null ? S.padd[r.id] : null;
    var t = S.st[r.id]; return t ? t[k] || 0 : null;
  }
  function fmt(v, k){ if(v == null) return '\u2013'; if(k === 'own' || k === 'add') return (Math.round(v * 10) / 10) + '%'; if(k === 'ppg') return v.toFixed(1); if(k === 'p') return D.pts(v); return String(Math.round(v)); }
  function list(){
    var q = S.q.toLowerCase(), C = COLS[S.pos] || COLS.ALL;
    if(!C.some(function(c){ return c[0] === S.sort; })) S.sort = 'p';
    var R = S.rows.filter(function(r){ return (!S.fa || !r.own) && (S.pos === 'ALL' || r.pos === S.pos) && (!q || r.n.toLowerCase().indexOf(q) > -1 || r.tm.toLowerCase() === q); })
      .sort(function(a, b){ var x = val(a, S.sort), y = val(b, S.sort); return (y == null ? -1 : y) - (x == null ? -1 : x) || b.p - a.p; }).slice(0, 120);
    [].forEach.call(document.querySelectorAll('[data-pos]'), function(b){ b.classList.toggle('on', b.getAttribute('data-pos') === S.pos); });
    [].forEach.call(document.querySelectorAll('[data-fa]'), function(b){ b.classList.toggle('on', (b.getAttribute('data-fa') === '1') === S.fa); });
    $('cnt').textContent = R.length + (R.length === 120 ? '+' : '') + ' PLAYERS';
    $('plist').innerHTML = '<div class="ptw"><table class="ptab"><thead><tr><th class="l mono">PLAYER</th><th class="mono act"></th>' + C.map(function(c){ return '<th class="mono' + (c[0] === S.sort ? ' on' : '') + '"><button type="button" data-sort="' + c[0] + '">' + c[1] + (c[0] === S.sort ? ' \u25be' : '') + '</button></th>'; }).join('') + '</tr></thead><tbody>' +
      (R.map(function(r){
        return '<tr><td class="l"><div class="ptn"><span class="pos ' + esc(r.pos) + '">' + esc(r.pos || '\u2013') + '</span>' + D.face(r.id, r.pos, r.tm) + '<button type="button" class="pnb" data-card="' + esc(r.id) + '"><b>' + esc(r.n) + D.ij(r.id) + '</b><i class="mono">' + D.tlogo(r.tm) + esc(r.tm) + '</i></button></div></td>' +
          '<td class="act">' + (r.own ? '<a class="ow2" href="' + D.href('teams', 'f=' + r.own) + '" title="' + esc(D.NAME[r.own]) + '"><img src="' + helm(r.own) + '" alt=""></a>' : '<button class="btn sm" type="button" data-add="' + esc(r.id) + '">ADD</button>') + '</td>' +
          C.map(function(c){ return '<td class="mono' + (c[0] === S.sort ? ' on' : '') + (c[0] === 'p' ? ' pp' : '') + '">' + fmt(val(r, c[0]), c[0]) + '</td>'; }).join('') + '</tr>';
      }).join('') || '<tr><td colspan="' + (C.length + 2) + '"><div class="ld mono">NO PLAYERS MATCH</div></td></tr>') + '</tbody></table></div>' +
      '<div class="fnote mono"><span>TAP A PLAYER FOR GAME LOGS \u00b7 TAP A COLUMN TO SORT</span><span>% OWN / % ADD ACROSS ALL MFL LEAGUES</span></div>';
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
      var go = fa ? D.act('fcfsWaiver', f.drop.value ? { ADD:id, DROP:f.drop.value } : { ADD:id }) : D.act('blindBidWaiverRequest', { PICKS:id + ',' + num(f.bid.value) + ',' + (f.drop.value || '') });
      go.then(function(r){
        if(r && r.ok){ v.remove(); toast(r.demo ? 'PREVIEW ONLY \u2014 NOT SENT' : fa ? i[0].toUpperCase() + ' ADDED' : 'BID IN FOR ' + i[0].toUpperCase()); }
        else { err.textContent = (r && r.error) || 'MFL didn\u2019t accept that.'; err.hidden = false; b.disabled = false; }
      });
    });
  }
  function toast(m){ var t = $('toast'); t.textContent = m; t.hidden = false; clearTimeout(t._h); t._h = setTimeout(function(){ t.hidden = true; }, 4000); }

  $('q').addEventListener('input', function(){ S.q = this.value.trim(); list(); });
  document.addEventListener('click', function(e){
    var so = e.target.closest('[data-sort]'); if(so){ S.sort = so.getAttribute('data-sort'); list(); return; }
    var p = e.target.closest('[data-pos]'); if(p){ S.pos = p.getAttribute('data-pos'); list(); return; }
    var fa = e.target.closest('[data-fa]'); if(fa){ S.fa = fa.getAttribute('data-fa') === '1'; list(); return; }
    var a = e.target.closest('[data-add]'); if(a){ var id = a.getAttribute('data-add'); setTimeout(function(){ add(id); }, 0); return; }

  });
})();
