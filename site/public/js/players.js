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
      list(); trend();
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
  function list(){
    var q = S.q.toLowerCase();
    var R = S.rows.filter(function(r){ return (!S.fa || !r.own) && (S.pos === 'ALL' || r.pos === S.pos) && (!q || r.n.toLowerCase().indexOf(q) > -1 || r.tm.toLowerCase() === q); })
      .sort(function(a, b){ return b.p - a.p; }).slice(0, 120);
    [].forEach.call(document.querySelectorAll('[data-pos]'), function(b){ b.classList.toggle('on', b.getAttribute('data-pos') === S.pos); });
    [].forEach.call(document.querySelectorAll('[data-fa]'), function(b){ b.classList.toggle('on', (b.getAttribute('data-fa') === '1') === S.fa); });
    $('cnt').textContent = R.length + (R.length === 120 ? '+' : '') + ' PLAYERS';
    $('plist').innerHTML = '<div class="plr hd mono"><span>POS</span><span>PLAYER</span><span>OWNER</span><span>SEASON PTS</span><span></span></div>' + (R.map(function(r){
      return '<div class="plr"><span class="pos ' + esc(r.pos) + '">' + esc(r.pos || '\u2013') + '</span>' + D.face(r.id, r.pos, r.tm) + '<button type="button" class="pnb" data-card="' + esc(r.id) + '"><b>' + esc(r.n) + D.ij(r.id) + '</b><i class="mono">' + D.tlogo(r.tm) + esc(r.tm) + '</i></button>' +
        (r.own ? '<a class="ow2" href="' + D.href('teams', 'f=' + r.own) + '" title="' + esc(D.NAME[r.own]) + '"><img src="' + helm(r.own) + '" alt=""><span class="mono">' + esc(D.SHORT[r.own]) + '</span></a>' : '<span class="fa mono">FREE AGENT</span>') +
        '<span class="pp">' + D.pts(r.p) + '</span>' +
        (r.own ? '<span></span>' : '<button class="btn sm" type="button" data-add="' + esc(r.id) + '">ADD</button>') + '</div>';
    }).join('') || '<div class="ld mono">NO PLAYERS MATCH</div>');
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
    var i = D.pinfo(id), mine = S.rows.filter(function(r){ return r.own === S.me; }).sort(function(a, b){ return a.p - b.p; });
    var v = sheet('<div class="bar mono"><span>WAIVER CLAIM</span><button type="button" data-x aria-label="Close">\u00d7</button></div>' +
      '<form class="cl"><div class="pch">' + D.face(id, i[1], i[2], 1) + '<div><span class="pos ' + esc(i[1]) + '">' + esc(i[1]) + '</span><h2>' + esc(i[0]) + D.ij(id) + '</h2><span class="mono">' + esc(i[2]) + ' · ' + D.pts(S.pts[id] || 0) + ' PTS</span></div></div>' +
      '<label class="mono">YOUR BID' + (S.faab ? ' · ' + esc(S.faab) + ' LEFT' : '') + '<input name="bid" type="number" min="0" step="1" value="1" inputmode="numeric"></label>' +
      '<label class="mono">DROP<select name="drop"><option value="">Nobody (if you have room)</option>' + mine.map(function(r){ return '<option value="' + esc(r.id) + '">' + esc(r.pos + ' · ' + r.n + ' (' + D.pts(r.p) + ')') + '</option>'; }).join('') + '</select></label>' +
      '<div class="err" hidden></div><button class="btn" type="submit">SUBMIT CLAIM</button><div class="fine mono">CLAIMS RUN AT THE NEXT WAIVER PROCESS. CHECK THEM UNDER MY TEAM \u2192 WAIVERS.</div></form>');
    var f = v.querySelector('form'), err = v.querySelector('.err');
    f.addEventListener('submit', function(e){
      e.preventDefault(); var b = f.querySelector('button[type=submit]'); b.disabled = true; err.hidden = true;
      D.act('blindBidWaiverRequest', { PICKS:id + ',' + num(f.bid.value) + ',' + (f.drop.value || '') }).then(function(r){
        if(r && r.ok){ v.remove(); toast(r.demo ? 'PREVIEW ONLY \u2014 CLAIM NOT SENT' : 'CLAIM IN FOR ' + i[0].toUpperCase()); }
        else { err.textContent = (r && r.error) || 'MFL didn\u2019t accept that claim.'; err.hidden = false; b.disabled = false; }
      });
    });
  }
  function toast(m){ var t = $('toast'); t.textContent = m; t.hidden = false; clearTimeout(t._h); t._h = setTimeout(function(){ t.hidden = true; }, 4000); }

  $('q').addEventListener('input', function(){ S.q = this.value.trim(); list(); });
  document.addEventListener('click', function(e){
    var p = e.target.closest('[data-pos]'); if(p){ S.pos = p.getAttribute('data-pos'); list(); return; }
    var fa = e.target.closest('[data-fa]'); if(fa){ S.fa = fa.getAttribute('data-fa') === '1'; list(); return; }
    var a = e.target.closest('[data-add]'); if(a){ var id = a.getAttribute('data-add'); setTimeout(function(){ add(id); }, 0); return; }

  });
})();
