(function(){
  var D = DC, $ = D.$, esc = D.esc, arr = D.arr, helm = D.helm;
  var AWID = { "Team of the Week":"0004", "Biggest Bust":"0012", "Luckiest Win":"0005" };
  var C = null, w = new URLSearchParams(location.search).get('w');
  D.shell('dispatch');
  document.addEventListener('click', function(e){
    var c = e.target.closest('.st,.tk'); if(c){ c.classList.toggle('open'); return; }
    var b = e.target.closest('[data-w]'); if(b){ e.preventDefault(); w = b.getAttribute('data-w'); draw(); history.replaceState(null, '', D.href('dispatch', 'w=' + w)); window.scrollTo(0, 0); }
  });
  D.column().then(function(c){ C = c; draw(); }).catch(function(){ $('disp').innerHTML = '<div class="ld mono">THE DISPATCH IS ON ITS WAY.</div>'; });

  function draw(){
    var ks = Object.keys(C.weeks || {}).filter(function(k){ return C.weeks[k] && (arr(C.weeks[k].dispatch).length || C.weeks[k].takes); }).sort(function(a, b){ return b - a; });
    if(!ks.length) return;
    if(!w || ks.indexOf(w) < 0) w = ks[0];
    $('weeks').innerHTML = ks.slice().reverse().map(function(k){ return '<a class="' + (k === w ? 'on' : '') + '" href="' + D.href('dispatch', 'w=' + k) + '" data-w="' + k + '">' + k + '</a>'; }).join('');
    $('k').textContent = 'THE DISPATCH · WEEK ' + w;
    var W = C.weeks[w], Dp = arr(W.dispatch);
    if(Dp.length){
      var lead = Dp[0];
      $('disp').innerHTML = '<div class="bar mono"><span>WEEK ' + esc(w) + '</span><span>' + Dp.length + ' STORIES</span></div>' +
        '<div class="lead"><div class="tx"><div class="kick mono">' + esc(lead.kick) + '</div><h1>' + esc(lead.head) + '</h1><p>' + esc(lead.dek) + '</p></div><div class="ph"><img src="' + helm(lead.id) + '" alt=""></div></div>' +
        '<div class="stories">' + Dp.slice(1).map(function(s){ return '<div class="st open"><img src="' + helm(s.id) + '" alt=""><div><div class="kick mono">' + esc(s.kick) + '</div><h2>' + esc(s.head) + '</h2><p>' + esc(s.dek) + '</p></div></div>'; }).join('') + '</div>';
      $('disp').hidden = false;
    } else $('disp').hidden = true;
    var T = W.takes || {}, ids = Object.keys(T);
    $('takesSec').hidden = !ids.length;
    $('takes').innerHTML = ids.map(function(id){ return '<div class="tk open"><div class="th"><img src="' + helm(id) + '" alt=""><b>' + esc(D.NAME[id] || id) + '</b><span class="plate"></span></div><p>' + esc(T[id]) + '</p></div>'; }).join('');
    var aw = W.awards || {}, ak = Object.keys(aw);
    $('awards').hidden = !ak.length;
    $('awards').innerHTML = '<div class="bar mono"><span>WEEK ' + esc(w) + ' AWARDS</span></div>' + ak.map(function(k){ var A = D.award(aw[k]), id = A.id || AWID[k]; return '<div class="aw">' + (id ? '<img src="' + helm(id) + '" alt="">' : '<span></span>') + '<b class="mono">' + esc(k) + '</b><span>' + esc(A.text) + '</span></div>'; }).join('');
  }
})();
