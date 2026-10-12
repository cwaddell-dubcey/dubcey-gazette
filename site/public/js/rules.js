(function(){
  var D = DC, $ = D.$, esc = D.esc, arr = D.arr, num = D.num;
  D.shell('rules');
  function v(x){ return x && typeof x === 'object' && '$t' in x ? x.$t : x; }
  var ROMAN = ['I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII','XIII','XIV','XV'];
  var POSN = { QB:'Quarterback', RB:'Running Back', WR:'Wide Receiver', TE:'Tight End', PK:'Kicker', K:'Kicker', Def:'Team Defense', DEF:'Team Defense', 'RB+WR+TE':'Flex (RB/WR/TE)', 'WR+TE':'Flex (WR/TE)', 'RB+WR':'Flex (RB/WR)', 'QB+RB+WR+TE':'Superflex' };
  var WAIV = { BBID:'Blind bidding (FAAB)', BBID_FCFS:'Blind bidding, then first-come first-served', FCFS:'First-come, first-served', SINGLE:'Rolling waiver order', NONE:'No waivers' };
  function yes(x){ return /^(1|yes|y|true)$/i.test(String(x || '')); }
  function limit(l){ l = String(l); var m = /^(\d+)-(\d+)$/.exec(l); return m ? (m[1] === m[2] ? m[1] : m[1] + ' to ' + m[2]) : l; }
  function plural(n, w){ return n + ' ' + w + (String(n) === '1' ? '' : 's'); }
  function rnd(x){ return String(Math.round(x * 100) / 100); }

  // an article = { id, title, rules:[{t, v}] }  (t = rule text, v = optional value shown right)
  function rule(t, val){ return { t:t, v:val }; }
  function articleHTML(a, i){
    return '<article class="card art" id="a-' + esc(a.id) + '"><div class="arthd"><span class="mono">ARTICLE ' + ROMAN[i] + '</span><h2>' + esc(a.title) + '</h2>' + (a.src ? '<span class="mono src">' + esc(a.src) + '</span>' : '') + '</div>'
      + (a.html || '')
      + (a.rules && a.rules.length ? '<ol class="rl">' + a.rules.map(function(r, j){
          return '<li><span class="mono n">' + (i + 1) + '.' + (j + 1) + '</span><div>' + (r.h ? '<b class="rh">' + esc(r.h) + '</b> ' : '') + esc(r.t) + '</div>' + (r.v != null && r.v !== '' ? '<b class="rv">' + esc(r.v) + '</b>' : '') + '</li>';
        }).join('') + '</ol>' : '')
      + '</article>';
  }
  function custom(list){ return arr(list).map(function(x){ return typeof x === 'string' ? rule(x) : { h:x.h || x.title, t:x.t || x.text, v:x.v }; }); }

  function scoringHTML(r){
    var N = {}; arr(r[1] && r[1].allRules && r[1].allRules.rule).forEach(function(x){ N[v(x.abbreviation)] = v(x.shortDescription) || v(x.detailedDescription); });
    var P = arr(r[0] && r[0].rules && r[0].rules.positionRules);
    if(!P.length) return '<div class="ld mono">COULDN\u2019T LOAD THE SCORING RULES.</div>';
    function pts(p, rg){
      p = String(p); rg = String(rg || '');
      var full = !rg || /^0-(99|999|9999)$/.test(rg);
      var at = full ? '' : (/-(99|999|9999)$/.test(rg) ? rg.split('-')[0] + '+' : rg.replace('-', '\u2013'));
      if(p.charAt(0) === '*'){
        var x = num(p.slice(1)), inv = x ? 1 / Math.abs(x) : 0;
        var s = (Math.abs(x) < 1 && Math.abs(inv - Math.round(inv)) < .01) ? (x < 0 ? '\u22121' : '+1') + ' per ' + Math.round(inv) : (x > 0 ? '+' : x < 0 ? '\u2212' : '') + rnd(Math.abs(x)) + ' each';
        return s + (at ? ' (' + at + ')' : '');
      }
      if(p.charAt(0) === '/') return '+1 per ' + p.slice(1) + (at ? ' (' + at + ')' : '');
      var n = num(p); return (n > 0 ? '+' : n < 0 ? '\u2212' : '') + rnd(Math.abs(n)) + (at ? ' at ' + at : '');
    }
    return '<div class="sgrid">' + P.map(function(g){
      var pos = String(g.positions || '').split('|');
      return '<div class="sg"><div class="sghd">' + pos.map(function(x){ return '<span class="pos ' + esc(x) + '">' + esc(x) + '</span>'; }).join('') + '</div><table class="st2"><tbody>' + arr(g.rule).map(function(x){
        var ev = v(x.event); return '<tr><td>' + esc(N[ev] || ev) + '</td><td class="mono">' + esc(pts(v(x.points), v(x.range))) + '</td></tr>';
      }).join('') + '</tbody></table></div>';
    }).join('') + '</div>';
  }

  Promise.all([
    D.api('league').catch(function(){ return null; }),
    D.api('rules').catch(function(){ return null; }),
    D.api('allRules').catch(function(){ return null; }),
    fetch('data/rulebook.json', { cache:'no-cache' }).then(function(x){ return x.ok ? x.json() : {}; }).catch(function(){ return {}; }),
    D.content('bylaws')
  ]).then(function(R){
    var L = (R[0] && R[0].league) || {}, RB = R[3] || {}, ADD = RB.add || {};
    var nTeams = (L.franchises && L.franchises.count) || arr(L.franchises && L.franchises.franchise).length || 12;
    var A = [];

    var lg = [
      rule('The Dubcey League has played every season since 2001. It has ' + plural(nTeams, 'franchise') + '.', nTeams + ' teams'),
      L.startWeek && L.lastRegularSeasonWeek && rule('The regular season runs from NFL Week ' + L.startWeek + ' through Week ' + L.lastRegularSeasonWeek + '.', 'Wk ' + L.startWeek + '\u2013' + L.lastRegularSeasonWeek),
      L.h2h && rule(yes(L.h2h) ? 'Each week every franchise plays one head-to-head matchup. The team with more points wins.' : 'Franchises are ranked by total points scored.', yes(L.h2h) ? 'Head-to-head' : 'Total points'),
      L.precision != null && rule('Scores are kept to ' + plural(L.precision, 'decimal place') + '.')
    ].filter(Boolean).concat(custom(ADD.league));
    A.push({ id:'league', title:'The League', src:'FROM MFL', rules:lg });

    var sp = arr(L.starters && L.starters.position);
    var lu = [];
    if(L.starters && L.starters.count) lu.push(rule('Each franchise starts ' + L.starters.count + ' players every week.', L.starters.count + ' starters'));
    sp.forEach(function(p){ lu.push({ h:POSN[p.name] || p.name, t:'', v:limit(p.limit) }); });
    if(L.rosterSize) lu.push(rule('No roster may hold more than ' + L.rosterSize + ' players, not counting reserve slots.', L.rosterSize + ' max'));
    if(num(L.injuredReserve)) lu.push(rule('Each franchise has ' + plural(L.injuredReserve, 'injured reserve slot') + '. Players there do not count against the roster limit.', L.injuredReserve + ' IR'));
    if(num(L.taxiSquad)) lu.push(rule('Each franchise may stash up to ' + plural(L.taxiSquad, 'player') + ' on the taxi squad.', L.taxiSquad + ' taxi'));
    if(L.lockout) lu.push(rule(/^no$/i.test(L.lockout) ? 'Lineups lock at the first kickoff of the week.' : 'Each player locks at his own game\u2019s kickoff. Players in later games can still be swapped in or out.', /^no$/i.test(L.lockout) ? 'Week lock' : 'Game lock'));
    A.push({ id:'lineups', title:'Rosters & Lineups', src:'FROM MFL', rules:lu.concat(custom(ADD.lineups)) });

    A.push({ id:'scoring', title:'Scoring', src:'FROM MFL', html:scoringHTML([R[1], R[2]]), rules:custom(ADD.scoring) });

    var mv = [];
    if(L.currentWaiverType) mv.push(rule('Players are added off waivers by ' + (WAIV[L.currentWaiverType] || L.currentWaiverType).toLowerCase() + '.', WAIV[L.currentWaiverType] ? WAIV[L.currentWaiverType].split(',')[0] : L.currentWaiverType));
    if(num(L.salaryCapAmount)) mv.push(rule('Each franchise gets a $' + num(L.salaryCapAmount) + ' budget for the season.', '$' + num(L.salaryCapAmount)));
    if(L.bbidMinimum != null) mv.push(rule('The lowest bid allowed is $' + num(L.bbidMinimum) + '.', '$' + num(L.bbidMinimum)));
    if(num(L.bbidIncrement)) mv.push(rule('Bids go up in $' + num(L.bbidIncrement) + ' steps.', '$' + num(L.bbidIncrement)));
    A.push({ id:'moves', title:'Waivers & Trades', src:'FROM MFL', rules:mv.concat(custom(ADD.moves)) });
    if(arr(ADD.draft).length) A.push({ id:'draft', title:'The Drafts', rules:custom(ADD.draft) });

    var po = [];
    if(L.lastRegularSeasonWeek && L.endWeek) po.push(rule('The playoffs run from Week ' + (num(L.lastRegularSeasonWeek) + 1) + ' through Week ' + L.endWeek + '.', 'Wk ' + (num(L.lastRegularSeasonWeek) + 1) + '\u2013' + L.endWeek));
    if(L.playoffTeams && !arr(ADD.playoffs).length) po.push(rule('The top ' + L.playoffTeams + ' teams make the playoffs.', L.playoffTeams + ' teams'));
    A.push({ id:'playoffs', title:'Playoffs', src:'FROM MFL', rules:po.concat(custom(ADD.playoffs)) });

    arr(RB.articles).forEach(function(a, i){ A.push({ id:'x' + i, title:a.title, rules:custom(a.rules) }); });

    var b = R[4];
    if(b && b.text){
      var out = [], list = null;
      b.text.split(/\n/).forEach(function(l){
        var s = l.trim();
        if(/^[-*]\s+/.test(s)){ (list = list || []).push('<li>' + esc(s.replace(/^[-*]\s+/, '')) + '</li>'); return; }
        if(list){ out.push('<ul>' + list.join('') + '</ul>'); list = null; }
        if(!s) return;
        var h = /^(#{1,3})\s+(.*)$/.exec(s);
        out.push(h ? '<h4>' + esc(h[2]) + '</h4>' : '<p>' + esc(s) + '</p>');
      });
      if(list) out.push('<ul>' + list.join('') + '</ul>');
      A.push({ id:'bylaws', title:'Commissioner\u2019s Notes', src:b.updated ? 'UPDATED ' + new Date(b.updated).toLocaleDateString(undefined, { month:'short', day:'numeric', year:'numeric' }).toUpperCase() : '', html:'<div class="law">' + out.join('') + '</div>' });
    }

    A = A.filter(function(a){ return a.html || (a.rules && a.rules.length); });
    $('toc').innerHTML = '<div class="mono tk">CONTENTS</div>' + A.map(function(a, i){ return '<a href="#a-' + esc(a.id) + '"><span class="mono">' + ROMAN[i] + '</span>' + esc(a.title) + '</a>'; }).join('');
    $('book').innerHTML = A.map(articleHTML).join('');
    $('eff').textContent = 'EFFECTIVE ' + D.Y + ' SEASON' + (RB.updated ? ' \u00b7 REV. ' + new Date(RB.updated + 'T12:00').toLocaleDateString(undefined, { month:'short', day:'numeric', year:'numeric' }).toUpperCase() : '');
    if(location.hash){ var t = document.querySelector(location.hash); if(t) window.scrollTo(0, t.getBoundingClientRect().top + scrollY - 80); }
  });
})();
