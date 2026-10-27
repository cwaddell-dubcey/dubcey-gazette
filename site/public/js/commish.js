(function(){
  var D = DC, $ = D.$, esc = D.esc, arr = D.arr;
  var S = { tab:(location.hash || '#dispatch').slice(1), C:null, w:'', T:null, cal:null, law:null, pop:null };
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
    ({ dispatch:dispatch, teams:teams, bylaws:bylaws, lineups:lineups, popups:popups, health:health }[S.tab] || dispatch)();
  }

  /* ---------- the Dispatch ---------- */
  function dispatch(){
    if(!S.C){ $('cb').innerHTML = '<div class="ld mono">LOADING THE DISPATCH\u2026</div>'; Promise.all([D.column(), fetch('data/dispatch-draft.json', { cache:'no-store' }).then(function(r){ return r.ok ? r.json() : null; }).catch(function(){ return null; })]).then(function(r){
      var c = r[0], d = r[1]; S.C = c && c.weeks ? c : { weeks:{} };
      // a prepared draft for a week that isn't published yet loads into the editor; nothing goes live until Publish
      if(d && d.week && d.data && !S.C.weeks[d.week]){ S.C.weeks[d.week] = d.data; if(d.threads) S.C.threads = d.threads; if(d.previews){ S.C.previews = S.C.previews || {}; Object.keys(d.previews).forEach(function(k){ if(!S.C.previews[k]) S.C.previews[k] = d.previews[k]; }); } S.w = String(d.week); setTimeout(function(){ toast('WEEK ' + d.week + ' DRAFT LOADED \u2014 REVIEW, THEN PUBLISH'); }, 50); }
      dispatch(); }); return; }
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
    $('cb').insertAdjacentHTML('afterbegin', '<article class="card" style="margin-bottom:24px"><div class="bar mono"><span>WEEK DATA FOR CLAUDE</span><span>ONE COPY HAS EVERYTHING NEEDED TO WRITE THE DISPATCH</span></div><div class="ef pad wpk"><label class="mono">WEEK<input type="number" id="wpw" min="1" max="18" value="' + esc(S.pw || '') + '"></label><button class="btn" type="button" id="wpack">BUILD + COPY</button><span class="mono" id="wpst"></span>' + (S.pt ? '<textarea id="wpt" readonly>' + esc(S.pt) + '</textarea>' : '') + '</div></article>');
    if(!S.pw) D.doneWeek().then(function(d){ if(d.w && $('wpw') && !$('wpw').value){ S.pw = d.w; $('wpw').value = d.w; } });
  }

  /* ---------- week data pack: results with names, standings, the week's moves, next week's games ---------- */
  function pack(w){
    w = +w; var no = function(){ return null; };
    return Promise.all([D.api('weeklyResults', 'W=' + w), D.api('leagueStandings').catch(no), D.api('transactions').catch(no), D.api('schedule', 'W=' + (w + 1)).catch(no), D.api('rosters').catch(no)]).then(function(r){
      var M = arr(r[0] && r[0].weeklyResults && r[0].weeklyResults.matchup), ids = [], SAL = {};
      if(!M.length) throw 'NO RESULTS FOR WEEK ' + w;
      M.forEach(function(m){ arr(m.franchise).forEach(function(f){ arr(f.player).forEach(function(p){ ids.push(p.id); }); }); });
      arr(r[4] && r[4].rosters && r[4].rosters.franchise).forEach(function(f){ arr(f.player).forEach(function(p){ SAL[p.id] = p.salary; }); });
      var since = Date.now() / 1000 - 8 * 86400, pid = function(x){ return String(x || '').replace(/\|/g, ',').split(',').filter(function(y){ return /^\d{4,5}$/.test(y); }); };
      var TX = arr(r[2] && r[2].transactions && r[2].transactions.transaction).filter(function(t){ return D.num(t.timestamp) >= since && /^(FREE_AGENT|BBID_WAIVER|WAIVER|TRADE|IR|TAXI)/.test(t.type) && !/REQUEST|PROPOSAL/.test(t.type); });
      TX.forEach(function(t){ ids = ids.concat(pid(t.transaction), pid(t.franchise1_gave_up), pid(t.franchise2_gave_up)); });
      return D.players(ids).then(function(){
        var nm = function(id){ var i = D.pinfo(id); return i[0] + ' ' + i[1] + (i[2] ? ' ' + i[2] : ''); };
        var tn = function(id){ return id + ' ' + (D.NAME[id] || id); };
        var day = function(ts){ return new Date(D.num(ts) * 1000).toLocaleString('en-US', { timeZone:'America/New_York', weekday:'short', month:'short', day:'numeric', hour:'numeric', minute:'2-digit' }); };
        var L = ['DUBCEY CHRONICLE \u00b7 WEEK ' + w + ' DATA PACK \u00b7 built ' + day(Date.now() / 1000) + ' ET', 'Key: * = started but should have sat (MFL optimal) \u00b7 ! = benched but belonged in the optimal lineup \u00b7 $ = salary', '', '== WEEK ' + w + ' RESULTS'];
        M.forEach(function(m){
          var F = arr(m.franchise); if(F.length !== 2) return;
          L.push(''); L.push(F.map(function(f){ return tn(f.id) + ' ' + f.score + ' (optimal ' + (f.opt_pts || '?') + ') ' + (f.result || ''); }).join('  vs  '));
          F.forEach(function(f){
            var P = arr(f.player), row = function(p){ return nm(p.id) + ' ' + (p.score == null || p.score === '' ? 'DNP' : p.score) + (p.status === 'starter' && p.shouldStart === '0' ? '*' : '') + (p.status !== 'starter' && p.shouldStart === '1' ? '!' : '') + (SAL[p.id] ? ' $' + SAL[p.id] : ''); };
            L.push('  ' + (D.SHORT[f.id] || f.id) + ' START: ' + P.filter(function(p){ return p.status === 'starter'; }).map(row).join(' | '));
            var B = P.filter(function(p){ return p.status !== 'starter' && (p.score || p.shouldStart === '1'); });
            if(B.length) L.push('  ' + (D.SHORT[f.id] || f.id) + ' BENCH: ' + B.map(row).join(' | '));
          });
        });
        var ST = arr(r[1] && r[1].leagueStandings && r[1].leagueStandings.franchise);
        if(ST.length){ L.push('', '== STANDINGS (MFL order)'); ST.forEach(function(f, i){ L.push((i + 1) + '. ' + tn(f.id) + ' ' + (f.h2hwlt || (f.h2hw + '-' + f.h2hl)) + ' \u00b7 PF ' + f.pf + ' \u00b7 PA ' + f.pa + ' \u00b7 ' + (f.strk || '') + ' \u00b7 DIV ' + (f.divwlt || '') + ' \u00b7 FAAB ' + (f.bbidbalance || '') + ' \u00b7 EFF ' + (f.eff || '')); }); }
        L.push('', '== MOVES, LAST 8 DAYS (newest first)');
        if(!TX.length) L.push('none');
        TX.forEach(function(t){
          var who = D.SHORT[t.franchise] || t.franchise;
          if(/TRADE/.test(t.type)) L.push(day(t.timestamp) + ' \u00b7 TRADE: ' + (D.SHORT[t.franchise] || t.franchise) + ' gave ' + pid(t.franchise1_gave_up).map(nm).join(', ') + ' to ' + (D.SHORT[t.franchise2] || t.franchise2) + ' for ' + pid(t.franchise2_gave_up).map(nm).join(', ') + (t.comments ? ' \u00b7 note: ' + t.comments : ''));
          else { var q = String(t.transaction || '').split('|'), add = pid(q[0]), bid = /BBID/.test(t.type) ? q[1] : '', drop = pid(bid ? q[2] : q[1]);
            L.push(day(t.timestamp) + ' \u00b7 ' + who + ' ' + (bid ? 'WAIVER $' + D.num(bid) : t.type.replace(/_/g, ' ')) + ': ' + (add.length ? '+' + add.map(nm).join(', +') : '') + (drop.length ? ' / -' + drop.map(nm).join(', -') : '')); }
        });
        var NX = arr(r[3] && r[3].schedule && r[3].schedule.weeklySchedule)[0];
        if(NX && arr(NX.matchup).length){ L.push('', '== WEEK ' + (w + 1) + ' MATCHUPS (MFL spread)'); arr(NX.matchup).forEach(function(m){ var F = arr(m.franchise), a = F.filter(function(x){ return x.isHome !== '1'; })[0] || F[0], h = F.filter(function(x){ return x !== a; })[0] || F[1]; if(a && h) L.push(tn(a.id) + ' @ ' + tn(h.id) + (h.spread ? ' \u00b7 home spread ' + h.spread : '')); }); }
        return L.join('\n');
      });
    });
  }

  /* ---------- site health ---------- */
  var DEMOH = { at:Date.now(), svcAt:Date.now() - 6 * 864e5, items:[{ name:'Saved MFL login', ok:true, ms:212, note:'Good. Franchise 0001' }, { name:'Live scoring', ok:true, ms:140, note:'Week 8' }, { name:'Player news (uses saved login)', ok:false, ms:820, note:'No stories found. The login may have expired or MFL changed the page.' }, { name:'ESPN box scores', ok:true, ms:96, note:'14 games, week 8' }] };
  function health(){
    $('cb').innerHTML = '<article class="card" style="margin-bottom:44px"><div class="bar mono"><span>SITE HEALTH</span><span>EVERY FEED THE SITE DEPENDS ON</span></div><div id="hb"><div class="ld mono">CHECKING EVERY FEED\u2026</div></div><div class="ef pad" style="display:flex;justify-content:flex-end"><button class="btn" type="button" id="hrun">CHECK AGAIN</button></div></article>';
    (D.LOCAL ? Promise.resolve(DEMOH) : fetch('/data/health', { credentials:'same-origin', cache:'no-store' }).then(function(r){ return r.json(); })).then(function(h){
      if(!h || !h.items) throw (h && h.error) || 'NO ANSWER';
      var bad = h.items.filter(function(x){ return !x.ok; }), age = h.svcAt ? Math.floor((Date.now() - h.svcAt) / 864e5) : null;
      $('hb').innerHTML = '<div class="hsum"><span>' + (bad.length ? bad.length + ' PROBLEM' + (bad.length > 1 ? 'S' : '') : 'ALL ' + h.items.length + ' FEEDS WORKING') + '</span><i class="mono">' + (age != null ? 'MFL LOGIN SAVED ' + (age ? age + ' DAY' + (age > 1 ? 'S' : '') + ' AGO' : 'TODAY') + ' \u00b7 ' : '') + 'CHECKED ' + new Date(h.at).toLocaleTimeString('en-US', { hour:'numeric', minute:'2-digit' }).toUpperCase() + (h.ver ? ' \u00b7 DEPLOY ' + esc(h.ver) : '') + '</i></div>' +
        h.items.slice().sort(function(a, b){ return a.ok - b.ok; }).map(function(x){ return '<div class="hrow' + (x.ok ? '' : ' bad') + '"><i class="hdot"></i><b>' + esc(x.name) + '</b><span class="mono">' + esc(x.note) + '</span><span class="mono ms">' + x.ms + ' MS</span></div>'; }).join('') +
        (bad.some(function(x){ return /login/i.test(x.name + x.note); }) ? '<div class="fnote warn mono"><span>FIX: SIGN OUT, THEN SIGN BACK IN ON THIS SITE. THAT SAVES A FRESH MFL LOGIN.</span></div>' : '');
    }).catch(function(m){ $('hb').innerHTML = '<div class="ld mono">' + esc(typeof m === 'string' ? m : 'HEALTH CHECK DIDN\u2019T ANSWER') + '</div>'; });
  }
  function readWeek(){
    var st = [].map.call(document.querySelectorAll('#stories .st3'), function(el){ return { kick:el.querySelector('[name=kick]').value.trim(), head:el.querySelector('[name=head]').value.trim(), dek:el.querySelector('[name=dek]').value.trim(), id:el.querySelector('[name=id]').value }; }).filter(function(s){ return s.head || s.dek; });
    var tk = {}; [].forEach.call(document.querySelectorAll('textarea[name=take]'), function(t){ if(t.value.trim()) tk[t.getAttribute('data-id')] = t.value.trim(); });
    var aw = {}; [].forEach.call(document.querySelectorAll('#awards .aw2'), function(el){ var n = el.querySelector('[name=an]').value.trim(), t = el.querySelector('[name=at]').value.trim(); if(n && t) aw[n] = { text:t, id:el.querySelector('[name=aid]').value }; });
    return { dispatch:st, takes:tk, awards:aw };
  }
  function keepWeek(){ if(document.getElementById('stories')) S.C.weeks[S.w] = readWeek(); }

  /* ---------- team names & helmets ---------- */
  // typed week picks → S.T, so re-rendering (add/remove alternate) doesn't lose them
  function keepWk(){ [].forEach.call(document.querySelectorAll('.trow'), function(r){ var id = r.getAttribute('data-id'), o = S.T[id] = S.T[id] || {};
    [].forEach.call(r.querySelectorAll('[data-wk]'), function(inp){ var v = D.weeksOf(inp.value).join(', '), k = inp.getAttribute('data-wk'); if(k === 'main'){ if(v) o.mainWk = v; else delete o.mainWk; } else if(o.alts && o.alts[+k]){ if(v) o.alts[+k].wk = v; else delete o.alts[+k].wk; } }); }); }
  function applyPins(){ D.PIN = {}; D.IDS.forEach(function(id){ var o = S.T[id] || {}, pin = {}; D.weeksOf(o.mainWk).forEach(function(w){ pin[w] = 0; }); (o.alts || []).forEach(function(a, i){ D.weeksOf(a.wk).forEach(function(w){ pin[w] = i + 1; }); }); if(Object.keys(pin).length) D.PIN[id] = pin; }); }
  function teams(){
    if(!S.T){ D.content('teams').then(function(t){ S.T = t || {}; teams(); }); $('cb').innerHTML = '<div class="ld mono">LOADING\u2026</div>'; return; }
    $('cb').innerHTML = '<article class="card" style="margin-bottom:44px"><div class="bar mono"><span>TEAM NAMES & HELMETS</span><span>SHOWS EVERYWHERE ON THE SITE</span></div>' + D.IDS.map(function(id){ var o = S.T[id] || {};
      return '<div class="trow" data-id="' + id + '"><label class="hpick" title="Upload a new main helmet"><img src="' + D.helmPool(id)[0] + '" alt=""><input type="file" accept="image/*" hidden><span class="mono">CHANGE</span></label>' +
        '<label class="mono">FULL NAME<input name="name" value="' + esc(o.name || D.NAME[id]) + '"></label><label class="mono">SHORT NAME<input name="short" value="' + esc(o.short || D.SHORT[id]) + '" maxlength="14"></label><span class="mono fid">#' + id + '</span>' +
        '<div class="talts"><span class="mono">ALTERNATES' + ((o.alts || []).length ? ' \u00b7 RANDOM EACH WEEK UNLESS PICKED \u00b7 WEEK ' + D.nflWeek + ': ' + (D.helmPool(id).indexOf(D.helm(id)) === 0 ? 'MAIN' : 'ALT ' + D.helmPool(id).indexOf(D.helm(id))) + (D.helmPick(id) != null ? ' (PICKED)' : ' (RANDOM)') : '') + '</span>' +
          ((o.alts || []).length ? '<span class="taltc"><span class="talt"><img src="' + D.helmPool(id)[0] + '" alt=""></span><input class="mono" data-wk="main" value="' + esc(o.mainWk || '') + '" placeholder="WEEKS" title="Weeks this helmet always shows, e.g. 3, 7-9"></span>' : '') +
          (o.alts || []).map(function(a, i){ return '<span class="taltc"><span class="talt"><img src="' + esc(D.LOCAL ? (localStorage.getItem('dcImg:' + a.k) || '') : a.url) + '" alt=""><button type="button" data-altrm="' + i + '" aria-label="Remove alternate">\u00d7</button></span><input class="mono" data-wk="' + i + '" value="' + esc(a.wk || '') + '" placeholder="WEEKS" title="Weeks this helmet always shows, e.g. 3, 7-9"></span>'; }).join('') + ((o.alts || []).length < 5 ? '<label class="taltadd mono">+ ADD<input type="file" accept="image/*" data-alt hidden></label>' : '') + '</div></div>';
    }).join('') + '<div class="ef pad" style="display:flex;justify-content:flex-end"><button class="btn" type="button" id="tsave">SAVE TEAMS</button></div></article>';
  }
  // match the built-in helmets: trim empty transparent edges, then fit into the same 480×359 frame
  function shrink(file){
    return new Promise(function(res, rej){
      var img = new Image(); img.onload = function(){
        var W = img.width, H = img.height, a = document.createElement('canvas'); a.width = W; a.height = H; var ax = a.getContext('2d'); ax.drawImage(img, 0, 0);
        var d = ax.getImageData(0, 0, W, H).data, l = W, t = H, r = -1, b = -1;
        for(var y = 0; y < H; y++) for(var x = 0; x < W; x++) if(d[(y * W + x) * 4 + 3] > 16){ if(x < l) l = x; if(x > r) r = x; if(y < t) t = y; if(y > b) b = y; }
        if(r < 0){ l = 0; t = 0; r = W - 1; b = H - 1; }
        var cw = r - l + 1, ch = b - t + 1, FW = 480, FH = 359, s = Math.min(FW / cw, FH / ch), dw = Math.round(cw * s), dh = Math.round(ch * s);
        var c = document.createElement('canvas'); c.width = FW; c.height = FH; var cx = c.getContext('2d'); cx.imageSmoothingQuality = 'high';
        cx.drawImage(a, l, t, cw, ch, Math.round((FW - dw) / 2), Math.round((FH - dh) / 2), dw, dh);
        c.toBlob(function(bl){ bl ? res(bl) : rej(); }, 'image/webp', .88); URL.revokeObjectURL(img.src);
      };
      img.onerror = rej; img.src = URL.createObjectURL(file);
    });
  }

  /* ---------- by-laws ---------- */
  function bylaws(){
    if(!S.law){ D.content('bylaws').then(function(b){ S.law = b || { text:'' }; bylaws(); }); $('cb').innerHTML = '<div class="ld mono">LOADING\u2026</div>'; return; }
    $('cb').innerHTML = '<article class="card" style="max-width:900px;margin-bottom:44px"><div class="bar mono"><span>BY-LAWS</span><span>SHOWS ON THE BYLAWS PAGE</span></div><div class="ef pad"><div class="mono hint3">START A LINE WITH ## FOR A HEADING, - FOR A BULLET. BLANK LINE = NEW PARAGRAPH.</div><textarea id="law" rows="22" placeholder="## Keepers&#10;- Each team keeps up to 3 players&#10;&#10;## Dues&#10;$100, paid before the draft">' + esc(S.law.text || '') + '</textarea><div style="display:flex;justify-content:flex-end"><button class="btn" type="button" id="lsave">SAVE BY-LAWS</button></div></div></article>';
  }

  /* ---------- timed home-page popups, on a weekly calendar (Eastern) ---------- */
  function popups(){
    if(!S.pop){ D.popups().then(function(p){ S.pop = JSON.parse(JSON.stringify(p)); popups(); }); $('cb').innerHTML = '<div class="ld mono">LOADING\u2026</div>'; return; }
    var P = S.pop, now = D.etNow();
    function blocks(p, i){
      var a = D.weekMin(p.sd, p.st), b = D.weekMin(p.ed, p.et), segs = a <= b ? [[a, b]] : [[a, 7 * 1440], [0, b]], out = '';
      segs.forEach(function(s){ for(var d = Math.floor(s[0] / 1440); d * 1440 < s[1] && d < 7; d++){ var x0 = Math.max(s[0], d * 1440) - d * 1440, x1 = Math.min(s[1], (d + 1) * 1440) - d * 1440; if(x1 <= x0) continue;
        out += '<div class="pb k' + (p.kind === 'waivers' ? 'W' : 'N') + (p.on === false ? ' off' : '') + '" style="grid-column:' + (d + 2) + ';top:' + (x0 / 14.4) + '%;height:' + ((x1 - x0) / 14.4) + '%" title="' + esc(p.title) + '"><b>' + esc(p.title) + '</b></div>'; } });
      return out;
    }
    var hrs = ''; for(var t = 0; t < 24; t += 3) hrs += '<span style="top:' + (t / .24) + '%">' + (t === 0 ? '12a' : t < 12 ? t + 'a' : t === 12 ? '12p' : (t - 12) + 'p') + '</span>';
    var cal = '<div class="pcal"><div class="pcd mono"><span></span>' + D.DAYS.map(function(d){ return '<span>' + d.toUpperCase() + '</span>'; }).join('') + '</div><div class="pcg"><div class="pch mono">' + hrs + '</div>' + D.DAYS.map(function(d, i){ return '<div class="pcc" style="grid-column:' + (i + 2) + '"></div>'; }).join('') +
      P.map(blocks).join('') + '<div class="pnow" style="grid-column:' + (Math.floor(now / 1440) + 2) + ';top:' + ((now % 1440) / 14.4) + '%"></div></div></div>';
    function dsel(n, v){ return '<select name="' + n + '">' + D.DAYS.map(function(d){ return '<option' + (d === v ? ' selected' : '') + '>' + d + '</option>'; }).join('') + '</select>'; }
    var list = P.map(function(p, i){
      return '<div class="ed prow" data-i="' + i + '"><div class="edh mono"><span>' + (p.kind === 'waivers' ? 'WAIVER REPORT' : 'MESSAGE') + (D.inWindow(p) && p.on !== false ? ' \u00b7 <em>SHOWING NOW</em>' : '') + '</span><span class="eb"><a class="mono" href="' + D.href('', 'popup=' + encodeURIComponent(p.id)) + '" target="_blank">PREVIEW</a>' + (p.kind === 'waivers' ? '' : '<button type="button" data-pdel="' + i + '">REMOVE</button>') + '</span></div>' +
        '<div class="ef pgrid"><label class="mono">NAME<input name="title" value="' + esc(p.title) + '"></label><label class="mono">FROM' + dsel('sd', p.sd) + '<input type="time" name="st" value="' + esc(p.st) + '"></label><label class="mono">UNTIL' + dsel('ed', p.ed) + '<input type="time" name="et" value="' + esc(p.et) + '"></label><label class="mono onl"><input type="checkbox" name="on"' + (p.on === false ? '' : ' checked') + '> ON</label></div>' +
        (p.kind === 'waivers' ? '' : '<div class="ef two2"><label class="mono">KICKER<input name="kick" value="' + esc(p.kick || '') + '" placeholder="FROM THE COMMISH"></label><label class="mono">BUTTON LINK (OPTIONAL)<input name="link" value="' + esc(p.link || '') + '" placeholder="/scores"></label></div><label class="mono">MESSAGE<textarea name="body" rows="3">' + esc(p.body || '') + '</textarea></label>') + '</div>';
    }).join('');
    $('cb').innerHTML = '<article class="card" style="margin-bottom:24px"><div class="bar mono"><span>THIS WEEK\u2019S POPUPS</span><span>EASTERN TIME \u00b7 REPEATS EVERY WEEK</span></div>' + cal + '</article>' +
      '<article class="card" style="margin-bottom:44px"><div class="bar mono"><span>POPUPS</span><span>ONE SHOWS AT A TIME \u00b7 FIRST IN THE LIST WINS</span></div>' + list + '<div class="ef pad" style="display:flex;justify-content:space-between"><button class="btn ghost2" type="button" id="padd">+ ADD MESSAGE POPUP</button><button class="btn" type="button" id="psave">SAVE POPUPS</button></div></article>';
  }
  function readPop(){
    return [].map.call(document.querySelectorAll('.prow'), function(el){ var p = JSON.parse(JSON.stringify(S.pop[+el.getAttribute('data-i')])); ['title', 'sd', 'st', 'ed', 'et', 'kick', 'link', 'body'].forEach(function(n){ var x = el.querySelector('[name=' + n + ']'); if(x) p[n] = x.value; }); p.on = el.querySelector('[name=on]').checked; return p; });
  }

  /* ---------- lineups for any team ---------- */
  function lineups(){
    $('cb').innerHTML = '<article class="card" style="margin-bottom:44px"><div class="bar mono"><span>SET ANY TEAM\u2019S LINEUP</span><span>SENT TO MFL AS COMMISSIONER</span></div><div class="lgrid2">' + D.IDS.map(function(id){ return '<a href="' + D.href('myteam', 'f=' + id) + '"><img src="' + D.helm(id) + '" alt=""><b>' + esc(D.NAME[id]) + '</b><span class="mono">SET LINEUP \u2192</span></a>'; }).join('') + '</div></article>';
  }

  window.addEventListener('hashchange', function(){ if(S.tab === 'dispatch' && S.C) keepWeek(); S.tab = (location.hash || '#dispatch').slice(1); if(!$('ctabs').hidden) draw(); });
  document.addEventListener('click', function(e){
    var t = e.target;
    var wk = t.closest('[data-w]'); if(wk){ e.preventDefault(); keepWeek(); S.w = wk.getAttribute('data-w'); dispatch(); return; }
    if(t.id === 'hrun'){ health(); return; }
    if(t.id === 'wpack'){ var wv = +$('wpw').value; if(!wv){ toast('PICK A WEEK', true); return; } S.pw = wv; t.disabled = true; $('wpst').textContent = 'BUILDING\u2026';
      pack(wv).then(function(txt){ S.pt = txt; var ta = $('wpt'); if(!ta){ $('wpst').insertAdjacentHTML('afterend', '<textarea id="wpt" readonly></textarea>'); ta = $('wpt'); } ta.value = txt;
        return (navigator.clipboard ? navigator.clipboard.writeText(txt) : Promise.reject()).then(function(){ $('wpst').textContent = 'COPIED \u00b7 ' + txt.length.toLocaleString('en-US') + ' CHARACTERS. PASTE IT TO CLAUDE.'; }, function(){ ta.select(); $('wpst').textContent = 'SELECTED \u2014 PRESS CTRL/CMD+C TO COPY'; });
      }).catch(function(m){ $('wpst').textContent = typeof m === 'string' ? m : 'COULDN\u2019T BUILD IT'; }).then(function(){ t.disabled = false; });
      return; }
    if(t.id === 'addst'){ keepWeek(); var W = S.C.weeks[S.w] = S.C.weeks[S.w] || { dispatch:[], takes:{}, awards:{} }; W.dispatch = arr(W.dispatch).concat([{ kick:'', head:'', dek:'', id:'' }]); dispatch(); return; }
    var up = t.closest('[data-up]'); if(up){ keepWeek(); var i = +up.getAttribute('data-up'), L = S.C.weeks[S.w].dispatch; if(L[i]){ var x = L[i]; L[i] = L[i - 1]; L[i - 1] = x; } dispatch(); return; }
    var del = t.closest('[data-del]'); if(del){ var el = document.querySelector('.st3[data-i="' + del.getAttribute('data-del') + '"]'); if(el) el.remove(); keepWeek(); dispatch(); return; }
    if(t.id === 'dsave'){ keepWeek(); var w = S.C.weeks[S.w]; if(!w.dispatch.length){ toast('ADD AT LEAST ONE STORY', true); return; } t.disabled = true; D.save('column', S.C).then(function(r){ t.disabled = false; done(r, 'WEEK ' + S.w); }); return; }
    var ar = t.closest && t.closest('[data-altrm]'); if(ar){ keepWk(); var rid = ar.closest('.trow').getAttribute('data-id'), oo = S.T[rid] || {}; (oo.alts || []).splice(+ar.getAttribute('data-altrm'), 1); if(D.ALT[rid]) D.ALT[rid].splice(+ar.getAttribute('data-altrm'), 1); applyPins(); var yy = window.scrollY; teams(); window.scrollTo(0, yy); toast('REMOVED \u2014 HIT SAVE TEAMS'); return; }
    if(t.id === 'tsave'){
      keepWk(); t.disabled = true; var T = {};
      [].forEach.call(document.querySelectorAll('.trow'), function(r){ var id = r.getAttribute('data-id'), o = S.T[id] || {}; T[id] = { name:r.querySelector('[name=name]').value.trim(), short:r.querySelector('[name=short]').value.trim(), helm:o.helm || '', alts:o.alts || [] }; if(o.mainWk && T[id].alts.length) T[id].mainWk = o.mainWk; if(!T[id].helm) delete T[id].helm; if(!T[id].alts.length) delete T[id].alts; });
      D.save('teams', T).then(function(r){ t.disabled = false; if(done(r, 'TEAMS')){ S.T = T; Object.keys(T).forEach(function(id){ if(T[id].name) D.NAME[id] = T[id].name; if(T[id].short) D.SHORT[id] = T[id].short; }); applyPins(); var y3 = window.scrollY; teams(); window.scrollTo(0, y3); } });
      return;
    }
    if(t.id === 'padd'){ S.pop = readPop().concat([{ id:'n' + Date.now().toString(36), kind:'note', title:'New message', on:true, sd:'Sun', st:'12:00', ed:'Sun', et:'13:00', kick:'', body:'' }]); popups(); return; }
    var pd = t.closest('[data-pdel]'); if(pd){ var L4 = readPop(); L4.splice(+pd.getAttribute('data-pdel'), 1); S.pop = L4; popups(); return; }
    if(t.id === 'psave'){ var L5 = readPop(); t.disabled = true; D.save('popups', L5).then(function(r){ t.disabled = false; if(done(r, 'POPUPS')){ S.pop = L5; popups(); } }); return; }
    if(t.id === 'lsave'){ var b = { text:$('law').value, updated:Date.now() }; t.disabled = true; D.save('bylaws', b).then(function(r){ t.disabled = false; if(done(r, 'BY-LAWS')) S.law = b; }); }
  });
  document.addEventListener('change', function(e){
    if(e.target.closest('.prow') && S.tab === 'popups'){ S.pop = readPop(); var y = window.scrollY; popups(); window.scrollTo(0, y); return; }
    var inp = e.target; if(inp.type !== 'file' || !inp.files[0]) return;
    var row = inp.closest('.trow'), id = row.getAttribute('data-id'), img = row.querySelector('img');
    if(inp.hasAttribute('data-alt')){
      var o2 = S.T[id] = S.T[id] || {}, used = (o2.alts || []).map(function(a){ return a.k; }), n = 1; while(used.indexOf(id + '_' + n) > -1) n++;
      var k = id + '_' + n;
      shrink(inp.files[0]).then(function(b){ return D.saveImg(k, b); }).then(function(r){ if(!r.ok) throw r.error; keepWk(); (o2.alts = o2.alts || []).push({ k:k, url:D.LOCAL ? 'local' : r.url }); (D.ALT[id] = D.ALT[id] || []).push(D.LOCAL ? (localStorage.getItem('dcImg:' + k) || '') : r.url); var y = window.scrollY; teams(); window.scrollTo(0, y); toast('ALTERNATE ADDED \u2014 HIT SAVE TEAMS'); })
        .catch(function(m2){ toast(typeof m2 === 'string' ? m2 : 'COULDN\u2019T USE THAT IMAGE', true); });
      return;
    }
    shrink(inp.files[0]).then(function(b){ return D.saveImg(id, b); }).then(function(r){
      if(!r.ok) throw r.error;
      img.src = r.url; S.T[id] = S.T[id] || {}; S.T[id].helm = D.LOCAL ? 'local' : r.url;
      toast('HELMET UPLOADED \u2014 HIT SAVE TEAMS');
    }).catch(function(m){ toast(typeof m === 'string' ? m : 'COULDN\u2019T USE THAT IMAGE', true); });
  });
})();
