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
  D.helm = function(id){ return D.CUSTOM[id] || ('h/' + (D.HELM[id] || 'logo') + '.webp'); };
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
  D.div = function(id){ for(var i = 0; i < D.DIVS.length; i++) if(D.DIVS[i].ids.indexOf(id) > -1) return D.DIVS[i]; return null; };
  // division header: crest + name (divisions with a crest), otherwise the old banner image
  D.divBanner = function(d, extra){
    if(!d.crest) return '<div class="divhd ' + d.k + '"><img src="img/div-' + d.k + '.webp" alt="' + D.esc(d.name) + ' Division"></div>';
    return '<div class="dvb ' + d.k + '"><img class="dvc" src="' + d.crest + '" alt=""><div class="dvt"><span class="dvn">' + D.esc(d.name) + '</span></div>' + (extra ? '<div class="dvx">' + extra + '</div>' : '') + '</div>';
  };
  D.divTag = function(id, txt){ var d = D.div(id); return d ? '<span class="dtag ' + d.k + '"><img src="' + (d.crest || 'img/div-' + d.k + '-badge.webp') + '" alt="">' + D.esc(txt || d.name) + '</span>' : ''; };
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
    Object.keys(t || {}).forEach(function(id){ var o = t[id] || {}; if(!D.NAME[id]) return; if(o.name) D.NAME[id] = o.name; if(o.short) D.SHORT[id] = o.short; if(o.helm) D.CUSTOM[id] = D.LOCAL ? (localStorage.getItem('dcImg:' + id) || '') || undefined : o.helm; });
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
    return fetch('/api/' + t + (q ? '?' + q : ''), { credentials:'same-origin' }).then(function(r){ if(!r.ok) throw r.status; return r.json(); });
  }
  // write actions (lineups, waivers, trades…) — owner must be signed in
  D.act = function(t, body){
    if(D.LOCAL) return Promise.resolve({ ok:true, demo:true });
    return fetch('/act/' + t, { method:'POST', credentials:'same-origin', headers:{ 'Content-Type':'application/json' }, body:JSON.stringify(body || {}) }).then(function(r){ return r.json(); });
  };
  D.columnFile = function(){ return fetch(D.LOCAL ? 'demo/column.json' : D.RAW + 'column.json?t=' + Math.floor(Date.now() / 300000)).then(function(r){ return r.json(); }); };
  D.column = function(){ return D.content('column').then(function(c){ return c && c.weeks ? c : D.columnFile(); }); };
  D.award = function(v){ return typeof v === 'string' ? { text:v, id:'' } : (v || { text:'', id:'' }); };

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
    if(c && (!live || now - c.t < 55000)) return c.p;
    var p = fetch('/data/espn?W=' + w).then(function(r){ return r.json(); }).then(function(o){ WK[w].o = o || {}; }).catch(function(){ WK[w].o = WK[w].o || {}; });
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
      var R = {}, order = [];
      D.arr(j && j.leagueStandings && j.leagueStandings.franchise).forEach(function(f){ if(!D.NAME[f.id]) return; var t = D.num(f.h2ht); R[f.id] = D.num(f.h2hw) + '-' + D.num(f.h2hl) + (t ? '-' + t : ''); order.push(f.id); });
      return { rec:R, order:order };
    }).catch(function(){ return { rec:{}, order:D.IDS.slice() }; });
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
  var NAV = [['scores', 'SCORES'], ['standings', 'STANDINGS'], ['schedule', 'SCHEDULE'], ['teams', 'TEAMS'], ['players', 'PLAYERS'], ['wire', 'THE WIRE'], ['dispatch', 'DISPATCH'], ['history', 'HISTORY'], ['finances', 'FINANCES'], ['rules', 'RULES']];
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
        w.innerHTML = '<a class="mine" href="' + D.href('myteam') + '" title="' + D.esc(D.NAME[me.franchise]) + '"><img src="' + D.helm(me.franchise) + '" alt=""><b>' + D.esc(D.SHORT[me.franchise] || 'MY TEAM') + '</b></a>' + '<span class="outs">' + (me.commish ? '<a class="out mono' + (active === 'commish' ? ' on' : '') + '" href="' + D.href('commish') + '">COMMISH</a>' : '') + '<button class="out mono" type="button">SIGN OUT</button></span>';
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
    if(!PC){ PC = new Promise(function(res){ var s = document.createElement('script'); s.src = 'js/pcard.js?v=p6r6zdn'; s.onload = res; document.head.appendChild(s); }); }
    PC.then(function(){ D.openCard(id); });
  }, true);
})();
