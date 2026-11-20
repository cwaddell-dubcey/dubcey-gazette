/* The Clubhouse landing page: a wall of lockers (one per Clubhouse page) with a live line on each,
   a "what's happening" banner and the Clubhouse dates coming up. On phones the lockers turn sideways and stack. */
(function(){
  var D = DC, $ = D.$, esc = D.esc, arr = D.arr, num = D.num;
  D.shell('clubhouse');
  var DAY = 864e5, SUN1 = Date.parse('2026-09-13T13:00:00-04:00');
  function sunday(w){ return SUN1 + (w - 1) * 7 * DAY; }
  function md(t){ return new Date(t).toLocaleDateString('en-US', { month:'short', day:'numeric' }).toUpperCase(); }
  var L = [
    { k:'finances', h:'Finances', d:'Dues, payouts, the penalty pool and next year’s auction money.', ic:'$' },
    { k:'rules', h:'Bylaws', d:'The official rules, from scoring to the Pro Bowl.', ic:'§' },
    { k:'clerk', h:'Clerk’s Office', d:'Rulings, fines and the official record.', ic:'⚖' },
    { k:'lottery', h:'Rookie Lottery', d:'The balls, the odds and the draw for the rookie draft.', ic:'●' },
    { k:'probowl', h:'Pro Bowl', d:'Three divisions, one Week 18 showdown. $600 pot.', ic:'★' },
    { k:'helmets', h:'Helmet Lab', d:'Design an alternate helmet and wear it.', img:true },
    { k:'ideas', h:'Suggestion Box', d:'Bugs, fixes and the wish list.', ic:'?' }
  ];
  var LV = {}, ME = '', PB = null, LOT = null;
  function draw(){
    $('khlk').innerHTML = L.map(function(x){ var lv = LV[x.k] || '';
      return '<a class="khl" href="' + D.href(x.k) + '"><span class="khv" aria-hidden="true"></span><span class="khnp mono">' + esc(x.h.toUpperCase()) + '</span>' +
        (x.img ? '<img class="khim" src="' + D.helm(ME || '0001') + '" alt="">' : '<span class="khic" aria-hidden="true">' + x.ic + '</span>') +
        '<span class="khd">' + esc(x.d) + (lv ? '<span class="khlv2 mono">' + esc(lv) + '</span>' : '') + '</span>' + (lv ? '<span class="khlv mono">' + esc(lv) + '</span>' : '') + '<i class="khh" aria-hidden="true"></i></a>'; }).join('');
  }
  function set(k, v){ if(v){ LV[k] = v; draw(); } }

  // the dates that matter to the Clubhouse, soonest first
  function dates(cal){
    var now = Date.now(), E = [];
    function add(t, lbl, k){ if(t && t > now - DAY / 2) E.push({ t:t, lbl:lbl, k:k }); }
    add(Date.parse(D.SEASON.tradeDeadline), 'Trade deadline', 'rules');
    add(sunday(D.SEASON.ffaWeek || 14), 'Week ' + (D.SEASON.ffaWeek || 14) + ' Free-For-All', 'rules');
    add(sunday(D.SEASON.ffaWeek || 14) + 2 * DAY, 'Penalty pool pays out', 'finances');
    add(sunday(17), 'Dubcey championship', 'rules');
    add(sunday(17) + 2 * DAY, 'Pro Bowl board opens', 'probowl');
    add(sunday(18), 'Pro Bowl Sunday', 'probowl');
    arr(D.SEASON.events).concat(arr(cal)).forEach(function(e){ if(e && e.date && e.title) add(Date.parse(e.date + 'T' + (e.time || '12:00') + ':00'), e.title, ''); });
    return E.sort(function(a, b){ return a.t - b.t; }).slice(0, 6);
  }
  function hero(E){
    var now = Date.now(), pbOpen = sunday(17) + 2 * DAY, pbEnd = sunday(18) + 2 * DAY, h = null;
    if(now >= pbOpen && now < pbEnd) h = { k:'WHAT’S HAPPENING', t:now >= sunday(18) ? 'The Pro Bowl is on' : 'The Pro Bowl board is open', p:'Fill your division’s roster before kickoff. Every team puts in $50; the best division splits $600.', a:'probowl', b:'SEE THE PRO BOWL' };
    else if(LOT && LOT.pending) h = { k:'HAPPENING NOW', t:'The rookie lottery is being drawn', p:'The Commish is spinning the machine. The order posts when the #1 pick is out.', a:'lottery#draw', b:'WATCH THE DRAW' };
    else if(LOT && now - LOT.ts < 14 * DAY) h = { k:'JUST POSTED', t:'The rookie draft order is set', p:D.NAME[LOT.order[0]] + ' has the #1 pick.', a:'lottery#history', b:'SEE THE ORDER' };
    else if(E[0]) h = { k:'NEXT UP', t:E[0].lbl + ' · ' + new Date(E[0].t).toLocaleDateString('en-US', { weekday:'long', month:'long', day:'numeric' }), p:E[1] ? 'Then: ' + E[1].lbl + ', ' + md(E[1].t) + '.' : '', a:'schedule', b:'SEE THE SCHEDULE' };
    if(!h){ $('khhero').innerHTML = ''; return; }
    var hr = h.a.split('#');
    $('khhero').innerHTML = '<div class="khhero"><div><div class="k mono">' + h.k + '</div><h2>' + esc(h.t) + '</h2>' + (h.p ? '<p>' + esc(h.p) + '</p>' : '') + '</div><a class="btn" href="' + D.href(hr[0]) + (hr[1] ? '#' + hr[1] : '') + '">' + h.b + ' →</a></div>';
  }
  function cal(E){
    $('khcal').innerHTML = E.length ? '<article class="card khcal"><div class="bar mono"><span>COMING UP</span><span>CLUBHOUSE DATES</span></div><ul>' + E.map(function(e){ return '<li>' + (e.k ? '<a href="' + D.href(e.k) + '">' + esc(e.lbl) + '</a>' : esc(e.lbl)) + '<b class="mono">' + md(e.t) + '</b></li>'; }).join('') + '</ul></article>' : '';
  }

  D.shell; draw();
  D.me().then(function(me){ ME = (me && me.franchise) || ''; draw(); }).catch(function(){});
  var calP = D.content('calendar').catch(function(){ return null; });
  var lotP = D.content('lottery').then(function(c){ var h = arr(c && c.history); LOT = h[0] || null;
    if(LOT) set('lottery', LOT.pending ? 'DRAW IN PROGRESS' : 'ORDER SET ' + md(LOT.ts) + ' · ' + (D.SHORT[LOT.order[0]] || '') + ' AT #1');
    else if(c && c.balls){ var B = c.balls, tot = 0, top = ''; Object.keys(B).forEach(function(id){ tot += Math.max(0, num(B[id])); if(!top || num(B[id]) > num(B[top])) top = id; }); if(tot) set('lottery', 'OFFICIAL BALLS SET · ' + (D.SHORT[top] || '') + ' ' + (num(B[top]) / tot * 100).toFixed(1) + '% AT #1'); }
    else set('lottery', 'PRACTICE DRAWS OPEN'); }).catch(function(){});
  Promise.all([calP, lotP]).then(function(r){ var E = dates(r[0]); hero(E); cal(E); });

  D.penPool().then(function(p){ if(p && p.now) set('finances', 'PENALTY POOL ' + D.usd(p.now) + (p.live ? ' IN BTC' : '')); }).catch(function(){});
  fetch('data/rulebook.json', { cache:'no-cache' }).then(function(r){ return r.json(); }).then(function(j){ if(j && j.updated) set('rules', 'UPDATED ' + md(Date.parse(j.updated + 'T12:00:00'))); }).catch(function(){});
  D.content('clerk').then(function(c){ var t = 0; arr(c && c.notes).forEach(function(n){ if(n && n.at > t) t = n.at; }); if(t) set('clerk', 'LAST ENTRY ' + md(t)); }).catch(function(){});
  D.content('teams').then(function(T){ var n = 0; Object.keys(T || {}).forEach(function(id){ arr(T[id] && T[id].alts).forEach(function(a){ if(a.lab) n++; }); }); set('helmets', n ? n + ' LAB HELMET' + (n > 1 ? 'S' : '') + ' IN THE LEAGUE' : 'DESIGN YOUR ALTERNATE'); }).catch(function(){});
  if(!D.LOCAL){
    fetch('/data/probowl', { cache:'no-store', credentials:'same-origin' }).then(function(r){ return r.json(); }).then(function(b){ PB = b; var n = 0; Object.keys(b.div || {}).forEach(function(k){ Object.keys(b.div[k]).forEach(function(s){ if(b.div[k][s] && b.div[k][s].pid) n++; }); });
      set('probowl', b.open ? n + ' OF 30 SPOTS FILLED' : 'BOARD OPENS ' + md(b.opens)); }).catch(function(){});
    fetch('/data/feedback', { cache:'no-store', credentials:'same-origin' }).then(function(r){ return r.json(); }).then(function(d){ var n = arr(d && d.items).filter(function(x){ return x.status !== 'done' && x.status !== 'wont'; }).length; set('ideas', n + ' OPEN ITEM' + (n === 1 ? '' : 'S')); }).catch(function(){});
  } else set('probowl', 'BOARD OPENS ' + md(sunday(17) + 2 * DAY));
})();
