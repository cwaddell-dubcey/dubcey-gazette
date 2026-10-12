(function(){
  var D = DC, $ = D.$, esc = D.esc;
  var S = { k:'open', items:[], me:'', commish:false, type:'bug' };
  var PAGES = [['', 'Whole site'], ['home', 'Home'], ['scores', 'Scores'], ['nfl', 'NFL Games'], ['standings', 'Standings'], ['schedule', 'Schedule'], ['teams', 'Teams'], ['players', 'Players'], ['wire', 'The Wire'], ['dispatch', 'Dispatch'], ['history', 'History'], ['finances', 'Finances'], ['rules', 'Bylaws'], ['myteam', 'My Team'], ['mobile', 'Phone / home-screen app']];
  var ST = { new:'NEW', planned:'PLANNED', doing:'IN PROGRESS', done:'DONE', wont:'WON\u2019T DO' };
  var from = (/[?&]from=([a-z]+)/.exec(location.search) || [])[1] || '';

  D.shell('ideas').then(function(me){ S.signed = !!(me && me.franchise); form(); load(); });

  function load(){
    if(D.LOCAL){ S.items = []; list(); return; }
    fetch('/data/feedback', { cache:'no-store', credentials:'same-origin' }).then(function(r){ return r.json(); }).then(function(d){ S.items = d.items || []; S.me = d.me; S.commish = d.commish; list(); })
      .catch(function(){ $('fbl').innerHTML = '<div class="ld mono">COULDN\u2019T LOAD THE SUGGESTION BOX.</div>'; });
  }
  function form(){
    if(!S.signed){ $('fbf').innerHTML = '<div class="bar mono"><span>DROP ONE IN</span></div><div class="fbf"><p style="margin:0;color:#C9D6E6;font-size:15px">Sign in with your MFL account to report a bug or suggest a feature.</p><button class="btn" type="button" id="fsi">SIGN IN</button></div>'; $('fsi').addEventListener('click', D.signIn); return; }
    $('fbf').innerHTML = '<div class="bar mono"><span>DROP ONE IN</span></div><form class="fbf">' +
      '<div class="fbt mono"><button type="button" data-ty="bug" class="bug">\u26a0 BUG</button><button type="button" data-ty="idea" class="idea">\u2726 FEATURE IDEA</button></div>' +
      '<label class="mono">WHERE<select name="page">' + PAGES.map(function(p){ return '<option value="' + p[0] + '"' + (p[0] === from ? ' selected' : '') + '>' + esc(p[1]) + '</option>'; }).join('') + '</select></label>' +
      '<label class="mono">TITLE<input name="title" maxlength="120" required placeholder=""></label>' +
      '<label class="mono">DETAILS<textarea name="body" maxlength="2000" placeholder=""></textarea></label>' +
      '<div class="err" hidden></div><button class="btn" type="submit">SUBMIT</button><div class="fine mono">YOUR TEAM NAME IS ATTACHED. THE COMMISH WILL MARK IT PLANNED, IN PROGRESS OR DONE.</div></form>';
    ty(S.type);
    var f = $('fbf').querySelector('form'), err = f.querySelector('.err');
    f.addEventListener('submit', function(e){
      e.preventDefault(); var b = f.querySelector('[type=submit]'); b.disabled = true; err.hidden = true;
      fetch('/data/feedback', { method:'POST', credentials:'same-origin', headers:{ 'Content-Type':'application/json' }, body:JSON.stringify({ type:S.type, page:f.page.value, title:f.title.value, body:f.body.value }) })
        .then(function(r){ return r.json(); }).then(function(r){
          b.disabled = false;
          if(!r.ok){ err.textContent = r.error || 'That didn\u2019t go through.'; err.hidden = false; return; }
          f.title.value = ''; f.body.value = ''; S.k = 'open'; seg(); load();
        }).catch(function(){ b.disabled = false; err.textContent = 'That didn\u2019t go through.'; err.hidden = false; });
    });
  }
  function ty(t){
    S.type = t; var f = $('fbf').querySelector('form'); if(!f) return;
    [].forEach.call(f.querySelectorAll('[data-ty]'), function(b){ b.classList.toggle('on', b.getAttribute('data-ty') === t); });
    f.title.placeholder = t === 'bug' ? 'Standings won\u2019t scroll on my phone' : 'Show bye weeks on Set Lineup';
    f.body.placeholder = t === 'bug' ? 'What happened, what you expected, and what phone or browser you were on.' : 'What it should do and why it would help.';
  }
  function seg(){ [].forEach.call(document.querySelectorAll('#fil [data-k]'), function(b){ b.classList.toggle('on', b.getAttribute('data-k') === S.k); }); }
  function when(t){ var d = (Date.now() - t) / 864e5; return d < 1 ? 'TODAY' : d < 2 ? 'YESTERDAY' : new Date(t).toLocaleDateString('en-US', { month:'short', day:'numeric' }).toUpperCase(); }
  function list(){
    var pg = {}; PAGES.forEach(function(p){ pg[p[0]] = p[1]; });
    var R = S.items.filter(function(x){
      if(S.k === 'open') return x.status !== 'done' && x.status !== 'wont';
      if(S.k === 'done') return x.status === 'done' || x.status === 'wont';
      if(S.k === 'bug' || S.k === 'idea') return x.type === S.k && x.status !== 'done' && x.status !== 'wont';
      return true;
    }).sort(function(a, b){ return ((b.votes || []).length - (a.votes || []).length) || b.at - a.at; });
    var open = S.items.filter(function(x){ return x.status !== 'done' && x.status !== 'wont'; }).length;
    $('fbl').innerHTML = '<div class="bar mono"><span>' + ({ open:'OPEN', bug:'OPEN BUGS', idea:'OPEN IDEAS', done:'DONE & CLOSED', all:'EVERYTHING' }[S.k]) + ' \u00b7 ' + R.length + '</span><span>' + open + ' OPEN \u00b7 MOST VOTES FIRST</span></div>' +
      (R.map(function(x){
        var v = x.votes || [], mine = v.indexOf(S.me) > -1;
        return '<div class="fbi"><button type="button" class="fbv' + (mine ? ' on' : '') + '" data-vote="' + esc(x.id) + '"' + (S.signed ? '' : ' disabled') + ' title="' + (mine ? 'Remove your vote' : 'Me too') + '"><b>' + v.length + '</b><i class="mono">' + (mine ? 'VOTED' : 'ME TOO') + '</i></button><div>' +
          '<div class="fbh"><span class="fbk mono ' + x.type + '">' + (x.type === 'bug' ? 'BUG' : 'IDEA') + '</span><span class="fbs mono ' + x.status + '">' + ST[x.status] + '</span><h3>' + esc(x.title) + '</h3></div>' +
          (x.body ? '<p class="fbb">' + esc(x.body) + '</p>' : '') +
          (x.note ? '<div class="fbn"><b>FROM THE COMMISH</b>' + esc(x.note) + '</div>' : '') +
          '<div class="fbm mono"><span><img src="' + D.helm(x.f) + '" alt="">' + esc(D.SHORT[x.f] || D.NAME[x.f] || 'OWNER') + '</span><span>' + when(x.at) + '</span>' + (x.page ? '<span>' + esc(String(pg[x.page] || x.page).toUpperCase()) + '</span>' : '') + (S.commish && x.ua ? '<span title="' + esc(x.ua) + '">' + (/iPhone|iPad/.test(x.ua) ? 'IOS' : /Android/.test(x.ua) ? 'ANDROID' : 'DESKTOP') + '</span>' : '') + '</div>' +
          (S.commish ? '<div class="fbc" data-id="' + esc(x.id) + '"><select data-st>' + Object.keys(ST).map(function(k){ return '<option value="' + k + '"' + (k === x.status ? ' selected' : '') + '>' + ST[k] + '</option>'; }).join('') + '</select><input data-note value="' + esc(x.note || '') + '" placeholder="Reply to the league (optional)"><button type="button" data-save>SAVE</button><button type="button" class="x" data-rm>DELETE</button></div>' : '') +
          '</div></div>';
      }).join('') || '<div class="ld mono">' + (S.k === 'done' ? 'NOTHING CLOSED YET.' : 'NOTHING HERE YET. DROP THE FIRST ONE IN.') + '</div>');
  }
  function patch(b){ return fetch('/data/feedback', { method:'PATCH', credentials:'same-origin', headers:{ 'Content-Type':'application/json' }, body:JSON.stringify(b) }).then(function(r){ return r.json(); }).then(function(r){ if(r.ok) load(); else alert(r.error || 'Couldn\u2019t save.'); }); }
  document.addEventListener('click', function(e){
    var t = e.target.closest('[data-ty]'); if(t){ ty(t.getAttribute('data-ty')); return; }
    var k = e.target.closest('#fil [data-k]'); if(k){ S.k = k.getAttribute('data-k'); seg(); list(); return; }
    var v = e.target.closest('[data-vote]'); if(v && !v.disabled){ var it = S.items.filter(function(x){ return x.id === v.getAttribute('data-vote'); })[0]; if(it){ it.votes = it.votes || []; var i = it.votes.indexOf(S.me); if(i > -1) it.votes.splice(i, 1); else it.votes.push(S.me); list(); } patch({ id:v.getAttribute('data-vote'), vote:1 }); return; }
    var c = e.target.closest('.fbc'); if(!c) return;
    var id = c.getAttribute('data-id');
    if(e.target.closest('[data-save]')) patch({ id:id, status:c.querySelector('[data-st]').value, note:c.querySelector('[data-note]').value });
    if(e.target.closest('[data-rm]') && confirm('Delete this suggestion?')) patch({ id:id, remove:1 });
  });
})();
