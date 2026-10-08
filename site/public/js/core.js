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
  D.api = function(t, q){ return D.teamsReady.then(function(){ return api(t, q); }); };
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
  var NAV = [['scores', 'SCORES'], ['standings', 'STANDINGS'], ['schedule', 'SCHEDULE'], ['teams', 'TEAMS'], ['players', 'PLAYERS'], ['wire', 'THE WIRE'], ['dispatch', 'DISPATCH'], ['history', 'HISTORY'], ['rules', 'RULES']];
  D.shell = function(active){
    var top = D.$('top');
    top.innerHTML = '<div class="in"><a class="brand" href="' + D.href('') + '" aria-label="Dubcey Chronicle home"><img src="' + D.helm('x') + '" alt=""><span class="wm"><b>Dubcey</b><i class="mono">Chronicle \u00b7 Est. 2001</i></span></a>' +
      '<nav class="nav mono">' + NAV.map(function(n){ return '<a class="' + (n[0] === active ? 'on' : '') + (n[2] ? ' soon' : '') + '" href="' + D.href(n[0]) + '">' + n[1] + '</a>'; }).join('') + '</nav>' +
      '<div class="who" id="who"></div></div>';
    return Promise.all([D.me(), D.teamsReady]).then(function(x){
      var me = x[0], w = D.$('who');
      var bi = top.querySelector('.brand img'); if(bi) bi.src = D.helm('x');
      if(me && me.franchise){
        w.innerHTML = '<a class="mine" href="' + D.href('myteam') + '" title="' + D.esc(D.NAME[me.franchise]) + '"><img src="' + D.helm(me.franchise) + '" alt=""><b>' + D.esc(D.SHORT[me.franchise] || 'MY TEAM') + '</b></a>' + (me.commish ? '<a class="out mono' + (active === 'commish' ? ' on' : '') + '" href="' + D.href('commish') + '">COMMISH</a>' : '') + '<button class="out mono" type="button">SIGN OUT</button>';
        w.querySelector('button.out').addEventListener('click', signOut);
      } else {
        w.innerHTML = '<button class="btn" type="button">SIGN IN</button>';
        w.querySelector('.btn').addEventListener('click', signIn);
      }
      return me || {};
    });
  };
})();
