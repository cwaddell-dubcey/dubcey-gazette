(function(){
  var D = DC, $ = D.$, esc = D.esc, arr = D.arr, num = D.num, helm = D.helm;
  var ME = '';
  D.shell('league').then(function(me){ ME = me.franchise || ''; if(ME) $('post').hidden = false; });

  D.api('league').then(function(j){
    var L = j && j.league; if(!L) throw 0;
    var st = arr(L.starters && L.starters.position).map(function(p){ return p.name + ' ' + p.limit; }).join(' · ');
    var rows = [
      ['Teams', '12'],
      L.starters && ['Starting lineup', (L.starters.count ? L.starters.count + ' starters · ' : '') + st],
      L.rosterSize && ['Roster size', L.rosterSize],
      num(L.salaryCapAmount) && ['Salary cap', '$' + num(L.salaryCapAmount)],
      L.playoffTeams && ['Playoffs', 'Top ' + L.playoffTeams + (L.lastRegularSeasonWeek ? ' after Week ' + L.lastRegularSeasonWeek : '')],
      L.bbidMinimum != null && ['Minimum waiver bid', '$' + num(L.bbidMinimum)],
      L.endWeek && ['Season ends', 'Week ' + L.endWeek]
    ].filter(Boolean);
    $('set').innerHTML = '<div class="bar mono"><span>LEAGUE SETTINGS</span><span>EST. 2001</span></div>' + rows.map(function(r){ return '<div class="kv"><span class="mono">' + esc(r[0]) + '</span><b>' + esc(r[1]) + '</b></div>'; }).join('');
  }).catch(function(){ $('set').innerHTML = '<div class="bar mono"><span>LEAGUE SETTINGS</span></div><div class="ld mono">COULDN\u2019T LOAD SETTINGS</div>'; });

  function board(){
    D.api('messageBoard').then(function(j){
      var T = arr(j && j.messageBoard && j.messageBoard.thread).sort(function(a, b){ return num(b.lastPostTime) - num(a.lastPostTime); });
      $('mb').innerHTML = T.map(function(t){
        var when = t.lastPostTime ? new Date(num(t.lastPostTime) * 1000).toLocaleDateString(undefined, { month:'short', day:'numeric' }) : '';
        return '<button type="button" class="th3" data-th="' + esc(t.id) + '"><b>' + esc(t.subject || 'Untitled') + '</b><span class="mono">' + esc(when) + (t.numPosts ? ' · ' + esc(t.numPosts) + ' POSTS' : '') + '</span></button><div class="thb" id="th' + esc(t.id) + '" hidden></div>';
      }).join('') || '<div class="ld mono">NO THREADS YET. START ONE.</div>';
    }).catch(function(){ $('mb').innerHTML = '<div class="ld mono">COULDN\u2019T LOAD THE MESSAGE BOARD</div>'; });
  }
  board();

  document.addEventListener('click', function(e){
    var t = e.target.closest('[data-th]'); if(!t) return;
    var id = t.getAttribute('data-th'), box = $('th' + id);
    if(!box.hidden){ box.hidden = true; return; }
    box.hidden = false; box.innerHTML = '<div class="ld mono">LOADING…</div>';
    D.api('messageBoardThread', 'THREAD=' + encodeURIComponent(id)).then(function(j){
      var P = arr(j && j.messageBoardThread && j.messageBoardThread.post);
      box.innerHTML = P.map(function(p){
        var f = p.franchise || p.postedBy || '';
        return '<div class="po">' + (D.NAME[f] ? '<img src="' + helm(f) + '" alt="">' : '<span></span>') + '<div><span class="mono">' + esc(D.SHORT[f] || f) + (p.time ? ' · ' + new Date(num(p.time) * 1000).toLocaleString(undefined, { month:'short', day:'numeric', hour:'numeric', minute:'2-digit' }) : '') + '</span><p>' + esc(String(p.body || '').replace(/<[^>]+>/g, ' ')) + '</p></div></div>';
      }).join('') || '<div class="ld mono">EMPTY THREAD</div>';
    }).catch(function(){ box.innerHTML = '<div class="ld mono">COULDN\u2019T LOAD THIS THREAD</div>'; });
  });

  $('post').addEventListener('submit', function(e){
    e.preventDefault(); var f = this, b = f.querySelector('button'); b.disabled = true;
    D.act('messageBoard', { SUBJECT:f.subject.value.trim(), BODY:f.body.value.trim() }).then(function(r){
      b.disabled = false;
      if(r && r.ok){ f.reset(); if(!r.demo) board(); f.querySelector('.msg').textContent = r.demo ? 'PREVIEW ONLY \u2014 NOT POSTED' : 'POSTED'; }
      else f.querySelector('.msg').textContent = (r && r.error) || 'MFL DIDN\u2019T ACCEPT THAT POST';
    });
  });
})();
