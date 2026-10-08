(function(){
  var D = DC, $ = D.$, esc = D.esc, arr = D.arr;
  var S = { tab:(location.hash || '#dispatch').slice(1), C:null, w:'', T:null, cal:null, law:null };
  var AW = ['Team of the Week', 'Biggest Bust', 'Luckiest Win'];
  function toast(m, bad){ var t = $('toast'); t.textContent = m; t.className = 'toast mono' + (bad ? ' bad' : ''); t.hidden = false; clearTimeout(t._h); t._h = setTimeout(function(){ t.hidden = true; }, 4200); }
  function done(r, what){ if(r && r.ok) toast(r.demo ? 'SAVED IN THIS BROWSER (PREVIEW)' : what + ' SAVED'); else toast((r && r.error) || 'COULDN\u2019T SAVE', true); return r && r.ok; }
  function teamSel(name, val, blank){ return '<select name="' + name + '">' + (blank ? '<option value="">\u2014 none \u2014</option>' : '') + D.IDS.map(function(id){ return '<option value="' + id + '"' + (id === val ? ' selected' : '') + '>' + esc(D.NAME[id]) + '</option>'; }).join('') + '</select>'; }

  D.shell('commish').then(function(me){
    if(!me.commish){ $('cb').innerHTML = '<div class="gate card"><img src="img/hocking-hills-2026.webp" alt=""><div><div class="kick mono">COMMISSIONER ONLY</div><h2>Nothing to see here</h2><p>This desk is for the commissioner. ' + (me.franchise ? 'Your login isn\u2019t set up as commissioner.' : 'Sign in first.') + '</p>' + (me.franchise ? '' : '<button class="btn" type="button" id="gi">SIGN IN</button>') + '</div></div>'; if($('gi')) $('gi').addEventListener('click', D.signIn); return; }
    $('ctabs').hidden = false; draw();
  });
  function draw(){
    [].forEach.call(document.querySelectorAll('#ctabs a'), function(a){ a.classList.toggle('on', a.getAttribute('data-t') === S.tab); });
    ({ dispatch:dispatch, teams:teams, calendar:calendar, bylaws:bylaws, lineups:lineups }[S.tab] || dispatch)();
  }

  /* ---------- the Dispatch ---------- */
  function dispatch(){
    if(!S.C){ $('cb').innerHTML = '<div class="ld mono">LOADING THE DISPATCH\u2026</div>'; D.column().then(function(c){ S.C = c && c.weeks ? c : { weeks:{} }; dispatch(); }); return; }
    var ks = Object.keys(S.C.weeks).sort(function(a, b){ return a - b; }), next = String((+ks[ks.length - 1] || 0) + 1);
    if(!S.w) S.w = ks[ks.length - 1] || '1';
    var W = S.C.weeks[S.w] || { dispatch:[], takes:{}, awards:{} }, Dp = arr(W.dispatch);
    if(!Dp.length) Dp = [{ kick:'', head:'', dek:'', id:'' }];
    function story(s, i){
      return '<div class="ed st3" data-i="' + i + '"><div class="edh mono"><span>' + (i ? 'STORY ' + (i + 1) : 'LEAD STORY') + '</span><span class="eb">' + (i ? '<button type="button" data-up="' + i + '">\u2191</button>' : '') + '<button type="button" data-del="' + i + '">REMOVE</button></span></div>' +
        '<div class="ef two2"><label class="mono">KICKER<input name="kick" value="' + esc(s.kick) + '" placeholder="Week ' + esc(S.w) + ' · The Great Divide"></label><label class="mono">TEAM (HELMET)' + teamSel('id', s.id, 1) + '</label></div>' +
        '<label class="mono">HEADLINE<input name="head" value="' + esc(s.head) + '"></label><label class="mono">STORY<textarea name="dek" rows="' + (i ? 3 : 5) + '">' + esc(s.dek) + '</textarea></label></div>';
    }
    var aw = W.awards || {}, ak = Object.keys(aw); AW.forEach(function(a){ if(ak.indexOf(a) < 0) ak.push(a); });
    $('cb').innerHTML = '<div class="edbar"><div class="weeks">' + ks.map(function(k){ return '<a href="#dispatch" data-w="' + k + '" class="' + (k === S.w ? 'on' : '') + '">' + k + '</a>'; }).join('') + (S.C.weeks[next] ? '' : '<a href="#dispatch" data-w="' + next + '" class="' + (next === S.w ? 'on' : '') + '">+ WK ' + next + '</a>') + '</div><button class="btn" type="button" id="dsave">PUBLISH WEEK ' + esc(S.w) + '</button></div>' +
      '<div class="edgrid"><div><article class="card"><div class="bar mono"><span>STORIES</span><span>FIRST ONE LEADS THE HOME PAGE</span></div><div id="stories">' + Dp.map(story).join('') + '</div><div class="ef pad"><button class="btn ghost2" type="button" id="addst">+ ADD STORY</button></div></article>' +
      '<article class="card" style="margin-top:24px"><div class="bar mono"><span>AROUND THE LEAGUE</span><span>ONE TAKE PER TEAM</span></div><div class="ef pad takes2">' + D.IDS.map(function(id){ return '<label class="mono tk2"><span><img src="' + D.helm(id) + '" alt="">' + esc(D.NAME[id]) + '</span><textarea name="take" data-id="' + id + '" rows="3">' + esc((W.takes || {})[id] || '') + '</textarea></label>'; }).join('') + '</div></article></div>' +
      '<aside><article class="card"><div class="bar mono"><span>AWARDS</span></div><div class="ef pad" id="awards">' + ak.map(function(k){ var A = D.award(aw[k]); return '<div class="ed aw2"><label class="mono">AWARD<input name="an" value="' + esc(k) + '"></label><label class="mono">TEAM' + teamSel('aid', A.id, 1) + '</label><label class="mono">WHY<textarea name="at" rows="3">' + esc(A.text) + '</textarea></label></div>'; }).join('') + '</div></article>' +
      '<div class="note mono" style="color:#9FB4CC">PUBLISHING UPDATES THE HOME PAGE AND THE DISPATCH ARCHIVE RIGHT AWAY.</div></aside></div>';
  }
  function readWeek(){
    var st = [].map.call(document.querySelectorAll('#stories .st3'), function(el){ return { kick:el.querySelector('[name=kick]').value.trim(), head:el.querySelector('[name=head]').value.trim(), dek:el.querySelector('[name=dek]').value.trim(), id:el.querySelector('[name=id]').value }; }).filter(function(s){ return s.head || s.dek; });
    var tk = {}; [].forEach.call(document.querySelectorAll('textarea[name=take]'), function(t){ if(t.value.trim()) tk[t.getAttribute('data-id')] = t.value.trim(); });
    var aw = {}; [].forEach.call(document.querySelectorAll('#awards .aw2'), function(el){ var n = el.querySelector('[name=an]').value.trim(), t = el.querySelector('[name=at]').value.trim(); if(n && t) aw[n] = { text:t, id:el.querySelector('[name=aid]').value }; });
    return { dispatch:st, takes:tk, awards:aw };
  }
  function keepWeek(){ if(document.getElementById('stories')) S.C.weeks[S.w] = readWeek(); }

  /* ---------- team names & helmets ---------- */
  function teams(){
    if(!S.T){ D.content('teams').then(function(t){ S.T = t || {}; teams(); }); $('cb').innerHTML = '<div class="ld mono">LOADING\u2026</div>'; return; }
    $('cb').innerHTML = '<article class="card" style="margin-bottom:44px"><div class="bar mono"><span>TEAM NAMES & HELMETS</span><span>SHOWS EVERYWHERE ON THE SITE</span></div>' + D.IDS.map(function(id){ var o = S.T[id] || {};
      return '<div class="trow" data-id="' + id + '"><label class="hpick" title="Upload a new helmet"><img src="' + D.helm(id) + '" alt=""><input type="file" accept="image/*" hidden><span class="mono">CHANGE</span></label>' +
        '<label class="mono">FULL NAME<input name="name" value="' + esc(o.name || D.NAME[id]) + '"></label><label class="mono">SHORT NAME<input name="short" value="' + esc(o.short || D.SHORT[id]) + '" maxlength="14"></label><span class="mono fid">#' + id + '</span></div>';
    }).join('') + '<div class="ef pad" style="display:flex;justify-content:flex-end"><button class="btn" type="button" id="tsave">SAVE TEAMS</button></div></article>';
  }
  function shrink(file){
    return new Promise(function(res, rej){
      var img = new Image(); img.onload = function(){ var s = Math.min(1, 520 / Math.max(img.width, img.height)), c = document.createElement('canvas'); c.width = Math.round(img.width * s); c.height = Math.round(img.height * s);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); c.toBlob(function(b){ b ? res(b) : rej(); }, 'image/webp', .86); URL.revokeObjectURL(img.src); };
      img.onerror = rej; img.src = URL.createObjectURL(file);
    });
  }

  /* ---------- calendar ---------- */
  function calendar(){
    if(!S.cal){ D.content('calendar').then(function(c){ S.cal = arr(c); if(!S.cal.length) S.cal.push({ date:'', time:'', title:'Trade Deadline', kind:'TRADE' }); calendar(); }); $('cb').innerHTML = '<div class="ld mono">LOADING\u2026</div>'; return; }
    function row(e, i){ return '<div class="crow" data-i="' + i + '"><label class="mono">DATE<input type="date" name="date" value="' + esc(e.date) + '"></label><label class="mono">TIME<input type="time" name="time" value="' + esc(e.time || '') + '"></label><label class="mono">WHAT<input name="title" value="' + esc(e.title) + '"></label><label class="mono">TYPE<select name="kind">' + ['TRADE', 'WAIVERS', 'DRAFT', 'LEAGUE'].map(function(k){ return '<option' + (k === e.kind ? ' selected' : '') + '>' + k + '</option>'; }).join('') + '</select></label><button type="button" class="x2" data-cdel="' + i + '" aria-label="Remove">\u00d7</button></div>'; }
    $('cb').innerHTML = '<article class="card" style="max-width:900px;margin-bottom:44px"><div class="bar mono"><span>LEAGUE CALENDAR</span><span>WAIVER RUNS FROM MFL SHOW AUTOMATICALLY</span></div><div id="crows">' + S.cal.map(row).join('') + '</div>' +
      '<div class="ef pad" style="display:flex;justify-content:space-between"><button class="btn ghost2" type="button" id="cadd">+ ADD DATE</button><button class="btn" type="button" id="csave">SAVE CALENDAR</button></div></article>';
  }
  function readCal(){ return [].map.call(document.querySelectorAll('#crows .crow'), function(el){ return { date:el.querySelector('[name=date]').value, time:el.querySelector('[name=time]').value, title:el.querySelector('[name=title]').value.trim(), kind:el.querySelector('[name=kind]').value }; }); }

  /* ---------- by-laws ---------- */
  function bylaws(){
    if(!S.law){ D.content('bylaws').then(function(b){ S.law = b || { text:'' }; bylaws(); }); $('cb').innerHTML = '<div class="ld mono">LOADING\u2026</div>'; return; }
    $('cb').innerHTML = '<article class="card" style="max-width:900px;margin-bottom:44px"><div class="bar mono"><span>BY-LAWS</span><span>SHOWS ON THE RULES PAGE</span></div><div class="ef pad"><div class="mono hint3">START A LINE WITH ## FOR A HEADING, - FOR A BULLET. BLANK LINE = NEW PARAGRAPH.</div><textarea id="law" rows="22" placeholder="## Keepers&#10;- Each team keeps up to 3 players&#10;&#10;## Dues&#10;$100, paid before the draft">' + esc(S.law.text || '') + '</textarea><div style="display:flex;justify-content:flex-end"><button class="btn" type="button" id="lsave">SAVE BY-LAWS</button></div></div></article>';
  }

  /* ---------- lineups for any team ---------- */
  function lineups(){
    $('cb').innerHTML = '<article class="card" style="margin-bottom:44px"><div class="bar mono"><span>SET ANY TEAM\u2019S LINEUP</span><span>SENT TO MFL AS COMMISSIONER</span></div><div class="lgrid2">' + D.IDS.map(function(id){ return '<a href="' + D.href('myteam', 'f=' + id) + '"><img src="' + D.helm(id) + '" alt=""><b>' + esc(D.NAME[id]) + '</b><span class="mono">SET LINEUP \u2192</span></a>'; }).join('') + '</div></article>';
  }

  window.addEventListener('hashchange', function(){ if(S.tab === 'dispatch' && S.C) keepWeek(); S.tab = (location.hash || '#dispatch').slice(1); if(!$('ctabs').hidden) draw(); });
  document.addEventListener('click', function(e){
    var t = e.target;
    var wk = t.closest('[data-w]'); if(wk){ e.preventDefault(); keepWeek(); S.w = wk.getAttribute('data-w'); dispatch(); return; }
    if(t.id === 'addst'){ keepWeek(); var W = S.C.weeks[S.w] = S.C.weeks[S.w] || { dispatch:[], takes:{}, awards:{} }; W.dispatch = arr(W.dispatch).concat([{ kick:'', head:'', dek:'', id:'' }]); dispatch(); return; }
    var up = t.closest('[data-up]'); if(up){ keepWeek(); var i = +up.getAttribute('data-up'), L = S.C.weeks[S.w].dispatch; if(L[i]){ var x = L[i]; L[i] = L[i - 1]; L[i - 1] = x; } dispatch(); return; }
    var del = t.closest('[data-del]'); if(del){ var el = document.querySelector('.st3[data-i="' + del.getAttribute('data-del') + '"]'); if(el) el.remove(); keepWeek(); dispatch(); return; }
    if(t.id === 'dsave'){ keepWeek(); var w = S.C.weeks[S.w]; if(!w.dispatch.length){ toast('ADD AT LEAST ONE STORY', true); return; } t.disabled = true; D.save('column', S.C).then(function(r){ t.disabled = false; done(r, 'WEEK ' + S.w); }); return; }
    if(t.id === 'tsave'){
      t.disabled = true; var T = {};
      [].forEach.call(document.querySelectorAll('.trow'), function(r){ var id = r.getAttribute('data-id'), o = S.T[id] || {}; T[id] = { name:r.querySelector('[name=name]').value.trim(), short:r.querySelector('[name=short]').value.trim(), helm:o.helm || '' }; if(!T[id].helm) delete T[id].helm; });
      D.save('teams', T).then(function(r){ t.disabled = false; if(done(r, 'TEAMS')){ S.T = T; Object.keys(T).forEach(function(id){ if(T[id].name) D.NAME[id] = T[id].name; if(T[id].short) D.SHORT[id] = T[id].short; }); } });
      return;
    }
    if(t.id === 'cadd'){ S.cal = readCal().concat([{ date:'', time:'', title:'', kind:'LEAGUE' }]); calendar(); return; }
    var cd = t.closest('[data-cdel]'); if(cd){ var L2 = readCal(); L2.splice(+cd.getAttribute('data-cdel'), 1); S.cal = L2; calendar(); return; }
    if(t.id === 'csave'){ var L3 = readCal().filter(function(x){ return x.date && x.title; }); t.disabled = true; D.save('calendar', L3).then(function(r){ t.disabled = false; if(done(r, 'CALENDAR')) S.cal = L3.length ? L3 : null; }); return; }
    if(t.id === 'lsave'){ var b = { text:$('law').value, updated:Date.now() }; t.disabled = true; D.save('bylaws', b).then(function(r){ t.disabled = false; if(done(r, 'BY-LAWS')) S.law = b; }); }
  });
  document.addEventListener('change', function(e){
    var inp = e.target; if(inp.type !== 'file' || !inp.files[0]) return;
    var row = inp.closest('.trow'), id = row.getAttribute('data-id'), img = row.querySelector('img');
    shrink(inp.files[0]).then(function(b){ return D.saveImg(id, b); }).then(function(r){
      if(!r.ok) throw r.error;
      img.src = r.url; S.T[id] = S.T[id] || {}; S.T[id].helm = D.LOCAL ? 'local' : r.url;
      toast('HELMET UPLOADED \u2014 HIT SAVE TEAMS');
    }).catch(function(m){ toast(typeof m === 'string' ? m : 'COULDN\u2019T USE THAT IMAGE', true); });
  });
})();
