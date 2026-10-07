(function(){
  var D = DC, $ = D.$, esc = D.esc, arr = D.arr, num = D.num, helm = D.helm;
  var S = { f:'ALL', team:'', rows:[] };
  D.shell('wire');
  var KIND = { BBID_WAIVER:'WAIVER', WAIVER:'WAIVER', FREE_AGENT:'FREE AGENT', TRADE:'TRADE' };

  D.api('transactions', 'COUNT=250').then(function(j){
    var tx = arr(j && j.transactions && j.transactions.transaction).filter(function(t){ return KIND[t.type] && D.NAME[t.franchise]; });
    S.rows = tx.map(function(t){
      if(t.type === 'TRADE') return { k:'TRADE', f:t.franchise, f2:t.franchise2, give:String(t.franchise1_gave_up || '').split(',').filter(Boolean), get:String(t.franchise2_gave_up || '').split(',').filter(Boolean), ts:num(t.timestamp), cm:t.comments || '' };
      var p = String(t.transaction || '').split('|'), bb = t.type === 'BBID_WAIVER';
      return { k:KIND[t.type], f:t.franchise, add:p[0].split(',').filter(Boolean), bid:bb ? num(p[1]) : 0, drop:String(bb ? p[2] || '' : p[1] || '').split(',').filter(Boolean), ts:num(t.timestamp) };
    });
    var ids = []; S.rows.forEach(function(r){ ids = ids.concat(r.add || [], r.drop || [], r.give || [], r.get || []); });
    return D.players(ids);
  }).then(function(){ draw(); side(); }).catch(function(){ $('feed').innerHTML = '<div class="ld mono">THE WIRE IS QUIET RIGHT NOW.</div>'; });

  function nm(l){ return l.map(function(id){ return esc(D.pinfo(id)[0]); }).join(', '); }
  function draw(){
    [].forEach.call(document.querySelectorAll('[data-k]'), function(b){ b.classList.toggle('on', b.getAttribute('data-k') === S.f); });
    var R = S.rows.filter(function(r){ return (S.f === 'ALL' || r.k === S.f) && (!S.team || r.f === S.team || r.f2 === S.team); });
    var day = '', h = '';
    R.forEach(function(r){
      var d = new Date(r.ts * 1000), dl = d.toLocaleDateString(undefined, { weekday:'long', month:'long', day:'numeric' });
      if(dl !== day){ day = dl; h += '<div class="day mono">' + esc(dl) + '</div>'; }
      var body = r.k === 'TRADE'
        ? '<b>' + esc(D.NAME[r.f]) + '</b> and <b>' + esc(D.NAME[r.f2] || '') + '</b> made a trade.<div class="tl2"><span><img src="' + helm(r.f) + '" alt="">gets ' + (nm(r.get) || 'nothing') + '</span><span><img src="' + helm(r.f2) + '" alt="">gets ' + (nm(r.give) || 'nothing') + '</span></div>'
        : '<b>' + esc(D.NAME[r.f]) + '</b>' + (r.add.length ? ' added <span class="add">' + nm(r.add) + '</span>' : '') + (r.bid ? ' for <em>$' + r.bid + '</em>' : '') + (r.drop.length ? (r.add.length ? ' and dropped ' : ' dropped ') + '<span class="drop">' + nm(r.drop) + '</span>' : '') + '.';
      h += '<div class="wr"><img src="' + helm(r.f) + '" alt=""><div>' + body + '</div><span class="tag mono k' + r.k.charAt(0) + '">' + r.k + '</span></div>';
    });
    $('feed').innerHTML = h || '<div class="ld mono">NOTHING HERE YET</div>';
  }
  function side(){
    var bids = S.rows.filter(function(r){ return r.bid; }).sort(function(a, b){ return b.bid - a.bid; }).slice(0, 8);
    $('big').innerHTML = '<div class="bar mono"><span>BIGGEST BIDS</span><span>THIS SEASON</span></div>' + (bids.map(function(r){ return '<div class="bb"><img src="' + helm(r.f) + '" alt=""><div><b>' + nm(r.add) + '</b><span class="mono">' + esc(D.SHORT[r.f]) + '</span></div><em>$' + r.bid + '</em></div>'; }).join('') || '<div class="ld mono">NO BIDS YET</div>');
    var spent = {}; S.rows.forEach(function(r){ if(r.bid) spent[r.f] = (spent[r.f] || 0) + r.bid; });
    var act = {}; S.rows.forEach(function(r){ act[r.f] = (act[r.f] || 0) + 1; });
    $('teams').innerHTML = '<div class="bar mono"><span>BY TEAM</span><span>MOVES · SPENT</span></div>' + D.IDS.slice().sort(function(a, b){ return (act[b] || 0) - (act[a] || 0); }).map(function(id){
      return '<button type="button" class="bt' + (S.team === id ? ' on' : '') + '" data-team="' + id + '"><img src="' + helm(id) + '" alt=""><b>' + esc(D.SHORT[id]) + '</b><span class="mono">' + (act[id] || 0) + ' · $' + (spent[id] || 0) + '</span></button>';
    }).join('');
  }
  document.addEventListener('click', function(e){
    var k = e.target.closest('[data-k]'); if(k){ S.f = k.getAttribute('data-k'); draw(); return; }
    var t = e.target.closest('[data-team]'); if(t){ var id = t.getAttribute('data-team'); S.team = S.team === id ? '' : id; draw(); side(); }
  });
})();
