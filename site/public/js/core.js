/* dubcey.party shared core: team data, MFL data access, sign-in, header */
(function(){
  var D = window.DC = {};
  D.L = '18919'; D.Y = '2026';
  D.RAW = 'https://raw.githubusercontent.com/cwaddell-dubcey/dubcey-gazette/main/assets/';
  D.LOCAL = !/dubcey\.party$|workers\.dev$/.test(location.hostname);
  D.IDS = ['0001','0002','0003','0004','0005','0006','0007','0008','0009','0010','0011','0012'];
  D.NAME = {"0001":"Bloodfeast Islandmen","0002":"Entertainment 720","0003":"The Ligers","0004":"Windy City Wet Bandits","0005":"Full Blown Trash","0006":"Nuts on Your Drumset","0007":"The Scallywags","0008":"Wad of Hell","0009":"Viva La Resistance","0010":"Prestige Worldwide","0011":"Breaking My Back","0012":"The Diamond Dogs"};
  D.SHORT = {"0001":"Bloodfeast","0002":"E720","0003":"Ligers","0004":"Wet Bandits","0005":"Full Blown","0006":"Nuts","0007":"Scallywags","0008":"Wad of Hell","0009":"Viva","0010":"Prestige","0011":"BMB","0012":"Diamond Dogs"};
  D.HELM = {"0001":"bloodfeast2026","0002":"helmet-e720","0003":"helmet-ligers","0004":"windy2026","0005":"helmet-full","0006":"helmet-nuts","0007":"scally2026","0008":"helmet-devil","0009":"helmet-resistance","0010":"helmet-prestige","0011":"helmet-bmb","0012":"diamonddogs2026v2"};
  D.CUSTOM = {};
  // helmets: a team with alternates rotates them, one per week (changes Tuesday), same pick for everyone
  D.ALT = {};
  D.helmWeek = Math.floor((Date.now() - Date.UTC(2026, 0, 6, 9)) / 6048e5);
  D.helmPool = function(id){ return [D.CUSTOM[id] || ('h/' + (D.HELM[id] || 'logo') + '.webp')].concat(D.ALT[id] || []); };
  D.helm = function(id){
    var P = D.helmPool(id); if(P.length < 2) return P[0];
    var s = String(id) + ':' + D.helmWeek, h = 2166136261; for(var i = 0; i < s.length; i++){ h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    return P[(h >>> 0) % P.length];
  };
  D.COMMISH = ['0001'];
  // divisions: full banner for section headers, badge crop for inline tags
  D.DIVS = [
    { k:'malort', name:'Mal\u00f6rt', crest:'img/div-malort-crest.webp', ids:['0009','0012','0011','0010'] },
    { k:'rumple', name:'RumpleMinze', crest:'img/div-rumple-crest.webp', ids:['0002','0004','0003','0001'] },
    { k:'soup', name:'Soup City', crest:'img/div-soup-crest.svg', ids:['0005','0008','0006','0007'] }
  ];
  // home-page popups on a weekly clock (Eastern). kind 'waivers' = the Waiver Report; 'note' = commish-written message
  D.DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  D.POPUPS = [{ id:'waivers', kind:'waivers', title:'The Waiver Report', on:true, sd:'Wed', st:'20:05', ed:'Thu', et:'11:00' }];
  D.popups = function(){ return D.content('popups').then(function(p){ return p && p.length ? p : D.POPUPS; }); };
  D.etNow = function(){
    var p = new Intl.DateTimeFormat('en-US', { timeZone:'America/New_York', weekday:'short', hour:'numeric', minute:'numeric', hour12:false }).formatToParts(new Date());
    function g(t){ return (p.filter(function(x){ return x.type === t; })[0] || {}).value; }
    return D.DAYS.indexOf(g('weekday')) * 1440 + (+g('hour') % 24) * 60 + (+g('minute'));
  };
  D.weekMin = function(d, t){ var hm = String(t || '0:0').split(':'); return D.DAYS.indexOf(d) * 1440 + (+hm[0]) * 60 + (+hm[1] || 0); };
  D.inWindow = function(p, now){ var a = D.weekMin(p.sd, p.st), b = D.weekMin(p.ed, p.et); now = now == null ? D.etNow() : now; return a <= b ? now >= a && now < b : now >= a || now < b; };
  // Dubcey add rules: free agency opens Thu 9 a.m. ET; a player locks at his game's kickoff and stays on blind-bid waivers until the Wed 8 p.m. run
  D.FA_OPEN = ['Thu', '9:00']; D.WAIVER_RUN = ['Wed', '20:00'];
  var NFLW = null;
  D.addWindow = function(team){
    NFLW = NFLW || D.api('nflSchedule').catch(function(){ return null; });
    return NFLW.then(function(j){
      var now = Date.now(), m = D.etNow(), open = D.weekMin(D.FA_OPEN[0], D.FA_OPEN[1]), run = D.weekMin(D.WAIVER_RUN[0], D.WAIVER_RUN[1]);
      var since = ((m - open) % 10080 + 10080) % 10080, lastOpen = now - since * 60000, cycle = (run - open + 10080) % 10080;
      var kick = 0, last = 0;
      D.arr(j && j.nflSchedule && j.nflSchedule.matchup).forEach(function(g){ var k = D.num(g.kickoff) * 1000; if(k > last) last = k; D.arr(g.team).forEach(function(t){ if(t.id === team) kick = k; }); });
      var lock = kick || last;
      var fa = since < cycle && lock > now && lock - lastOpen < cycle * 60000;
      return { mode:fa ? 'fa' : 'bid', lock:fa ? lock : 0, bye:!kick };
    });
  };
  D.addWhy = function(w){
    if(w.mode === 'fa') return 'FREE AGENCY IS OPEN. HE\u2019S ADDED RIGHT AWAY. HE LOCKS AT KICKOFF ' + new Date(w.lock).toLocaleString('en-US', { timeZone:'America/New_York', weekday:'short', hour:'numeric', minute:'2-digit' }).toUpperCase() + ' ET.';
    return 'HE\u2019S LOCKED UNTIL WAIVERS RUN WEDNESDAY AT 8 P.M. ET. PUT IN A BLIND BID; HIGHEST BID WINS. FREE AGENCY REOPENS THURSDAY AT 9 A.M.';
  };
  D.div = function(id){ for(var i = 0; i < D.DIVS.length; i++) if(D.DIVS[i].ids.indexOf(id) > -1) return D.DIVS[i]; return null; };
  // division header: crest + name (divisions with a crest), otherwise the old banner image
  D.divBanner = function(d, extra){
    if(!d.crest) return '<div class="divhd ' + d.k + '"><img src="img/div-' + d.k + '.webp" alt="' + D.esc(d.name) + ' Division"></div>';
    return '<div class="dvb ' + d.k + '"><img class="dvc" src="' + d.crest + '" alt=""><div class="dvt"><span class="dvn">' + D.esc(d.name) + '</span></div>' + (extra ? '<div class="dvx">' + extra + '</div>' : '') + '</div>';
  };
  D.divTag = function(id, txt){ var d = D.div(id); return d ? '<span class="dtag ' + d.k + '"><img src="' + (d.crest || 'img/div-' + d.k + '-badge.webp') + '" alt="">' + D.esc(txt || d.name) + '</span>' : ''; };
  D.divChip = function(id, txt){ var d = D.div(id); return d ? '<span class="dchip ' + d.k + '" title="' + D.esc(d.name) + ' divisional game"><img src="' + d.crest + '" alt=""><i class="mono">' + D.esc(txt || 'DIV GAME') + '</i></span>' : ''; };
  D.esc = function(s){ return String(s == null ? '' : s).replace(/[&<>"]/g, function(c){ return { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;' }[c]; }); };
  D.arr = function(x){ return x == null ? [] : (Array.isArray(x) ? x : [x]); };
  D.num = function(v){ var n = parseFloat(v); return isNaN(n) ? 0 : n; };
  D.pts = function(n){ n = D.num(n); return n % 1 ? n.toFixed(2) : String(n); };
  D.$ = function(id){ return document.getElementById(id); };
  D.href = function(p, q){ return (D.LOCAL ? (p || 'index') + '.html' : '/' + (p || '')) + (q ? '?' + q : ''); };

  // commissioner-edited content (Dispatch, team names, calendar, by-laws). Preview keeps edits in this browser.
  D.content = function(key){
    if(D.LOCAL){ var v = null; try{ v = JSON.parse(localStorage.getItem('dcC:' + key) || 'null'); }catch(e){} return Promise.resolve(v); }
    return fetch('/content/' + key, { credentials:'same-origin' }).then(function(r){ return r.ok ? r.json() : null; }).catch(function(){ return null; });
  };
  D.save = function(key, obj){
    if(D.LOCAL){ try{ localStorage.setItem('dcC:' + key, JSON.stringify(obj)); }catch(e){ return Promise.resolve({ ok:false, error:'Too big for the preview.' }); } return Promise.resolve({ ok:true, demo:true }); }
    return fetch('/content/' + key, { method:'PUT', credentials:'same-origin', headers:{ 'Content-Type':'application/json' }, body:JSON.stringify(obj) }).then(function(r){ return r.json(); }).catch(function(){ return { ok:false, error:'Couldn\u2019t reach the site.' }; });
  };
  D.saveImg = function(id, blob){
    if(D.LOCAL) return new Promise(function(res){ var fr = new FileReader(); fr.onload = function(){ try{ localStorage.setItem('dcImg:' + id, fr.result); res({ ok:true, demo:true, url:fr.result }); }catch(e){ res({ ok:false, error:'Too big for the preview.' }); } }; fr.readAsDataURL(blob); });
    return fetch('/content/img/' + id, { method:'PUT', credentials:'same-origin', headers:{ 'Content-Type':blob.type || 'image/webp' }, body:blob }).then(function(r){ return r.json(); }).then(function(j){ if(j.ok) j.url = '/content/img/' + id + '?v=' + j.v; return j; });
  };
  // team-name / helmet overrides, applied before any page draws
  D.teamsReady = D.content('teams').then(function(t){
    Object.keys(t || {}).forEach(function(id){ var o = t[id] || {}; if(!D.NAME[id]) return; if(o.name) D.NAME[id] = o.name; if(o.short) D.SHORT[id] = o.short; if(o.helm) D.CUSTOM[id] = D.LOCAL ? (localStorage.getItem('dcImg:' + id) || '') || undefined : o.helm; if(Array.isArray(o.alts) && o.alts.length) D.ALT[id] = o.alts.map(function(a){ return D.LOCAL ? localStorage.getItem('dcImg:' + a.k) || '' : a.url; }).filter(Boolean); });
    return t || {};
  }).catch(function(){ return {}; });

  // league data via the site's own connection (local preview reads sample files)
  // injury designations (Q / D / OUT / IR / SUS…), loaded once and shown next to every player name via D.ij(id)
  D.INJ = {};
  D.injCode = function(s){ s = String(s || '').toLowerCase().trim(); if(!s) return ''; if(/^q/.test(s)) return 'Q'; if(/^doubt/.test(s)) return 'D'; if(/^out/.test(s)) return 'OUT'; if(/^(ir|injured)/.test(s)) return 'IR'; if(/^susp/.test(s)) return 'SUS'; if(/^pup/.test(s)) return 'PUP'; if(/^hold/.test(s)) return 'HO'; if(/^retir/.test(s)) return ''; if(/^prob/.test(s)) return 'P'; if(/^(nfi|non)/.test(s)) return 'NFI'; return s.toUpperCase().slice(0, 4); };
  D.injReady = api('injuries', 'r=2').then(function(j){ D.arr(j && j.injuries && j.injuries.injury).forEach(function(i){ var k = D.injCode(i.status); if(k) D.INJ[i.id] = { k:k, full:i.status || '', det:[i.details, i.exp_return ? 'est. return ' + i.exp_return : ''].filter(Boolean).join(', ') }; }); }).catch(function(){});
  D.ij = function(id){ var x = D.INJ[id]; return x ? '<span class="ij mono" title="' + D.esc(x.full + (x.det ? ' \u2014 ' + x.det : '')) + '">' + x.k + '</span>' : ''; };
  D.api = function(t, q){ return Promise.all([D.teamsReady, D.injReady]).then(function(){ return api(t, q); }); };
  function api(t, q){
    if(D.LOCAL) return fetch('demo/' + t + '.json').then(function(r){ if(!r.ok) throw 0; return r.json(); });
    return fetch('/api/' + t + (q ? '?' + q : ''), { credentials:'same-origin', cache:'no-cache' }).then(function(r){ if(!r.ok) throw r.status; return r.json(); });
  }
  // write actions (lineups, waivers, trades…) — owner must be signed in
  D.act = function(t, body){
    if(D.LOCAL) return Promise.resolve({ ok:true, demo:true });
    return fetch('/act/' + t, { method:'POST', credentials:'same-origin', headers:{ 'Content-Type':'application/json' }, body:JSON.stringify(body || {}) }).then(function(r){ return r.json(); });
  };
  D.columnFile = function(){ return fetch(D.LOCAL ? 'demo/column.json' : D.RAW + 'column.json?t=' + Math.floor(Date.now() / 300000)).then(function(r){ return r.json(); }); };
  D.column = function(){ return D.content('column').then(function(c){ return c && c.weeks ? c : D.columnFile(); }); };
  D.award = function(v){ return typeof v === 'string' ? { text:v, id:'' } : (v || { text:'', id:'' }); };
  // $50 weekly low scorer: commish's pick in Finances wins; otherwise the lowest MFL score that week
  D.LOW_FINE = 50;
  // next year's auction: $200 each, trades move dollars (budget must land $170–$230) and rookie picks
  D.NEXT = { year:2027, base:200, min:170, max:230 };
  D.FUTURE_SEED = [
    { date:'2026-09-08', from:'0006', to:'0004', amt:4, pick:'', note:'Waddle / Etienne trade' },
    { date:'2026-09-09', from:'0005', to:'0001', amt:4, pick:'', note:'Kittle / Engram trade' },
    { date:'2026-10-12', from:'0005', to:'0001', amt:10, pick:'0005', note:'McConkey / Mitchell trade' }
  ];
  D.futureCalc = function(moves){
    var T = {}; D.IDS.forEach(function(id){ T[id] = { id:id, budget:D.NEXT.base, picks:[id], moves:[] }; });
    D.arr(moves).slice().sort(function(a, b){ return String(a.date).localeCompare(String(b.date)); }).forEach(function(m){
      if(!T[m.from] || !T[m.to]) return;
      var a = D.num(m.amt); T[m.from].budget -= a; T[m.to].budget += a;
      T[m.from].moves.push({ m:m, d:-a, other:m.to, pick:m.pick ? 'out' : '' }); T[m.to].moves.push({ m:m, d:a, other:m.from, pick:m.pick ? 'in' : '' });
      if(m.pick){ var i = T[m.from].picks.indexOf(m.pick); if(i > -1){ T[m.from].picks.splice(i, 1); T[m.to].picks.push(m.pick); } }
    });
    return T;
  };
  // trades proposed on the site carry next-year money/picks in a tag inside the MFL comment: [dc27:0001>0005:10:p,0005>0001:4]
  D.futTag = function(parts){ var p = parts.filter(function(x){ return x.amt > 0 || x.pick; }); return p.length ? '[dc' + String(D.NEXT.year).slice(2) + ':' + p.map(function(x){ return x.from + '>' + x.to + ':' + (x.amt || 0) + (x.pick ? ':' + x.pick : ''); }).join(',') + ']' : ''; };
  D.futParse = function(s){ var m = new RegExp('\\[dc' + String(D.NEXT.year).slice(2) + ':([^\\]]+)\\]').exec(String(s || '')); if(!m) return []; return m[1].split(',').map(function(x){ var q = x.split(/[>:]/); return { from:q[0], to:q[1], amt:D.num(q[2]), pick:q[3] && q[3] !== 'p' ? q[3] : (q[3] === 'p' ? q[0] : '') }; }).filter(function(x){ return D.NAME[x.from] && D.NAME[x.to]; }); };
  D.futText = function(s){ return String(s || '').replace(/\s*\[dc\d\d:[^\]]+\]/, '').trim(); };
  var TXF = null;
  D.futureFromTrades = function(){
    TXF = TXF || D.api('transactions', 'TRANS_TYPE=TRADE&COUNT=200').then(function(j){
      var out = [];
      D.arr(j && j.transactions && j.transactions.transaction).forEach(function(t){
        if(!/TRADE/i.test(t.type)) return;
        D.futParse(t.comments).forEach(function(x, i){ out.push({ date:new Date(D.num(t.timestamp) * 1000).toISOString().slice(0, 10), from:x.from, to:x.to, amt:x.amt, pick:x.pick, note:D.futText(t.comments) || 'Trade', tx:t.timestamp + ':' + i, auto:1 }); });
      });
      return out;
    }).catch(function(){ return []; });
    return TXF;
  };
  D.future = function(){
    return Promise.all([D.content('finance').catch(function(){ return null; }), D.futureFromTrades()]).then(function(r){
      var base = r[0] && Array.isArray(r[0].future) ? r[0].future : D.FUTURE_SEED, have = {};
      base.forEach(function(m){ if(m.tx) have[m.tx] = 1; });
      return base.concat(r[1].filter(function(m){ return !have[m.tx]; }));
    });
  };
  // penalty pool is held in bitcoin: value it at today's price (falls back to dollars paid in if BTC holdings aren't entered)
  D.btcPrice = function(){
    var j = function(u){ return fetch(u).then(function(r){ return r.ok ? r.json() : null; }).catch(function(){ return null; }); };
    return j('https://api.coinbase.com/v2/prices/BTC-USD/spot').then(function(r){ var v = r && r.data && parseFloat(r.data.amount); return v > 0 ? v : j('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd').then(function(g){ return (g && g.bitcoin && g.bitcoin.usd) || 0; }); });
  };
  D.penPool = function(fallbackCost){
    return Promise.all([D.content('finance').catch(function(){ return null; }), D.btcPrice().catch(function(){ return 0; })]).then(function(r){
      var P = D.arr(r[0] && r[0].penalties), n = P.filter(function(p){ return p.fid || String(p.name || '').trim(); }).length;
      var btc = P.reduce(function(a, p){ return a + D.num(p.btc); }, 0), cost = n ? n * D.LOW_FINE : (fallbackCost || 0), px = r[1];
      return { cost:cost, btc:btc, px:px, now:px > 0 && btc > 0 ? btc * px : cost, live:px > 0 && btc > 0 };
    });
  };
  D.usd = function(v){ return '$' + Math.round(D.num(v)).toLocaleString('en-US'); };
  // one week of results: score, bench points (non-starters), opponent
  var WKR = {};
  D.week = function(w){
    WKR[w] = WKR[w] || D.api('weeklyResults', 'W=' + w).then(function(j){
      var out = [];
      D.arr(j && j.weeklyResults && j.weeklyResults.matchup).forEach(function(m){
        var F = D.arr(m.franchise);
        F.forEach(function(f, i){
          var pl = D.arr((f.players && f.players.player) || f.player), bench = pl.reduce(function(a, p){ return p.status === 'starter' ? a : a + D.num(p.score); }, 0);
          if(D.NAME[f.id]) out.push({ id:f.id, s:D.num(f.score), bench:bench, opp:F[1 - i] ? F[1 - i].id : '', res:f.result || '' });
        });
      });
      return out;
    }).catch(function(){ return []; });
    return WKR[w];
  };
  D.weeks = function(upTo){ var a = []; for(var w = 1; w <= upTo; w++) a.push(w); return Promise.all(a.map(D.week)); };
  // $50 low scorer: commish pick wins; otherwise lowest score, tie broken by fewer bench points
  D.lowScores = function(upTo){
    var ws = []; for(var i = 1; i <= upTo; i++) ws.push(i);
    return Promise.all([D.content('finance').catch(function(){ return null; }), D.weeks(upTo)]).then(function(r){
      var pen = {}; D.arr(r[0] && r[0].penalties).forEach(function(p, i){ if(p.fid) pen[p.week || i + 1] = p.fid; });
      return ws.map(function(w, k){
        var all = (r[1][k] || []).slice().sort(function(a, b){ return a.s - b.s || a.bench - b.bench; });
        if(!all.length || !all.some(function(x){ return x.s > 0; })) return pen[w] ? { w:w, id:pen[w], s:null } : null;
        var id = pen[w] || all[0].id, me = all.filter(function(x){ return x.id === id; })[0], hi = all.slice().sort(function(a, b){ return b.s - a.s || b.bench - a.bench; })[0];
        var tie = all[1] && all[1].s === all[0].s && !pen[w];
        return { w:w, id:id, s:me ? me.s : null, gap:all[1] && id === all[0].id ? all[1].s - all[0].s : null, tie:tie ? { other:all[1].id, bench:all[0].bench, obench:all[1].bench } : null, top:{ id:hi.id, s:hi.s } };
      }).filter(Boolean);
    });
  };
  // power rankings: 40% season points, 40% all-play win %, 20% last-3-weeks scoring
  D.power = function(upTo){
    return D.weeks(upTo).then(function(W){
      W = W.filter(function(x){ return x.length && x.some(function(y){ return y.s > 0; }); });
      if(!W.length) return { week:0, list:[] };
      function rank(L){
        var T = {}; D.IDS.forEach(function(id){ T[id] = { id:id, pf:0, apw:0, apl:0, last:[], w:0, l:0 }; });
        L.forEach(function(wk){ wk.forEach(function(x){ var t = T[x.id]; if(!t) return; t.pf += x.s; t.last.push(x.s); if(x.res === 'W') t.w++; else if(x.res === 'L') t.l++;
          wk.forEach(function(y){ if(y.id === x.id) return; if(x.s > y.s) t.apw++; else if(x.s < y.s) t.apl++; }); }); });
        var A = D.IDS.map(function(id){ var t = T[id], r3 = t.last.slice(-3); t.r3 = r3.length ? r3.reduce(function(a, b){ return a + b; }, 0) / r3.length : 0; t.ap = t.apw + t.apl ? t.apw / (t.apw + t.apl) : 0; return t; });
        var nm = function(k){ var v = A.map(function(t){ return t[k]; }), lo = Math.min.apply(null, v), hi = Math.max.apply(null, v); A.forEach(function(t){ t[k + 'n'] = hi > lo ? (t[k] - lo) / (hi - lo) : .5; }); };
        nm('pf'); nm('r3');
        A.forEach(function(t){ t.score = Math.round((.4 * t.pfn + .4 * t.ap + .2 * t.r3n) * 1000) / 10; });
        A.sort(function(a, b){ return b.score - a.score; }); A.forEach(function(t, i){ t.rk = i + 1; });
        return A;
      }
      var now = rank(W), prev = W.length > 1 ? rank(W.slice(0, -1)) : null, P = {};
      if(prev) prev.forEach(function(t){ P[t.id] = t.rk; });
      now.forEach(function(t){ t.prev = P[t.id] || t.rk; t.mv = t.prev - t.rk; });
      return { week:W.length, list:now };
    });
  };

  // matchup previews for week w: best projected lineup per team (league starter rules), records, key players
  D.previews = function(w){
    var no = function(){ return null; };
    return Promise.all([D.api('schedule', 'W=' + w).catch(no), D.api('rosters').catch(no), D.api('projectedScores', 'W=' + w).catch(no), D.api('league').catch(no), D.records(), D.power(Math.max(1, w - 1)).catch(no)]).then(function(r){
      var wk = D.arr(r[0] && r[0].schedule && r[0].schedule.weeklySchedule).filter(function(x){ return +x.week === +w; })[0] || D.arr(r[0] && r[0].schedule && r[0].schedule.weeklySchedule)[0];
      var M = D.arr(wk && wk.matchup); if(!M.length) return [];
      var PJ = {}; D.arr(r[2] && r[2].projectedScores && r[2].projectedScores.playerScore).forEach(function(x){ if(x.score !== '') PJ[x.id] = D.num(x.score); });
      var RO = {}, ids = []; D.arr(r[1] && r[1].rosters && r[1].rosters.franchise).forEach(function(f){ RO[f.id] = D.arr(f.player).map(function(p){ ids.push(p.id); return p.id; }); });
      var st = (r[3] && r[3].league && r[3].league.starters) || {}, slots = D.arr(st.position).filter(function(p){ return D.OURPOS[p.name]; }).map(function(p){ var a = String(p.limit || '1').split('-'); return { pos:p.name, min:+a[0] || 0, max:+(a[1] || a[0]) || 0 }; }), tot = D.num(st.count) || 9;
      var PW = {}; if(r[5] && r[5].week) r[5].list.forEach(function(t){ PW[t.id] = t.rk; });
      return D.players(ids).then(function(){
        function best(fid){
          var pool = (RO[fid] || []).map(function(id){ return { id:id, pos:D.pinfo(id)[1], p:PJ[id] || 0 }; }).filter(function(x){ return D.OURPOS[x.pos]; }).sort(function(a, b){ return b.p - a.p; });
          var pick = [], used = {}, cnt = {};
          slots.forEach(function(s){ pool.filter(function(x){ return x.pos === s.pos; }).slice(0, s.min).forEach(function(x){ pick.push(x); used[x.id] = 1; cnt[s.pos] = (cnt[s.pos] || 0) + 1; }); });
          pool.forEach(function(x){ if(pick.length >= tot || used[x.id]) return; var s = slots.filter(function(y){ return y.pos === x.pos; })[0]; if(s && (cnt[x.pos] || 0) >= s.max) return; pick.push(x); used[x.id] = 1; cnt[x.pos] = (cnt[x.pos] || 0) + 1; });
          return { proj:pick.reduce(function(a, x){ return a + x.p; }, 0), key:pick[0] || null };
        }
        return M.map(function(m){
          var F = D.arr(m.franchise); if(F.length !== 2) return null;
          var a = F.filter(function(x){ return x.isHome !== '1'; })[0] || F[0], h = F.filter(function(x){ return x !== a; })[0];
          var A = best(a.id), H = best(h.id), da = D.div(a.id), dh = D.div(h.id);
          return { a:a.id, h:h.id, pa:A.proj, ph:H.proj, ka:A.key, kh:H.key, ra:r[4].rec[a.id] || '', rh:r[4].rec[h.id] || '', pwa:PW[a.id], pwh:PW[h.id], div:!!(da && dh && da.k === dh.k), gap:Math.abs(A.proj - H.proj) };
        }).filter(Boolean).sort(function(x, y){ return (x.gap - y.gap); });
      });
    });
  };

  // auto-written Dispatch pieces: preview cards and the power rankings story
  D.previewCard = function(p){
    var side = function(id, pj, k, rec, pw){ var i = k ? D.pinfo(k.id) : null; return '<div class="pvt"><img src="' + D.helm(id) + '" alt=""><b>' + D.esc(D.SHORT[id]) + '</b><span class="mono">' + D.esc(rec) + (pw ? ' \u00b7 PWR ' + pw : '') + '</span><em>' + (pj ? D.pts(Math.round(pj * 100) / 100) : '\u2013') + '</em>' + (i ? '<i class="mono">KEY: ' + D.esc(i[0]) + ' (' + D.esc(i[1]) + ') ' + (k.p ? D.pts(k.p) : '') + '</i>' : '') + '</div>'; };
    var fav = p.pa === p.ph ? '' : (p.pa > p.ph ? p.a : p.h);
    return '<div class="pv' + (p.div ? ' dv' : '') + '"><div class="pvk mono">' + (p.div ? 'DIVISION GAME' : 'MATCHUP') + (fav ? ' \u00b7 ' + D.esc(D.SHORT[fav]).toUpperCase() + ' BY ' + D.pts(Math.round(p.gap * 100) / 100) : '') + '</div><div class="pvg">' + side(p.a, p.pa, p.ka, p.ra, p.pwa) + '<span class="pvat mono">@</span>' + side(p.h, p.ph, p.kh, p.rh, p.pwh) + '</div>' + (p.txt ? '<div class="pvw"><h4>' + D.esc(p.txt.head) + '</h4><p>' + D.esc(p.txt.text) + '</p></div>' : '') + '</div>';
  };
  D.powerStory = function(PR){
    var L = PR.list, t = L[0], up = L.slice().sort(function(a, b){ return b.mv - a.mv; })[0], dn = L.slice().sort(function(a, b){ return a.mv - b.mv; })[0], last = L[L.length - 1];
    var txt = D.esc(D.NAME[t.id]) + ' sits at No. 1 after Week ' + PR.week + ', going ' + t.apw + '-' + t.apl + ' against the whole league.';
    if(up && up.mv > 0) txt += ' ' + D.esc(D.SHORT[up.id]) + ' climbed ' + up.mv + ' spot' + (up.mv > 1 ? 's' : '') + ' to No. ' + up.rk + '.';
    if(dn && dn.mv < 0) txt += ' ' + D.esc(D.SHORT[dn.id]) + ' fell ' + (-dn.mv) + ' to No. ' + dn.rk + '.';
    txt += ' ' + D.esc(D.SHORT[last.id]) + ' brings up the rear.';
    return { id:t.id, kick:'POWER RANKINGS \u00b7 WEEK ' + PR.week, head:D.esc(D.SHORT[t.id]) + ' on top', body:txt, top5:L.slice(0, 5) };
  };

  // player names, cached in the browser for a day
  var PK = 'dcPlayers', PI = null;
  D.players = function(ids){
    if(!PI){ try{ var c = JSON.parse(localStorage.getItem(PK) || '{}'); PI = (c.at && Date.now() - c.at < 864e5) ? c.p : {}; }catch(e){ PI = {}; } }
    var need = ids.filter(function(id){ return id && !PI[id]; }), jobs = [];
    for(var i = 0; i < need.length; i += 150) jobs.push(D.api('players', 'PLAYERS=' + need.slice(i, i + 150).join(',')));
    return Promise.all(jobs).then(function(rs){
      rs.forEach(function(j){ D.arr(j && j.players && j.players.player).forEach(function(p){ var n = String(p.name).split(', '); PI[p.id] = [n[1] ? n[1] + ' ' + n[0] : p.name, p.position || '', p.team || '']; }); });
      if(need.length){ try{ localStorage.setItem(PK, JSON.stringify({ at:Date.now(), p:PI })); }catch(e){} }
      return PI;
    }).catch(function(){ return PI; });
  };
  // NFL team logos + player headshots
  var NFLX = { GBP:'gb', KCC:'kc', NEP:'ne', NOS:'no', SFO:'sf', TBB:'tb', LVR:'lv', JAC:'jax', WAS:'wsh', LAR:'lar', LAC:'lac', OAK:'lv', SDC:'lac', STL:'lar' };
  D.nflLogo = function(t){ t = String(t || '').toUpperCase(); if(!t || t === 'FA') return 'h/logo.webp'; return 'https://a.espncdn.com/i/teamlogos/nfl/500/' + (NFLX[t] || t.toLowerCase()) + '.png'; };
  D.photo = function(id, team, pos){ return /^(Def|DEF|TMDEF|ST)$/.test(pos || '') ? D.nflLogo(team) : 'https://www.mflscripts.com/playerImages_80x107/mfl_' + id + '.png'; };
  D.face = function(id, pos, team, big){ var lg = D.nflLogo(team); return '<span class="face' + (big ? ' big' : '') + '"' + (big ? '' : ' data-card="' + D.esc(id) + '"') + '><img src="' + D.photo(id, team, pos) + '" alt="" loading="lazy" onerror="this.onerror=null;this.src=\'' + lg + '\';this.className=\'lg\'"></span>'; };
  D.tlogo = function(team){ return team && team !== 'FA' ? '<img class="nl" src="' + D.nflLogo(team) + '" alt="' + D.esc(team) + '" title="' + D.esc(team) + '">' : ''; };
  D.OURPOS = { QB:1, RB:1, WR:1, TE:1 };
  // weekly stat lines for players ("245 PASS YDS · 2 PASS TD"), cached briefly in memory
  var SX = {}, WK = {};
  var ESPNX = { GBP:'GB', KCC:'KC', NEP:'NE', NOS:'NO', SFO:'SF', TBB:'TB', LVR:'LV', JAC:'JAX', WAS:'WSH' };
  function nkey(n){ return String(n || '').toLowerCase().replace(/[.'\u2019]/g, '').replace(/\s+(jr|sr|ii|iii|iv|v)$/, '').replace(/[^a-z ]/g, '').replace(/\s+/g, ' ').trim(); }
  D.stats = function(w, ids, live){
    if(D.LOCAL){ if(SX.demo) return Promise.resolve(); return fetch('demo/stats.json').then(function(r){ return r.json(); }).then(function(o){ SX.demo = o; }).catch(function(){}); }
    var c = WK[w], now = Date.now();
    if(c && (!live || now - c.t < 20000)) return c.p;
    var p = fetch('/data/espn?W=' + w, { cache:'no-cache' }).then(function(r){ return r.json(); }).then(function(o){ WK[w].o = o || {}; }).catch(function(){ WK[w].o = WK[w].o || {}; });
    WK[w] = { t:now, p:p, o:(c && c.o) || null };
    return p;
  };
  D.statOf = function(w, id){
    if(D.LOCAL) return (SX.demo && SX.demo[id]) || '';
    var c = WK[w]; if(!c || !c.o) return '';
    var i = D.pinfo(id), nm = nkey(i[0]), tm = String(i[2] || '').toUpperCase(), s = c.o[nm + '|' + (ESPNX[tm] || tm)];
    if(s == null){ for(var k in c.o){ if(k.split('|')[0] === nm){ s = c.o[k]; break; } } }
    return s && s !== 'NO STATS' ? s : '';
  };
  D.scores = function(w, ids){
    var jobs = []; for(var i = 0; i < ids.length; i += 100) jobs.push(D.api('playerScores', 'W=' + w + '&YEAR=' + D.Y + '&PLAYERS=' + ids.slice(i, i + 100).join(',')).catch(function(){ return null; }));
    return Promise.all(jobs).then(function(rs){ var o = {}; rs.forEach(function(j){ D.arr(j && j.playerScores && j.playerScores.playerScore).forEach(function(s){ if(s.score !== '' && s.score != null) o[s.id] = D.num(s.score); }); }); return o; });
  };
  D.pinfo = function(id){ return (PI && PI[id]) || ['Player ' + id, '', '']; };

  D.records = function(){
    return D.api('leagueStandings').then(function(j){
      var R = {}, order = [], ST = {};
      D.arr(j && j.leagueStandings && j.leagueStandings.franchise).forEach(function(f){ if(!D.NAME[f.id]) return; var t = D.num(f.h2ht); R[f.id] = D.num(f.h2hw) + '-' + D.num(f.h2hl) + (t ? '-' + t : ''); ST[f.id] = { w:D.num(f.h2hw), l:D.num(f.h2hl), t:t, pf:D.num(f.pf) }; order.push(f.id); });
      return { rec:R, order:order, st:ST };
    }).catch(function(){ return { rec:{}, order:D.IDS.slice(), st:{} }; });
  };

  // ---------- sign-in ----------
  var ME = null;
  D.me = function(){
    if(ME) return ME;
    if(D.LOCAL){ var f = ''; try{ f = localStorage.getItem('dcDemoMe') || ''; }catch(e){} ME = Promise.resolve(f ? { user:'demo', franchise:f, commish:D.COMMISH.indexOf(f) > -1 } : {}); return ME; }
    ME = fetch('/auth/me', { credentials:'same-origin' }).then(function(r){ return r.json(); }).catch(function(){ return {}; });
    return ME;
  };
  function signIn(){
    var v = document.createElement('div'); v.className = 'veil';
    v.innerHTML = '<div class="sheet" role="dialog" aria-modal="true" aria-label="Sign in"><div class="bar mono"><span>OWNER SIGN-IN</span><button type="button" aria-label="Close" data-x>\u00d7</button></div>' +
      '<img class="hero" src="img/hocking-hills-2026.webp" alt="Dubcey Fantasy Football \u00b7 Hocking Hills 2026">' +
      '<form><h2>Owners only</h2><p>Sign in with the email and password you use for MyFantasyLeague to set lineups, bid on waivers and make trades right here.</p>' +
      '<div class="err" hidden></div>' +
      '<label class="mono">MFL email or username<input name="username" type="text" inputmode="email" autocomplete="username" autocapitalize="off" spellcheck="false" placeholder="you@example.com" required></label>' +
      '<label class="mono">Password<input name="password" type="password" autocomplete="current-password" required></label>' +
      '<button class="btn" type="submit">SIGN IN</button>' +
      '<div class="fine mono">Your password goes straight to MFL to sign you in. This site never stores it.</div></form></div>';
    document.body.appendChild(v);
    var form = v.querySelector('form'), err = v.querySelector('.err'), btn = form.querySelector('button');
    function close(){ v.remove(); }
    v.addEventListener('click', function(e){ if(e.target === v || e.target.hasAttribute('data-x')) close(); });
    document.addEventListener('keydown', function k(e){ if(e.key === 'Escape'){ close(); document.removeEventListener('keydown', k); } });
    form.username.focus();
    form.addEventListener('submit', function(e){
      e.preventDefault(); err.hidden = true; btn.disabled = true; btn.textContent = 'SIGNING IN\u2026';
      var body = { username:form.username.value.trim(), password:form.password.value };
      var go = D.LOCAL ? Promise.resolve({ ok:true, franchise:'0001' }) : fetch('/auth/login', { method:'POST', credentials:'same-origin', headers:{ 'Content-Type':'application/json' }, body:JSON.stringify(body) }).then(function(r){ return r.json(); });
      go.then(function(r){
        if(r && r.ok){ if(D.LOCAL){ try{ localStorage.setItem('dcDemoMe', r.franchise); }catch(e){} } location.reload(); return; }
        throw (r && r.error) || 'Sign-in failed.';
      }).catch(function(m){ err.textContent = typeof m === 'string' ? m : 'Couldn\u2019t reach MFL. Try again.'; err.hidden = false; btn.disabled = false; btn.textContent = 'SIGN IN'; });
    });
  }
  D.signIn = signIn;
  function signOut(){
    if(D.LOCAL){ try{ localStorage.removeItem('dcDemoMe'); }catch(e){} location.reload(); return; }
    fetch('/auth/logout', { credentials:'same-origin' }).then(function(){ location.reload(); });
  }

  // ---------- header ----------
  var NAV = [['scores', 'SCORES'], ['nfl', 'NFL GAMES'], ['standings', 'STANDINGS'], ['schedule', 'SCHEDULE'], ['teams', 'TEAMS'], ['players', 'PLAYERS'], ['wire', 'THE WIRE'], ['dispatch', 'DISPATCH'], ['history', 'HISTORY'], ['finances', 'FINANCES'], ['rules', 'BYLAWS'], ['myteam', 'MY TEAM'], ['ideas', 'SUGGESTION BOX']];
  D.shell = function(active){
    var top = D.$('top');
    top.innerHTML = '<div class="in"><a class="brand" href="' + D.href('') + '" aria-label="Dubcey Chronicle home"><span class="bh"><img src="' + D.helm('x') + '" alt=""><span class="bp mono">EST. 2001</span></span><span class="wm"><b>Dubcey</b><span class="wmr"><span class="b26 mono">\u201926</span><i class="mono">Chronicle</i></span></span></a>' +
      '<nav class="nav mono">' + NAV.map(function(n){ return '<a class="' + (n[0] === active ? 'on' : '') + (n[2] ? ' soon' : '') + '" href="' + D.href(n[0]) + '">' + n[1] + '</a>'; }).join('') + '</nav>' +
      '<div class="who" id="who"></div></div>';
    mobileNav(active);
    return Promise.all([D.me(), D.teamsReady]).then(function(x){
      var me = x[0], w = D.$('who');
      var bi = top.querySelector('.brand img'); if(bi) bi.src = D.helm('x');
      if(me && me.franchise){
        w.innerHTML = '<a class="mine" href="' + D.href('myteam') + '" title="' + D.esc(D.NAME[me.franchise]) + '"><img src="' + D.helm(me.franchise) + '" alt=""><b>' + D.esc(D.SHORT[me.franchise] || 'MY TEAM') + '</b></a>' + '<span class="outs"><a class="out mono' + (active === 'ideas' ? ' on' : '') + '" href="' + D.href('ideas') + '" title="Report a bug or suggest a feature">SUGGEST</a>' + (me.commish ? '<a class="out mono' + (active === 'commish' ? ' on' : '') + '" href="' + D.href('commish') + '">COMMISH</a>' : '') + '<button class="out mono" type="button">SIGN OUT</button></span>';
        w.querySelector('button.out').addEventListener('click', signOut);
      } else {
        w.innerHTML = '<button class="btn" type="button">SIGN IN</button>';
        w.querySelector('.btn').addEventListener('click', signIn);
      }
      mobileMe(me, active);
      return me || {};
    });
  };

  // ---------- phone navigation: bottom tab bar + full "More" sheet (CSS shows it under 761px) ----------
  var TABS = [['', 'HOME', 'M3 10.5 12 3l9 7.5V21h-6v-6H9v6H3z'], ['scores', 'SCORES', 'M4 5h16v14H4zM12 5v14M4 12h16'], ['standings', 'STANDINGS', 'M5 20V10M12 20V4M19 20v-7'], ['myteam', 'MY TEAM', 'M12 3c4.5 0 8 3 8 8v2l-2 1v4h-5l-1-3H7a3 3 0 0 1-3-3v-1c0-4.5 3.5-8 8-8z']];
  function ico(d){ return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="' + d + '"/></svg>'; }
  function mobileNav(active){
    var old = document.getElementById('mbar'); if(old) old.remove(); old = document.getElementById('msheet'); if(old) old.remove();
    var inMore = !TABS.some(function(t){ return t[0] === (active || ''); }) && active !== 'home';
    var bar = document.createElement('nav'); bar.id = 'mbar'; bar.className = 'mbar mono'; bar.setAttribute('aria-label', 'Sections');
    bar.innerHTML = TABS.map(function(t){ var on = (t[0] || 'home') === (active || 'home'); return '<a href="' + D.href(t[0]) + '" class="' + (on ? 'on' : '') + '">' + ico(t[2]) + '<span>' + t[1] + '</span></a>'; }).join('') +
      '<button type="button" class="' + (inMore ? 'on' : '') + '" data-more aria-expanded="false">' + ico('M4 7h16M4 12h16M4 17h16') + '<span>MORE</span></button>';
    var sh = document.createElement('div'); sh.id = 'msheet'; sh.className = 'msheet'; sh.hidden = true;
    sh.innerHTML = '<div class="msb"><div class="msh mono"><span>THE DUBCEY CHRONICLE · ’26</span><button type="button" data-close aria-label="Close">×</button></div>' +
      '<div class="msg">' + NAV.map(function(n){ return '<a href="' + D.href(n[0]) + '" class="' + (n[0] === active ? 'on' : '') + '">' + n[1].replace('THE ', '') + '</a>'; }).join('') + '</div>' +
      '<div class="msme" id="msme"></div></div>';
    document.body.appendChild(bar); document.body.appendChild(sh); document.body.classList.add('hasmbar');
    function set(open){ sh.hidden = !open; bar.querySelector('[data-more]').setAttribute('aria-expanded', open ? 'true' : 'false'); document.documentElement.classList.toggle('mlock', open); }
    bar.querySelector('[data-more]').addEventListener('click', function(){ set(sh.hidden); });
    sh.addEventListener('click', function(e){ if(e.target === sh || e.target.closest('[data-close]')) set(false); });
    document.addEventListener('keydown', function(e){ if(e.key === 'Escape' && !sh.hidden) set(false); });
  }
  function mobileMe(me, active){
    var m = document.getElementById('msme'); if(!m) return;
    if(me && me.franchise){
      m.innerHTML = '<a class="msteam" href="' + D.href('myteam') + '"><img src="' + D.helm(me.franchise) + '" alt=""><span><b>' + D.esc(D.NAME[me.franchise]) + '</b><i class="mono">LINEUP · TRADES · WAIVERS</i></span></a>' +
        '<div class="msrow mono">' + (me.commish ? '<a href="' + D.href('commish') + '" class="' + (active === 'commish' ? 'on' : '') + '">COMMISH TOOLS</a>' : '') + '<button type="button" data-so>SIGN OUT</button></div>';
      m.querySelector('[data-so]').addEventListener('click', signOut);
    } else {
      m.innerHTML = '<button class="btn msin" type="button">SIGN IN WITH MFL</button>';
      m.querySelector('.msin').addEventListener('click', signIn);
    }
  }

  // any element with data-card="MFL player id" opens the player card (loaded on first use)
  var PC = null;
  document.addEventListener('click', function(e){
    var c = e.target.closest && e.target.closest('[data-card]'); if(!c || c.closest('#pcard')) return;
    e.preventDefault(); e.stopPropagation();
    var id = c.getAttribute('data-card');
    if(D.openCard) return D.openCard(id);
    if(!PC){ PC = new Promise(function(res){ var s = document.createElement('script'); s.src = 'js/pcard.js?v=s167z6m'; s.onload = res; document.head.appendChild(s); }); }
    PC.then(function(){ D.openCard(id); });
  }, true);
})();
