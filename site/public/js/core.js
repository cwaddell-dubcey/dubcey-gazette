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
  D.helm = function(id){ return 'h/' + (D.HELM[id] || 'logo') + '.webp'; };
  D.esc = function(s){ return String(s == null ? '' : s).replace(/[&<>"]/g, function(c){ return { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;' }[c]; }); };
  D.arr = function(x){ return x == null ? [] : (Array.isArray(x) ? x : [x]); };
  D.num = function(v){ var n = parseFloat(v); return isNaN(n) ? 0 : n; };
  D.pts = function(n){ n = D.num(n); return n % 1 ? n.toFixed(2) : String(n); };
  D.$ = function(id){ return document.getElementById(id); };
  D.href = function(p, q){ return (D.LOCAL ? (p || 'index') + '.html' : '/' + (p || '')) + (q ? '?' + q : ''); };

  // league data via the site's own connection (local preview reads sample files)
  D.api = function(t, q){
    if(D.LOCAL) return fetch('demo/' + t + '.json').then(function(r){ if(!r.ok) throw 0; return r.json(); });
    return fetch('/api/' + t + (q ? '?' + q : ''), { credentials:'same-origin' }).then(function(r){ if(!r.ok) throw r.status; return r.json(); });
  };
  // write actions (lineups, waivers, trades…) — owner must be signed in
  D.act = function(t, body){
    if(D.LOCAL) return Promise.resolve({ ok:true, demo:true });
    return fetch('/act/' + t, { method:'POST', credentials:'same-origin', headers:{ 'Content-Type':'application/json' }, body:JSON.stringify(body || {}) }).then(function(r){ return r.json(); });
  };
  D.column = function(){ return fetch(D.LOCAL ? 'demo/column.json' : D.RAW + 'column.json?t=' + Math.floor(Date.now() / 300000)).then(function(r){ return r.json(); }); };

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
    if(D.LOCAL){ var f = ''; try{ f = localStorage.getItem('dcDemoMe') || ''; }catch(e){} ME = Promise.resolve(f ? { user:'demo', franchise:f } : {}); return ME; }
    ME = fetch('/auth/me', { credentials:'same-origin' }).then(function(r){ return r.json(); }).catch(function(){ return {}; });
    return ME;
  };
  function signIn(){
    var v = document.createElement('div'); v.className = 'veil';
    v.innerHTML = '<div class="sheet" role="dialog" aria-modal="true" aria-label="Sign in"><div class="bar mono"><span>OWNER SIGN-IN</span><button type="button" aria-label="Close" data-x>\u00d7</button></div>' +
      '<img class="hero" src="img/hocking-hills-2026.webp" alt="Dubcey Fantasy Football \u00b7 Hocking Hills 2026">' +
      '<form><h2>Owners only</h2><p>Sign in with your MyFantasyLeague username and password to set lineups, bid on waivers and make trades right here.</p>' +
      '<div class="err" hidden></div>' +
      '<label class="mono">MFL username<input name="username" autocomplete="username" required></label>' +
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
  var NAV = [['scores', 'SCORES'], ['standings', 'STANDINGS'], ['teams', 'TEAMS'], ['players', 'PLAYERS'], ['wire', 'THE WIRE'], ['dispatch', 'DISPATCH'], ['league', 'LEAGUE']];
  D.shell = function(active){
    var top = D.$('top');
    top.innerHTML = '<div class="in"><a class="brand" href="' + D.href('') + '" aria-label="Dubcey Chronicle home"><img src="' + D.helm('x') + '" alt=""><span class="wm"><b>Dubcey</b><i class="mono">Chronicle \u00b7 Est. 2001</i></span></a>' +
      '<nav class="nav mono">' + NAV.map(function(n){ return '<a class="' + (n[0] === active ? 'on' : '') + (n[2] ? ' soon' : '') + '" href="' + D.href(n[0]) + '">' + n[1] + '</a>'; }).join('') + '</nav>' +
      '<div class="who" id="who"></div></div>';
    return D.me().then(function(me){
      var w = D.$('who');
      if(me && me.franchise){
        w.innerHTML = '<a class="mine" href="' + D.href('myteam') + '" title="' + D.esc(D.NAME[me.franchise]) + '"><img src="' + D.helm(me.franchise) + '" alt=""><b>' + D.esc(D.SHORT[me.franchise] || 'MY TEAM') + '</b></a><button class="out mono" type="button">SIGN OUT</button>';
        w.querySelector('.out').addEventListener('click', signOut);
      } else {
        w.innerHTML = '<button class="btn" type="button">SIGN IN</button>';
        w.querySelector('.btn').addEventListener('click', signIn);
      }
      return me || {};
    });
  };
})();
