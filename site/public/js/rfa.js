/* Restricted Free Agency (offseason, mid-August). Each team puts one player in the pool. RDPC draws one a day at random;
   the other 11 teams blind-bid (whole dollars + penalty shots as the tiebreaker) or pass. The original team can match the
   top bid (its salary and its shots) or let him go to the top bidder. Every bid posts once a player is resolved.
   RDPC's console (bids as they come in, the draw, closing, publishing) shows only for the RFA press pass — not the Commish. */
(function(){
  var D = DC, $ = D.$, esc = D.esc, arr = D.arr, num = D.num, YR = (D.NEXT && D.NEXT.year) || (+D.Y + 1);
  var S = { v:null, me:{}, roster:{}, sal:{}, owner:{}, fut:null, busy:false };

  function say(t){ $('rfsay').textContent = t; [].forEach.call(document.querySelectorAll('.rftoast'), function(x){ x.remove(); }); var n = document.createElement('div'); n.className = 'rftoast mono'; n.setAttribute('role', 'status'); n.textContent = t; document.body.appendChild(n); setTimeout(function(){ n.remove(); }, 3400); }
  function P(id){ var i = D.pinfo(id); return { name:i[0], pos:i[1], team:i[2] }; }
  function when(t){ return new Date(t).toLocaleString('en-US', { weekday:'short', month:'short', day:'numeric', hour:'numeric', minute:'2-digit' }); }
  function helm(f, cls){ return '<img class="' + (cls || 'rfh') + '" src="' + D.helm(f) + '" alt="" title="' + esc(D.NAME[f] || f) + '">'; }
  function nm(f){ return esc(D.NAME[f] || f); }
  function money(n){ return '$' + num(n); }
  function shots(n){ n = num(n); return n + ' shot' + (n === 1 ? '' : 's'); }
  function player(id, f, big){ var p = P(id); return '<div class="rfpl' + (big ? ' big' : '') + '">' + D.face(id, p.pos, p.team, big) + '<div><b>' + esc(p.name) + '</b><span class="mono">' + esc(p.pos + ' · ' + p.team) + (S.sal[id] != null ? ' · ' + money(S.sal[id]) + ' NOW' : '') + '</span>' + (f ? '<span class="mono rfor">' + helm(f, 'rfhs') + 'FROM ' + nm(f).toUpperCase() + '</span>' : '') + '</div></div>'; }
  function budget(){ var me = S.me.franchise; if(!me || !S.fut || !S.fut[me]) return null; return S.fut[me].budget - num(S.v.wonSalary); }

  /* ---------- data ---------- */
  function api(body){
    return fetch('/data/rfa', body ? { method:'POST', credentials:'same-origin', headers:{ 'Content-Type':'application/json' }, body:JSON.stringify(body) } : { credentials:'same-origin', cache:'no-store' })
      .then(function(r){ return r.json(); }).then(function(j){ if(j.ok === false) throw j.error || 'That didn’t work.'; return j; });
  }
  function act(body, ok){ if(S.busy) return; S.busy = true; api(body).then(function(v){ S.busy = false; if(v && v.phase) S.v = v; say(ok); draw(); if(body.action === 'reset') load(); }, function(e){ S.busy = false; say(String(e)); }); }
  function load(){
    return Promise.all([api(), D.api('rosters').catch(function(){ return null; }), D.future().then(D.futureCalc).catch(function(){ return null; })]).then(function(r){
      S.v = r[0]; S.fut = r[2];
      arr(r[1] && r[1].rosters && r[1].rosters.franchise).forEach(function(f){ S.roster[f.id] = arr(f.player).map(function(p){ S.owner[p.id] = f.id; S.sal[p.id] = num(p.salary); return p.id; }); });
      var ids = Object.keys(S.owner); arr(S.v.results).forEach(function(x){ ids.push(x.pid); }); if(S.v.cur) ids.push(S.v.cur.pid);
      return D.players(ids);
    }).then(draw).catch(function(e){ $('rfb').innerHTML = '<div class="card"><div class="ld mono">COULDN’T OPEN THE RFA WINDOW. ' + esc(typeof e === 'string' ? e : '') + '<br><button type="button" class="btn ghost2" data-reload>TRY AGAIN</button></div></div>'; });
  }

  /* ---------- views ---------- */
  function draw(){
    var v = S.v, me = S.me.franchise, h = '';
    $('rfst').textContent = { off:'OPENS MID-AUGUST', pool:'POOL OPEN', running:'DAY ' + (v.cur ? v.cur.day : (v.results || []).length) + ' OF ' + (v.nPool || 12), done:'ALL DONE' }[v.phase] || '';
    if(v.admin) h += console_();
    h += '<div class="rfgrid"><div class="rfmain">' + today() + '</div><aside class="rfside">' + mine() + rules() + '</aside></div>';
    h += pool() + results();
    $('rfb').innerHTML = h;
  }
  function today(){
    var v = S.v, c = v.cur, me = S.me.franchise;
    if(v.phase === 'off') return '<article class="card rfday"><div class="bar mono"><span>RESTRICTED FREE AGENCY · ' + YR + '</span><span>OFFSEASON</span></div><div class="rfpad"><h2>The window opens in mid-August.</h2><p>Every team puts one player into the RFA pool. Then, for 12 days, one player a day comes up for blind bids. RDPC runs the show.</p></div></article>';
    if(v.phase === 'pool') return '<article class="card rfday"><div class="bar mono"><span>THE RFA POOL IS OPEN</span><span>' + (v.deadline ? 'DUE ' + esc(when(v.deadline).toUpperCase()) : 'DEADLINE TBA') + '</span></div><div class="rfpad"><h2>' + v.nPool + ' of 12 teams are in.</h2><p>Every team has to put one player in the pool. Pick yours on the right. You can change it until the deadline.</p></div></article>';
    if(c && c.stage === 'done') c = null;
    if(!c) return '<article class="card rfday"><div class="bar mono"><span>' + (v.phase === 'done' ? 'RFA IS IN THE BOOKS' : 'BETWEEN DRAWS') + '</span><span>' + (v.results || []).length + ' OF ' + (v.nPool || 12) + ' DONE</span></div><div class="rfpad"><h2>' + (v.phase === 'done' ? 'Every RFA has a home.' : 'Waiting on RDPC to draw the next player.') + '</h2>' + (v.phase === 'done' ? '<p>Results are below.</p>' : '') + '</div></article>';
    var mineUp = c.fid === me, h = '<article class="card rfday"><div class="bar mono"><span>DAY ' + c.day + ' · UP FOR BIDS</span><span>' + ({ bidding:'BIDDING OPEN', match:'BIDDING CLOSED · MATCH DECISION', decided:'DECIDED · RESULTS POST SOON', done:'FINAL' }[c.stage] || '') + '</span></div><div class="rfpad">' + player(c.pid, c.fid, true);
    if(c.stage === 'bidding'){
      if(mineUp) h += '<div class="rfnote">He’s your player. Sit tight. When bidding closes you’ll see the top bid and decide whether to match it.</div>';
      else if(!me) h += '<div class="rfnote">Sign in with your team account to bid.</div>';
      else { var my = c.mine, cap = budget();
        h += '<form class="rfbid" data-bid><div class="rfrow"><label><span class="mono">YOUR BID ($)</span><input type="number" name="amt" min="1" step="1" inputmode="numeric" value="' + (my && !my.pass ? my.amt : '') + '" required></label><label><span class="mono">PENALTY SHOTS</span><input type="number" name="shots" min="0" max="99" step="1" inputmode="numeric" value="' + (my && !my.pass ? my.shots : 0) + '"></label></div>' +
          '<p class="rfhint mono">HIGHEST BID WINS. A TIE GOES TO MORE SHOTS. WIN IT AND YOU OWE THE SHOTS.' + (cap != null ? ' YOUR ' + YR + ' BUDGET LEFT: ' + money(cap) + '.' : '') + '</p>' +
          '<div class="rfbtns"><button class="btn" type="submit">' + (my && !my.pass ? 'UPDATE MY BID' : 'SUBMIT MY BID') + '</button><button class="btn ghost2" type="button" data-pass>PASS ON HIM</button></div>' +
          (my ? '<div class="rfmine mono">' + (my.pass ? 'YOU PASSED.' : 'YOUR BID: ' + money(my.amt) + ' + ' + shots(my.shots).toUpperCase() + '.') + ' YOU CAN CHANGE IT UNTIL BIDDING CLOSES.</div>' : '') + '</form>'; }
      h += '<div class="rfcount mono">' + c.nBids + ' OF 11 TEAMS HAVE WEIGHED IN</div>';
    } else if(c.stage === 'match'){
      if(mineUp && c.top) h += '<div class="rfmatch"><span class="mono">THE TOP BID</span><b>' + money(c.top.amt) + ' + ' + shots(c.top.shots) + '</b><p>Match it and he stays at ' + money(c.top.amt) + ' — and you take the ' + shots(c.top.shots) + '. Or let him go.</p><div class="rfbtns"><button class="btn" type="button" data-match="match">MATCH AND KEEP HIM</button><button class="btn ghost2" type="button" data-match="decline">LET HIM GO</button></div></div>';
      else h += '<div class="rfnote">Bidding is closed. Waiting on ' + nm(c.fid) + ' to match or let him go.</div>';
    } else h += '<div class="rfnote">Decided. RDPC will post every bid shortly.</div>';
    return h + '</div></article>';
  }
  function mine(){
    var v = S.v, me = S.me.franchise; if(!me) return '';
    var pick = v.pool && v.pool[me], cap = budget();
    var h = '<article class="card rfme"><div class="bar mono"><span>' + nm(me).toUpperCase() + '</span><span>YOUR RFA</span></div><div class="rfpad">';
    if(pick) h += player(pick.pid, null) + (pick.by === 'rdpc' ? '<div class="rfhint mono">RDPC PUT HIM IN FOR YOU.</div>' : '');
    if(v.phase === 'pool' && (!v.deadline || Date.now() < v.deadline)){
      var R = (S.roster[me] || []).slice().sort(function(a, b){ return (S.sal[b] || 0) - (S.sal[a] || 0); });
      h += '<label class="rfsel"><span class="mono">' + (pick ? 'CHANGE YOUR PLAYER' : 'PICK YOUR RFA PLAYER') + '</span><select data-submit><option value="">Choose a player…</option>' + R.map(function(id){ var p = P(id), no = (v.blocked || []).indexOf(id) > -1; return '<option value="' + id + '"' + (pick && pick.pid === id ? ' selected' : '') + (no ? ' disabled' : '') + '>' + esc(p.name + ' · ' + p.pos + ' · $' + (S.sal[id] || 0) + (no ? ' · RFA LAST YEAR' : '')) + '</option>'; }).join('') + '</select></label>';
    } else if(!pick) h += '<p class="rfhint mono">' + (v.phase === 'off' ? 'NOTHING TO DO YET.' : 'NO PLAYER IN THE POOL.') + '</p>';
    if(cap != null) h += '<div class="rfbud"><span class="mono">' + YR + ' AUCTION BUDGET</span><b>' + money(cap) + '</b>' + (num(v.wonSalary) ? '<i class="mono">AFTER ' + money(v.wonSalary) + ' IN RFA WINS</i>' : '') + '</div>';
    return h + '</div></article>';
  }
  function rules(){ return '<article class="card rfrules"><div class="bar mono"><span>HOW RFA WORKS</span></div><ol>' +
    '<li>Every team puts one player from its roster into the RFA pool.</li><li>For 12 days, RDPC draws one player a day at random.</li>' +
    '<li>The other 11 teams submit a blind bid in whole dollars, plus penalty shots, or pass. A bid is the player’s salary for the auction.</li>' +
    '<li>Highest bid wins. A tie goes to the most shots. Still tied? A three-cup flip-cup relay at the draft decides it.</li><li>The original team can match the top bid, keeping him at that salary and taking the shots, or let him go to the top bidder, who takes the shots.</li>' +
    '<li>Bids can’t exceed your ' + YR + ' auction budget, and RFA salaries come out of it.</li><li>A player who was an RFA last year can’t go back in the pool.</li></ol><a class="rfhist mono" href="' + D.href('rfa-history') + '">EVERY RFA SINCE 2018 →</a></article>'; }
  function pool(){
    var v = S.v, ids = Object.keys(v.pool || {}); if(!ids.length || (v.phase !== 'running' && v.phase !== 'done' && !v.admin)) return '';
    var res = {}; arr(v.results).forEach(function(x){ res[x.fid] = x; });
    return '<article class="card rfpool"><div class="bar mono"><span>THE RFA POOL</span><span>' + ids.length + ' PLAYERS</span></div><div class="rfpg">' + D.IDS.filter(function(f){ return v.pool[f]; }).map(function(f){ var x = res[f], up = v.cur && v.cur.fid === f && v.cur.stage !== 'done';
      return '<div class="rfpc' + (x ? ' done' : up ? ' up' : '') + '">' + player(v.pool[f].pid, f) + '<span class="mono rfps">' + (x ? (x.winner === f ? 'KEPT' : 'TO ' + esc((D.SHORT[x.winner] || x.winner).toUpperCase())) + ' · ' + money(x.salary) : up ? 'UP TODAY' : 'IN THE HAT') + '</span></div>'; }).join('') + '</div></article>';
  }
  function results(){
    var L = arr(S.v.results).slice().reverse(); if(!L.length) return '';
    return '<h2 class="rfh2">The results</h2>' + L.map(function(x){
      var bids = Object.keys(x.bids || {}).map(function(f){ return Object.assign({ fid:f }, x.bids[f]); }).sort(function(a, b){ return (b.pass ? -1 : b.amt) - (a.pass ? -1 : a.amt) || (num(b.shots) - num(a.shots)) || a.ts - b.ts; });
      var out = x.decision === 'match' ? nm(x.fid) + ' matched. He stays at ' + money(x.salary) + ' and ' + nm(x.fid) + ' takes ' + shots(x.shots) + '.' : x.decision === 'nobids' ? 'No bids. He stays with ' + nm(x.fid) + '.' :
        x.flip && !x.winner ? x.flip.map(nm).join(' and ') + ' tied at ' + money(x.salary) + ' + ' + shots(x.shots) + '. It goes to a three-cup flip-cup relay at the draft.' :
        nm(x.winner) + ' gets him at ' + money(x.salary) + ' and takes ' + shots(x.shots) + '.' + (x.flip ? ' (Won the flip-cup relay.)' : '');
      var flipBtns = S.v.admin && x.flip && !x.winner ? '<div class="rfbtns">' + x.flip.map(function(f){ return '<button class="btn ghost2" type="button" data-flip="' + x.day + ':' + f + '">' + esc((D.SHORT[f] || f).toUpperCase()) + ' WON THE FLIP CUP</button>'; }).join('') + '</div>' : '';
      return '<article class="card rfres"><div class="bar mono"><span>DAY ' + x.day + '</span><span>' + (x.decision === 'match' ? 'MATCHED' : x.decision === 'nobids' ? 'NO BIDS' : 'LET GO') + '</span></div><div class="rfpad"><div class="rfrh">' + player(x.pid, x.fid) + '<p>' + out + '</p></div>' + (x.note ? '<p class="rfrn">' + esc(x.note) + '</p>' : '') + flipBtns +
        '<table class="rfbt"><thead><tr><th>TEAM</th><th>BID</th><th>SHOTS</th></tr></thead><tbody>' + bids.map(function(b){ var top = x.top && b.fid === x.top.fid; return '<tr class="' + (top ? 'rftop' : '') + '"><td>' + helm(b.fid, 'rfhs') + nm(b.fid) + '</td><td class="mono">' + (b.pass ? 'PASS' : money(b.amt)) + '</td><td class="mono">' + (b.pass ? '–' : num(b.shots)) + '</td></tr>'; }).join('') +
        (11 - bids.length > 0 ? '<tr class="rfnb"><td colspan="3" class="mono">' + (11 - bids.length) + ' TEAM' + (11 - bids.length > 1 ? 'S' : '') + ' DIDN’T BID</td></tr>' : '') + '</tbody></table></div></article>';
    }).join('');
  }
  /* ---------- RDPC's console ---------- */
  function console_(){
    var v = S.v, c = v.cur, h = '<article class="card rfcon"><div class="bar mono"><span>RDPC · RFA CONTROL ROOM</span><span>ONLY YOU SEE THIS</span></div><div class="rfpad">';
    if(v.phase === 'off') h += '<div class="rfrow"><label><span class="mono">POOL DEADLINE (ET)</span><input type="datetime-local" data-dl></label><button class="btn" type="button" data-a="open">OPEN THE RFA POOL</button></div>';
    if(v.phase === 'pool') h += '<div class="rfrow"><label><span class="mono">POOL DEADLINE (ET)</span><input type="datetime-local" data-dl value="' + (v.deadline ? new Date(v.deadline - new Date(v.deadline).getTimezoneOffset() * 6e4).toISOString().slice(0, 16) : '') + '"></label><button class="btn ghost2" type="button" data-a="deadline">SAVE DEADLINE</button><button class="btn" type="button" data-a="start"' + (v.nPool < 12 ? ' title="Not every team is in yet"' : '') + '>LOCK THE POOL · START THE DRAWS</button></div>';
    if(v.phase === 'pool' || v.phase === 'off'){
      h += '<table class="rfbt rfcp"><thead><tr><th>TEAM</th><th>RFA PLAYER</th><th>SET FOR THEM</th></tr></thead><tbody>' + D.IDS.map(function(f){ var p = v.pool[f];
        return '<tr><td>' + helm(f, 'rfhs') + nm(f) + '</td><td>' + (p ? esc(P(p.pid).name) + (p.by === 'rdpc' ? ' <i class="mono">(YOU)</i>' : '') : '<i class="mono rfmiss">NOT IN YET</i>') + '</td><td><select data-assign="' + f + '"><option value="">—</option>' + (S.roster[f] || []).map(function(id){ var no = (v.blocked || []).indexOf(id) > -1; return '<option value="' + id + '"' + (no ? ' disabled' : '') + '>' + esc(P(id).name + ' · $' + (S.sal[id] || 0) + (no ? ' · RFA LAST YEAR' : '')) + '</option>'; }).join('') + '</select></td></tr>'; }).join('') + '</tbody></table>';
    }
    if(v.phase === 'running'){
      if(!c || c.stage === 'done') h += '<div class="rfrow"><button class="btn" type="button" data-a="draw">DRAW DAY ' + ((v.results || []).length + 1) + '’S PLAYER</button><span class="mono rfhint">' + ((v.nPool || 0) - (v.results || []).length) + ' LEFT IN THE HAT</span></div>';
      else {
        var bids = Object.keys(c.bids || {}).map(function(f){ return Object.assign({ fid:f }, c.bids[f]); }).sort(function(a, b){ return (b.pass ? -1 : b.amt) - (a.pass ? -1 : a.amt) || num(b.shots) - num(a.shots) || a.ts - b.ts; });
        var waiting = D.IDS.filter(function(f){ return f !== c.fid && !(c.bids || {})[f]; });
        h += '<div class="rfcd">' + player(c.pid, c.fid) + '<div class="mono rfhint">DAY ' + c.day + ' · ' + c.stage.toUpperCase() + (c.decision ? ' · ' + c.decision.toUpperCase() : '') + '</div></div>' +
          '<table class="rfbt"><thead><tr><th>TEAM</th><th>BID</th><th>SHOTS</th><th>IN</th></tr></thead><tbody>' + bids.map(function(b, i){ return '<tr class="' + (i === 0 && !b.pass ? 'rftop' : '') + '"><td>' + helm(b.fid, 'rfhs') + nm(b.fid) + '</td><td class="mono">' + (b.pass ? 'PASS' : money(b.amt)) + '</td><td class="mono">' + (b.pass ? '–' : num(b.shots)) + '</td><td class="mono">' + esc(when(b.ts).toUpperCase()) + '</td></tr>'; }).join('') + '</tbody></table>' +
          (waiting.length ? '<p class="mono rfhint">STILL WAITING ON: ' + waiting.map(function(f){ return esc((D.SHORT[f] || f).toUpperCase()); }).join(', ') + '</p>' : '<p class="mono rfhint">ALL 11 TEAMS ARE IN.</p>') + '<div class="rfrow">';
        if(c.stage === 'bidding') h += '<button class="btn" type="button" data-a="close">CLOSE BIDDING</button>';
        if(c.stage === 'match') h += '<span class="mono rfhint">WAITING ON ' + esc((D.SHORT[c.fid] || '').toUpperCase()) + ' TO DECIDE. OR RECORD IT FOR THEM:</span><button class="btn ghost2" type="button" data-dec="match">THEY MATCHED</button><button class="btn ghost2" type="button" data-dec="decline">THEY LET HIM GO</button>';
        if(c.stage === 'decided') h += '<input class="rfnotein" data-note placeholder="Optional note for the results (e.g. the call, the shots)"><button class="btn" type="button" data-a="publish">PUBLISH THE RESULT</button>';
        if(c.stage !== 'bidding') h += '<button class="btn ghost2" type="button" data-a="reopen">REOPEN BIDDING</button>';
        h += '</div>';
      }
    }
    h += '<details class="rfdz"><summary class="mono">START OVER</summary><div class="rfrow"><input data-reset placeholder="Type RESET"><button class="btn ghost2" type="button" data-a="reset">WIPE THIS YEAR’S RFA</button></div></details>';
    return h + '</div></article>';
  }

  /* ---------- events ---------- */
  document.addEventListener('submit', function(e){ var f = e.target; if(!f.hasAttribute || !f.hasAttribute('data-bid')) return; e.preventDefault();
    var amt = Math.floor(+f.amt.value), sh = Math.max(0, Math.floor(+f.shots.value || 0)), cap = budget();
    if(!(amt >= 1)) return say('Bids start at $1.'); if(cap != null && amt > cap) return say('That’s more than your ' + YR + ' budget allows ($' + cap + ').');
    act({ action:'bid', amt:amt, shots:sh }, 'Bid in: $' + amt + ' + ' + sh + ' shot' + (sh === 1 ? '' : 's') + '.'); });
  document.addEventListener('change', function(e){ var t = e.target;
    if(t.hasAttribute('data-submit') && t.value) act({ action:'submit', pid:t.value }, P(t.value).name + ' is your RFA player.');
    var f = t.getAttribute('data-assign'); if(f && t.value) act({ action:'assign', fid:f, pid:t.value }, 'Set ' + P(t.value).name + ' for ' + (D.SHORT[f] || f) + '.'); });
  document.addEventListener('click', function(e){ var b = e.target.closest && e.target.closest('button'); if(!b || !$('rfb').contains(b)) return; var a = b.getAttribute('data-a'), v;
    if(b.hasAttribute('data-pass')) return act({ action:'bid', pass:true }, 'You passed.');
    if((v = b.getAttribute('data-match'))){ if(b.getAttribute('data-arm') !== '1'){ b.setAttribute('data-arm', '1'); b.textContent = 'TAP AGAIN TO CONFIRM'; return; } return act({ action:'match', decision:v }, v === 'match' ? 'Matched. He stays.' : 'You let him go.'); }
    if((v = b.getAttribute('data-dec'))) return act({ action:'decide', decision:v }, 'Recorded.');
    if((v = b.getAttribute('data-flip'))){ var q = v.split(':'); return act({ action:'flip', day:+q[0], fid:q[1] }, 'Flip-cup winner recorded.'); }
    var dl = document.querySelector('[data-dl]'), dlv = dl && dl.value ? Date.parse(dl.value) : 0;
    if(a === 'open') return act({ action:'open', deadline:dlv }, 'The RFA pool is open.');
    if(a === 'deadline') return act({ action:'deadline', deadline:dlv }, 'Deadline saved.');
    if(a === 'start'){ if(b.getAttribute('data-arm') !== '1'){ b.setAttribute('data-arm', '1'); b.textContent = 'TAP AGAIN — THIS LOCKS THE POOL'; return; } return act({ action:'start' }, 'Pool locked. Draws are on.'); }
    if(a === 'draw') return act({ action:'draw' }, 'Drawn.');
    if(a === 'close'){ if(b.getAttribute('data-arm') !== '1'){ b.setAttribute('data-arm', '1'); b.textContent = 'TAP AGAIN TO CLOSE'; return; } return act({ action:'close' }, 'Bidding closed.'); }
    if(a === 'reopen') return act({ action:'reopen' }, 'Bidding reopened.');
    if(a === 'publish'){ var n = document.querySelector('[data-note]'); return act({ action:'publish', note:n ? n.value : '' }, 'Posted for the league.'); }
    if(a === 'reset'){ var r = document.querySelector('[data-reset]'); return act({ action:'reset', confirm:r ? r.value : '' }, 'Wiped.'); }
  });

  D.shell('rfa').then(function(me){ S.me = me || {}; return load(); });
  // keep the page current while things are moving
  setInterval(function(){ if(document.hidden || S.busy || !S.v || S.v.phase === 'off' || S.v.phase === 'done') return; var a = document.activeElement; if(a && /INPUT|SELECT|TEXTAREA/.test(a.tagName)) return; api().then(function(v){ S.v = v; draw(); }).catch(function(){}); }, 30000);
})();
