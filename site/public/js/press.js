/* The Press Desk: Dubcey Media (press-pass members) and the commissioner post stories, quick hits and player graphics */
(function(){
  var D = DC, $ = D.$, esc = D.esc, arr = D.arr;
  var S = { tab:(location.hash || '#stories').slice(1), me:null, st:null, hi:null, gx:null, ed:null, pl:null, q:'', gq:'' };
  var invite = new URLSearchParams(location.search).get('invite');
  function toast(m, bad){ var t = $('toast'); t.textContent = m; t.className = 'toast mono' + (bad ? ' bad' : ''); t.hidden = false; clearTimeout(t._h); t._h = setTimeout(function(){ t.hidden = true; }, 4200); }
  function uid(p){ return p + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }

  if(invite){ claim(); return; }
  D.shell('press').then(function(me){
    S.me = me;
    $('pdpass').innerHTML = D.pressPass ? D.pressPass(me.media ? me.user : 'RDPC', 'sm') : '';
    if(!me.media && !me.commish){
      $('pb').innerHTML = '<div class="gate card"><div class="gpass">' + (D.pressPass ? D.pressPass('RDPC') : '') + '</div><div><div class="kick mono">DUBCEY MEDIA ONLY</div><h2>Press pass required</h2><p>The Press Desk is where Dubcey Media writes stories, posts quick hits and makes player graphics. ' + (me.franchise ? 'Your owner login doesn’t carry a press pass.' : 'Sign in with your press pass.') + '</p>' + (me.franchise ? '' : '<button class="btn" type="button" id="gi">SIGN IN</button>') + '</div></div>';
      var gi = $('gi'); if(gi) gi.addEventListener('click', function(){ D.signIn(); });
      return;
    }
    $('pdk').textContent = me.media ? (me.user + ' · ' + (me.title || 'Dubcey Media')).toUpperCase() : 'COMMISSIONER · EVERYTHING DUBCEY MEDIA POSTS';
    $('ptabs').hidden = false; load().then(draw);
  });
  window.addEventListener('hashchange', function(){ S.tab = (location.hash || '#stories').slice(1); if(S.st) draw(); });

  /* invite link: set a password, then straight to the desk */
  function claim(){
    D.shell('press');
    $('pdpass').innerHTML = D.pressPass ? D.pressPass('RDPC', 'sm') : '';
    $('pb').innerHTML = '<div class="gate card"><div class="gpass">' + (D.pressPass ? D.pressPass('RDPC') : '') + '</div><form class="pclaim"><div class="kick mono">YOUR PRESS PASS</div><h2>Welcome to Dubcey Media</h2><p>Pick a password. You’ll sign in with your name and this password from the SIGN IN button, using the press-pass option.</p><div class="err" hidden></div>' +
      '<label class="mono">PASSWORD (8+ CHARACTERS)<input name="pw" type="password" autocomplete="new-password" minlength="8" required></label><label class="mono">AGAIN<input name="pw2" type="password" autocomplete="new-password" minlength="8" required></label><button class="btn" type="submit">ACTIVATE MY PASS</button></form></div>';
    var f = $('pb').querySelector('form'), err = f.querySelector('.err');
    f.addEventListener('submit', function(e){ e.preventDefault(); err.hidden = true;
      if(f.pw.value !== f.pw2.value){ err.textContent = 'Those don’t match.'; err.hidden = false; return; }
      var b = f.querySelector('button'); b.disabled = true;
      fetch('/press/claim', { method:'POST', credentials:'same-origin', headers:{ 'Content-Type':'application/json' }, body:JSON.stringify({ invite:invite, password:f.pw.value }) }).then(function(r){ return r.json(); })
        .then(function(r){ if(!r.ok) throw r.error; location.href = D.href('press'); })
        .catch(function(m){ b.disabled = false; err.textContent = typeof m === 'string' ? m : 'Couldn’t reach the site.'; err.hidden = false; });
    });
  }

  function load(){
    return Promise.all([D.content('stories'), D.content('hits'), D.content('pgfx')]).then(function(r){
      S.st = (r[0] && r[0].items) || []; S.hi = (r[1] && r[1].items) || []; S.gx = (r[2] && r[2].map) || {};
    });
  }
  function save(key, obj, what){ return D.save(key, obj).then(function(r){ if(r && r.ok) toast(r.demo ? 'SAVED IN THIS BROWSER (PREVIEW)' : what); else toast((r && r.error) || 'COULDN’T SAVE', true); return r && r.ok; }); }
  // re-read before writing, so two people posting at once don't erase each other
  function update(key, fn, what){ return D.content(key).then(function(cur){ cur = cur || {}; fn(cur); return save(key, cur, what).then(function(ok){ if(ok) return load(); }); }); }
  function mine(x){ return S.me.commish || x.mid === S.me.mid; }
  function by(){ return { by:S.me.media ? S.me.user : 'The Commish', byT:S.me.media ? (S.me.title || 'Dubcey Media') : 'Commissioner', mid:S.me.mid || 'commish' }; }

  function draw(){
    [].forEach.call(document.querySelectorAll('#ptabs a'), function(a){ a.classList.toggle('on', a.getAttribute('data-t') === S.tab); });
    ({ stories:stories, hits:hits, gfx:gfx, weekly:weekly }[S.tab] || stories)();
  }

  /* ---------- players for tagging and graphics (rostered + free agents) ---------- */
  function players(){
    if(S.pl) return Promise.resolve(S.pl);
    return Promise.all([D.api('rosters').catch(function(){ return null; }), D.api('freeAgents').catch(function(){ return null; })]).then(function(r){
      var own = {}, ids = [];
      arr(r[0] && r[0].rosters && r[0].rosters.franchise).forEach(function(f){ arr(f.player).forEach(function(p){ own[p.id] = f.id; ids.push(p.id); }); });
      arr(r[1] && r[1].freeAgents && r[1].freeAgents.leagueUnit && r[1].freeAgents.leagueUnit.player).forEach(function(p){ ids.push(p.id); });
      return D.players(ids).then(function(){ S.pl = ids.map(function(id){ var i = D.pinfo(id); return { id:id, n:i[0], pos:i[1], tm:i[2], own:own[id] || '' }; }).filter(function(p){ return D.OURPOS ? (D.OURPOS[p.pos] || p.own) : true; }); return S.pl; });
    });
  }
  function find(q, n){ q = String(q || '').toLowerCase().trim(); if(q.length < 2 || !S.pl) return []; return S.pl.filter(function(p){ return p.n.toLowerCase().indexOf(q) > -1; }).sort(function(a, b){ return (b.own ? 1 : 0) - (a.own ? 1 : 0) || a.n.localeCompare(b.n); }).slice(0, n || 8); }
  // photos: fit inside 1600px, saved as WebP
  function shrink(file, max){
    return new Promise(function(res, rej){ var img = new Image(); img.onload = function(){ var s = Math.min(1, max / Math.max(img.width, img.height)), c = document.createElement('canvas'); c.width = Math.round(img.width * s); c.height = Math.round(img.height * s); var x = c.getContext('2d'); x.imageSmoothingQuality = 'high'; x.drawImage(img, 0, 0, c.width, c.height); c.toBlob(function(b){ b ? res(b) : rej(); }, 'image/webp', .86); URL.revokeObjectURL(img.src); }; img.onerror = rej; img.src = URL.createObjectURL(file); });
  }
  function upload(file, id, max){ return shrink(file, max).then(function(b){ if(b.size > 1.9e6) throw 'That photo is too big even after shrinking.'; return D.saveImg(id, b); }).then(function(r){ if(!r.ok) throw r.error || 'Upload failed.'; return D.LOCAL ? 'dcImg:' + id : r.url; }); }

  /* ---------- stories ---------- */
  function stories(){
    if(S.ed) return editor();
    var L = S.st.slice().sort(function(a, b){ return b.at - a.at; });
    $('pb').innerHTML = '<div class="pdbar"><button class="btn" type="button" data-new>+ NEW STORY</button><span class="mono">' + L.length + ' STORIES · THEY APPEAR ON THE DISPATCH PAGE, THE HOME PAGE, AND EVERY TEAM AND PLAYER THEY TAG</span></div>' +
      '<div class="pdl">' + (L.map(function(s){ return '<div class="pdi' + (s.draft ? ' dr' : '') + '">' + D.storyCard(s, true) + '<div class="pdia mono">' + (s.draft ? '<span class="pdd">DRAFT</span>' : s.pin ? '<span class="pdp">PINNED</span>' : '') + (mine(s) ? '<button type="button" data-edit="' + esc(s.id) + '">EDIT</button>' : '') + (S.me.commish ? '<button type="button" data-pin="' + esc(s.id) + '">' + (s.pin ? 'UNPIN' : 'PIN TO TOP') + '</button>' : '') + (mine(s) ? '<button type="button" class="x" data-del="' + esc(s.id) + '">DELETE</button>' : '') + '</div></div>'; }).join('') || '<div class="ld mono">NO STORIES YET. WRITE THE FIRST ONE.</div>') + '</div>';
  }
  function editor(){
    var s = S.ed;
    $('pb').innerHTML = '<div class="pded card"><div class="bar mono"><span>' + (s.id ? 'EDIT STORY' : 'NEW STORY') + '</span><button type="button" class="lnk mono" data-back>← ALL STORIES</button></div><div class="ef pad">' +
      '<div class="pdph">' + (s.img ? '<img src="' + esc(D.pressImg(s.img)) + '" alt="">' : '<span class="mono">NO PHOTO · THE FIRST TEAM’S HELMET IS USED</span>') + '<label class="btn ghost2 sm">' + (s.img ? 'REPLACE PHOTO' : 'ADD PHOTO') + '<input type="file" accept="image/*" data-photo hidden></label>' + (s.img ? '<button type="button" class="btn ghost2 sm" data-nophoto>REMOVE</button>' : '') + '</div>' +
      '<label class="mono">KICKER (SMALL LINE ABOVE THE HEADLINE)<input name="kick" maxlength="60" value="' + esc(s.kick || '') + '" placeholder="Week 10 · Trade Rumors"></label>' +
      '<label class="mono">HEADLINE<input name="head" maxlength="140" value="' + esc(s.head || '') + '" required></label>' +
      '<label class="mono">STORY<textarea name="body" rows="12" placeholder="Blank line between paragraphs.">' + esc(s.body || '') + '</textarea></label>' +
      '<div class="mono pdlab">TEAMS IN THIS STORY · IT SHOWS ON EACH TEAM’S PAGE</div><div class="pdteams">' + D.IDS.map(function(id){ var on = (s.teams || []).indexOf(id) > -1; return '<button type="button" class="pdt' + (on ? ' on' : '') + '" data-tt="' + id + '" title="' + esc(D.NAME[id]) + '"><img src="' + D.helm(id) + '" alt=""><span class="mono">' + esc(D.SHORT[id]) + '</span></button>'; }).join('') + '</div>' +
      '<div class="mono pdlab">PLAYERS IN THIS STORY · IT SHOWS ON EACH PLAYER’S CARD</div><div class="pdpl">' + (s.players || []).map(function(p, i){ return '<span class="ptag pl">' + esc(p.n) + '<button type="button" data-rmp="' + i + '" aria-label="Remove">×</button></span>'; }).join('') + '<div class="pdsrch"><input data-ps placeholder="Add a player…" autocomplete="off"><div class="pdsr" id="psr"></div></div></div>' +
      '<div class="pdact"><button class="btn" type="button" data-pub>' + (s.id && !s.draft ? 'SAVE CHANGES' : 'PUBLISH') + '</button><button class="btn ghost2" type="button" data-draft>SAVE AS DRAFT</button></div></div></div>';
    players();
  }
  function readEd(){ var p = $('pb'); S.ed.kick = p.querySelector('[name=kick]').value.trim(); S.ed.head = p.querySelector('[name=head]').value.trim(); S.ed.body = p.querySelector('[name=body]').value.replace(/\s+$/, ''); }
  function pubStory(draft){
    readEd(); var s = S.ed; if(!s.head){ toast('ADD A HEADLINE', true); return; }
    var first = !s.id; if(first){ s.id = uid('s'); var b = by(); s.by = b.by; s.byT = b.byT; s.mid = b.mid; s.at = Date.now(); }
    if(!draft && s.draft) s.at = Date.now();
    s.draft = !!draft; s.ed = Date.now();
    var keep = JSON.parse(JSON.stringify(s));
    update('stories', function(cur){ var L = cur.items = arr(cur.items); var i = L.map(function(x){ return x.id; }).indexOf(keep.id); if(i > -1) L[i] = keep; else L.unshift(keep); cur.items = L.slice(0, 400); }, draft ? 'DRAFT SAVED' : 'STORY PUBLISHED').then(function(){ S.ed = null; draw(); });
  }

  /* ---------- quick hits ---------- */
  function hits(){
    var L = S.hi.slice().sort(function(a, b){ return b.at - a.at; });
    $('pb').innerHTML = '<div class="pded card"><div class="bar mono"><span>NEW QUICK HIT</span><span>RUNS IN THE TICKER ON THE HOME PAGE AND THE WIRE</span></div><div class="ef pad"><label class="mono">ONE OR TWO LINES<textarea name="qh" rows="2" maxlength="220" placeholder="Sources: the Ligers have called every team about Kirk Cousins."></textarea></label>' +
      '<div class="pdrow"><label class="mono">TEAM (OPTIONAL)<select name="qt"><option value="">— none —</option>' + D.IDS.map(function(id){ return '<option value="' + id + '">' + esc(D.NAME[id]) + '</option>'; }).join('') + '</select></label><label class="mono">KEEP IT UP FOR<select name="qd"><option value="3">3 DAYS</option><option value="7" selected>1 WEEK</option><option value="14">2 WEEKS</option><option value="0">UNTIL DELETED</option></select></label><button class="btn" type="button" data-qpost>POST</button></div></div></div>' +
      '<div class="pdl hl">' + (L.map(function(h){ var gone = h.exp && h.exp < Date.now(); return '<div class="pdh' + (gone ? ' gone' : '') + '">' + (h.team ? '<img src="' + D.helm(h.team) + '" alt="">' : '<span></span>') + '<div><b>' + esc(h.text) + '</b><i class="mono">' + esc(String(h.by).toUpperCase()) + ' · ' + D.ago(h.at) + (gone ? ' · EXPIRED' : h.exp ? ' · UNTIL ' + new Date(h.exp).toLocaleDateString('en-US', { month:'short', day:'numeric' }).toUpperCase() : '') + '</i></div>' + (mine(h) ? '<button type="button" class="x mono" data-qdel="' + esc(h.id) + '">DELETE</button>' : '') + '</div>'; }).join('') || '<div class="ld mono">NO QUICK HITS YET.</div>') + '</div>';
  }

  /* ---------- player graphics ---------- */
  function gfx(){
    var ids = Object.keys(S.gx);
    $('pb').innerHTML = '<div class="pded card"><div class="bar mono"><span>ADD A PLAYER GRAPHIC</span><span>SHOWS AT THE TOP OF THAT PLAYER’S CARD, EVERYWHERE ON THE SITE</span></div><div class="ef pad"><div class="pdsrch"><input data-gs placeholder="Find a player…" autocomplete="off"><div class="pdsr" id="gsr"></div></div><div id="gpick"></div></div></div>' +
      '<div class="pdg">' + (ids.map(function(id){ var g = S.gx[id], i = D.pinfo(id); return '<div class="pdgi"><img src="' + esc(D.pressImg(g.url)) + '" alt=""><div><a href="#" data-card="' + esc(id) + '"><b>' + esc(g.n || i[0]) + '</b></a><i class="mono">' + esc(String(g.by || '').toUpperCase()) + ' · ' + D.ago(g.at) + '</i></div>' + (S.me.commish || g.mid === S.me.mid ? '<button type="button" class="x mono" data-gdel="' + esc(id) + '">REMOVE</button>' : '') + '</div>'; }).join('') || '<div class="ld mono">NO PLAYER GRAPHICS YET.</div>') + '</div>';
    players();
  }
  function gpick(p){
    S.gp = p;
    $('gpick').innerHTML = '<div class="pdgp"><div><b>' + esc(p.n) + '</b><i class="mono">' + esc(p.pos + ' · ' + p.tm) + (p.own ? ' · ' + esc(D.SHORT[p.own]).toUpperCase() : ' · FREE AGENT') + '</i></div><label class="btn">' + (S.gx[p.id] ? 'REPLACE GRAPHIC' : 'UPLOAD GRAPHIC') + '<input type="file" accept="image/*" data-gfile hidden></label></div><div class="fine mono">WIDE IMAGES LOOK BEST (ABOUT 16:9). THEY’RE SHRUNK TO 1600PX AND SAVED AS WEBP.</div>';
  }

  /* ---------- weekly Dispatch: same editor the commissioner uses ---------- */
  function weekly(){
    $('pb').innerHTML = '<div class="gate card wk"><div><div class="kick mono">THE WEEKLY DISPATCH</div><h2>Draft the week’s stories, takes and awards</h2><p>The weekly Dispatch editor opens on the Commish desk. ' + (S.me.media ? 'Your press pass can edit and publish the Dispatch tab there; nothing else on that desk is open to you.' : '') + '</p><a class="btn" href="' + D.href('commish') + '#dispatch">OPEN THE DISPATCH EDITOR →</a></div></div>';
  }

  /* ---------- events ---------- */
  document.addEventListener('click', function(e){
    var t = e.target;
    if(t.closest('[data-new]')){ S.ed = { teams:[], players:[] }; draw(); return; }
    if(t.closest('[data-back]')){ S.ed = null; draw(); return; }
    var ed = t.closest('[data-edit]'); if(ed){ var s = S.st.filter(function(x){ return x.id === ed.getAttribute('data-edit'); })[0]; if(s){ S.ed = JSON.parse(JSON.stringify(s)); S.ed.teams = S.ed.teams || []; S.ed.players = S.ed.players || []; draw(); } return; }
    var dl = t.closest('[data-del]'); if(dl){ if(!confirm('Delete this story?')) return; var id = dl.getAttribute('data-del'); update('stories', function(cur){ cur.items = arr(cur.items).filter(function(x){ return x.id !== id; }); }, 'STORY DELETED').then(draw); return; }
    var pn = t.closest('[data-pin]'); if(pn){ var pid = pn.getAttribute('data-pin'); update('stories', function(cur){ arr(cur.items).forEach(function(x){ if(x.id === pid) x.pin = !x.pin; }); }, 'SAVED').then(draw); return; }
    var tt = t.closest('[data-tt]'); if(tt && S.ed){ readEd(); var tid = tt.getAttribute('data-tt'), T = S.ed.teams, k = T.indexOf(tid); if(k > -1) T.splice(k, 1); else T.push(tid); tt.classList.toggle('on', k < 0); return; }
    var rp = t.closest('[data-rmp]'); if(rp && S.ed){ readEd(); S.ed.players.splice(+rp.getAttribute('data-rmp'), 1); editor(); return; }
    var ap = t.closest('[data-addp]'); if(ap && S.ed){ readEd(); var p = S.pl.filter(function(x){ return x.id === ap.getAttribute('data-addp'); })[0]; if(p && !S.ed.players.some(function(x){ return x.id === p.id; })){ S.ed.players.push({ id:p.id, n:p.n }); if(p.own && S.ed.teams.indexOf(p.own) < 0) S.ed.teams.push(p.own); } editor(); var ps = document.querySelector('[data-ps]'); if(ps) ps.focus(); return; }
    if(t.closest('[data-pub]')){ pubStory(false); return; }
    if(t.closest('[data-draft]')){ pubStory(true); return; }
    if(t.closest('[data-nophoto]') && S.ed){ readEd(); S.ed.img = ''; editor(); return; }
    if(t.closest('[data-qpost]')){ var p2 = $('pb'), tx = p2.querySelector('[name=qh]').value.trim(); if(!tx){ toast('WRITE SOMETHING FIRST', true); return; } var d = +p2.querySelector('[name=qd]').value, b = by(), h = { id:uid('h'), text:tx, team:p2.querySelector('[name=qt]').value, at:Date.now(), exp:d ? Date.now() + d * 864e5 : 0, by:b.by, mid:b.mid };
      update('hits', function(cur){ cur.items = [h].concat(arr(cur.items)).slice(0, 200); }, 'QUICK HIT POSTED').then(draw); return; }
    var qd = t.closest('[data-qdel]'); if(qd){ var qid = qd.getAttribute('data-qdel'); update('hits', function(cur){ cur.items = arr(cur.items).filter(function(x){ return x.id !== qid; }); }, 'DELETED').then(draw); return; }
    var gp = t.closest('[data-gpick]'); if(gp){ var pp = S.pl.filter(function(x){ return x.id === gp.getAttribute('data-gpick'); })[0]; if(pp){ $('gsr').innerHTML = ''; document.querySelector('[data-gs]').value = pp.n; gpick(pp); } return; }
    var gd = t.closest('[data-gdel]'); if(gd){ if(!confirm('Remove this graphic?')) return; var gid = gd.getAttribute('data-gdel'); update('pgfx', function(cur){ cur.map = cur.map || {}; delete cur.map[gid]; }, 'GRAPHIC REMOVED').then(draw); return; }
  });
  document.addEventListener('input', function(e){
    var t = e.target;
    if(t.matches('[data-ps]')){ players().then(function(){ $('psr').innerHTML = find(t.value).map(function(p){ return '<button type="button" data-addp="' + esc(p.id) + '"><b>' + esc(p.n) + '</b><i class="mono">' + esc(p.pos + ' · ' + p.tm) + (p.own ? ' · ' + esc(D.SHORT[p.own]).toUpperCase() : '') + '</i></button>'; }).join(''); }); }
    if(t.matches('[data-gs]')){ players().then(function(){ $('gsr').innerHTML = find(t.value).map(function(p){ return '<button type="button" data-gpick="' + esc(p.id) + '"><b>' + esc(p.n) + '</b><i class="mono">' + esc(p.pos + ' · ' + p.tm) + (S.gx[p.id] ? ' · HAS A GRAPHIC' : '') + '</i></button>'; }).join(''); }); }
  });
  document.addEventListener('change', function(e){
    var t = e.target;
    if(t.matches('[data-photo]') && t.files[0] && S.ed){ readEd(); toast('UPLOADING…'); var sid = S.ed.pid || (S.ed.pid = uid('s')); upload(t.files[0], sid, 1600).then(function(u){ S.ed.img = u + (D.LOCAL ? '' : ''); toast('PHOTO ADDED'); editor(); }).catch(function(m){ toast(typeof m === 'string' ? m : 'UPLOAD FAILED', true); }); }
    if(t.matches('[data-gfile]') && t.files[0] && S.gp){ var p = S.gp, b = by(); toast('UPLOADING…'); upload(t.files[0], 'p' + p.id, 1600).then(function(u){ return update('pgfx', function(cur){ cur.map = cur.map || {}; cur.map[p.id] = { url:u, n:p.n, at:Date.now(), by:b.by, mid:b.mid }; }, 'GRAPHIC SAVED'); }).then(function(){ S.gp = null; draw(); }).catch(function(m){ toast(typeof m === 'string' ? m : 'UPLOAD FAILED', true); }); }
  });
})();
