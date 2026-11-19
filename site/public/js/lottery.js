/* Auction Lottery: weighted ball draw for next year's auction order.
   Anyone can play with the balls and run practice draws (kept in their own browser).
   Only the Commish can save official ball counts and run the official draw (saved to the site as content key "lottery"). */
(function(){
  var D = DC, $ = D.$, esc = D.esc, YR = (D.NEXT && D.NEXT.year) || (+D.Y + 1);
  var IDS = D.IDS.slice(), N = IDS.length, DEF = 20;
  var S = { v:'setup', balls:{}, off:null, me:{}, commish:false, draw:null, drawing:false, cur:null, muted:false, resetArm:false, delArm:'', runArm:false };

  function lsGet(k){ try{ return JSON.parse(localStorage.getItem(k) || 'null'); }catch(e){ return null; } }
  function lsSet(k, v){ try{ localStorage.setItem(k, JSON.stringify(v)); }catch(e){} }
  function ord(n){ var s = ['th','st','nd','rd'], v = n % 100; return n + (s[(v - 20) % 10] || s[v] || s[0]); }
  function short(id){ return D.SHORT[id] || D.NAME[id] || id; }
  function pc(x){ return (x * 100).toFixed(1) + '%'; }
  function when(ts){ return new Date(ts).toLocaleString('en-US', { month:'short', day:'numeric', year:'numeric', hour:'numeric', minute:'2-digit' }); }
  function say(t){ $('lxsay').textContent = t; }

  /* ---------- the math ---------- */
  // every team's exact chance at every pick: pick 1 is drawn first by balls, then pick 2 from who's left, and so on
  function oddsFor(B){
    var bal = IDS.map(function(id){ return Math.max(0, +B[id] || 0); }), size = 1 << N, prob = new Float64Array(size), P = IDS.map(function(){ return new Array(N).fill(0); });
    prob[0] = 1;
    for(var m = 0; m < size; m++){
      var p = prob[m]; if(!p) continue;
      var k = 0, tot = 0, left = 0;
      for(var i = 0; i < N; i++){ if(m & (1 << i)) k++; else { tot += bal[i]; left++; } }
      if(k === N) continue;
      for(var j = 0; j < N; j++){ if(m & (1 << j)) continue;
        var q = tot > 0 ? bal[j] / tot : 1 / left; if(!q) continue;
        prob[m | (1 << j)] += p * q; P[j][k] += p * q; }
    }
    var o = {}; IDS.forEach(function(id, i){ var e = 0; P[i].forEach(function(x, k){ e += x * (k + 1); }); o[id] = { p:P[i], exp:e }; });
    // projected slot = rank by expected pick (what the board "should" look like before the balls bounce)
    IDS.slice().sort(function(a, b){ return o[a].exp - o[b].exp; }).forEach(function(id, i){ o[id].slot = i + 1; });
    return o;
  }
  // one draw; a team with 0 balls can never come out while anyone else still has balls
  function drawOrder(B){
    var left = IDS.map(function(id){ return { id:id, b:Math.max(0, +B[id] || 0) }; }), out = [];
    while(left.length){
      var tot = left.reduce(function(a, t){ return a + t.b; }, 0), pick = null;
      if(tot <= 0) pick = left[Math.floor(Math.random() * left.length)];
      else { var r = Math.random() * tot; for(var i = 0; i < left.length; i++){ if(!left[i].b) continue; if(r < left[i].b){ pick = left[i]; break; } r -= left[i].b; } if(!pick) pick = left.filter(function(t){ return t.b; }).pop(); }
      out.push(pick.id); left = left.filter(function(t){ return t !== pick; });
    }
    return out;
  }
  function total(B){ return IDS.reduce(function(a, id){ return a + Math.max(0, +B[id] || 0); }, 0); }
  function offBalls(){ var b = S.off && S.off.balls; if(!b) return null; var o = {}; IDS.forEach(function(id){ o[id] = b[id] != null ? +b[id] : DEF; }); return o; }
  function same(a, b){ return !!a && !!b && IDS.every(function(id){ return +a[id] === +b[id]; }); }

  /* ---------- sound: Sirius underneath, a riser on each spin, a hit on each reveal ---------- */
  var AU = null, MUS = null;
  function ctx(){ if(!AU){ var C = window.AudioContext || window.webkitAudioContext; if(!C) return null; var c = new C(), g = c.createGain(); g.gain.value = S.muted ? 0 : 1; g.connect(c.destination); AU = { c:c, g:g, nodes:[] }; } if(AU.c.state === 'suspended') AU.c.resume(); return AU; }
  function music(on, restart){ MUS = MUS || $('lxmus'); if(!MUS) return; MUS.volume = 0.5; MUS.muted = S.muted; if(!on){ MUS.pause(); return; } if(restart){ try{ MUS.currentTime = 0; }catch(e){} } var p = MUS.play(); if(p && p.catch) p.catch(function(){}); }
  // duck the music under the spin, bring it back after the reveal
  function duck(to, ms){ MUS = MUS || $('lxmus'); if(!MUS) return; clearInterval(duck.t); var from = MUS.volume, n = 0, steps = Math.max(1, Math.round(ms / 40)); duck.t = setInterval(function(){ n++; MUS.volume = Math.max(0, Math.min(1, from + (to - from) * n / steps)); if(n >= steps) clearInterval(duck.t); }, 40); }
  function riser(dur){
    var a = ctx(); if(!a) return; var c = a.c, t = c.currentTime;
    var o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(950, t + dur);
    var f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 1100; f.Q.value = 5;
    var g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.11, t + dur * 0.75); g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.12);
    o.connect(f); f.connect(g); g.connect(a.g); o.start(t); o.stop(t + dur + 0.2);
    var r = c.createOscillator(); r.type = 'square'; r.frequency.value = 1000; var rg = c.createGain(); rg.gain.value = 0; var tr = c.createOscillator(); tr.type = 'square'; tr.frequency.setValueAtTime(8, t); tr.frequency.exponentialRampToValueAtTime(26, t + dur);
    var tg = c.createGain(); tg.gain.value = 0.05; tr.connect(tg); tg.connect(rg.gain); r.connect(rg); var hf = c.createBiquadFilter(); hf.type = 'highpass'; hf.frequency.value = 1500; rg.connect(hf); hf.connect(a.g);
    r.start(t); tr.start(t); r.stop(t + dur + 0.05); tr.stop(t + dur + 0.05); a.nodes = [o, r, tr];
  }
  function hush(){ if(AU) AU.nodes.forEach(function(n){ try{ n.stop(); }catch(e){} }); }
  function thump(v){ var a = ctx(); if(!a) return; var c = a.c, t = c.currentTime, o = c.createOscillator(), g = c.createGain(); o.frequency.setValueAtTime(95, t); o.frequency.exponentialRampToValueAtTime(38, t + 0.2); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v || 0.5, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.55); o.connect(g); g.connect(a.g); o.start(t); o.stop(t + 0.6); }
  function hit(big){
    var a = ctx(); if(!a) return; var c = a.c, t = c.currentTime; thump(0.7);
    var len = Math.floor(c.sampleRate), buf = c.createBuffer(1, len, c.sampleRate), d = buf.getChannelData(0); for(var i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2);
    var n = c.createBufferSource(); n.buffer = buf; var nf = c.createBiquadFilter(); nf.type = 'highpass'; nf.frequency.setValueAtTime(500, t); nf.frequency.exponentialRampToValueAtTime(7000, t + 0.5); var ng = c.createGain(); ng.gain.setValueAtTime(0.28, t); ng.gain.exponentialRampToValueAtTime(0.0001, t + 0.85); n.connect(nf); nf.connect(ng); ng.connect(a.g); n.start(t);
    (big ? [523.25, 659.25, 783.99, 1046.5] : [392, 493.88, 587.33]).forEach(function(f, i){ var o = c.createOscillator(), g = c.createGain(), st = t + 0.06 + i * 0.06; o.type = 'triangle'; o.frequency.value = f; g.gain.setValueAtTime(0.0001, st); g.gain.exponentialRampToValueAtTime(0.2, st + 0.03); g.gain.exponentialRampToValueAtTime(0.0001, st + (big ? 1.6 : 1.1)); o.connect(g); g.connect(a.g); o.start(st); o.stop(st + (big ? 1.7 : 1.2)); });
  }
  function mute(){ S.muted = !S.muted; lsSet('dcLotMute', S.muted); if(AU) AU.g.gain.value = S.muted ? 0 : 1; MUS = MUS || $('lxmus'); if(MUS) MUS.muted = S.muted; draw(); }

  /* ---------- saving ---------- */
  function load(){ return D.content('lottery').then(function(c){ S.off = c && typeof c === 'object' ? c : null; if(!S.off) S.off = null; }); }
  function put(o){ return D.save('lottery', o).then(function(j){ if(!j || !j.ok) throw (j && j.error) || 'Save failed.'; S.off = o; return j; }); }
  function hist(){ return (S.off && S.off.history) || []; }
  function latest(){ return hist()[0] || null; }

  /* ---------- views ---------- */
  function tabs(){ [].forEach.call(document.querySelectorAll('#lxtabs a'), function(a){ a.classList.toggle('on', a.getAttribute('data-v') === S.v); }); }
  function draw(){
    tabs(); banner();
    if(S.v === 'odds') return oddsView();
    if(S.v === 'draw') return drawView();
    if(S.v === 'history') return histView();
    setupView();
  }

  function banner(){
    var L = latest(), h = '';
    if(L && L.pending) h = '<div class="lxban mono"><b>● OFFICIAL DRAW IN PROGRESS</b><span>The Commish is spinning the machine. Results post when the #1 pick is out.</span></div>';
    else if(L) h = '<a class="lxban lxdone" href="#history"><span class="mono"><b>OFFICIAL ' + YR + ' AUCTION ORDER</b> · DRAWN ' + esc(when(L.ts).toUpperCase()) + '</span><span class="lxmini">' + L.order.map(function(id, i){ return '<i><em class="mono">' + (i + 1) + '</em><img src="' + D.helm(id) + '" alt="' + esc(D.NAME[id] || id) + '" title="' + esc((i + 1) + '. ' + (D.NAME[id] || id)) + '"></i>'; }).join('') + '</span></a>';
    $('lxoff').innerHTML = h;
  }

  function setupView(){
    var B = S.balls, T = total(B), O = oddsFor(B), ob = offBalls(), isOff = same(B, ob);
    var h = '<div class="lxtop card"><div class="lxsum"><b>' + T + '</b><span class="mono">TOTAL BALLS · ' + N + ' TEAMS</span></div>' +
      '<span class="lxtag mono ' + (isOff ? 'ok' : '') + '">' + (ob ? (isOff ? 'OFFICIAL BALL COUNTS' + (S.off.setAt ? ' · SET ' + esc(when(S.off.setAt).toUpperCase()) : '') : 'PRACTICE COUNTS · ONLY YOU SEE THESE') : 'PRACTICE COUNTS · NO OFFICIAL COUNTS YET') + '</span>' +
      '<div class="lxact">' + (ob && !isOff ? '<button class="btn ghost2" type="button" data-a="official">USE OFFICIAL COUNTS</button>' : '') +
      '<button class="btn ghost2" type="button" data-a="reset">' + (S.resetArm ? 'TAP AGAIN TO RESET ALL' : 'RESET ALL TO ' + DEF) + '</button>' +
      (S.commish && !isOff ? '<button class="btn ghost2" type="button" data-a="saveballs">SAVE AS OFFICIAL COUNTS</button>' : '') +
      '<a class="btn" href="#draw">GO TO THE DRAW →</a></div></div>' +
      '<div class="lxgrid">' + IDS.slice().sort(function(a, b){ return O[a].exp - O[b].exp || (D.NAME[a] || '').localeCompare(D.NAME[b] || ''); }).map(function(id){
        var o = O[id], b = Math.max(0, +B[id] || 0), w = Math.max(o.p[0] * 100, 1);
        return '<article class="lxt card"><div class="lxth"><img src="' + D.helm(id) + '" alt=""><div><b>' + esc(D.NAME[id] || id) + '</b><span class="mono">AVERAGE PICK ' + o.exp.toFixed(1) + '</span></div></div>' +
          '<div class="lxbal"><button type="button" class="lxpm" data-d="-1" data-id="' + id + '" aria-label="One less ball for ' + esc(D.NAME[id]) + '">−</button>' +
          '<label><input type="number" inputmode="numeric" min="0" max="999" value="' + b + '" data-id="' + id + '" aria-label="Balls for ' + esc(D.NAME[id]) + '"><span class="mono">BALLS</span></label>' +
          '<button type="button" class="lxpm" data-d="1" data-id="' + id + '" aria-label="One more ball for ' + esc(D.NAME[id]) + '">+</button></div>' +
          '<div class="lxodd"><span class="mono">#1 PICK ODDS</span><b>' + pc(o.p[0]) + '</b></div><div class="lxbar"><i style="width:' + w + '%"></i></div></article>';
      }).join('') + '</div>' +
      '<p class="lxnote mono">EACH BALL IS ONE CHANCE AT THE #1 PICK. PICK 1 IS DRAWN FIRST, THEN PICK 2 FROM WHO’S LEFT, AND SO ON. THE REVEAL RUNS FROM 12 UP TO 1.</p>';
    $('lxb').innerHTML = h;
  }

  function oddsView(){
    var B = S.balls, O = oddsFor(B), rows = IDS.slice().sort(function(a, b){ return O[a].exp - O[b].exp || (D.NAME[a] || '').localeCompare(D.NAME[b] || ''); }), max = 0;
    rows.forEach(function(id){ O[id].p.forEach(function(x){ if(x > max) max = x; }); });
    var h = '<article class="card lxodds"><div class="bar mono"><span>EVERY TEAM’S CHANCE AT EVERY PICK</span><span>' + (same(B, offBalls()) ? 'OFFICIAL COUNTS' : 'YOUR PRACTICE COUNTS') + ' · ' + total(B) + ' BALLS</span></div><div class="lxscr"><table><thead><tr><th scope="col">TEAM</th><th scope="col">BALLS</th>' +
      IDS.map(function(x, i){ return '<th scope="col">' + (i + 1) + '</th>'; }).join('') + '<th scope="col">AVG</th></tr></thead><tbody>' +
      rows.map(function(id){ var o = O[id];
        return '<tr><th scope="row"><img src="' + D.helm(id) + '" alt="">' + esc(short(id)) + '</th><td class="mono">' + Math.max(0, +B[id] || 0) + '</td>' + o.p.map(function(x){
          var a = max ? x / max : 0; return '<td class="mono" style="background:rgba(224,167,43,' + (a * 0.85).toFixed(3) + ')">' + (x >= 0.0005 ? (x * 100).toFixed(1) : '') + '</td>'; }).join('') + '<td class="mono"><b>' + o.exp.toFixed(1) + '</b></td></tr>';
      }).join('') + '</tbody></table></div><div class="lxft mono">PERCENT CHANCE OF LANDING EACH PICK · AVG = EXPECTED PICK · EXACT MATH, NOT A SIMULATION</div></article>';
    $('lxb').innerHTML = h;
  }

  function histView(){
    var H = hist();
    if(!H.length){ $('lxb').innerHTML = '<article class="card"><div class="ld mono">NO OFFICIAL DRAWS YET. PRACTICE ONES STAY IN YOUR BROWSER.</div></article>'; return; }
    $('lxb').innerHTML = '<div class="lxhist">' + H.map(function(L, k){
      var O = oddsFor(L.balls || {});
      return '<article class="card"><div class="bar mono"><span>' + (k ? 'EARLIER DRAW' : 'OFFICIAL ' + YR + ' AUCTION ORDER') + (L.pending ? ' · IN PROGRESS' : '') + '</span><span>' + esc(when(L.ts).toUpperCase()) + '</span></div>' +
        '<ol class="lxord">' + L.order.map(function(id, i){ var mv = O[id] ? Math.round(O[id].exp - (i + 1)) : 0;
          return '<li><b class="mono">' + (i + 1) + '</b><img src="' + D.helm(id) + '" alt=""><span>' + esc(D.NAME[id] || id) + '<i class="mono">' + (L.balls ? (+L.balls[id] || 0) + ' BALLS · ' + pc(O[id].p[i]) + ' TO LAND HERE' : '') + '</i></span>' + mvChip(mv) + '</li>'; }).join('') + '</ol>' +
        (S.commish ? '<div class="lxha"><button class="btn ghost2" type="button" data-del="' + L.ts + '">' + (S.delArm === String(L.ts) ? 'TAP AGAIN TO DELETE' : 'DELETE THIS DRAW') + '</button>' + (L.pending ? '<button class="btn" type="button" data-pub="' + L.ts + '">PUBLISH RESULT</button>' : '') + '</div>' : '') + '</article>';
    }).join('') + '</div>';
  }
  function mvChip(mv){ return mv ? '<em class="lxmv mono ' + (mv > 0 ? 'lxup' : 'lxdn') + '" title="' + (mv > 0 ? 'Jumped ' : 'Fell ') + Math.abs(mv) + ' from their average pick">' + (mv > 0 ? '▲' : '▼') + Math.abs(mv) + '</em>' : '<em class="lxmv mono">—</em>'; }

  /* the machine */
  function drawView(){
    var d = S.draw, step = d ? d.step : 0, done = d && step >= N, B = d ? d.balls : S.balls, O = oddsFor(B);
    var left = d ? d.order.slice(0, N - step) : IDS.slice(), lt = left.reduce(function(a, id){ return a + Math.max(0, +B[id] || 0); }, 0);
    var oc = left.length > 6 ? Math.ceil(left.length * 0.58) : left.length;
    function ball(id, i, ring, cnt){ var a = (i / Math.max(cnt, 1)) * Math.PI * 2 - Math.PI / 2, r = ring === 'o' ? (left.length > 8 ? 36 : 31) : 16, x = 50 + r * Math.cos(a), y = 50 + r * Math.sin(a), p = lt > 0 ? Math.max(0, +B[id] || 0) / lt : 1 / left.length;
      return '<span class="lxbl" style="left:' + x.toFixed(2) + '%;top:' + y.toFixed(2) + '%"><span class="lxbi"><img src="' + D.helm(id) + '" alt="' + esc(short(id)) + '"><i class="mono">' + Math.round(p * 100) + '%</i></span></span>'; }
    var drum = '<div class="lxdrum' + (S.drawing ? ' spin' : '') + '"><div class="lxring o">' + left.slice(0, oc).map(function(id, i){ return ball(id, i, 'o', oc); }).join('') + '</div>' +
      '<div class="lxring i">' + left.slice(oc).map(function(id, i){ return ball(id, i, 'i', left.length - oc); }).join('') + '</div>' +
      (done ? '<div class="lxempty"><b>MACHINE EMPTY</b><span class="mono">THE BOARD IS FINAL</span></div>' : '') + '</div>';
    var tray;
    var rs = !d && lsGet('dcLotDraw'), canRes = rs && rs.order && rs.order.length === N && rs.step < N && (!rs.official || (latest() && latest().ts === rs.ts));
    if(!d) tray = '<div class="lxtray"><span class="mono lxk">' + (S.commish ? 'PRACTICE OR THE REAL THING' : 'PRACTICE DRAW') + '</span><p>' + (S.commish ? 'Practice draws stay in your browser. The official draw is saved to the site for everyone.' : 'Run it as many times as you want — practice draws stay in your browser. Only the Commish can run the official one.') + '</p>' +
      '<div class="lxbtns">' + (canRes ? '<button class="btn" type="button" data-a="resume">RESUME ' + (rs.official ? 'OFFICIAL ' : '') + 'DRAW (' + rs.step + '/' + N + ')</button>' : '') + '<button class="btn' + (canRes ? ' ghost2' : '') + '" type="button" data-a="practice">RUN A PRACTICE DRAW</button>' + (S.commish ? '<button class="btn lxred" type="button" data-a="official-run">' + (S.runArm ? 'TAP AGAIN — THIS ONE COUNTS' : 'RUN THE OFFICIAL DRAW') + '</button>' : '') + '</div></div>';
    else if(S.drawing) tray = '<div class="lxtray"><span class="mono lxk lxglow">DRAWING THE ' + ord(S.cur).toUpperCase() + ' PICK…</span><p class="mono lxsub">HELMETS TUMBLING</p></div>';
    else if(done) tray = '<div class="lxtray"><span class="mono lxk">' + (d.official ? 'OFFICIAL · LOCKED IN' : 'PRACTICE · NOT OFFICIAL') + '</span><h3>The board is set.</h3><div class="lxbtns"><button class="btn" type="button" data-a="copy">COPY THE ORDER</button><button class="btn ghost2" type="button" data-a="clear">' + (d.official ? 'CLOSE' : 'DRAW AGAIN') + '</button></div></div>';
    else if(S.cur && step > 0){ var id = d.order[N - step];
      tray = '<div class="lxtray lxrev"><span class="mono lxk">WITH THE ' + ord(N - step + 1).toUpperCase() + ' PICK</span><img class="lxbig" src="' + D.helm(id) + '" alt=""><h3>' + esc(D.NAME[id] || id) + '</h3>' + mvChip(Math.round(O[id].exp - (N - step + 1))) + '</div>'; }
    else tray = '<div class="lxtray"><span class="mono lxk">' + (d.official ? 'OFFICIAL DRAW' : 'PRACTICE DRAW') + '</span><p>Spin the drum to pop out the next helmet. It counts down from the 12th pick to the 1st.</p></div>';
    var next = N - step;
    var ctl = d && !done && !S.drawing ? '<button class="btn lxspin" type="button" data-a="spin">SPIN FOR THE ' + ord(next).toUpperCase() + ' PICK</button>' + (step > 0 && step < N - 1 ? '<button class="btn ghost2" type="button" data-a="skip">SKIP TO THE #1 PICK</button>' : '') : '';
    var board = '<aside class="lxboard"><div class="bar mono"><span>THE BOARD</span><span>' + (d ? step + ' / ' + N + ' DRAWN' : 'NOT DRAWN') + '</span></div><ol>' + IDS.map(function(x, i){
      var p = i + 1, id = d && d.order[i], shown = d && p > N - step;
      return '<li class="' + (shown ? 'on' : '') + (p === 1 ? ' one' : '') + '"><b class="mono">' + p + '</b>' + (shown ? '<img src="' + D.helm(id) + '" alt=""><span>' + esc(D.NAME[id] || id) + '</span>' + mvChip(Math.round(O[id].exp - p)) : '<span class="mono lxin">IN THE MACHINE…</span>') + '</li>'; }).join('') + '</ol></aside>';
    $('lxb').innerHTML = '<section class="lxstage" id="lxstage"><div class="lxsh mono"><span>' + (d && d.official ? '● OFFICIAL DRAW' : 'PRACTICE DRAW') + ' · ' + YR + ' AUCTION ORDER</span><span class="lxtools"><button type="button" data-a="mute" aria-pressed="' + (!S.muted) + '">' + (S.muted ? 'SOUND: OFF' : 'SOUND: ON') + '</button><button type="button" data-a="tv">' + (document.fullscreenElement ? 'EXIT TV MODE' : 'TV MODE') + '</button>' + (d && !S.drawing && !done ? '<button type="button" data-a="clear">' + (d.official ? 'PAUSE' : 'START OVER') + '</button>' : '') + '</span></div>' +
      '<div class="lxmach"><div class="lxcol">' + drum + '<div class="lxchute">' + (S.drawing ? '<i></i>' : '') + '</div>' + tray + '<div class="lxctl">' + ctl + '</div></div>' + board + '</div></section>';
  }

  /* ---------- actions ---------- */
  function setBalls(id, n){ n = parseInt(n, 10); if(isNaN(n)) n = 0; S.balls[id] = Math.max(0, Math.min(999, n)); lsSet('dcLotBalls', S.balls); }
  function begin(official){
    var B = {}; IDS.forEach(function(id){ B[id] = Math.max(0, +S.balls[id] || 0); });
    if(official && !same(B, offBalls())){ say('Save the ball counts as official first.'); alertBox('Save these ball counts as the official counts first, so the league can see what the draw used.'); return; }
    var d = { order:drawOrder(B), step:0, balls:B, official:!!official, ts:Date.now() };
    function go(){ S.draw = d; S.cur = null; lsSet('dcLotDraw', d); music(true, true); location.hash = 'draw'; S.v = 'draw'; draw(); }
    if(!official) return go();
    var o = JSON.parse(JSON.stringify(S.off || {})); o.history = [{ ts:d.ts, order:d.order, balls:B, pending:true, by:S.me.franchise || '' }].concat(o.history || []).slice(0, 30);
    put(o).then(go, function(e){ alertBox(String(e)); });
  }
  function finishOfficial(){ var d = S.draw; if(!d || !d.official) return; var o = JSON.parse(JSON.stringify(S.off || {})); (o.history || []).forEach(function(L){ if(L.ts === d.ts) delete L.pending; }); put(o).then(function(){ banner(); }, function(){}); }
  function spin(){
    var d = S.draw; if(!d || S.drawing || d.step >= N) return;
    var pick = N - d.step; S.drawing = true; S.cur = pick; music(true); duck(0.12, 500); riser(4); say('Drawing the ' + ord(pick) + ' pick');
    drawView();
    spin.t = setTimeout(function(){
      S.drawing = false; d.step++; lsSet('dcLotDraw', d); hit(pick === 1); duck(0.5, 1800);
      var id = d.order[pick - 1]; say('With the ' + ord(pick) + ' pick: ' + (D.NAME[id] || id));
      if(d.step >= N) finishOfficial();
      drawView();
    }, 4200);
  }
  function skip(){ var d = S.draw; if(!d || S.drawing || d.step >= N - 1) return; d.step = N - 1; S.cur = 2; lsSet('dcLotDraw', d); thump(0.6); say('Picks 12 through 2 are out. One spin left.'); drawView(); }
  function clear(){ clearTimeout(spin.t); hush(); S.drawing = false; S.cur = null; if(S.draw && !S.draw.official){ S.draw = null; lsSet('dcLotDraw', null); } else { S.draw = null; } music(false); draw(); }
  function copy(){ var d = S.draw; if(!d) return; var t = YR + ' Dubcey auction order' + (d.official ? '' : ' (practice)') + '\n' + d.order.map(function(id, i){ return (i + 1) + '. ' + (D.NAME[id] || id); }).join('\n');
    (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).then(function(){ say('Copied the draft order.'); flash('COPIED'); }, function(){ flash('COPY BLOCKED'); }); }
  function flash(t){ var b = document.querySelector('[data-a="copy"]'); if(b){ b.textContent = t; setTimeout(function(){ if(b.isConnected) b.textContent = 'COPY THE ORDER'; }, 1800); } }
  function alertBox(t){ var n = document.createElement('div'); n.className = 'lxtoast mono'; n.setAttribute('role', 'alert'); n.textContent = t; document.body.appendChild(n); setTimeout(function(){ n.remove(); }, 4200); }
  function tv(){ var el = $('lxstage'); if(!el) return; if(document.fullscreenElement) document.exitFullscreen(); else if(el.requestFullscreen) el.requestFullscreen().catch(function(){ el.classList.toggle('lxfake'); }); else el.classList.toggle('lxfake'); }
  document.addEventListener('fullscreenchange', function(){ if(S.v === 'draw') drawView(); });

  document.addEventListener('click', function(e){
    var t = e.target.closest('button,[data-v]'); if(!t || !$('lxb').parentNode.contains(t)) return;
    if(t.matches('#lxtabs a')) return;
    var a = t.getAttribute('data-a');
    if(t.classList.contains('lxpm')){ var id = t.getAttribute('data-id'); setBalls(id, (+S.balls[id] || 0) + (+t.getAttribute('data-d'))); return setupView(); }
    if(a !== 'reset' && S.resetArm){ S.resetArm = false; }
    if(a === 'reset'){ if(!S.resetArm){ S.resetArm = true; setupView(); clearTimeout(S.rt); S.rt = setTimeout(function(){ S.resetArm = false; if(S.v === 'setup') setupView(); }, 3500); return; } S.resetArm = false; IDS.forEach(function(id){ S.balls[id] = DEF; }); lsSet('dcLotBalls', S.balls); return setupView(); }
    if(a === 'official'){ S.balls = offBalls(); lsSet('dcLotBalls', S.balls); return setupView(); }
    if(a === 'saveballs'){ var o = JSON.parse(JSON.stringify(S.off || {})); o.balls = JSON.parse(JSON.stringify(S.balls)); o.setAt = Date.now(); return put(o).then(function(){ alertBox('Saved. Everyone now sees these ball counts.'); draw(); }, function(err){ alertBox(String(err)); }); }
    if(a === 'practice') return begin(false);
    if(a === 'official-run'){ if(!S.runArm){ S.runArm = true; drawView(); setTimeout(function(){ S.runArm = false; if(S.v === 'draw' && !S.draw) drawView(); }, 3500); return; } S.runArm = false; return begin(true); }
    if(a === 'resume'){ S.draw = lsGet('dcLotDraw'); S.cur = S.draw && S.draw.step ? N - S.draw.step + 1 : null; music(true); return drawView(); }
    if(a === 'spin') return spin();
    if(a === 'skip') return skip();
    if(a === 'clear') return clear();
    if(a === 'copy') return copy();
    if(a === 'mute') return mute();
    if(a === 'tv') return tv();
    var del = t.getAttribute('data-del');
    if(del){ if(S.delArm !== del){ S.delArm = del; histView(); return; } S.delArm = ''; var o2 = JSON.parse(JSON.stringify(S.off || {})); o2.history = (o2.history || []).filter(function(L){ return String(L.ts) !== del; }); return put(o2).then(draw, function(err){ alertBox(String(err)); }); }
    var pub = t.getAttribute('data-pub');
    if(pub){ var o3 = JSON.parse(JSON.stringify(S.off || {})); (o3.history || []).forEach(function(L){ if(String(L.ts) === pub) delete L.pending; }); return put(o3).then(draw, function(err){ alertBox(String(err)); }); }
  });
  document.addEventListener('change', function(e){ var i = e.target; if(i.matches && i.matches('.lxbal input')){ setBalls(i.getAttribute('data-id'), i.value); setupView(); } });
  function route(){ var v = (location.hash || '#setup').slice(1); S.v = /^(setup|odds|draw|history)$/.test(v) ? v : 'setup'; if(S.v !== 'draw' && S.drawing){ clearTimeout(spin.t); hush(); S.drawing = false; } draw(); window.scrollTo(0, 0); }
  window.addEventListener('hashchange', route);

  Promise.all([D.shell('lottery'), load().catch(function(){})]).then(function(r){
    S.me = r[0] || {}; S.commish = !!S.me.commish; S.muted = !!lsGet('dcLotMute');
    var mine = lsGet('dcLotBalls'), ob = offBalls();
    S.balls = {}; IDS.forEach(function(id){ S.balls[id] = mine && mine[id] != null ? +mine[id] : ob ? ob[id] : DEF; });
    // an unfinished draw in this browser picks up where it left off (an official one only if it's still the latest on the site)
    var dr = lsGet('dcLotDraw'); if(dr && dr.order && dr.order.length === N && (!dr.official || (latest() && latest().ts === dr.ts))) S.draw = dr;
    route();
  });
})();
