(function(){
  var D = DC, $ = D.$, esc = D.esc, arr = D.arr, num = D.num, helm = D.helm;
  var AWID = { "Team of the Week":"0004", "Biggest Bust":"0012", "Luckiest Win":"0005" };
  var REC = {}, LIVE = null;
  D.shell('');
  // timed popups from the weekly calendar (Commish → Popups). One at a time; closing keeps it closed until its next window.
  function pop(key, html){
    try{ if(localStorage.getItem(key) && !/[?&]popup=/.test(location.search) && !/[?&]waivers=1/.test(location.search)) return; }catch(e){}
    var v = document.createElement('div'); v.className = 'veil wvpop';
    v.innerHTML = '<div class="wvsheet" role="dialog" aria-modal="true"><button type="button" class="wvx" data-x aria-label="Close">\u00d7</button>' + html + '</div>';
    document.body.appendChild(v);
    function close(){ try{ localStorage.setItem(key, '1'); }catch(e){} v.remove(); }
    v.addEventListener('click', function(e){ if(e.target === v || e.target.closest('[data-x]')) close(); });
    document.addEventListener('keydown', function k(e){ if(e.key === 'Escape'){ close(); document.removeEventListener('keydown', k); } });
  }
  D.popups().then(function(P){
    var force = (/[?&]popup=([^&]+)/.exec(location.search) || [])[1] || (/[?&]waivers=1/.test(location.search) ? 'waivers' : '');
    var act = P.filter(function(p){ return p.on !== false && (force ? p.id === force : D.inWindow(p)); })[0];
    if(!act) return;
    var stamp = new Date().toISOString().slice(0, 10);
    if(act.kind === 'waivers') D.waiverReport().then(function(m){ if(m.rows.length) pop('dcPop:waivers:' + (m.run || m.label), D.waiverMini(m)); }).catch(function(){});
    else pop('dcPop:' + act.id + ':' + stamp, '<article class="card wvhome note2"><div class="bar mono"><span>' + esc(act.kick || 'FROM THE COMMISH') + '</span>' + (act.link ? '<a href="' + esc(act.link) + '">' + esc(act.linkText || 'GO') + ' \u2192</a>' : '') + '</div><div class="nt2"><h2>' + esc(act.title) + '</h2>' + (act.body ? '<p>' + esc(act.body).replace(/\n/g, '<br>') + '</p>' : '') + '</div></article>');
  });

  function shelf(order){
    $('helms').innerHTML = order.map(function(id, i){
      return '<a class="tm" href="' + D.href('teams', 'f=' + id) + '" title="' + esc(D.NAME[id]) + '"><span class="rk">' + (REC[id] ? i + 1 : '') + '</span><img src="' + helm(id) + '" alt="' + esc(D.NAME[id]) + '"></a>';
    }).join('');
    $('plates').innerHTML = order.map(function(id){ return '<span class="plate">' + esc(REC[id] || '') + '</span>'; }).join('');
  }
  shelf(D.IDS);
  D.records().then(function(r){ REC = r.rec; if(r.order.length) shelf(r.order); slate(); takesRec(); });

  function slate(){
    if(!LIVE) return;
    var ms = arr(LIVE.matchup), live = ms.some(function(m){ return arr(m.franchise).some(function(f){ return num(f.score) > 0; }); });
    $('slate').innerHTML = ms.map(function(m, k){
      var f = arr(m.franchise); if(f.length < 2) return '';
      var s = [num(f[0].score), num(f[1].score)];
      return '<a class="bug" href="' + D.href('scores', 'm=' + k) + '">' + [0, 1].map(function(i){
        var x = f[i], w = live && s[i] > s[1 - i];
        return '<div class="s' + (w ? ' w' : '') + '"><img src="' + helm(x.id) + '" alt=""><b title="' + esc(D.NAME[x.id]) + '">' + esc(D.SHORT[x.id] || x.id) + '</b><i>' + (live ? D.pts(s[i]) : esc(REC[x.id] || '')) + '</i></div>';
      }).join('') + '</a>';
    }).join('');
  }
  function loadLive(){ D.api('liveScoring').then(function(j){ LIVE = j && j.liveScoring; slate(); }).catch(function(){}); }
  loadLive(); setInterval(function(){ if(!document.hidden) loadLive(); }, 60000);

  document.addEventListener('click', function(e){ var c = e.target.closest('.st,.tk'); if(c) c.classList.toggle('open'); });

  var TAKES = null;
  function takesRec(){ if(!TAKES) return; [].forEach.call(document.querySelectorAll('.tk[data-id]'), function(el){ var p = el.querySelector('.plate'); if(p) p.textContent = REC[el.getAttribute('data-id')] || ''; }); }

  D.column().then(function(c){
    var ks = Object.keys(c.weeks || {}).filter(function(k){ return c.weeks[k] && arr(c.weeks[k].dispatch).length; }).sort(function(a, b){ return b - a; });
    if(!ks.length) throw 0;
    var w = ks[0], W = c.weeks[w], Dp = arr(W.dispatch), lead = Dp[0], rest = Dp.slice(1);
    $('disp').innerHTML = '<div class="bar mono"><span>THE DISPATCH · WEEK ' + esc(w) + '</span><span>' + Dp.length + ' STORIES</span></div>' +
      '<div class="lead"><div class="tx"><div class="kick mono">' + esc(lead.kick) + '</div><h1>' + esc(lead.head) + '</h1><p>' + esc(lead.dek) + '</p></div><div class="ph"><img src="' + helm(lead.id) + '" alt=""></div></div>' +
      '<div class="stories">' + rest.map(function(s){
        return '<div class="st"><img src="' + helm(s.id) + '" alt=""><div><div class="kick mono">' + esc(s.kick) + '</div><h2>' + esc(s.head) + '</h2><p>' + esc(s.dek) + '</p></div></div>';
      }).join('') + '</div>';
    $('shk').textContent = 'THE STANDINGS · AFTER WEEK ' + w;
    var T = W.takes || {}, order = Object.keys(T);
    if(order.length){
      TAKES = T;
      $('takesK').textContent = 'WEEK ' + w + ' · ALL 12 TEAMS';
      $('takes').innerHTML = order.map(function(id){
        return '<div class="tk" data-id="' + esc(id) + '"><div class="th"><img src="' + helm(id) + '" alt=""><b>' + esc(D.NAME[id] || id) + '</b><span class="plate">' + esc(REC[id] || '') + '</span></div><p>' + esc(T[id]) + '</p></div>';
      }).join('');
      $('takesSec').hidden = false;
    }
    var aw = W.awards || {}, ak = Object.keys(aw);
    if(ak.length){
      $('awards').innerHTML = '<div class="bar mono"><span>WEEK ' + esc(w) + ' AWARDS</span></div>' + ak.map(function(k){
        var A = D.award(aw[k]), id = A.id || AWID[k];
        return '<div class="aw">' + (id ? '<img src="' + helm(id) + '" alt="">' : '<span></span>') + '<b class="mono">' + esc(k) + '</b><span>' + esc(A.text) + '</span></div>';
      }).join('');
      $('awards').hidden = false;
    }
    return num(w);
  }).catch(function(){ $('disp').innerHTML = '<div class="bar mono"><span>THE DISPATCH</span></div><div class="ld mono">THE DISPATCH IS ON ITS WAY.</div>'; return null; }).then(function(w){
    if(w) return w;
    return D.api('liveScoring').then(function(j){ return Math.max(0, num(j && j.liveScoring && j.liveScoring.week) - 1); }).catch(function(){ return 0; });
  }).then(function(w){
    w = num(w); if(!w) return;
    return D.lowScores(Math.min(w, 13)).then(function(L){
      var cur = L.filter(function(x){ return x.w === w; })[0]; if(!cur) return;
      var tally = {}; L.forEach(function(x){ tally[x.id] = (tally[x.id] || 0) + 1; });
      var pts = cur.s != null ? D.pts(cur.s) + ' pts' : '';
      $('low').innerHTML = '<div class="bar mono"><span>$' + D.LOW_FINE + ' LOW-SCORE PENALTY</span><span>WEEK ' + w + '</span></div>' +
        '<a class="lowhd" href="' + D.href('teams', 'f=' + cur.id) + '"><img src="' + helm(cur.id) + '" alt=""><div><b>' + esc(D.NAME[cur.id]) + '</b><span class="mono">' + esc(pts) + (cur.gap != null ? ' \u00b7 LOW BY ' + D.pts(cur.gap) : '') + '</span></div><i class="mono">\u2212$' + D.LOW_FINE + '</i></a>' +
        (L.length > 1 ? '<div class="lowls">' + L.slice().reverse().slice(1).map(function(x){ return '<div><span class="mono">WK ' + x.w + '</span><b>' + esc(D.SHORT[x.id] || D.NAME[x.id]) + '</b><span class="mono">' + (x.s != null ? D.pts(x.s) : '') + '</span></div>'; }).join('') + '</div>' : '') +
        '<div class="lowft mono"><span>SEASON \u00b7 ' + L.length + ' \u00d7 $' + D.LOW_FINE + '</span><span>$' + (L.length * D.LOW_FINE) + ' IN THE POOL</span></div>';
      // season-high single week (Weeks 1–13) wins 25% of the pool; a new record gets announced
      var rec = null, prev = null;
      L.forEach(function(x){ if(x.top && x.top.s > 0 && (!rec || x.top.s > rec.s)){ prev = rec; rec = { w:x.w, id:x.top.id, s:x.top.s }; } });
      var pot = L.length * D.LOW_FINE;
      if(rec){
        $('low').innerHTML += '<div class="pot"><div class="pothd mono"><span>WHERE THE POOL GOES \u00b7 WEEK 14</span></div>' +
          '<div class="potr"><span class="mono">50%</span><b>Week 14 high score</b><i class="mono">$' + Math.round(pot * .5) + '</i></div>' +
          '<div class="potr"><span class="mono">25%</span><b>Week 14 runner-up</b><i class="mono">$' + Math.round(pot * .25) + '</i></div>' +
          '<a class="potr hold" href="' + D.href('teams', 'f=' + rec.id) + '"><span class="mono">25%</span><b>Best single week <u>' + esc(D.SHORT[rec.id] || D.NAME[rec.id]) + ' \u00b7 ' + D.pts(rec.s) + ' \u00b7 WK ' + rec.w + '</u></b><i class="mono">$' + Math.round(pot * .25) + '</i></a>' +
          '<div class="lowft mono"><span>PAYOUTS GROW AS FINES COME IN</span><span>SEE FINANCES \u2192</span></div></div>';
        if(rec.w === w){
          var tx = esc(D.NAME[rec.id]) + ' scored ' + D.pts(rec.s) + ' points in Week ' + rec.w + ', the best single week of the season so far.' + (prev ? ' That beats ' + esc(D.SHORT[prev.id] || D.NAME[prev.id]) + '\u2019s ' + D.pts(prev.s) + ' from Week ' + prev.w + '.' : '') + ' If nobody tops it by Week 13, it\u2019s worth 25% of the penalty pool.';
          var stH = document.querySelector('#disp .stories');
          if(stH && !stH.querySelector('.st.rec')){ var dh = document.createElement('div'); dh.className = 'st rec'; dh.innerHTML = '<img src="' + helm(rec.id) + '" alt=""><div><div class="kick mono">NEW SINGLE-WEEK RECORD \u00b7 WEEK ' + rec.w + '</div><h2>' + esc(D.NAME[rec.id]) + ' sets the high mark</h2><p>' + tx + '</p></div>'; stH.insertBefore(dh, stH.firstChild); }
          pop('dcPop:rec:' + rec.w + ':' + rec.id, '<article class="card wvhome note2"><div class="bar mono"><span>NEW SINGLE-WEEK RECORD</span><span>WEEK ' + rec.w + '</span></div><div class="nt2"><h2>' + esc(D.NAME[rec.id]) + ' \u00b7 ' + D.pts(rec.s) + '</h2><p>' + tx + '</p></div></article>');
        }
      }
      $('low').hidden = false;
      var st = document.querySelector('#disp .stories');
      if(st && !st.querySelector('.st.low')){
        var dv = document.createElement('div'); dv.className = 'st low';
        dv.innerHTML = '<img src="' + helm(cur.id) + '" alt=""><div><div class="kick mono">$' + D.LOW_FINE + ' LOW-SCORE PENALTY \u00b7 WEEK ' + w + '</div><h2>' + esc(D.NAME[cur.id]) + ' pays up</h2><p>' + (cur.s != null ? 'With ' + D.pts(cur.s) + ' points, the fewest in the league this week' : 'The fewest points in the league this week') + ', ' + esc(D.SHORT[cur.id] || D.NAME[cur.id]) + ' owes $' + D.LOW_FINE + ' to the penalty pool.' + (tally[cur.id] > 1 ? ' That\u2019s ' + tally[cur.id] + ' times this season.' : '') + '</p></div>';
        st.insertBefore(dv, st.firstChild);
      }
    });
  }).catch(function(){});

  D.api('transactions', 'COUNT=40').then(function(j){
    var tx = arr(j && j.transactions && j.transactions.transaction).filter(function(t){ return /BBID_WAIVER|FREE_AGENT|TRADE/.test(t.type) && D.NAME[t.franchise]; }).slice(0, 8);
    if(!tx.length) throw 0;
    var rows = tx.map(function(t){
      if(t.type === 'TRADE') return { f:t.franchise, add:[], drop:[], bid:'', t:t, trade:t.franchise2 };
      var p = String(t.transaction || '').split('|');
      return t.type === 'BBID_WAIVER' ? { f:t.franchise, add:p[0].split(',').filter(Boolean), bid:p[1] || '', drop:String(p[2] || '').split(',').filter(Boolean), t:t } : { f:t.franchise, add:p[0].split(',').filter(Boolean), drop:String(p[1] || '').split(',').filter(Boolean), bid:'', t:t };
    });
    var ids = []; rows.forEach(function(r){ ids = ids.concat(r.add, r.drop); });
    return D.players(ids).then(function(){
      function nm(l){ return l.map(function(id){ return '<span class="pk" data-card="' + esc(id) + '">' + esc(D.pinfo(id)[0]) + '</span>' + D.ij(id); }).join(', '); }
      $('wire').innerHTML = rows.map(function(r){
        var when = new Date(num(r.t.timestamp) * 1000).toLocaleDateString(undefined, { weekday:'short', month:'short', day:'numeric' });
        var line = r.trade ? '<b>' + esc(D.SHORT[r.f]) + '</b> traded with <b>' + esc(D.SHORT[r.trade] || '') + '</b>'
          : '<b>' + esc(D.SHORT[r.f]) + '</b>' + (r.add.length ? ' <span class="add">+ ' + nm(r.add) + '</span>' : '') + (r.bid ? ' for $' + esc(r.bid) : '') + (r.drop.length ? ' <span class="drop">\u2212 ' + nm(r.drop) + '</span>' : '');
        return '<div class="wi"><img src="' + helm(r.f) + '" alt=""><div>' + line + '<i>' + esc(when) + (r.t.type === 'BBID_WAIVER' ? ' · WAIVER' : r.trade ? ' · TRADE' : ' · FREE AGENT') + '</i></div></div>';
      }).join('');
    });
  }).catch(function(){ $('wire').innerHTML = '<div class="ld mono">NO RECENT MOVES</div>'; });
})();
