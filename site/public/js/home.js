(function(){
  var D = DC, $ = D.$, esc = D.esc, arr = D.arr, num = D.num, helm = D.helm;
  var AWID = { "Team of the Week":"0004", "Biggest Bust":"0012", "Luckiest Win":"0005" };
  var REC = {}, LIVE = null;
  D.shell('');

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
        var id = AWID[k];
        return '<div class="aw">' + (id ? '<img src="' + helm(id) + '" alt="">' : '<span></span>') + '<b class="mono">' + esc(k) + '</b><span>' + esc(aw[k]) + '</span></div>';
      }).join('');
      $('awards').hidden = false;
    }
  }).catch(function(){ $('disp').innerHTML = '<div class="bar mono"><span>THE DISPATCH</span></div><div class="ld mono">THE DISPATCH IS ON ITS WAY.</div>'; });

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
      function nm(l){ return l.map(function(id){ return esc(D.pinfo(id)[0]); }).join(', '); }
      $('wire').innerHTML = rows.map(function(r){
        var when = new Date(num(r.t.timestamp) * 1000).toLocaleDateString(undefined, { weekday:'short', month:'short', day:'numeric' });
        var line = r.trade ? '<b>' + esc(D.SHORT[r.f]) + '</b> traded with <b>' + esc(D.SHORT[r.trade] || '') + '</b>'
          : '<b>' + esc(D.SHORT[r.f]) + '</b>' + (r.add.length ? ' <span class="add">+ ' + nm(r.add) + '</span>' : '') + (r.bid ? ' for $' + esc(r.bid) : '') + (r.drop.length ? ' <span class="drop">\u2212 ' + nm(r.drop) + '</span>' : '');
        return '<div class="wi"><img src="' + helm(r.f) + '" alt=""><div>' + line + '<i>' + esc(when) + (r.t.type === 'BBID_WAIVER' ? ' · WAIVER' : r.trade ? ' · TRADE' : ' · FREE AGENT') + '</i></div></div>';
      }).join('');
    });
  }).catch(function(){ $('wire').innerHTML = '<div class="ld mono">NO RECENT MOVES</div>'; });
})();
