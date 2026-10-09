(function(){
  var D = DC, $ = D.$, esc = D.esc, arr = D.arr, num = D.num;
  D.shell('rules');
  function v(x){ return x && typeof x === 'object' && '$t' in x ? x.$t : x; }

  // by-laws: commissioner writes them in Commish → By-laws (## heading, - bullet, blank line = new paragraph)
  D.content('bylaws').then(function(b){
    var t = b && b.text;
    if(!t){ $('bylaws').innerHTML = '<div class="bar mono"><span>BY-LAWS</span></div><div class="ld mono">THE COMMISSIONER HASN\u2019T POSTED THE BY-LAWS YET.</div>'; return; }
    var out = [], list = null;
    t.split(/\n/).forEach(function(l){
      var s = l.trim();
      if(/^[-*]\s+/.test(s)){ (list = list || []).push('<li>' + esc(s.replace(/^[-*]\s+/, '')) + '</li>'); return; }
      if(list){ out.push('<ul>' + list.join('') + '</ul>'); list = null; }
      if(!s) return;
      var h = /^(#{1,3})\s+(.*)$/.exec(s);
      out.push(h ? '<h' + (h[1].length + 1) + '>' + esc(h[2]) + '</h' + (h[1].length + 1) + '>' : '<p>' + esc(s) + '</p>');
    });
    if(list) out.push('<ul>' + list.join('') + '</ul>');
    $('bylaws').innerHTML = '<div class="bar mono"><span>BY-LAWS</span>' + (b.updated ? '<span>UPDATED ' + esc(new Date(b.updated).toLocaleDateString(undefined, { month:'short', day:'numeric', year:'numeric' }).toUpperCase()) + '</span>' : '') + '</div><div class="law">' + out.join('') + '</div>';
  });

  D.api('league').then(function(j){
    var L = j && j.league; if(!L) throw 0;
    var st = arr(L.starters && L.starters.position).map(function(p){ return p.name + ' ' + p.limit; }).join(' · ');
    var rows = [
      ['Teams', '12'],
      L.starters && ['Starting lineup', (L.starters.count ? L.starters.count + ' starters · ' : '') + st],
      L.rosterSize && ['Roster size', L.rosterSize],
      L.playoffTeams && ['Playoffs', 'Top ' + L.playoffTeams + (L.lastRegularSeasonWeek ? ' after Week ' + L.lastRegularSeasonWeek : '')],
      L.bbidMinimum != null && ['Minimum waiver bid', '$' + num(L.bbidMinimum)],
      L.endWeek && ['Season ends', 'Week ' + L.endWeek]
    ].filter(Boolean);
    $('set').innerHTML = '<div class="bar mono"><span>LEAGUE SETTINGS</span><span>EST. 2001</span></div>' + rows.map(function(r){ return '<div class="kv"><span class="mono">' + esc(r[0]) + '</span><b>' + esc(r[1]) + '</b></div>'; }).join('');
  }).catch(function(){ $('set').innerHTML = '<div class="bar mono"><span>LEAGUE SETTINGS</span></div><div class="ld mono">COULDN\u2019T LOAD SETTINGS</div>'; });

  Promise.all([D.api('rules'), D.api('allRules').catch(function(){ return null; })]).then(function(r){
    var N = {}; arr(r[1] && r[1].allRules && r[1].allRules.rule).forEach(function(x){ N[v(x.abbreviation)] = v(x.shortDescription) || v(x.detailedDescription); });
    var P = arr(r[0] && r[0].rules && r[0].rules.positionRules);
    if(!P.length) throw 0;
    function pts(p, rg){
      p = String(p); var full = /^0-(99|999|9999)$/.test(rg) || !rg;
      var rng = full ? '' : (/-(99|999|9999)$/.test(rg) ? rg.split('-')[0] + '+' : rg);
      if(p.charAt(0) === '*'){ var x = num(p.slice(1)); return (x > 0 ? '+' : '') + D.pts(x) + ' each' + (rng ? ' (' + rng + ')' : ''); }
      if(p.charAt(0) === '/'){ return '+1 per ' + p.slice(1) + (rng ? ' (' + rng + ')' : ''); }
      return (num(p) > 0 ? '+' : '') + p + (rng ? ' for ' + rng : '');
    }
    $('scoring').innerHTML = P.map(function(g){
      var pos = String(g.positions || '').split('|');
      return '<article class="card"><div class="bar mono"><span>' + pos.map(function(x){ return '<span class="pos ' + esc(x) + '">' + esc(x) + '</span>'; }).join(' ') + '</span></div>' + arr(g.rule).map(function(x){
        var ev = v(x.event); return '<div class="kv"><span class="mono">' + esc(N[ev] || ev) + '</span><b>' + esc(pts(v(x.points), v(x.range))) + '</b></div>';
      }).join('') + '</article>';
    }).join('');
  }).catch(function(){ $('scoring').innerHTML = '<div class="ld mono">COULDN\u2019T LOAD THE SCORING RULES.</div>'; });
})();
