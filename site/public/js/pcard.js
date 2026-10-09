/* Player card popup: tap any player photo or name (anything with data-card="MFL id"). All content comes from MFL. */
(function(){
  var D = DC, esc = D.esc, arr = D.arr, num = D.num;
  var S = { id:'', tab:'news', d:null };
  var IW = { questionable:'Q', doubtful:'D', out:'OUT', 'injured reserve':'IR', ir:'IR', suspended:'SUS', probable:'P' };
  var CACHE = {};

  function el(){ var v = document.getElementById('pcard'); if(v) return v; v = document.createElement('div'); v.id = 'pcard'; v.className = 'veil pcv'; v.innerHTML = '<div class="pcs2" role="dialog" aria-modal="true" aria-label="Player card"></div>'; document.body.appendChild(v);
    v.addEventListener('click', function(e){ if(e.target === v || e.target.closest('[data-pcx]')) close(); var t = e.target.closest('[data-pct]'); if(t){ S.tab = t.getAttribute('data-pct'); if(S.tab === 'proj') proj(); body(); } var a = e.target.closest('[data-pca]'); if(a) act(a.getAttribute('data-pca')); });
    return v; }
  document.addEventListener('keydown', function(e){ if(e.key === 'Escape' && document.getElementById('pcard')) close(); });
  function close(){ var v = document.getElementById('pcard'); if(v) v.remove(); document.documentElement.classList.remove('nos'); S.id = ''; }
  function no(){ return null; }

  // MFL pages come through the site's own connection as HTML; parsed here
  function page(kind, id){
    var k = kind + ':' + id; if(CACHE[k]) return CACHE[k];
    var u = D.LOCAL ? 'demo/mfl-' + kind + '.html' : '/data/mfl?k=' + kind + '&P=' + id;
    return CACHE[k] = fetch(u, { credentials:'same-origin' }).then(function(r){ if(!r.ok) throw r.status; return r.text(); }).then(function(h){ return new DOMParser().parseFromString(h, 'text/html'); }).catch(function(e){ delete CACHE[k]; throw e; });
  }
  function tx(n){ return n ? String(n.textContent || '').replace(/\s+/g, ' ').trim() : ''; }
  function kv(t){ var o = []; if(t) [].forEach.call(t.querySelectorAll('tr'), function(r){ var th = r.querySelector('th'), td = r.querySelector('td:not(.player_photo)'); if(th && td) o.push([tx(th).replace(/:$/, ''), tx(td)]); }); return o; }
  function cap(doc, re){ return [].filter.call(doc.querySelectorAll('table.biography'), function(t){ return re.test(tx(t.querySelector('caption'))); })[0]; }
  function grid(t, drop){
    if(!t) return null;
    var hr = [], rows = [];
    [].forEach.call(t.rows, function(r){ if(r.querySelector('form,select')) return; if(r.cells.length === 1 && (r.cells[0].colSpan || 1) > 1) return; if(r.querySelector('td')) rows.push(r); else hr.push(r); });
    if(!hr.length) return null;
    function expand(r){ var o = []; [].forEach.call(r.cells, function(c){ for(var k = 0; k < (c.colSpan || 1); k++) o.push(k ? '' : tx(c)); }); return o; }
    function span(r){ var o = []; [].forEach.call(r.cells, function(c){ for(var k = 0; k < (c.colSpan || 1); k++) o.push(tx(c)); }); return o; }
    var hi = 0, best = -1; hr.forEach(function(r, i){ var n = [].filter.call(r.cells, function(c){ return tx(c); }).length; if(n >= best){ best = n; hi = i; } });
    var head = expand(hr[hi]), grp = hi > 0 ? span(hr[hi - 1]) : head.map(function(){ return ''; });
    var wide = rows.reduce(function(m, r){ return Math.max(m, expand(r).length); }, 0);
    while(head.length < wide){ head.push(''); grp.push(''); }
    var keep = head.map(function(h){ return !(drop && drop.test(h)); });
    var body = rows.map(function(r){ return expand(r).filter(function(_, i){ return keep[i]; }); }).filter(function(r){ return r.some(function(c){ return c; }); });
    head = head.filter(function(_, i){ return keep[i]; }); grp = grp.filter(function(_, i){ return keep[i]; });
    var groups = []; grp.forEach(function(g){ var l = groups[groups.length - 1]; if(l && l[0] === g) l[1]++; else groups.push([g, 1]); });
    return { head:head, groups:groups, rows:body };
  }
  function table(g, empty){
    if(!g || !g.rows.length) return '<div class="ld mono">' + empty + '</div>';
    var h = '<div class="sx"><table class="ht pgt">';
    if(g.groups.some(function(x){ return x[0]; })) h += '<thead><tr class="gt">' + g.groups.map(function(x){ return '<th colspan="' + x[1] + '">' + esc(x[0]) + '</th>'; }).join('') + '</tr>';
    else h += '<thead>';
    h += '<tr>' + g.head.map(function(x, i){ return '<th' + (i ? '' : ' class="l"') + '>' + esc(x) + '</th>'; }).join('') + '</tr></thead><tbody>';
    h += g.rows.map(function(r){ return '<tr>' + r.map(function(v, i){ return '<td' + (i ? '' : ' class="l y"') + '>' + esc(v) + '</td>'; }).join('') + '</tr>'; }).join('');
    return h + '</tbody></table></div>';
  }

  D.openCard = function(id){
    S.id = id; S.tab = 'news'; S.d = { id:id, load:1 };
    el(); document.documentElement.classList.add('nos'); draw();
    Promise.all([D.me(), D.api('rosters').catch(no), D.api('liveScoring').catch(no), D.api('injuries').catch(no), D.players([id]), D.api('nflSchedule').catch(no)]).then(function(r){
      if(S.id !== id) return;
      var me = r[0] || {}, d = S.d, i = D.pinfo(id);
      d.name = i[0]; d.pos = i[1]; d.team = i[2]; d.me = me.franchise || ''; d.load = 0;
      arr(r[1] && r[1].rosters && r[1].rosters.franchise).forEach(function(f){ arr(f.player).forEach(function(p){ if(p.id === id){ d.own = f.id; d.sal = p.salary; d.rst = p.status; } }); });
      var L = r[2] && r[2].liveScoring; d.week = num(L && L.week);
      arr(L && L.matchup).forEach(function(m){ arr(m.franchise).forEach(function(f){ arr((f.players && f.players.player) || f.player).forEach(function(p){ if(p.id === id){ d.wk = num(p.score); d.sec = num(p.gameSecondsRemaining); } }); }); });
      arr(r[3] && r[3].injuries && r[3].injuries.injury).forEach(function(x){ if(x.id === id) d.inj = D.injCode(x.status); });
      arr(r[5] && r[5].nflSchedule && r[5].nflSchedule.matchup).forEach(function(m){ var t = arr(m.team); t.forEach(function(x, k){ if(x.id === d.team){ d.opp = (x.isHome === '1' ? 'vs ' : '@ ') + t[1 - k].id; d.kick = num(m.kickoff) * 1000; } }); });
      draw();
      return Promise.all([D.scores('YTD', [id]), D.scores('AVG', [id]), d.week ? D.api('projectedScores', 'W=' + d.week + '&PLAYERS=' + id).catch(no) : null, d.week ? D.stats(d.week, [id], d.sec > 0 && d.sec < 3600) : null]).then(function(s){
        if(S.id !== id) return;
        function sc(j, k){ var x = arr(j && j[k] && j[k].playerScore)[0]; return x && x.score !== '' ? num(x.score) : null; }
        d.ytd = s[0][id] != null ? s[0][id] : null; d.avg = s[1][id] != null ? s[1][id] : null; d.proj = sc(s[2], 'projectedScores'); d.sx = d.week ? D.statOf(d.week, id) : '';
        top();
      });
    });
    page('page', id).then(function(doc){
      if(S.id !== id) return;
      var d = S.d, im = doc.querySelector('td.player_photo img');
      d.bio = kv(cap(doc, /biography/i)); d.status = kv(cap(doc, /player status/i));
      d.log = grid(doc.getElementById('player_stats_table'), /^opp (avg|rank)|^status$/i);
      d.career = grid(doc.querySelector('table.biohistory'));
      if(d.career) d.career.rows.forEach(function(r){ if(/\*$/.test(r[0])) r[0] = r[0].replace(/\*$/, ' PROJ'); });
      d.pageOk = true; draw();
    }).catch(function(){ if(S.id === id){ S.d.pageOk = false; body(); } });
    page('news', id).then(function(doc){
      if(S.id !== id) return;
      var out = [];
      [].forEach.call(doc.querySelectorAll('table.report tr'), function(r){
        var hd = r.querySelector('td.headline'); if(!hd) return;
        var cells = [].filter.call(r.cells, function(c){ return c !== hd && !c.classList.contains('rank') && !c.classList.contains('timestamp') && !c.hasAttribute('rowspan'); });
        var sum = cells[0], src = sum && sum.querySelector('a[target="_blank"]');
        var t = tx(sum).replace(/^\([^)]*\)\s*/, '').replace(/\s*\(More\)\s*$/i, ''), parts = t.split(/\s*Analysis:\s*/i);
        out.push({ hl:tx(hd), src:tx(src), when:tx(r.querySelector('td.timestamp')), body:parts[0] || '', an:parts.slice(1).join(' ') });
      });
      S.d.news = out; S.d.newsOk = true; body();
    }).catch(function(){ if(S.id === id){ S.d.news = []; S.d.newsOk = true; body(); } });
  };
  function proj(){
    var d = S.d, id = d.id; if(d.projLog || d.projLoading) return; d.projLoading = 1;
    page('proj', id).then(function(doc){ if(S.id !== id) return; d.projLog = grid(doc.getElementById('player_stats_table'), /^opp (avg|rank)|^status$/i) || { rows:[] }; body(); })
      .catch(function(){ if(S.id === id){ d.projLog = { rows:[] }; body(); } });
  }

  function draw(){ top(); body(); }
  function top(){
    var d = S.d, v = el().querySelector('.pcs2');
    var photo = d.pos ? D.photo(d.id, d.team, d.pos) : '';
    var rs = /INJURED/.test(d.rst || '') ? 'IR' : /TAXI/.test(d.rst || '') ? 'TAXI' : '';
    var own = d.own ? '<a class="pco" href="' + D.href('teams', 'f=' + d.own) + '"><img src="' + D.helm(d.own) + '" alt=""><span>' + esc(D.NAME[d.own]) + (rs ? ' \u00b7 ' + rs : '') + (d.sal ? ' \u00b7 $' + esc(d.sal) : '') + '</span></a>' : d.load ? '' : '<span class="pco fa mono">FREE AGENT</span>';
    function box(x, l, hi){ return '<div' + (hi ? ' class="hi"' : '') + '><b>' + (x == null ? '\u2013' : D.pts(Math.round(x * 100) / 100)) + '</b><span class="mono">' + l + '</span></div>'; }
    var live = d.sec > 0 && d.sec < 3600, up = d.kick && d.kick > Date.now(), ln = [];
    if(live) ln.push('<em>LIVE</em>'); if(d.opp) ln.push(esc(d.opp)); if(up) ln.push('KICKOFF ' + esc(new Date(d.kick).toLocaleString(undefined, { weekday:'short', hour:'numeric', minute:'2-digit' }).toUpperCase())); if(d.sx) ln.push(esc(d.sx));
    var tabs = [['news', 'NEWS'], ['bio', 'BIO'], ['log', D.Y + ' STATS'], ['proj', 'PROJ.'], ['career', 'CAREER']];
    v.innerHTML = '<button type="button" class="wvx" data-pcx aria-label="Close">\u00d7</button>' +
      '<div class="pct2"><div class="pph">' + (photo ? '<img src="' + esc(photo) + '" alt="" onerror="this.onerror=null;this.src=\'' + D.nflLogo(d.team) + '\';this.className=\'lg\'">' : '') + '</div>' +
      '<div class="pin"><div class="kick mono">' + [d.pos ? '<span class="pos ' + esc(d.pos) + '">' + esc(d.pos) + '</span>' : '', d.team ? D.tlogo(d.team) + esc(d.team) : ''].filter(Boolean).join(' ') + (d.inj ? ' <span class="ij mono">' + esc(d.inj) + '</span>' : '') + '</div>' +
      '<h2>' + esc(d.name || 'Loading\u2026') + '</h2>' + own + '</div></div>' +
      '<div class="pstat">' + box(d.wk, d.week ? 'WEEK ' + d.week : 'WEEK', live) + box(d.proj, 'PROJ') + box(d.ytd, 'SEASON') + box(d.avg, 'AVG') + '</div>' +
      (ln.length ? '<div class="pline mono">' + ln.join(' \u00b7 ') + '</div>' : '') +
      '<div class="pact">' + acts() + '</div>' +
      '<div class="ptabs mono">' + tabs.map(function(t){ return '<button type="button" data-pct="' + t[0] + '" class="' + (S.tab === t[0] ? 'on' : '') + '">' + t[1] + '</button>'; }).join('') + '</div><div class="pbody" id="pbody"></div>';
    body();
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
  function body(){
    var b = document.getElementById('pbody'); if(!b) return;
    [].forEach.call(document.querySelectorAll('[data-pct]'), function(t){ t.classList.toggle('on', t.getAttribute('data-pct') === S.tab); });
    var d = S.d, wait = '<div class="ld mono">LOADING\u2026</div>', none = function(m){ return '<div class="ld mono">' + m + '</div>'; };
    if(S.tab === 'news'){
      b.innerHTML = !d.newsOk ? wait : d.news.length ? d.news.map(function(n){
        return '<div class="pnw"><span class="mono">' + esc([n.src, n.when ? n.when + ' ago' : ''].filter(Boolean).join(' \u00b7 ').toUpperCase()) + '</span><h4>' + esc(n.hl) + '</h4>' + (n.body ? '<p>' + esc(n.body) + '</p>' : '') + (n.an ? '<p><b>Analysis:</b> ' + esc(n.an) + '</p>' : '') + '</div>';
      }).join('') : none('NO NEWS IN THE LAST 30 DAYS');
    } else if(S.tab === 'bio'){
      if(d.pageOk == null){ b.innerHTML = wait; return; }
      var M = {}; (d.bio || []).concat(d.status || []).forEach(function(x){ M[x[0].toLowerCase()] = x[1]; });
      var hw = String(M['height/weight'] || '').split(/\s*\/\s*/), da = String(M['dob/age'] || '').split(/\s*\/\s*/);
      var dr = String(M['drafted'] || '').split(/\s*\/\s*/).filter(Boolean).join(' \u00b7 ');
      var half = [['HEIGHT', hw[0]], ['WEIGHT', (hw[1] || '').replace(/\s*lbs?$/i, ' lbs')], ['AGE', da[1]], ['BORN', da[0]], ['COLLEGE', M['college']], ['EXPERIENCE', M['experience']],
        ['JERSEY', M['jersey num'] ? '#' + M['jersey num'] : ''], ['BYE WEEK', M['bye week'] ? 'Week ' + M['bye week'] : ''], ['SALARY', M['salary']], ['STARTED', M['started']]].filter(function(x){ return x[1]; });
      var wide = [['DRAFTED', dr], ['LEAGUE STATUS', M['league status']]].filter(function(x){ return x[1]; });
      if(half.length % 2) wide.unshift(half.pop());
      function cell(x, w){ return '<div' + (w ? ' class="w"' : '') + '><span class="mono">' + x[0] + '</span><b>' + esc(x[1]) + '</b></div>'; }
      b.innerHTML = half.length || wide.length ? '<div class="pbio">' + half.map(function(x){ return cell(x); }).join('') + wide.map(function(x){ return cell(x, 1); }).join('') + '</div>' : none('NO BIO ON FILE');
    } else if(S.tab === 'log'){
      b.innerHTML = d.pageOk == null ? wait : table(d.log, 'NO ' + D.Y + ' STATS YET');
    } else if(S.tab === 'proj'){
      b.innerHTML = !d.projLog ? wait : table(d.projLog, 'NO PROJECTIONS');
    } else {
      b.innerHTML = d.pageOk == null ? wait : table(d.career, 'NO CAREER STATS');
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
