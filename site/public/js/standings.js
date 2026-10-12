(function(){
  var D = DC, $ = D.$, esc = D.esc, arr = D.arr, num = D.num, helm = D.helm;
  var ME = '';
  D.shell('standings').then(function(me){ ME = me.franchise || ''; [].forEach.call(document.querySelectorAll('[data-id="' + ME + '"]'), function(el){ el.classList.add('me'); }); });

  var SV = location.hash === '#power' ? 'power' : 'table', PR = null;
  function sv(){
    [].forEach.call(document.querySelectorAll('#stabs [data-v]'), function(a){ a.classList.toggle('on', a.getAttribute('data-v') === SV); });
    $('vtab').hidden = SV !== 'table'; $('vpow').hidden = SV !== 'power';
    if(SV === 'power') power();
  }
  window.addEventListener('hashchange', function(){ SV = location.hash === '#power' ? 'power' : 'table'; sv(); });
  function power(){
    if(PR){ drawPower(); return; }
    D.api('liveScoring').then(function(j){ var w = num(j && j.liveScoring && j.liveScoring.week) || 1; return D.power(w); }).then(function(p){ PR = p; drawPower(); })
      .catch(function(){ $('vpow').innerHTML = '<div class="card"><div class="ld mono">POWER RANKINGS AREN\u2019T AVAILABLE YET.</div></div>'; });
  }
  function drawPower(){
    var L = PR.list; if(!PR.week){ $('vpow').innerHTML = '<div class="card"><div class="ld mono">POWER RANKINGS START AFTER WEEK 1.</div></div>'; return; }
    var top = L[0], up = L.slice().sort(function(a, b){ return b.mv - a.mv; })[0], dn = L.slice().sort(function(a, b){ return a.mv - b.mv; })[0];
    var hi = L[0].score || 1;
    $('vpow').innerHTML = '<div class="pwh">' +
      '<div class="pwc top"><span class="mono">NO. 1 \u00b7 WEEK ' + PR.week + '</span><img src="' + helm(top.id) + '" alt=""><b>' + esc(D.NAME[top.id]) + '</b><i class="mono">' + top.w + '-' + top.l + ' \u00b7 ALL-PLAY ' + top.apw + '-' + top.apl + '</i></div>' +
      (up && up.mv > 0 ? '<div class="pwc"><span class="mono">BIGGEST RISER</span><img src="' + helm(up.id) + '" alt=""><b>' + esc(D.SHORT[up.id]) + '</b><i class="mono up">\u25b2 ' + up.mv + ' TO NO. ' + up.rk + '</i></div>' : '') +
      (dn && dn.mv < 0 ? '<div class="pwc"><span class="mono">BIGGEST FALL</span><img src="' + helm(dn.id) + '" alt=""><b>' + esc(D.SHORT[dn.id]) + '</b><i class="mono dn">\u25bc ' + (-dn.mv) + ' TO NO. ' + dn.rk + '</i></div>' : '') +
      '</div><article class="card pwt"><div class="bar mono"><span>POWER RANKINGS \u00b7 AFTER WEEK ' + PR.week + '</span><span>40% POINTS \u00b7 40% ALL-PLAY \u00b7 20% LAST 3 WEEKS</span></div>' +
      '<div class="pwr2 hd mono"><span>#</span><span></span><span>TEAM</span><span>RECORD</span><span class="px">ALL-PLAY</span><span class="px">POINTS</span><span class="px">LAST 3 AVG</span><span>POWER</span></div>' +
      L.map(function(t){ return '<a class="pwr2' + (t.id === ME ? ' me' : '') + '" href="' + D.href('teams', 'f=' + t.id) + '"><b class="n2">' + t.rk + '</b><span class="mv mono ' + (t.mv > 0 ? 'up' : t.mv < 0 ? 'dn' : '') + '">' + (t.mv > 0 ? '\u25b2' + t.mv : t.mv < 0 ? '\u25bc' + (-t.mv) : '\u2013') + '</span><span class="tn2"><img src="' + helm(t.id) + '" alt=""><b>' + esc(D.NAME[t.id]) + '</b></span><span class="mono">' + t.w + '-' + t.l + '</span><span class="mono">' + t.apw + '-' + t.apl + '</span><span class="mono">' + D.pts(t.pf) + '</span><span class="mono">' + D.pts(Math.round(t.r3 * 100) / 100) + '</span><span class="pws"><i style="width:' + (t.score / hi * 100).toFixed(1) + '%"></i><em class="mono">' + t.score.toFixed(1) + '</em></span></a>'; }).join('') +
      '<div class="fnote mono"><span>ALL-PLAY = YOUR RECORD IF YOU PLAYED ALL 11 TEAMS EVERY WEEK</span><span>ARROWS = CHANGE SINCE LAST WEEK</span></div></article>';
  }
  sv();
  Promise.all([D.api('leagueStandings'), D.api('schedule').catch(function(){ return null; }), D.api('league').catch(function(){ return null; })]).then(function(r){
    var F = arr(r[0] && r[0].leagueStandings && r[0].leagueStandings.franchise).filter(function(f){ return D.NAME[f.id]; });
    if(!F.length) throw 0;
    var lg = (r[2] && r[2].league) || {}, cut = num(lg.playoffTeams) || 6;
    var T = F.map(function(f, i){
      var w = num(f.h2hw), l = num(f.h2hl), t = num(f.h2ht), g = w + l + t;
      var dv = String(f.divwlt || '').split('-');
      return { id:f.id, rk:i + 1, dw:num(dv[0]), dl:num(dv[1]), w:w, l:l, t:t, g:g, pct:g ? (w + t / 2) / g : 0, pf:num(f.pf), pa:num(f.pa), strk:f.strk || '', eff:f.eff ? num(f.eff) : null, faab:f.bbidbalance || '' };
    });
    var played = Math.max.apply(null, T.map(function(x){ return x.g; })) || 0;
    $('k').textContent = 'THE STANDINGS · AFTER WEEK ' + played;

    // shelf
    $('helms').innerHTML = T.map(function(x){ return '<a class="tm" data-id="' + x.id + '" href="' + D.href('teams', 'f=' + x.id) + '" title="' + esc(D.NAME[x.id]) + '"><span class="rk">' + x.rk + '</span><img src="' + helm(x.id) + '" alt="' + esc(D.NAME[x.id]) + '"></a>'; }).join('');
    $('plates').innerHTML = T.map(function(x){ return '<span class="plate">' + x.w + '-' + x.l + (x.t ? '-' + x.t : '') + '</span>'; }).join('');

    // power: 45% record, 40% points for, 15% lineup efficiency
    var maxPF = Math.max.apply(null, T.map(function(x){ return x.pf; })) || 1, minPF = Math.min.apply(null, T.map(function(x){ return x.pf; }));
    T.forEach(function(x){ var pfn = maxPF > minPF ? (x.pf - minPF) / (maxPF - minPF) : .5; x.pow = .45 * x.pct + .40 * pfn + .15 * (x.eff != null ? x.eff / 100 : .5); });
    var P = T.slice().sort(function(a, b){ return b.pow - a.pow; }); P.forEach(function(x, i){ x.prk = i + 1; });

    // table
    var hasEff = T.some(function(x){ return x.eff != null; }), hasFaab = T.some(function(x){ return x.faab; });
    var cols = '<span>#</span><span>TEAM</span><span>W-L</span><span>PCT</span><span>PF</span><span>PA</span><span>DIFF</span><span>STRK</span>' + (hasEff ? '<span>EFF</span>' : '') + (hasFaab ? '<span>FAAB</span>' : '');
    var gt = '28px minmax(0,1fr) 62px 54px 78px 78px 70px 52px' + (hasEff ? ' 54px' : '') + (hasFaab ? ' 74px' : '');
    $('tbl').style.setProperty('--gt', gt);
    function row(x, inDiv){
      var d = x.pf - x.pa, mv = x.rk - x.prk;
      return '<a class="sr' + '' + (x.id === ME ? ' me' : '') + '" data-id="' + x.id + '" href="' + D.href('teams', 'f=' + x.id) + '">' +
        '<span class="rk">' + x.rk + '</span><span class="tn2"><img src="' + helm(x.id) + '" alt=""><span class="nm4"><b>' + esc(D.NAME[x.id]) + '</b>' + (inDiv !== undefined ? '<span class="tg4">' + (inDiv ? '<i class="dlead mono">DIV LEADER</i>' : '') + ((x.dw || x.dl) ? '<i class="dvr mono">' + x.dw + '-' + x.dl + ' DIV</i>' : '') + '</span>' : '') + '</span></span>' +
        '<span class="wl">' + x.w + '-' + x.l + (x.t ? '-' + x.t : '') + '</span><span>' + x.pct.toFixed(3).replace(/^0/, '') + '</span><span>' + D.pts(x.pf) + '</span><span>' + D.pts(x.pa) + '</span>' +
        '<span class="' + (d >= 0 ? 'up' : 'dn') + '">' + (d >= 0 ? '+' : '\u2212') + D.pts(Math.abs(d)) + '</span><span class="' + (/^W/.test(x.strk) ? 'up' : /^L/.test(x.strk) ? 'dn' : '') + '">' + esc(x.strk || '\u2013') + '</span>' +
        (hasEff ? '<span>' + (x.eff != null ? x.eff.toFixed(1) + '%' : '\u2013') + '</span>' : '') + (hasFaab ? '<span>' + esc(String(x.faab).replace('.00', '')) + '</span>' : '') +
        '</a>';
    }
    var view = 'div';
    function table(){
      var note = '';
      var tg = '<div class="seg mono vtog"><button type="button" data-v="div" class="' + (view === 'div' ? 'on' : '') + '">DIVISIONS</button><button type="button" data-v="all" class="' + (view === 'all' ? 'on' : '') + '">OVERALL</button></div>';
      if(view === 'all'){
        $('tbl').innerHTML = '<div class="bar mono"><span>REGULAR SEASON</span>' + tg + '<span></span></div><div class="sr hd mono">' + cols + '</div>' + T.map(function(x){ return row(x); }).join('') + note;
      } else {
        $('tbl').innerHTML = '<div class="bar mono"><span>REGULAR SEASON</span>' + tg + '<span></span></div>' + D.DIVS.map(function(d){
          var L = T.filter(function(x){ return d.ids.indexOf(x.id) > -1; });
          var lead = L[0]; return D.divBanner(d, lead ? '<span class="mono">LEADER</span><img src="' + helm(lead.id) + '" alt=""><b>' + esc(D.SHORT[lead.id]) + '</b><i class="mono">' + lead.w + '-' + lead.l + '</i>' : '') + '<div class="sr hd mono">' + cols + '</div>' + L.map(function(x, i){ return row(x, i === 0); }).join('');
        }).join('') + note;
      }
      [].forEach.call(document.querySelectorAll('#tbl [data-id="' + ME + '"]'), function(el){ el.classList.add('me'); });
    }
    table();
    $('tbl').addEventListener('click', function(e){ var b = e.target.closest('[data-v]'); if(b){ view = b.getAttribute('data-v'); table(); } });

    // power rankings
    $('pow').innerHTML = '<div class="bar mono"><span>POWER RANKINGS</span><span>WHO\u2019S ACTUALLY GOOD</span></div>' + P.map(function(x){
      var mv = x.rk - x.prk;
      return '<div class="pwr" data-id="' + x.id + '"><b class="n2">' + x.prk + '</b><img src="' + helm(x.id) + '" alt=""><div><b>' + esc(D.NAME[x.id]) + '</b><span class="mono">' + x.w + '-' + x.l + ' · ' + D.pts(x.pf) + ' PF' + (mv ? ' · <em class="' + (mv > 0 ? 'up' : 'dn') + '">' + (mv > 0 ? 'UNDERRATED BY ' + mv : 'OVERRATED BY ' + (-mv)) + '</em>' : '') + '</span></div></div>';
    }).join('');

    // remaining schedule / strength of schedule
    var W = arr(r[1] && r[1].schedule && r[1].schedule.weeklySchedule), last = num(lg.lastRegularSeasonWeek) || 14;
    var pct = {}; T.forEach(function(x){ pct[x.id] = x.pct; });
    var rem = {}; T.forEach(function(x){ rem[x.id] = []; });
    W.forEach(function(wk){
      var n = num(wk.week); if(n <= played || n > last) return;
      arr(wk.matchup).forEach(function(m){ var f = arr(m.franchise); if(f.length === 2 && rem[f[0].id] && rem[f[1].id]){ rem[f[0].id].push([n, f[1].id]); rem[f[1].id].push([n, f[0].id]); } });
    });
    var S = T.map(function(x){ var o = rem[x.id]; return { id:x.id, o:o, sos:o.length ? o.reduce(function(a, p){ return a + (pct[p[1]] || 0); }, 0) / o.length : 0 }; }).filter(function(x){ return x.o.length; }).sort(function(a, b){ return b.sos - a.sos; });
    if(S.length){
      $('sos').innerHTML = '<div class="bar mono"><span>ROAD AHEAD</span><span>HARDEST REMAINING SCHEDULE FIRST</span></div>' + S.map(function(x){
        return '<div class="ra" data-id="' + x.id + '"><img src="' + helm(x.id) + '" alt="" class="me2"><div class="sm"><b>' + esc(D.SHORT[x.id]) + '</b><span class="mono">OPP ' + x.sos.toFixed(3).replace(/^0/, '') + '</span></div><div class="nx">' +
          x.o.slice(0, 5).map(function(p){ return '<span title="Week ' + p[0] + ': ' + esc(D.NAME[p[1]]) + '"><img src="' + helm(p[1]) + '" alt=""><i class="mono">W' + p[0] + '</i></span>'; }).join('') + '</div></div>';
      }).join('');
    } else $('sos').hidden = true;
  }).catch(function(){ $('tbl').innerHTML = '<div class="ld mono">STANDINGS AREN\u2019T AVAILABLE RIGHT NOW.</div>'; });
})();
