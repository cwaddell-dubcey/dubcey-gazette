/* Player card popup: tap any player photo or name (anything with data-card="MFL id") */
(function(){
  var D = DC, esc = D.esc, arr = D.arr, num = D.num;
  var S = { id:'', tab:'news', d:null, x:null };
  var IW = { questionable:'Q', doubtful:'D', out:'OUT', 'injured reserve':'IR', ir:'IR', suspended:'SUS', probable:'P' };

  function el(){ var v = document.getElementById('pcard'); if(v) return v; v = document.createElement('div'); v.id = 'pcard'; v.className = 'veil pcv'; v.innerHTML = '<div class="pcs2" role="dialog" aria-modal="true" aria-label="Player card"></div>'; document.body.appendChild(v);
    v.addEventListener('click', function(e){ if(e.target === v || e.target.closest('[data-pcx]')) close(); var t = e.target.closest('[data-pct]'); if(t){ S.tab = t.getAttribute('data-pct'); body(); } var a = e.target.closest('[data-pca]'); if(a) act(a.getAttribute('data-pca')); });
    document.addEventListener('keydown', function(e){ if(e.key === 'Escape' && document.getElementById('pcard')) close(); });
    return v; }
  function close(){ var v = document.getElementById('pcard'); if(v) v.remove(); document.documentElement.classList.remove('nos'); S.id = ''; }
  function no(){ return null; }

  D.openCard = function(id){
    S.id = id; S.tab = 'news'; S.d = { id:id, load:1 }; S.x = null;
    el(); document.documentElement.classList.add('nos'); draw();
    var me;
    Promise.all([D.me(), D.api('rosters').catch(no), D.api('liveScoring').catch(no), D.api('injuries').catch(no), D.players([id])]).then(function(r){
      if(S.id !== id) return;
      me = r[0] || {}; var d = S.d, i = D.pinfo(id);
      d.name = i[0]; d.pos = i[1]; d.team = i[2]; d.me = me.franchise || ''; d.load = 0;
      arr(r[1] && r[1].rosters && r[1].rosters.franchise).forEach(function(f){ arr(f.player).forEach(function(p){ if(p.id === id){ d.own = f.id; d.sal = p.salary; d.rst = p.status; } }); });
      var L = r[2] && r[2].liveScoring; d.week = num(L && L.week);
      arr(L && L.matchup).forEach(function(m){ arr(m.franchise).forEach(function(f){ arr((f.players && f.players.player) || f.player).forEach(function(p){ if(p.id === id){ d.wk = num(p.score); d.sec = num(p.gameSecondsRemaining); } }); }); });
      arr(r[3] && r[3].injuries && r[3].injuries.injury).forEach(function(x){ if(x.id === id) d.inj = IW[String(x.status || '').toLowerCase()] || x.status; });
      draw();
      return Promise.all([D.api('playerScores', 'W=YTD&PLAYERS=' + id).catch(no), D.api('playerScores', 'W=AVG&PLAYERS=' + id).catch(no), d.week ? D.api('projectedScores', 'W=' + d.week + '&PLAYERS=' + id).catch(no) : null, d.week ? D.stats(d.week, [id], d.sec > 0 && d.sec < 3600) : null]).then(function(s){
        if(S.id !== id) return;
        function sc(j, k){ var x = arr(j && j[k] && j[k].playerScore)[0]; return x && x.score !== '' ? num(x.score) : null; }
        d.ytd = sc(s[0], 'playerScores'); d.avg = sc(s[1], 'playerScores'); d.proj = sc(s[2], 'projectedScores'); d.sx = d.week ? D.statOf(d.week, id) : '';
        draw();
      });
    });
    var info = D.pinfo(id);
    (D.LOCAL ? Promise.resolve(null) : D.players([id]).then(function(){ var i = D.pinfo(id); return fetch('/data/player?name=' + encodeURIComponent(i[0]) + '&team=' + encodeURIComponent(i[2])).then(function(r){ return r.json(); }); })).then(function(x){ if(S.id !== id) return; S.x = x || { espn:'' }; draw(); }).catch(function(){ if(S.id === id){ S.x = { espn:'' }; draw(); } });
  };

  function draw(){ top(); body(); }
  function top(){
    var d = S.d, x = S.x || {}, b = x.bio || {}, v = el().querySelector('.pcs2');
    var photo = b.photo || (d.pos ? D.photo(d.id, d.team, d.pos) : '');
    var rs = /INJURED/.test(d.rst || '') ? 'IR' : /TAXI/.test(d.rst || '') ? 'TAXI' : '';
    var own = d.own ? '<a class="pco" href="' + D.href('teams', 'f=' + d.own) + '"><img src="' + D.helm(d.own) + '" alt=""><span>' + esc(D.NAME[d.own]) + (rs ? ' \u00b7 ' + rs : '') + (d.sal ? ' \u00b7 $' + esc(d.sal) : '') + '</span></a>' : d.load ? '' : '<span class="pco fa mono">FREE AGENT</span>';
    function box(v, l, hi){ return '<div' + (hi ? ' class="hi"' : '') + '><b>' + (v == null ? '\u2013' : D.pts(Math.round(v * 100) / 100)) + '</b><span class="mono">' + l + '</span></div>'; }
    var live = d.sec > 0 && d.sec < 3600;
    var html = '<button type="button" class="wvx" data-pcx aria-label="Close">\u00d7</button>' +
      '<div class="pct2"><div class="pph">' + (photo ? '<img src="' + esc(photo) + '" alt="" onerror="this.onerror=null;this.src=\'' + D.nflLogo(d.team) + '\';this.className=\'lg\'">' : '') + '</div>' +
      '<div class="pin"><div class="kick mono">' + [d.pos ? '<span class="pos ' + esc(d.pos) + '">' + esc(d.pos) + '</span>' : '', d.team ? D.tlogo(d.team) + esc(d.team) : '', b.jersey ? '#' + esc(b.jersey) : ''].filter(Boolean).join(' ') + (d.inj || b.inj ? ' <span class="ij mono">' + esc(d.inj || b.inj) + '</span>' : '') + '</div>' +
      '<h2>' + esc(d.name || 'Loading\u2026') + '</h2>' + own + '</div></div>' +
      '<div class="pstat">' + box(d.wk, d.week ? 'WEEK ' + d.week : 'WEEK', live) + box(d.proj, 'PROJ') + box(d.ytd, 'SEASON') + box(d.avg, 'AVG') + '</div>' +
      (d.sx ? '<div class="pline mono">' + (live ? '<em>LIVE</em> \u00b7 ' : '') + esc(d.sx) + '</div>' : '') +
      '<div class="pact">' + acts() + '</div>' +
      '<div class="ptabs mono">' + [['news', 'NEWS'], ['bio', 'BIO'], ['log', D.Y + ' GAME LOG'], ['career', 'CAREER']].map(function(t){ return '<button type="button" data-pct="' + t[0] + '" class="' + (S.tab === t[0] ? 'on' : '') + '">' + t[1] + '</button>'; }).join('') + '</div><div class="pbody" id="pbody"></div>';
    v.innerHTML = html;
  }
  function acts(){
    var d = S.d; if(d.load) return '';
    var A = [];
    if(!d.own) A.push(['add', 'ADD PLAYER', 1]);
    else if(d.me && d.own === d.me) A.push(['drop', 'DROP PLAYER', 0]);
    else if(d.me) A.push(['trade', 'PROPOSE TRADE', 1]);
    if(d.own) A.push(['team', 'VIEW ROSTER', 0]);
    return A.map(function(a){ return '<button type="button" class="btn' + (a[2] ? '' : ' ghost2') + ' sm" data-pca="' + a[0] + '">' + a[1] + '</button>'; }).join('');
  }
  function table(labels, rows, lead){
    if(!rows || !rows.length) return '';
    return '<div class="sx"><table class="ht"><thead><tr>' + lead.map(function(l){ return '<th class="l">' + esc(l) + '</th>'; }).join('') + labels.map(function(l){ return '<th>' + esc(l) + '</th>'; }).join('') + '</tr></thead><tbody>' + rows.join('') + '</tbody></table></div>';
  }
  function body(){
    var b = document.getElementById('pbody'); if(!b) return;
    [].forEach.call(document.querySelectorAll('[data-pct]'), function(t){ t.classList.toggle('on', t.getAttribute('data-pct') === S.tab); });
    var x = S.x, wait = '<div class="ld mono">LOADING\u2026</div>', none = function(m){ return '<div class="ld mono">' + m + '</div>'; };
    if(!x){ b.innerHTML = wait; return; }
    if(!x.espn){ b.innerHTML = none(D.LOCAL ? 'NEWS, BIO AND GAME LOG LOAD ON THE LIVE SITE' : 'NO EXTRA INFO FOUND FOR THIS PLAYER'); return; }
    if(S.tab === 'news'){
      b.innerHTML = (x.news || []).map(function(n){ var dt = n.when ? new Date(n.when) : null;
        return '<div class="pnw"><span class="mono">' + (dt ? esc(dt.toLocaleDateString(undefined, { month:'short', day:'numeric' }).toUpperCase()) : '') + '</span><h4>' + esc(n.hl) + '</h4>' + (n.body ? '<p>' + esc(n.body) + '</p>' : '') + (n.href ? '<a class="mono" href="' + esc(n.href) + '" target="_blank" rel="noopener">READ MORE \u2192</a>' : '') + '</div>'; }).join('') || none('NO RECENT NEWS');
    } else if(S.tab === 'bio'){
      var B = x.bio || {}, rows = [['HEIGHT', B.height], ['WEIGHT', B.weight], ['AGE', B.age], ['BORN', B.born], ['COLLEGE', B.college], ['EXPERIENCE', B.exp], ['DRAFTED', B.draft], ['STATUS', B.status]].filter(function(r){ return r[1]; });
      b.innerHTML = rows.length ? '<div class="pbio">' + rows.map(function(r){ return '<div><span class="mono">' + r[0] + '</span><b>' + esc(r[1]) + '</b></div>'; }).join('') + '</div>' : none('NO BIO ON FILE');
    } else if(S.tab === 'log'){
      var L = x.log; b.innerHTML = L && L.rows.length ? table(L.labels, L.rows.map(function(r){ return '<tr><td class="l y">' + esc(r.wk) + '</td><td class="l">' + esc(r.opp) + '</td><td class="l">' + esc(r.res) + '</td>' + r.s.map(function(v){ return '<td>' + esc(v) + '</td>'; }).join('') + '</tr>'; }), ['WK', 'OPP', 'RESULT']) : none('NO ' + D.Y + ' GAMES YET');
    } else {
      var C = x.career || []; b.innerHTML = C.length ? C.map(function(c){ return '<div class="sub mono pcsub">' + esc(c.name).toUpperCase() + '</div>' + table(c.labels, c.rows.slice().reverse().map(function(r){ return '<tr><td class="l y">' + esc(r.yr) + '</td><td class="l">' + esc(r.tm) + '</td>' + r.s.map(function(v){ return '<td>' + esc(v) + '</td>'; }).join('') + '</tr>'; }), ['YEAR', 'TEAM']); }).join('') : none('NO CAREER STATS');
    }
  }
  function toast(m, bad){ var t = document.getElementById('pctoast'); if(!t){ t = document.createElement('div'); t.id = 'pctoast'; document.body.appendChild(t); } t.className = 'toast mono' + (bad ? ' bad' : ''); t.textContent = m; t.hidden = false; clearTimeout(t._h); t._h = setTimeout(function(){ t.hidden = true; }, 4000); }
  function act(k){
    var d = S.d;
    if(k === 'team'){ location.href = D.href('teams', 'f=' + d.own); return; }
    if(k === 'trade'){ location.href = D.href('myteam', 'to=' + d.own + '&get=' + d.id) + '#trades'; return; }
    if(!d.me){ close(); D.signIn(); return; }
    if(k === 'drop'){
      if(!confirm('Drop ' + d.name + '? He goes straight to free agency.')) return;
      D.act('fcfsWaiver', { DROP:d.id }).then(function(r){ toast(r && r.ok ? (r.demo ? 'PREVIEW ONLY \u2014 NOT SENT' : d.name.toUpperCase() + ' DROPPED') : ((r && r.error) || 'MFL REJECTED THAT'), !(r && r.ok)); if(r && r.ok && !r.demo) close(); });
      return;
    }
    if(k === 'add'){
      var p = el().querySelector('.pact');
      Promise.all([D.api('rosters'), D.api('leagueStandings').catch(no)]).then(function(r){
        var mine = []; arr(r[0] && r[0].rosters && r[0].rosters.franchise).forEach(function(f){ if(f.id === d.me) mine = arr(f.player).map(function(x){ return x.id; }); });
        var bal = ''; arr(r[1] && r[1].leagueStandings && r[1].leagueStandings.franchise).forEach(function(f){ if(f.id === d.me) bal = f.bbidbalance || ''; });
        return D.players(mine).then(function(){
          p.innerHTML = '<form class="pclaim"><label class="mono">BID' + (bal ? ' \u00b7 ' + esc(String(bal).replace('.00', '')) + ' LEFT' : '') + '<input name="bid" type="number" min="0" step="1" value="1" inputmode="numeric"></label><label class="mono">DROP<select name="drop"><option value="">Nobody</option>' +
            mine.map(function(id){ var i = D.pinfo(id); return '<option value="' + esc(id) + '">' + esc(i[1] + ' \u00b7 ' + i[0]) + '</option>'; }).join('') + '</select></label><button class="btn sm" type="submit">SUBMIT CLAIM</button></form>';
          p.querySelector('form').addEventListener('submit', function(e){ e.preventDefault(); var f = this, bt = f.querySelector('button'); bt.disabled = true;
            D.act('blindBidWaiverRequest', { PICKS:d.id + ',' + num(f.bid.value) + ',' + (f.drop.value || '') }).then(function(r){ toast(r && r.ok ? (r.demo ? 'PREVIEW ONLY \u2014 CLAIM NOT SENT' : 'CLAIM IN FOR ' + d.name.toUpperCase()) : ((r && r.error) || 'MFL DIDN\u2019T ACCEPT THAT CLAIM'), !(r && r.ok)); bt.disabled = false; if(r && r.ok) p.innerHTML = acts(); }); });
        });
      });
    }
  }
})();
