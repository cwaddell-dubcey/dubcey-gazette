/* Pro Bowl: NFL Week 18, after the Dubcey championship. Each division fields one 10-man lineup (2 QB, 2 RB, 3 WR, 1 TE, 2 FLEX)
   from its four teams' rosters; every team must have at least one player in. Owners fill open spots with their own players;
   players lock at their own Week 18 kickoff. Highest division total wins. $50 a team, the winning division splits the pot.
   Board + rules live in the worker (/data/probowl); scores are MFL's Week 18 player scores. */
(function(){
  var D = DC, $ = D.$, esc = D.esc, arr = D.arr, num = D.num;
  var WK = 18, BUY = 50, SLOTS = ['QB1', 'QB2', 'RB1', 'RB2', 'WR1', 'WR2', 'WR3', 'TE1', 'FX1', 'FX2'];
  var LABEL = { QB:'QB', RB:'RB', WR:'WR', TE:'TE', FX:'FLEX' };
  var S = { B:null, me:'', boss:false, owner:{}, roster:{}, kick:{}, opp:{}, proj:{}, pts:{}, pick:null, busy:false };

  function say(t){ $('bwsay').textContent = t; [].forEach.call(document.querySelectorAll('.bwtoast'), function(x){ x.remove(); }); var n = document.createElement('div'); n.className = 'bwtoast mono'; n.setAttribute('role', 'status'); n.textContent = t; document.body.appendChild(n); setTimeout(function(){ n.remove(); }, 3200); }
  function divOf(fid){ return D.DIVS.filter(function(d){ return d.ids.indexOf(fid) > -1; })[0]; }
  function info(id){ var i = D.pinfo(id); return { name:i[0], pos:i[1], team:i[2] }; }
  function fits(slot, pos){ var k = slot.slice(0, 2); return k === 'FX' ? /^(RB|WR|TE)$/.test(pos) : pos === k; }
  function locked(id){ var k = S.kick[info(id).team]; return !!(k && Date.now() >= k); }
  function live(){ var now = Date.now(); return Object.keys(S.kick).some(function(t){ var k = S.kick[t]; return k && now >= k && now < k + 4 * 36e5; }); }
  function allDone(){ var ks = Object.keys(S.kick).map(function(t){ return S.kick[t]; }).filter(Boolean); return ks.length && ks.every(function(k){ return Date.now() > k + 4 * 36e5; }); }
  function when(t){ var k = S.kick[t]; if(!k) return t ? 'BYE' : ''; return new Date(k).toLocaleString('en-US', { weekday:'short', hour:'numeric', minute:'2-digit' }).replace(':00', '').toUpperCase(); }

  /* ---------- data ---------- */
  function board(){
    if(D.LOCAL){ var b = null; try{ b = JSON.parse(localStorage.getItem('dcPB') || 'null'); }catch(e){} b = b || { open:true, div:{} };
      D.DIVS.forEach(function(d){ b.div[d.k] = b.div[d.k] || {}; }); return Promise.resolve({ ok:true, open:true, forced:true, opens:0, div:b.div, me:'', commish:false }); }
    return fetch('/data/probowl', { cache:'no-store', credentials:'same-origin' }).then(function(r){ return r.json(); });
  }
  function post(body){
    if(D.LOCAL){ var b = { open:true, div:S.B.div }; var d = b.div[body.div || divOf(S.me).k]; if(body.action === 'clear') delete d[body.slot]; else if(body.action === 'set') d[body.slot] = { pid:body.pid, fid:S.owner[body.pid], ts:Date.now() };
      try{ localStorage.setItem('dcPB', JSON.stringify(b)); }catch(e){} return Promise.resolve({ ok:true, div:b.div }); }
    return fetch('/data/probowl', { method:'POST', credentials:'same-origin', headers:{ 'Content-Type':'application/json' }, body:JSON.stringify(body) }).then(function(r){ return r.json(); }).then(function(j){ if(!j.ok) throw j.error || 'That didn’t work.'; return j; });
  }
  function load(){
    return Promise.all([board(), D.api('rosters'), D.api('nflSchedule', 'W=' + WK).catch(function(){ return null; }), D.api('projectedScores', 'W=' + WK).catch(function(){ return null; })]).then(function(r){
      S.B = r[0] || { div:{} }; if(!S.boss) S.boss = !!S.B.commish;
      S.owner = {}; S.roster = {};
      arr(r[1] && r[1].rosters && r[1].rosters.franchise).forEach(function(f){ S.roster[f.id] = arr(f.player).map(function(p){ S.owner[p.id] = f.id; return p.id; }); });
      S.kick = {}; S.opp = {};
      arr(r[2] && r[2].nflSchedule && r[2].nflSchedule.matchup).forEach(function(m){ var T = arr(m.team); T.forEach(function(t, i){ S.kick[t.id] = num(m.kickoff) * 1000; var o = T[1 - i]; if(o) S.opp[t.id] = (t.isHome === '1' ? 'vs ' : '@ ') + o.id; }); });
      S.proj = {}; arr(r[3] && r[3].projectedScores && r[3].projectedScores.playerScore).forEach(function(x){ if(x.score !== '') S.proj[x.id] = num(x.score); });
      var ids = Object.keys(S.owner); return D.players(ids);
    }).then(scores);
  }
  function picked(){ var o = []; D.DIVS.forEach(function(d){ var b = S.B.div[d.k] || {}; SLOTS.forEach(function(k){ if(b[k] && b[k].pid) o.push(b[k].pid); }); }); return o; }
  function scores(){
    var ids = picked(); if(!ids.length){ draw(); return; }
    return D.api('playerScores', 'W=' + WK + '&YEAR=' + D.Y + '&PLAYERS=' + ids.join(',')).then(function(j){ S.pts = {}; arr(j && j.playerScores && j.playerScores.playerScore).forEach(function(x){ if(x.score !== '' && x.score != null) S.pts[x.id] = num(x.score); }); }).catch(function(){}).then(draw);
  }

  /* ---------- view ---------- */
  function totals(){ return D.DIVS.map(function(d){ var b = S.B.div[d.k] || {}, t = 0, pj = 0, n = 0; SLOTS.forEach(function(k){ var c = b[k]; if(c && c.pid){ n++; t += S.pts[c.pid] || 0; pj += S.pts[c.pid] != null && locked(c.pid) ? S.pts[c.pid] : (S.proj[c.pid] || 0); } }); return { d:d, t:Math.round(t * 100) / 100, pj:Math.round(pj * 10) / 10, n:n }; }); }
  function draw(){
    var T = totals(), started = T.some(function(x){ return x.t > 0; }), done = allDone() && started, lv = live(), mine = divOf(S.me), open = S.B.open;
    var rank = T.slice().sort(function(a, b){ return b.t - a.t || b.pj - a.pj; }), lead = rank[0];
    $('bwst').innerHTML = lv ? '<b class="live">● LIVE</b> · UPDATES EVERY MINUTE · ' + D.updated() : done ? 'FINAL' : open ? 'BOARD OPEN · PLAYERS LOCK AT KICKOFF' : 'BOARD OPENS ' + new Date(S.B.opens).toLocaleDateString('en-US', { weekday:'short', month:'short', day:'numeric' }).toUpperCase();
    var pot = BUY * D.IDS.length;
    var h = '<div class="bwpot card"><span class="mono">$' + BUY + ' A TEAM · $' + pot + ' POT</span><b>' + (done ? esc(lead.d.name) + ' takes it: $' + (pot / lead.d.ids.length) + ' a team' : 'Winning division splits it: $' + (pot / 4) + ' a team') + '</b>' +
      (S.boss ? '<button type="button" class="btn ghost2" data-open="' + (S.B.forced ? '0' : '1') + '">' + (S.B.forced ? 'CLOSE THE EARLY BOARD' : open ? 'BOARD IS OPEN' : 'OPEN THE BOARD NOW') + '</button>' : '') + '</div>';
    h += '<div class="bwsb">' + rank.map(function(x, i){ return '<div class="bwsc' + (i === 0 && started ? ' bwlead' : '') + '"><img src="' + x.d.crest + '" alt=""><div><b>' + esc(x.d.name) + '</b><span class="mono">' + x.n + ' / 10 SET' + (x.pj ? ' · PROJ ' + x.pj : '') + '</span></div><em>' + D.pts(x.t) + '</em></div>'; }).join('') + '</div>';
    h += '<div class="bwgrid">' + D.DIVS.map(function(d){ return divCard(d, mine && mine.k === d.k); }).join('') + '</div>';
    h += '<article class="card bwrules"><div class="bar mono"><span>HOW THE PRO BOWL WORKS</span><span>NFL WEEK 18</span></div><ol class="mono">' +
      '<li>THE PRO BOWL IS PLAYED IN NFL WEEK 18, THE WEEK AFTER THE DUBCEY CHAMPIONSHIP.</li>' +
      '<li>EACH DIVISION FIELDS ONE LINEUP: 2 QB, 2 RB, 3 WR, 1 TE, 2 FLEX (RB/WR/TE), SCORED LIKE A REGULAR WEEK.</li>' +
      '<li>THE FOUR OWNERS IN A DIVISION FILL THE OPEN SPOTS WITH PLAYERS FROM THEIR OWN ROSTERS. YOU CAN SWAP OR PULL YOUR OWN PLAYERS UNTIL THEIR GAME KICKS OFF.</li>' +
      '<li>EVERY TEAM MUST HAVE AT LEAST ONE PLAYER IN. ONCE THE OPEN SPOTS ONLY COVER THE TEAMS STILL MISSING, THOSE SPOTS ARE SAVED FOR THEM.</li>' +
      '<li>HIGHEST DIVISION TOTAL WINS. EVERY TEAM PUTS IN $' + BUY + ", AND THE WINNING DIVISION'S FOUR TEAMS SPLIT THE POT.</li></ol></article>";
    $('bwb').innerHTML = h;
  }
  function divCard(d, isMine){
    var b = S.B.div[d.k] || {}, inT = {}, open = 0; SLOTS.forEach(function(k){ if(b[k] && b[k].pid) inT[b[k].fid] = 1; else open++; });
    var missing = d.ids.filter(function(f){ return !inT[f]; }), canEdit = (isMine || S.boss) && S.B.open;
    var tot = 0; SLOTS.forEach(function(k){ if(b[k]) tot += S.pts[b[k].pid] || 0; });
    var h = '<article class="card bwdiv' + (isMine ? ' bwmine' : '') + '">' + D.divBanner(d, '<span class="mono">TOTAL</span><b>' + D.pts(Math.round(tot * 100) / 100) + '</b>') +
      '<div class="bwteams">' + d.ids.map(function(f){ return '<span class="' + (inT[f] ? 'bwin' : 'bwout') + '" title="' + esc(D.NAME[f]) + (inT[f] ? ' has a player in' : ' still needs a player') + '"><img src="' + D.helm(f) + '" alt="' + esc(D.SHORT[f] || f) + '"><i class="mono">' + (inT[f] ? '✓' : 'NEEDS 1') + '</i></span>'; }).join('') + '</div>' +
      (missing.length && open && open <= missing.length + 1 && S.B.open ? '<div class="bwwarn mono">' + (open <= missing.length ? 'THE LAST ' + (open > 1 ? open + ' SPOTS ARE' : 'SPOT IS') + ' SAVED FOR ' + missing.map(function(f){ return esc((D.SHORT[f] || f).toUpperCase()); }).join(' & ') : missing.length + ' TEAM' + (missing.length > 1 ? 'S' : '') + ' STILL NEED' + (missing.length > 1 ? '' : 'S') + ' A PLAYER') + '</div>' : '') +
      '<ol class="bwslots">' + SLOTS.map(function(k){ var c = b[k], pos = LABEL[k.slice(0, 2)], pick = S.pick && S.pick.div === d.k && S.pick.slot === k;
        if(!c || !c.pid) return '<li class="bwempty' + (pick ? ' bwpicking' : '') + '"><b class="mono bwpos">' + pos + '</b>' + (canEdit ? '<button type="button" class="bwadd mono" data-add="' + d.k + ':' + k + '">+ ADD A ' + pos + '</button>' : '<span class="mono bwopen">OPEN</span>') + '</li>' + (pick ? picker(d, k) : '');
        var p = info(c.pid), lk = locked(c.pid), own = c.fid === S.me || S.boss, pts = S.pts[c.pid];
        return '<li class="' + (lk ? 'bwlk' : '') + (pick ? ' bwpicking' : '') + '"><b class="mono bwpos">' + pos + '</b>' + D.face(c.pid, p.pos, p.team) +
          '<span class="bwnm"><b>' + esc(p.name) + '</b><i class="mono">' + esc(p.pos + ' · ' + p.team) + (S.opp[p.team] ? ' · ' + esc(S.opp[p.team]) : '') + (lk ? '' : ' · ' + when(p.team)) + '</i></span>' +
          '<img class="bwown" src="' + D.helm(c.fid) + '" alt="' + esc(D.SHORT[c.fid] || '') + '" title="' + esc(D.NAME[c.fid] || '') + '">' +
          '<em class="mono">' + (pts != null && (lk || pts) ? D.pts(pts) : S.proj[c.pid] != null ? '<small>' + S.proj[c.pid] + '</small>' : '–') + '</em>' +
          (own && canEdit && !lk ? '<span class="bwact"><button type="button" class="mono" data-swap="' + d.k + ':' + k + '">SWAP</button><button type="button" class="mono" data-clear="' + d.k + ':' + k + '">PULL</button></span>' : '') + '</li>' + (pick ? picker(d, k) : '');
      }).join('') + '</ol></article>';
    return h;
  }
  function picker(d, k){
    var used = picked(), teams = S.boss ? d.ids : [S.me], rows = [];
    teams.forEach(function(f){ (S.roster[f] || []).forEach(function(id){ var p = info(id); if(!fits(k, p.pos)) return; rows.push({ id:id, f:f, p:p, used:used.indexOf(id) > -1, lk:locked(id), pj:S.proj[id] }); }); });
    rows.sort(function(a, b){ return (a.used - b.used) || (a.lk - b.lk) || ((b.pj || 0) - (a.pj || 0)); });
    return '<li class="bwpick"><div class="bwph mono"><span>' + (S.boss ? 'ANY ' + esc(d.name.toUpperCase()) + ' PLAYER' : 'YOUR PLAYERS') + ' · ' + LABEL[k.slice(0, 2)] + '</span><button type="button" class="mono" data-cancel>CANCEL</button></div>' +
      (rows.length ? rows.map(function(r){ var off = r.used || r.lk;
        return '<button type="button" class="bwopt"' + (off ? ' disabled' : '') + ' data-put="' + d.k + ':' + k + ':' + r.id + '">' + D.face(r.id, r.p.pos, r.p.team, true) + '<span class="bwnm"><b>' + esc(r.p.name) + '</b><i class="mono">' + esc(r.p.pos + ' · ' + r.p.team) + (S.opp[r.p.team] ? ' · ' + esc(S.opp[r.p.team]) : '') + (S.boss ? ' · ' + esc(D.SHORT[r.f] || '') : '') + '</i></span><em class="mono">' + (r.used ? 'ON THE ROSTER' : r.lk ? 'LOCKED' : r.pj != null ? 'PROJ ' + r.pj : when(r.p.team)) + '</em></button>'; }).join('')
        : '<div class="ld mono">NO ELIGIBLE PLAYERS ON YOUR ROSTER</div>') + '</li>';
  }

  /* ---------- actions ---------- */
  document.addEventListener('click', function(e){
    var b = e.target.closest && e.target.closest('button'); if(!b || !$('bwb').contains(b) || S.busy) return;
    var v;
    if((v = b.getAttribute('data-add') || b.getAttribute('data-swap'))){ var q = v.split(':'); S.pick = { div:q[0], slot:q[1] }; draw(); return; }
    if(b.hasAttribute('data-cancel')){ S.pick = null; draw(); return; }
    if((v = b.getAttribute('data-put'))){ var p = v.split(':'); return act({ action:'set', div:p[0], slot:p[1], pid:p[2] }, info(p[2]).name + ' is in.'); }
    if((v = b.getAttribute('data-clear'))){ if(b.getAttribute('data-arm') !== '1'){ b.setAttribute('data-arm', '1'); b.textContent = 'SURE?'; return; } var c = v.split(':'); return act({ action:'clear', div:c[0], slot:c[1] }, 'Pulled.'); }
    if((v = b.getAttribute('data-open'))){ S.busy = true; return post({ action:'open', open:v === '1' }).then(function(j){ S.busy = false; S.B.open = j.open; S.B.forced = j.forced; say(j.open ? 'The board is open.' : 'Early board closed.'); draw(); }, function(err){ S.busy = false; say(String(err)); }); }
  });
  function act(body, ok){ S.busy = true; post(body).then(function(j){ S.busy = false; S.B.div = j.div; S.pick = null; say(ok); scores(); }, function(err){ S.busy = false; say(String(err)); }); }

  D.shell('probowl').then(function(me){
    S.me = (me && me.franchise) || ''; S.boss = !!(me && me.commish);
    return load();
  }).catch(function(){ $('bwb').innerHTML = '<div class="card"><div class="ld mono">COULDN’T LOAD THE PRO BOWL.<br><button type="button" class="btn ghost2" data-reload>TRY AGAIN</button></div></div>'; });
  // live scoring: refresh every minute while Week 18 games are on
  setInterval(function(){ if(S.B && live() && !S.pick && !document.hidden) board().then(function(b){ S.B = Object.assign(S.B, { div:b.div }); scores(); }); }, 60000);
})();
