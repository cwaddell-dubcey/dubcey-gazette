(function(){
  var D = DC, $ = D.$, esc = D.esc, arr = D.arr, num = D.num, helm = D.helm;
  var ME = '';
  D.shell('standings').then(function(me){ ME = me.franchise || ''; [].forEach.call(document.querySelectorAll('[data-id="' + ME + '"]'), function(el){ el.classList.add('me'); }); });

  Promise.all([D.api('leagueStandings'), D.api('schedule').catch(function(){ return null; }), D.api('league').catch(function(){ return null; })]).then(function(r){
    var F = arr(r[0] && r[0].leagueStandings && r[0].leagueStandings.franchise).filter(function(f){ return D.NAME[f.id]; });
    if(!F.length) throw 0;
    var lg = (r[2] && r[2].league) || {}, cut = num(lg.playoffTeams) || 6;
    var T = F.map(function(f, i){
      var w = num(f.h2hw), l = num(f.h2hl), t = num(f.h2ht), g = w + l + t;
      return { id:f.id, rk:i + 1, w:w, l:l, t:t, g:g, pct:g ? (w + t / 2) / g : 0, pf:num(f.pf), pa:num(f.pa), strk:f.strk || '', eff:f.eff ? num(f.eff) : null, faab:f.bbidbalance || '' };
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
    var cols = '<span>#</span><span>TEAM</span><span>W-L</span><span>PCT</span><span>PF</span><span>PA</span><span>DIFF</span><span>STRK</span>' + (hasEff ? '<span>EFF</span>' : '') + (hasFaab ? '<span>FAAB</span>' : '') + '<span>PWR</span>';
    var gt = '28px minmax(0,1fr) 62px 54px 78px 78px 70px 52px' + (hasEff ? ' 54px' : '') + (hasFaab ? ' 74px' : '') + ' 48px';
    $('tbl').style.setProperty('--gt', gt);
    $('tbl').innerHTML = '<div class="bar mono"><span>REGULAR SEASON</span><span>TOP ' + cut + ' MAKE THE PLAYOFFS</span></div><div class="sr hd mono">' + cols + '</div>' + T.map(function(x){
      var d = x.pf - x.pa, mv = x.rk - x.prk;
      return '<a class="sr' + (x.rk === cut ? ' cut' : '') + (x.id === ME ? ' me' : '') + '" data-id="' + x.id + '" href="' + D.href('teams', 'f=' + x.id) + '">' +
        '<span class="rk">' + x.rk + '</span><span class="tn2"><img src="' + helm(x.id) + '" alt=""><b>' + esc(D.NAME[x.id]) + '</b></span>' +
        '<span class="wl">' + x.w + '-' + x.l + (x.t ? '-' + x.t : '') + '</span><span>' + x.pct.toFixed(3).replace(/^0/, '') + '</span><span>' + D.pts(x.pf) + '</span><span>' + D.pts(x.pa) + '</span>' +
        '<span class="' + (d >= 0 ? 'up' : 'dn') + '">' + (d >= 0 ? '+' : '\u2212') + D.pts(Math.abs(d)) + '</span><span class="' + (/^W/.test(x.strk) ? 'up' : /^L/.test(x.strk) ? 'dn' : '') + '">' + esc(x.strk || '\u2013') + '</span>' +
        (hasEff ? '<span>' + (x.eff != null ? x.eff.toFixed(1) + '%' : '\u2013') + '</span>' : '') + (hasFaab ? '<span>' + esc(String(x.faab).replace('.00', '')) + '</span>' : '') +
        '<span class="pw">' + x.prk + (mv > 0 ? '<i class="up">\u25b2</i>' : mv < 0 ? '<i class="dn">\u25bc</i>' : '') + '</span></a>';
    }).join('') + '<div class="note mono">PWR = 45% RECORD · 40% POINTS FOR · 15% LINEUP EFFICIENCY. ARROWS SHOW HOW IT DIFFERS FROM THE STANDINGS.</div>';

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
