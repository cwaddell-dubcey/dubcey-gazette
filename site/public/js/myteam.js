(function(){
  var D = DC, $ = D.$, esc = D.esc, arr = D.arr, num = D.num, helm = D.helm;
  var PO = { QB:1, RB:2, WR:3, TE:4, PK:5, K:5, Def:6, DEF:6 };
  var S = { me:'', tab:(location.hash || '#lineup').slice(1), week:0, live:null, rules:null, start:{}, lock:{}, dirty:false, R:{}, rec:{}, trade:{ to:'', give:{}, get:{} } };
  (function(){ var q = new URLSearchParams(location.search), to = q.get('to'), g = q.get('get'); if(to){ S.trade.to = to; if(g) S.trade.get[g] = 1; } })();

  function toast(msg, bad){ var t = $('toast'); t.textContent = msg; t.className = 'toast mono' + (bad ? ' bad' : ''); t.hidden = false; clearTimeout(t._h); t._h = setTimeout(function(){ t.hidden = true; }, 4200); }
  function tabs(){ [].forEach.call(document.querySelectorAll('#tabs a'), function(a){ a.classList.toggle('on', a.getAttribute('data-t') === S.tab); }); }

  D.shell('myteam').then(function(me){
    S.me = me.franchise || '';
    var f = new URLSearchParams(location.search).get('f');
    if(me.commish && f && D.NAME[f] && f !== S.me){ S.me = f; S.as = 1; S.tab = 'lineup'; }
    if(!S.me){
      $('tabs').hidden = true;
      $('mtb').innerHTML = '<div class="gate card"><img src="img/hocking-hills-2026.webp" alt=""><div><div class="kick mono">OWNERS ONLY</div><h2>Sign in to run your team</h2><p>Set your lineup, answer trade offers and check your waiver claims. Use your MyFantasyLeague login.</p><button class="btn" type="button" id="gateIn">SIGN IN</button></div></div>';
      $('gateIn').addEventListener('click', D.signIn);
      return;
    }
    $('k').textContent = 'MY TEAM · ' + D.NAME[S.me].toUpperCase();
    $('h').textContent = D.SHORT[S.me];
    if(S.as){ $('k').textContent = 'COMMISSIONER \u00b7 SETTING LINEUP FOR ' + D.NAME[S.me].toUpperCase(); $('tabs').innerHTML = '<a href="' + D.href('commish') + '#lineups">\u2190 BACK TO COMMISH</a>'; }
    tabs(); boot();
  });

  function boot(){
    Promise.all([D.api('liveScoring'), D.api('league').catch(function(){ return null; }), D.api('rosters').catch(function(){ return null; }), D.records()]).then(function(r){
      var L = r[0] && r[0].liveScoring; S.week = num(L && L.week);
      S.rules = r[1] && r[1].league && r[1].league.starters;
      arr(r[2] && r[2].rosters && r[2].rosters.franchise).forEach(function(f){ S.R[f.id] = arr(f.player).map(function(p){ return p.id; }); });
      S.rec = r[3].rec;
      arr(L && L.matchup).forEach(function(m){ var f = arr(m.franchise); f.forEach(function(x, i){ if(x.id === S.me){ S.live = x; S.opp = f[1 - i] && f[1 - i].id; } }); });
      var mine = S.live ? arr((S.live.players && S.live.players.player) || S.live.player) : [];
      mine.forEach(function(p){ S.start[p.id] = p.status === 'starter'; var sec = num(p.gameSecondsRemaining); S.lock[p.id] = !D.LOCAL && (sec > 0 && sec < 3600 || (num(p.score) > 0 && sec === 0)); });
      (S.R[S.me] || []).forEach(function(id){ if(!(id in S.start)) S.start[id] = false; });
      var ids = Object.keys(S.start); Object.keys(S.R).forEach(function(k){ ids = ids.concat(S.R[k]); });
      return D.players(ids);
    }).then(draw).catch(function(){ $('mtb').innerHTML = '<div class="ld mono">COULDN\u2019T LOAD YOUR TEAM. TRY AGAIN IN A MINUTE.</div>'; });
  }
  function draw(){ tabs(); if(S.tab === 'trades') return trades(); if(S.tab === 'waivers') return waivers(); lineup(); }

  /* ---------- lineup ---------- */
  function limits(){
    var R = S.rules, out = { count:0, pos:{} };
    if(!R) return out;
    out.count = num(R.count);
    arr(R.position).forEach(function(p){ var m = String(p.limit || '').split('-'); out.pos[p.name] = [num(m[0]), num(m[1] || m[0])]; });
    return out;
  }
  function check(){
    var lim = limits(), c = {}, n = 0, bad = [];
    Object.keys(S.start).forEach(function(id){ if(S.start[id]){ n++; var pos = D.pinfo(id)[1]; c[pos] = (c[pos] || 0) + 1; } });
    if(lim.count && n !== lim.count) bad.push('Start exactly ' + lim.count + ' (you have ' + n + ')');
    Object.keys(lim.pos).forEach(function(p){ var k = c[p] || 0, l = lim.pos[p]; if(k < l[0] || k > l[1]) bad.push(p + ': ' + (l[0] === l[1] ? l[0] : l[0] + '\u2013' + l[1]) + ' (you have ' + k + ')'); });
    return { lim:lim, c:c, n:n, bad:bad };
  }
  function prow(id, starter){
    var i = D.pinfo(id), lk = S.lock[id];
    return '<button type="button" class="lu' + (lk ? ' lk' : '') + '" data-p="' + esc(id) + '"' + (lk ? ' disabled' : '') + '><span class="pos ' + esc(i[1]) + '">' + esc(i[1] || '\u2013') + '</span>' + D.face(id, i[1], i[2]) + '<span class="nm2">' + esc(i[0]) + '<i class="mono">' + D.tlogo(i[2]) + esc(i[2]) + (lk ? ' · LOCKED' : '') + '</i></span><span class="mv mono">' + (lk ? '\ud83d\udd12' : starter ? 'BENCH \u2193' : 'START \u2191') + '</span></button>';
  }
  function lineup(){
    var ids = Object.keys(S.start).sort(function(a, b){ return (PO[D.pinfo(a)[1]] || 9) - (PO[D.pinfo(b)[1]] || 9); });
    var st = ids.filter(function(id){ return S.start[id]; }), bn = ids.filter(function(id){ return !S.start[id]; }), v = check();
    var opp = S.opp ? '<a class="vs2" href="' + D.href('scores') + '"><span class="mono">WEEK ' + S.week + ' VS</span><img src="' + helm(S.opp) + '" alt=""><b>' + esc(D.NAME[S.opp]) + '</b><span class="mono">' + esc(S.rec[S.opp] || '') + '</span></a>' : '';
    var chips = Object.keys(v.lim.pos).map(function(p){ var l = v.lim.pos[p], k = v.c[p] || 0, ok = k >= l[0] && k <= l[1]; return '<span class="chip mono' + (ok ? '' : ' no') + '">' + p + ' ' + k + '<em>/' + (l[0] === l[1] ? l[0] : l[0] + '\u2013' + l[1]) + '</em></span>'; }).join('') +
      (v.lim.count ? '<span class="chip mono' + (v.n === v.lim.count ? '' : ' no') + '">TOTAL ' + v.n + '<em>/' + v.lim.count + '</em></span>' : '');
    $('mtb').innerHTML = opp +
      '<div class="lugrid"><article class="card"><div class="bar mono"><span>STARTERS</span><span>TAP TO BENCH</span></div>' + (st.map(function(id){ return prow(id, true); }).join('') || '<div class="ld mono">NO STARTERS SET</div>') + '</article>' +
      '<article class="card"><div class="bar mono"><span>BENCH</span><span>TAP TO START</span></div>' + (bn.map(function(id){ return prow(id, false); }).join('') || '<div class="ld mono">BENCH IS EMPTY</div>') + '</article></div>' +
      '<div class="savebar"><div class="chips">' + chips + '</div><div class="sv">' + (v.bad.length ? '<span class="why">' + esc(v.bad[0]) + '</span>' : (S.dirty ? '<span class="why ok mono">UNSAVED CHANGES</span>' : '')) +
      '<button class="btn" type="button" id="save"' + (v.bad.length || !S.dirty ? ' disabled' : '') + '>SAVE LINEUP</button></div></div>';
  }

  /* ---------- trades ---------- */
  function trades(){
    $('mtb').innerHTML = '<div class="duo" style="margin-top:6px"><article class="card" id="pend"><div class="bar mono"><span>TRADE OFFERS</span></div><div class="ld mono">LOADING…</div></article><article class="card" id="prop"></article></div>';
    D.api('pendingTrades').then(function(j){
      var T = arr(j && j.pendingTrades && j.pendingTrades.pendingTrade);
      $('pend').innerHTML = '<div class="bar mono"><span>TRADE OFFERS</span><span>' + T.length + ' PENDING</span></div>' + (T.map(function(t){
        var mine = t.offeringteam === S.me, other = mine ? t.offeredto : t.offeringteam;
        var give = String(t.will_give_up || '').split(',').filter(Boolean), get = String(t.will_receive || '').split(',').filter(Boolean);
        var you = mine ? give : get, them = mine ? get : give;
        function li(l){ return l.map(function(id){ var i = D.pinfo(id); return '<li><span class="pos ' + esc(i[1]) + '">' + esc(i[1]) + '</span>' + D.face(id, i[1], i[2]) + '<span>' + esc(i[0]) + '<i class="mono">' + D.tlogo(i[2]) + esc(i[2]) + '</i></span></li>'; }).join(''); }
        return '<div class="tro"><div class="trh"><img src="' + helm(other) + '" alt=""><div><b>' + esc(D.NAME[other]) + '</b><span class="mono">' + (mine ? 'YOU OFFERED' : 'OFFERED TO YOU') + '</span></div></div>' +
          '<div class="trs"><div><span class="mono">YOU GIVE</span><ul>' + li(you) + '</ul></div><div><span class="mono">YOU GET</span><ul>' + li(them) + '</ul></div></div>' +
          (t.comments ? '<p class="cm">\u201c' + esc(t.comments) + '\u201d</p>' : '') +
          '<div class="tra">' + (mine ? '<button class="btn ghost2" data-resp="revoke" data-id="' + esc(t.trade_id) + '">WITHDRAW</button>' : '<button class="btn" data-resp="accept" data-id="' + esc(t.trade_id) + '">ACCEPT</button><button class="btn ghost2" data-resp="reject" data-id="' + esc(t.trade_id) + '">DECLINE</button>') + '</div></div>';
      }).join('') || '<div class="ld mono">NO PENDING OFFERS</div>');
    }).catch(function(){ $('pend').innerHTML = '<div class="bar mono"><span>TRADE OFFERS</span></div><div class="ld mono">COULDN\u2019T LOAD OFFERS</div>'; });
    propose();
  }
  function propose(){
    var t = S.trade, others = D.IDS.filter(function(id){ return id !== S.me; });
    var h = '<div class="bar mono"><span>PROPOSE A TRADE</span><span>' + (t.to ? 'WITH ' + esc(D.SHORT[t.to]).toUpperCase() : 'PICK A TEAM') + '</span></div><div class="pick2">' +
      others.map(function(id){ return '<button type="button" class="' + (id === t.to ? 'on' : '') + '" data-to="' + id + '" title="' + esc(D.NAME[id]) + '"><img src="' + helm(id) + '" alt=""></button>'; }).join('') + '</div>';
    if(t.to){
      function list(f, side){ return (S.R[f] || []).slice().sort(function(a, b){ return (PO[D.pinfo(a)[1]] || 9) - (PO[D.pinfo(b)[1]] || 9); }).map(function(id){ var i = D.pinfo(id), on = t[side][id]; return '<label class="ck' + (on ? ' on' : '') + '"><input type="checkbox" data-side="' + side + '" value="' + esc(id) + '"' + (on ? ' checked' : '') + '><span class="pos ' + esc(i[1]) + '">' + esc(i[1]) + '</span>' + D.face(id, i[1], i[2]) + '<span>' + esc(i[0]) + '<i class="mono">' + D.tlogo(i[2]) + esc(i[2]) + '</i></span></label>'; }).join(''); }
      var ng = Object.keys(t.give).length, nr = Object.keys(t.get).length;
      h += '<div class="trs2"><div><div class="sub mono">YOU GIVE · ' + ng + '</div>' + list(S.me, 'give') + '</div><div><div class="sub mono">YOU GET · ' + nr + '</div>' + list(t.to, 'get') + '</div></div>' +
        '<div class="tsend"><input id="tcm" placeholder="Add a note (optional)" maxlength="200"><button class="btn" type="button" id="tsend"' + (ng && nr ? '' : ' disabled') + '>SEND OFFER</button></div>';
    }
    $('prop').innerHTML = h;
  }

  /* ---------- waivers ---------- */
  function waivers(){
    $('mtb').innerHTML = '<article class="card" id="pw" style="max-width:760px"><div class="bar mono"><span>MY WAIVER CLAIMS</span></div><div class="ld mono">LOADING…</div></article>';
    D.api('pendingWaivers').then(function(j){
      var W = arr(j && j.pendingWaivers && (j.pendingWaivers.pendingWaiver || j.pendingWaivers.waiverRequest));
      var ids = []; W.forEach(function(w){ ids.push(w.player, w.drop); });
      return D.players(ids.filter(Boolean)).then(function(){
        $('pw').innerHTML = '<div class="bar mono"><span>MY WAIVER CLAIMS</span><span>' + W.length + ' PENDING</span></div>' + (W.map(function(w){
          var a = D.pinfo(w.player), d = w.drop ? D.pinfo(w.drop) : null;
          return '<div class="wc"><span class="pos ' + esc(a[1]) + '">' + esc(a[1]) + '</span>' + D.face(w.player, a[1], a[2]) + '<div><b>' + esc(a[0]) + '</b><span class="mono">' + D.tlogo(a[2]) + esc(a[2]) + (d ? ' · DROP ' + esc(d[0]) : '') + '</span></div>' + (w.amount ? '<em>$' + esc(w.amount) + '</em>' : '') + '</div>';
        }).join('') || '<div class="ld mono">NO CLAIMS IN</div>') + '<div class="wcf"><a class="btn" href="' + D.href('players') + '">FIND PLAYERS \u2192</a></div>';
      });
    }).catch(function(){ $('pw').innerHTML = '<div class="bar mono"><span>MY WAIVER CLAIMS</span></div><div class="ld mono">COULDN\u2019T LOAD CLAIMS</div><div class="wcf"><a class="btn" href="' + D.href('players') + '">FIND PLAYERS \u2192</a></div>'; });
  }

  /* ---------- events ---------- */
  window.addEventListener('hashchange', function(){ S.tab = (location.hash || '#lineup').slice(1); if(S.me) draw(); });
  document.addEventListener('click', function(e){
    var p = e.target.closest('[data-p]');
    if(p && !p.disabled){ var id = p.getAttribute('data-p'); S.start[id] = !S.start[id]; S.dirty = true; lineup(); return; }
    if(e.target.id === 'save'){
      var b = e.target; b.disabled = true; b.textContent = 'SAVING\u2026';
      var st = Object.keys(S.start).filter(function(id){ return S.start[id]; });
      D.act('lineup', S.as ? { W:S.week, STARTERS:st.join(','), FRANCHISE_ID:S.me } : { W:S.week, STARTERS:st.join(',') }).then(function(r){
        if(r && r.ok){ S.dirty = false; toast(r.demo ? 'PREVIEW ONLY \u2014 LINEUP NOT SENT' : 'LINEUP SAVED'); lineup(); }
        else { toast((r && r.error) || 'MFL DIDN\u2019T ACCEPT THAT LINEUP', true); b.disabled = false; b.textContent = 'SAVE LINEUP'; }
      }).catch(function(){ toast('COULDN\u2019T REACH MFL', true); b.disabled = false; b.textContent = 'SAVE LINEUP'; });
      return;
    }
    var to = e.target.closest('[data-to]');
    if(to){ S.trade = { to:to.getAttribute('data-to'), give:{}, get:{} }; propose(); return; }
    var rsp = e.target.closest('[data-resp]');
    if(rsp){
      var kind = rsp.getAttribute('data-resp'); rsp.disabled = true;
      D.act('tradeResponse', { TRADE_ID:rsp.getAttribute('data-id'), RESPONSE:kind }).then(function(r){ toast(r && r.ok ? (r.demo ? 'PREVIEW ONLY \u2014 NOT SENT' : kind === 'accept' ? 'TRADE ACCEPTED' : kind === 'reject' ? 'TRADE DECLINED' : 'OFFER WITHDRAWN') : ((r && r.error) || 'MFL REJECTED THAT'), !(r && r.ok)); if(r && r.ok && !r.demo) trades(); else rsp.disabled = false; });
      return;
    }
    if(e.target.id === 'tsend'){
      var t = S.trade, sb = e.target; sb.disabled = true;
      D.act('tradeProposal', { OFFEREDTO:t.to, WILL_GIVE_UP:Object.keys(t.give).join(','), WILL_RECEIVE:Object.keys(t.get).join(','), COMMENTS:($('tcm').value || '').trim() }).then(function(r){
        if(r && r.ok){ toast(r.demo ? 'PREVIEW ONLY \u2014 OFFER NOT SENT' : 'OFFER SENT TO ' + D.SHORT[t.to].toUpperCase()); if(!r.demo){ S.trade = { to:'', give:{}, get:{} }; trades(); } else sb.disabled = false; }
        else { toast((r && r.error) || 'MFL REJECTED THE OFFER', true); sb.disabled = false; }
      });
    }
  });
  document.addEventListener('change', function(e){
    var c = e.target.closest('input[data-side]'); if(!c) return;
    var side = c.getAttribute('data-side'); if(c.checked) S.trade[side][c.value] = 1; else delete S.trade[side][c.value];
    var cm = $('tcm') ? $('tcm').value : ''; propose(); if($('tcm')) $('tcm').value = cm;
  });
})();
