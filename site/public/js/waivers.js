/* The Waiver Report — reads MFL's processed waivers (claims + denied bids) */
(function(){
  var D = DC, esc = D.esc;
  function money(n){ return '$' + (Math.round(n * 100) / 100).toLocaleString('en-US', { maximumFractionDigits:2 }); }
  function player(s){
    s = String(s || '').replace(/\(\$[\d,.]+\)/, '').trim();
    if(!s || /^none$/i.test(s)) return null;
    var m = s.match(/^(.+?),\s*(.+?)\s+(\S+)\s+(\S+)$/);
    return m ? { nm:m[2] + ' ' + m[1], key:s, meta:m[3] + ' \u00b7 ' + m[4] } : { nm:s, key:s, meta:'' };
  }
  function fid(r){
    if(D.NAME[r.f]) return r.f;
    var lc = String(r.fn || '').toLowerCase();
    for(var id in D.NAME) if(lc.indexOf(D.NAME[id].toLowerCase()) > -1) return id;
    return '';
  }
  function parse(d){
    var H = (d.heads || []);
    function col(re, def){ for(var i = 0; i < H.length; i++) if(re.test(H[i])) return i; return def; }
    var cF = col(/franchise/, 0), cA = col(/added/, 1), cD = col(/dropped/, 2), cR = col(/original|request/, 3), cW = col(/reason|granted/, 4);
    var rows = (d.rows || []).map(function(r){
      var c = r.cells, req = c[cR] || '', why = c[cW] || '', addTx = c[cA] || '';
      var m = req.match(/^Add\s+(.+?)(?:\s+for\s+\$([\d,.]+))?(?:\s+and\s+drop\s+(.+?))?\s+Submitted\s+(.+)$/i) || [];
      var won = !/^none$/i.test(addTx) && !!addTx && !why;
      var am = (addTx.match(/\$([\d,.]+)/) || [])[1] || m[2];
      return { f:fid(r), won:won, add:player(m[1] || addTx), drop:player(m[3] || (won ? c[cD] : '')), amt:am ? parseFloat(am.replace(/,/g, '')) : null, why:why };
    });
    var win = {}; rows.forEach(function(x){ if(x.won && x.add) win[x.add.key] = x; });
    rows.forEach(function(x){
      if(x.won || !x.add) return;
      var w = win[x.add.key];
      if(w && w.f !== x.f && (!x.why || /not\s+available/i.test(x.why))) x.note = 'Outbid by ' + (D.SHORT[w.f] || 'another team') + (w.amt != null ? ' at ' + money(w.amt) + (x.amt != null && w.amt >= x.amt ? (w.amt === x.amt ? ' (tiebreaker)' : ', by ' + money(w.amt - x.amt)) : '') : '');
      else if(/not\s+available/i.test(x.why)) x.note = 'Gone before this claim ran';
      else if(/cannot\s+be\s+dropped/i.test(x.why)) x.note = 'Bad drop: ' + ((x.drop && x.drop.nm) || 'that player') + ' was already gone';
      else if(/insufficient|funds|budget|cap/i.test(x.why)) x.note = 'Short on funds';
      else x.note = x.why;
    });
    var claims = rows.filter(function(x){ return x.won; }).sort(function(a, b){ return (b.amt || 0) - (a.amt || 0); });
    var denied = rows.filter(function(x){ return !x.won; });
    var runs = d.runs || [], cur = runs.filter(function(r){ return r.on; })[0] || runs[0];
    return { rows:rows, claims:claims, denied:denied, spent:claims.reduce(function(a, x){ return a + (x.amt || 0); }, 0), top:claims[0], runs:runs, run:cur ? cur.v : '', label:cur ? cur.t.replace(/(\d+:\d+):\d+/, '$1') : '' };
  }
  D.waiverReport = function(run){
    var u = D.LOCAL ? 'demo/waivers.json' : '/data/waivers' + (run ? '?run=' + encodeURIComponent(run) : '');
    return fetch(u, { credentials:'same-origin' }).then(function(r){ if(!r.ok) throw r.status; return r.json(); }).then(parse);
  };
  // Wednesday 6 PM ET through Thursday night: the report leads the home page
  D.waiverWindow = function(){
    if(/[?&]waivers=1/.test(location.search)) return true;
    var p = new Intl.DateTimeFormat('en-US', { timeZone:'America/New_York', weekday:'short', hour:'numeric', hour12:false }).formatToParts(new Date());
    var wd = (p.filter(function(x){ return x.type === 'weekday'; })[0] || {}).value, hr = +((p.filter(function(x){ return x.type === 'hour'; })[0] || {}).value);
    return (wd === 'Wed' && hr >= 18) || wd === 'Thu';
  };
  function card(x){
    return '<div class="wc2' + (x.won ? '' : ' no') + '"><img src="' + D.helm(x.f) + '" alt=""><div><b>' + esc(x.add ? x.add.nm : 'No add') + '</b><span class="mono">' + esc(x.add ? x.add.meta : '') + (x.drop ? ' \u00b7 DROP ' + esc(x.drop.nm) : '') + '</span>' +
      (x.note ? '<i>' + esc(x.note) + '</i>' : '') + '</div><em class="' + (x.won ? '' : 'dn') + '">' + (x.amt != null ? money(x.amt) : '\u2014') + '</em></div>';
  }
  D.waiverStats = function(m){
    return '<div class="wstats"><div><span class="mono">BIDS</span><b>' + m.rows.length + '</b></div><div><span class="mono">CLAIMED</span><b class="up">' + m.claims.length + '</b></div><div><span class="mono">DENIED</span><b class="dn">' + m.denied.length + '</b></div><div><span class="mono">SPENT</span><b>' + money(m.spent) + '</b></div>' +
      (m.top ? '<div class="big"><span class="mono">BIGGEST SPLASH</span><b>' + esc(m.top.add ? m.top.add.nm : '') + '</b><i class="mono">' + esc(D.SHORT[m.top.f] || '') + ' \u00b7 ' + money(m.top.amt || 0) + '</i></div>' : '') + '</div>';
  };
  D.waiverFull = function(m, team){
    var C = m.claims.filter(function(x){ return !team || x.f === team; }), N = m.denied.filter(function(x){ return !team || x.f === team; });
    if(!m.rows.length) return '<div class="ld mono">NO WAIVERS WERE PROCESSED IN THIS RUN.</div>';
    return D.waiverStats(m) + '<div class="wcols"><div><div class="grp mono"><span>CLAIMED</span><span>' + C.length + '</span></div>' + (C.map(card).join('') || '<div class="ld mono">NONE</div>') + '</div>' +
      '<div><div class="grp mono"><span>DENIED</span><span>' + N.length + '</span></div>' + (N.map(card).join('') || '<div class="ld mono">NONE</div>') + '</div></div>';
  };
  D.waiverMini = function(m){
    return '<article class="card wvhome"><div class="bar mono"><span>THE WAIVER REPORT' + (m.label ? ' \u00b7 ' + esc(m.label).toUpperCase() : '') + '</span><a href="' + D.href('wire') + '#report">FULL REPORT \u2192</a></div>' + D.waiverStats(m) +
      '<div class="wvgrid">' + m.claims.slice(0, 6).map(card).join('') + '</div></article>';
  };
})();
