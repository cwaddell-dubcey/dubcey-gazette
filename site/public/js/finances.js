/* League finances: dues, luxury tax, crypto luxury pool, last-place penalties, payouts, expenses. Commish edits; everyone sees. */
(function(){
  var D = DC, $ = D.$, esc = D.esc, num = D.num;
  var DUES = 250, PENALTY = 50, ZCAT = 'HcRLc9VDgjLeK154xDawfb1dmVJ98DoSqcwTHGqiDeJR';
  var S = { F:null, edit:false, px:{}, pxAt:0, from:'', tab:location.hash === '#auction' ? 'auction' : 'season' };

  function seed(){
    return {
      dues:{}, luxTax:{}, btcQty:'', btcCost:'', zecQty:'', zecCost:'', zcatQty:'', zcatCost:'', luxInvested:'',
      expenses:[], penalties:Array.from({ length:13 }, function(_, i){ return { week:i + 1, name:'', btc:'' }; }),
      payouts:[['Winner', 40], ['Runner Up', 15], ['Division Winners', 15], ['Most Points', 6], ['Weekly High Score', 13], ['Rivalry Week', 6], ['3rd Place', 5]].map(function(p, i){ return { id:'p' + (i + 1), label:p[0], pct:p[1] }; })
    };
  }
  // old tracker keyed teams by name; this site keys them by franchise id
  function nk(s){ return String(s || '').toLowerCase().replace(/^the\s+/, '').replace(/[^a-z0-9]/g, ''); }
  function idOf(name){ var k = nk(name); if(!k) return ''; for(var i = 0; i < D.IDS.length; i++){ var id = D.IDS[i]; if(nk(D.NAME[id]) === k || nk(D.SHORT[id]) === k) return id; } for(i = 0; i < D.IDS.length; i++){ id = D.IDS[i]; var a = nk(D.NAME[id]); if(a.indexOf(k) > -1 || k.indexOf(a) > -1) return id; } return ''; }
  function convert(f){
    var o = seed(); if(!f) return o;
    ['btcQty','btcCost','zecQty','zecCost','zcatQty','zcatCost','luxInvested'].forEach(function(k){ if(f[k] != null) o[k] = String(f[k]); });
    Object.keys(f.dues || {}).forEach(function(n){ var id = idOf(n); if(id) o.dues[id] = !!f.dues[n]; });
    Object.keys(f.luxTax || {}).forEach(function(n){ var id = idOf(n); if(id && f.luxTax[n] !== '') o.luxTax[id] = String(f.luxTax[n]); });
    if(Array.isArray(f.expenses)) o.expenses = f.expenses.map(function(x, i){ return { id:x.id || 'ex' + i, label:x.label || '', amount:String(x.amount || '') }; });
    if(Array.isArray(f.payouts) && f.payouts.length) o.payouts = f.payouts.map(function(p, i){ return { id:p.id || 'p' + i, label:p.label || '', pct:String(p.pct || '') }; });
    if(Array.isArray(f.penalties) && f.penalties.length) o.penalties = f.penalties.map(function(p, i){ return { week:p.week || i + 1, fid:idOf(p.name), name:p.name || '', btc:p.btc == null ? '' : String(p.btc) }; });
    return o;
  }

  var money = function(v){ return '$' + num(v).toLocaleString('en-US', { minimumFractionDigits:2, maximumFractionDigits:2 }); };
  var money0 = function(v){ return '$' + Math.round(num(v)).toLocaleString('en-US'); };
  var signed = function(v){ return (v >= 0 ? '+' : '\u2212') + money(Math.abs(v)).slice(0); };
  var pctOf = function(g, b){ return b > 0 ? (g >= 0 ? '+' : '\u2212') + Math.abs(g / b * 100).toFixed(1) + '%' : '\u2014'; };
  var tone = function(g){ return g > 0.005 ? 'up' : g < -0.005 ? 'dn' : ''; };
  function price(v){ return !(v > 0) ? '\u2014' : v >= 1 ? money(v) : '$' + Number(v).toFixed(8).replace(/0+$/, ''); }

  function calc(){
    var F = S.F, px = S.px;
    var paid = D.IDS.filter(function(id){ return F.dues[id]; }).length, duesTotal = paid * DUES;
    var luxSum = D.IDS.reduce(function(a, id){ return a + num(F.luxTax[id]); }, 0);
    var A = [
      { k:'btc', sym:'BTC', name:'Bitcoin', mark:'\u20bf', live:px.btc, dp:8 },
      { k:'zec', sym:'ZEC', name:'Zcash', mark:'\u24cf', logo:'img/zec-logo.png', live:px.zec, dp:4 },
      { k:'zcat', sym:'ZCAT', name:'ZCAT \u00b7 Solana', mark:'\u25c8', logo:'img/zcat-logo.png', live:px.zcat, dp:0 }
    ].map(function(x){ x.qty = num(F[x.k + 'Qty']); x.cost = num(F[x.k + 'Cost']); x.value = x.live > 0 && x.qty > 0 ? x.qty * x.live : x.cost; return x; });
    var costSum = A.reduce(function(a, x){ return a + x.cost; }, 0), luxNow = A.reduce(function(a, x){ return a + x.value; }, 0);
    var luxCost = costSum > 0 ? costSum : (F.luxInvested === '' || F.luxInvested == null ? luxSum : num(F.luxInvested));
    var expTotal = F.expenses.reduce(function(a, x){ return a + num(x.amount); }, 0);
    var net = duesTotal + luxNow - expTotal;
    var pctSum = F.payouts.reduce(function(a, p){ return a + num(p.pct); }, 0);
    var penN = F.penalties.filter(function(p){ return p.fid || String(p.name || '').trim(); }).length, penCost = penN * PENALTY;
    var penBtc = F.penalties.reduce(function(a, p){ return a + num(p.btc); }, 0), penNow = px.btc > 0 && penBtc > 0 ? penBtc * px.btc : penCost;
    return { paid:paid, duesTotal:duesTotal, luxSum:luxSum, A:A, costSum:costSum, luxNow:luxNow, luxCost:luxCost, expTotal:expTotal, net:net, pctSum:pctSum, penN:penN, penCost:penCost, penBtc:penBtc, penNow:penNow };
  }

  function inp(path, val, o){ o = o || {}; return S.edit ? '<input class="fin' + (o.cls ? ' ' + o.cls : '') + '" data-f="' + esc(path) + '" value="' + esc(val) + '"' + (o.num ? ' inputmode="decimal"' : '') + ' placeholder="' + esc(o.ph || '') + '">' : '<span class="fv' + (o.cls ? ' ' + o.cls : '') + '">' + esc(o.show != null ? o.show : val || '\u2014') + '</span>'; }
  function team(id, fallback){ return id ? '<a class="ftm" href="' + D.href('teams', 'f=' + id) + '"><img src="' + D.helm(id) + '" alt=""><b>' + esc(D.NAME[id]) + '</b></a>' : '<span class="ftm"><b>' + esc(fallback || '\u2014') + '</b></span>'; }

  function draw(){
    var F = S.F, c = calc();
    $('px').innerHTML = [['btc', 'BTC'], ['zec', 'ZEC'], ['zcat', 'ZCAT']].map(function(x){ return '<span class="fchip mono"><i class="' + (S.px[x[0]] > 0 ? 'on' : '') + '"></i>' + x[1] + ' <b>' + price(S.px[x[0]]) + '</b></span>'; }).join('') + '<button class="btn ghost" type="button" data-rf title="Refresh prices">\u21bb</button>';

    var h = '';
    // headline numbers
    h += '<section class="card fsum">' +
      '<div class="fbig"><span class="mono">NET PAYOUT POOL</span><b>' + money(c.net) + '</b><i class="mono">DUES + LUXURY POOL \u2212 EXPENSES</i></div>' +
      '<div><span class="mono">DUES COLLECTED</span><b>' + money0(c.duesTotal) + '</b><i class="mono">' + c.paid + ' OF ' + D.IDS.length + ' PAID \u00b7 $' + DUES + ' EACH</i></div>' +
      '<div><span class="mono">LUXURY POOL \u00b7 CRYPTO</span><b>' + money(c.luxNow) + '</b><i class="mono ' + tone(c.luxNow - c.luxCost) + '">' + signed(c.luxNow - c.luxCost) + ' (' + pctOf(c.luxNow - c.luxCost, c.luxCost) + ')</i></div>' +
      '<div><span class="mono">SHARED EXPENSES</span><b class="dn">\u2212' + money(c.expTotal) + '</b><i class="mono">' + F.expenses.length + ' ITEM' + (F.expenses.length === 1 ? '' : 'S') + '</i></div>' +
    '</section>';

    // crypto
    h += '<section class="card fcr"><div class="bar mono"><span>\u20bf LUXURY POOL \u00b7 CRYPTO</span><span>' + (S.pxAt ? 'PRICES ' + new Date(S.pxAt).toLocaleTimeString([], { hour:'numeric', minute:'2-digit' }).toUpperCase() + ' \u00b7 COINBASE / DEXSCREENER' : 'FETCHING PRICES\u2026') + '</span></div>' +
      '<div class="fcrt"><div><span class="mono">COST BASIS</span><b>' + money(c.luxCost) + '</b><i class="mono">' + (c.costSum > 0 ? 'ENTERED PER ASSET' : 'FROM LUXURY TAX COLLECTED') + '</i></div>' +
      '<div class="hi"><span class="mono">POOL VALUE TODAY</span><b>' + money(c.luxNow) + '</b><i class="mono ' + tone(c.luxNow - c.luxCost) + '">' + signed(c.luxNow - c.luxCost) + ' (' + pctOf(c.luxNow - c.luxCost, c.luxCost) + ')</i></div></div>' +
      '<div class="fas">' + c.A.map(function(x){ var g = x.value - x.cost;
        return '<div class="fcx"><div class="fah"><span class="fmk ' + x.k + '">' + (x.logo ? '<img src="' + x.logo + '" alt="">' : '') + x.mark + '</span><b>' + x.sym + '</b><i class="mono">' + esc(x.name) + '</i><em class="mono">' + (x.live > 0 ? price(x.live) : 'NO FEED') + '</em></div>' +
          '<div class="fag"><label class="mono">HELD' + inp(x.k + 'Qty', F[x.k + 'Qty'], { num:1, ph:'0', show:x.qty ? x.qty.toLocaleString('en-US', { maximumFractionDigits:x.qty >= 1000 ? 0 : x.dp }) + ' ' + x.sym : '\u2014' }) + '</label>' +
          '<label class="mono">COST BASIS' + inp(x.k + 'Cost', F[x.k + 'Cost'], { num:1, ph:'0', show:money(x.cost) }) + '</label></div>' +
          '<div class="fav"><b>' + money(x.value) + '</b><span class="mono ' + tone(g) + '">' + signed(g) + ' (' + pctOf(g, x.cost) + ')</span><span class="mono">' + (c.luxNow > 0 ? (x.value / c.luxNow * 100).toFixed(1) : '0.0') + '% OF POOL</span></div></div>';
      }).join('') + '</div>' +
      '<div class="fgt mono"><span>ALL LEAGUE CRYPTO \u00b7 LUXURY + PENALTY POOLS \u00b7 COST ' + money(c.luxCost + c.penCost) + '</span><b>' + money(c.luxNow + c.penNow) + '</b></div></section>';

    // penalties + payouts
    var opts = function(sel){ return '<option value="">\u2014</option>' + D.IDS.map(function(id){ return '<option value="' + id + '"' + (id === sel ? ' selected' : '') + '>' + esc(D.NAME[id]) + '</option>'; }).join(''); };
    h += '<div class="duo fduo"><section class="card"><div class="bar mono"><span>\u20bf WEEKLY LOW-SCORE PENALTIES</span><span>$' + PENALTY + ' EACH \u00b7 SEPARATE POOL</span></div>' +
      '<table class="ft"><thead><tr><th class="l mono">WK</th><th class="l mono">LOW SCORER</th><th class="mono">BTC BOUGHT</th><th class="mono">BUY</th></tr></thead><tbody>' +
      F.penalties.map(function(p, i){ var on = p.fid || String(p.name || '').trim();
        // a week with both a team and a BTC amount locks; the commish taps EDIT to reopen it
        var lock = on && num(p.btc) > 0 && !(S.unl && S.unl[i]), ed = S.edit && !lock;
        return '<tr class="' + (on ? '' : 'off') + (lock ? ' lkd' : '') + '"><td class="l mono">' + (p.week || i + 1) + '</td><td class="l">' + (ed ? '<select class="fin" data-f="penalties.' + i + '.fid">' + opts(p.fid) + '</select>' : team(p.fid, p.name)) + '</td><td class="r">' + (ed ? inp('penalties.' + i + '.btc', p.btc, { num:1, ph:'0.0000', cls:'r' }) : '<span class="fbtc mono">' + (num(p.btc) > 0 ? '\u20bf' + esc(String(p.btc).replace(/^\./, '0.')) : '\u2014') + '</span>') + '</td><td class="amt">' + (on ? '$' + PENALTY : '\u2014') + (lock && S.edit ? '<button type="button" class="funl mono" data-punl="' + i + '" title="Unlock to edit">EDIT</button>' : '') + '</td></tr>';
      }).join('') + '</tbody><tfoot><tr><td colspan="2" class="l mono">POOL \u00b7 ' + c.penN + ' OF ' + F.penalties.length + ' WEEKS</td><td class="mono">\u20bf' + c.penBtc.toFixed(8).replace(/0+$/, '').replace(/\.$/, '') + '</td><td class="amt">' + money0(c.penCost) + '</td></tr></tfoot></table>' +
      '<div class="fnote mono"><span>INVESTED ' + money(c.penCost) + ' \u00b7 WORTH ' + money(c.penNow) + '</span><span class="' + tone(c.penNow - c.penCost) + '">' + signed(c.penNow - c.penCost) + ' (' + pctOf(c.penNow - c.penCost, c.penCost) + ')</span></div></section>';

    var off = Math.abs(c.pctSum - 100) >= 0.01;
    h += '<section class="card"><div class="bar mono"><span>PAYOUT SCHEDULE</span><span>OF NET POOL ' + money(c.net) + '</span></div>' +
      '<table class="ft"><thead><tr><th class="l mono">PLACEMENT</th><th class="mono">SHARE</th><th class="mono">PAYOUT</th></tr></thead><tbody>' +
      F.payouts.map(function(p, i){ return '<tr><td class="l"><b class="fpl">' + esc(p.label) + '</b></td><td class="mono">' + num(p.pct) + '%</td><td class="amt">' + money(c.net * num(p.pct) / 100) + '</td></tr>'; }).join('') +
      '</tbody><tfoot><tr><td class="l mono">TOTAL</td><td class="mono ' + (off ? 'warn' : '') + '">' + c.pctSum.toFixed(2).replace(/\.00$/, '') + '%</td><td class="amt">' + money(c.net) + '</td></tr></tfoot></table>' +
      (off ? '<div class="fnote warn mono">SHARES ADD UP TO ' + c.pctSum.toFixed(2) + '% \u2014 THEY SHOULD TOTAL 100%</div>' : '') + '</section></div>';

    // penalty pool → Week 14 payout
    var R = S.hi, pp = c.penNow;
    h += '<section class="card fpp"><div class="bar mono"><span>\u20bf PENALTY POOL PAYOUT \u00b7 AFTER WEEK 14</span><span>POOL TODAY ' + money(pp) + '</span></div>' +
      '<div class="fppg">' +
        '<div class="fppc hi"><span class="mono">CURRENT WEEKLY HIGH SCORE \u00b7 WEEKS 1\u201313</span>' +
          (R ? '<a class="fpph" href="' + D.href('teams', 'f=' + R.id) + '"><img src="' + D.helm(R.id) + '" alt=""><div><b>' + esc(D.NAME[R.id]) + '</b><i class="mono">' + D.pts(R.s) + ' PTS \u00b7 WEEK ' + R.w + '</i></div></a>' : '<div class="fpph"><span class="ph2"></span><div><b>To be decided</b><i class="mono">' + (S.hiErr ? 'COULDN\u2019T LOAD SCORES' : 'WAITING ON WEEK 1') + '</i></div></div>') +
          '<div class="fppa"><b>' + money(pp * .25) + '</b><i class="mono">25% OF POOL \u00b7 AT TODAY\u2019S BTC PRICE</i></div></div>' +
        '<div class="fppc"><span class="mono">WEEK 14 \u00b7 HIGHEST SCORE IN THE LEAGUE</span><div class="fpph"><span class="ph2 pct mono">50%</span><div><b>Week 14 winner</b><i class="mono">DECIDED AFTER WEEK 14</i></div></div><div class="fppa"><b>' + money(pp * .5) + '</b><i class="mono">50% OF POOL \u00b7 AT TODAY\u2019S BTC PRICE</i></div></div>' +
        '<div class="fppc"><span class="mono">WEEK 14 \u00b7 SECOND-HIGHEST SCORE</span><div class="fpph"><span class="ph2 pct mono">25%</span><div><b>Week 14 runner-up</b><i class="mono">DECIDED AFTER WEEK 14</i></div></div><div class="fppa"><b>' + money(pp * .25) + '</b><i class="mono">25% OF POOL \u00b7 AT TODAY\u2019S BTC PRICE</i></div></div>' +
      '</div>' +
      '<div class="fnote mono"><span>THE LOW SCORER IN EACH OF WEEKS 1\u201313 PAYS $' + PENALTY + '. THE POOL IS HELD IN BITCOIN, SO PAYOUTS MOVE WITH THE PRICE.</span><a href="' + D.href('rules') + '#a-league">BYLAWS \u2192</a></div></section>';

    // next year's auction budgets
    var NX = D.NEXT, FM = Array.isArray(F.future) ? F.future : (F.future = D.FUTURE_SEED.slice()), AU = (S.auto || []).filter(function(a){ return !FM.some(function(m){ return m.tx === a.tx; }); }), FT = D.futureCalc(FM.concat(AU));
    var auc = '<section class="card ffut"><div class="bar mono"><span>' + NX.year + ' AUCTION BUDGETS & ROOKIE PICKS</span><span>$' + NX.base + ' EACH \u00b7 MUST LAND $' + NX.min + '\u2013$' + NX.max + '</span></div>' +
      '<div class="ffg">' + D.IDS.slice().sort(function(a, b){ return FT[b].budget - FT[a].budget; }).map(function(id){ var x = FT[id], bad = x.budget > NX.max || x.budget < NX.min;
        return '<a class="ffr' + (bad ? ' bad' : '') + '" href="' + D.href('teams', 'f=' + id) + '"><img src="' + D.helm(id) + '" alt=""><b>' + esc(D.SHORT[id]) + '</b><span class="mono">' + (x.picks.length === 1 && x.picks[0] === id ? '1 PICK' : x.picks.length + ' PICK' + (x.picks.length === 1 ? '' : 'S')) + '</span><strong class="mono ' + (x.budget > NX.base ? 'up' : x.budget < NX.base ? 'dn' : '') + '">$' + x.budget + '</strong></a>'; }).join('') + '</div>' +
      (S.edit ? '<div class="ffe"><div class="ffeh mono">TRADED ' + NX.year + ' MONEY & PICKS \u00b7 COMMISH</div>' +
        FM.map(function(m, i){ return '<div class="ffl"><input class="fin" type="date" data-f="future.' + i + '.date" value="' + esc(m.date || '') + '"><select class="fin" data-f="future.' + i + '.from">' + opts(m.from) + '</select><span class="mono">SENDS</span><select class="fin" data-f="future.' + i + '.to">' + opts(m.to) + '</select><input class="fin" data-f="future.' + i + '.amt" inputmode="numeric" value="' + esc(m.amt || 0) + '" style="width:64px"><label class="mono"><input type="checkbox" data-fpick="' + i + '"' + (m.pick ? ' checked' : '') + '> + ROOKIE PICK</label><input class="fin" data-f="future.' + i + '.note" value="' + esc(m.note || '') + '" placeholder="Note"><button type="button" class="mono" data-fdel="' + i + '">\u00d7</button></div>'; }).join('') +
        '<button type="button" class="btn sm" data-fadd>+ ADD A TRADE</button></div>' : '') +
      (AU.length ? '<div class="ffau"><div class="ffeh mono">FROM TRADES MADE ON THE SITE \u00b7 TRACKED AUTOMATICALLY</div>' + AU.slice().reverse().map(function(a){ return '<div class="ffal"><span class="mono">' + esc(new Date(a.date + 'T12:00:00').toLocaleDateString('en-US', { month:'short', day:'numeric' }).toUpperCase()) + '</span><img src="' + D.helm(a.from) + '" alt=""><b>' + esc(D.SHORT[a.from]) + ' \u2192 ' + esc(D.SHORT[a.to]) + '</b><span class="mono">' + [a.amt ? '$' + a.amt : '', a.pick ? esc(D.SHORT[a.pick]).toUpperCase() + ' ROOKIE PICK' : ''].filter(Boolean).join(' + ') + '</span></div>'; }).join('') + '</div>' : '') +
      '<div class="fnote mono"><span>BUDGETS CAN GO PAST $' + NX.min + '\u2013$' + NX.max + ' DURING THE SEASON. THEY JUST HAVE TO BE BACK IN RANGE BY THE ' + NX.year + ' AUCTION.</span><a href="' + D.href('rules') + '#a-draft">BYLAWS \u2192</a></div></section>';

    // dues + expenses
    h += '<div class="duo fduo"><section class="card"><div class="bar mono"><span>DUES & LUXURY TAX</span><span>DUES $' + DUES + '</span></div>' +
      '<table class="ft"><thead><tr><th class="l mono">TEAM</th><th class="mono">DUES</th><th class="mono">LUXURY TAX</th></tr></thead><tbody>' +
      D.IDS.map(function(id){ var pd = !!F.dues[id];
        return '<tr><td class="l">' + team(id) + '</td><td><button type="button" class="fpd mono' + (pd ? ' on' : '') + '"' + (S.edit ? ' data-due="' + id + '"' : ' disabled') + '>' + (pd ? 'PAID' : 'OWES') + '</button></td><td>' + inp('luxTax.' + id, F.luxTax[id] || '', { num:1, ph:'0', cls:'r sm', show:num(F.luxTax[id]) ? money0(F.luxTax[id]) : '\u2014' }) + '</td></tr>';
      }).join('') + '</tbody><tfoot><tr><td class="l mono">TOTALS</td><td class="amt">' + money0(c.duesTotal) + '</td><td class="amt">' + money0(c.luxSum) + '</td></tr></tfoot></table></section>';

    h += '<section class="card"><div class="bar mono"><span>SHARED EXPENSES</span>' + (S.edit ? '<button type="button" class="fadd mono" data-addx>+ ADD</button>' : '<span>' + F.expenses.length + ' LOGGED</span>') + '</div>' +
      '<table class="ft"><thead><tr><th class="l mono">ITEM</th><th class="mono">AMOUNT</th>' + (S.edit ? '<th></th>' : '') + '</tr></thead><tbody>' +
      (F.expenses.map(function(x, i){ return '<tr><td class="l">' + inp('expenses.' + i + '.label', x.label, { cls:'nm', ph:'What was it?' }) + '</td><td>' + inp('expenses.' + i + '.amount', x.amount, { num:1, ph:'0', cls:'r sm', show:money(x.amount) }) + '</td>' + (S.edit ? '<td><button type="button" class="fx" data-rmx="' + i + '" aria-label="Remove">\u00d7</button></td>' : '') + '</tr>'; }).join('') || '<tr><td colspan="3" class="ld mono">NO SHARED EXPENSES LOGGED</td></tr>') +
      '</tbody><tfoot><tr><td class="l mono">TOTAL</td><td class="amt dn">\u2212' + money(c.expTotal) + '</td>' + (S.edit ? '<td></td>' : '') + '</tr></tfoot></table></section></div>';

    $('ftabs').innerHTML = '<a href="#season" class="' + (S.tab === 'season' ? 'on' : '') + '">' + D.Y + ' SEASON</a><a href="#auction" class="' + (S.tab === 'auction' ? 'on' : '') + '">' + NX.year + ' AUCTION</a>';
    $('fin').innerHTML = S.tab === 'auction' ? auc : h;
    $('ffoot').innerHTML = S.edit ? 'COMMISH MODE \u2014 CHANGES SAVE AS YOU GO' : '';
  }

  // ---------- saving ----------
  var tSave = null;
  function save(){ clearTimeout(tSave); tSave = setTimeout(function(){ D.save('finance', S.F).then(function(r){ if(r && r.ok){ S.from = 'kv'; toast(r.demo ? 'SAVED IN THIS BROWSER (PREVIEW)' : 'SAVED'); soon(); } else toast((r && r.error) || 'COULDN\u2019T SAVE'); }); }, 300); }
  function setPath(path, v){ var k = path.split('.'), o = S.F; for(var i = 0; i < k.length - 1; i++){ o = o[k[i]] = o[k[i]] || {}; } o[k[k.length - 1]] = v; }
  function clean(v){ v = String(v).replace(/[^0-9.]/g, ''); var p = v.split('.'); return p.length > 2 ? p[0] + '.' + p.slice(1).join('') : v; }
  document.addEventListener('change', function(e){
    var t = e.target; if(!S.edit || !t.matches || !t.matches('[data-f]')) return;
    var path = t.getAttribute('data-f'), v = t.value;
    if(t.hasAttribute('inputmode')) v = clean(v);
    if(/\.fid$/.test(path)){ var i = +path.split('.')[1]; S.F.penalties[i].name = v ? D.NAME[v] : ''; }
    setPath(path, v);
    if(/^future\.\d+\.from$/.test(path)){ var fm = S.F.future[+path.split('.')[1]]; if(fm.pick) fm.pick = v; }
    if(t.tagName === 'SELECT') draw(); else soon(); save();
  });
  document.addEventListener('change', function(e){
    var c = e.target.closest && e.target.closest('[data-fpick]'); if(!c || !S.edit) return;
    var m = S.F.future[+c.getAttribute('data-fpick')]; m.pick = c.checked ? m.from : ''; draw(); save();
  });
  // redraw only once the commish leaves the inputs, so tabbing between fields isn't interrupted
  function soon(){ setTimeout(function(){ var a = document.activeElement; if(a && a.classList && a.classList.contains('fin')) return; draw(); }, 0); }
  window.addEventListener('hashchange', function(){ S.tab = location.hash === '#auction' ? 'auction' : 'season'; if(S.F) draw(); });
  document.addEventListener('focusout', function(e){ if(S.edit && e.target.classList && e.target.classList.contains('fin')) soon(); });
  document.addEventListener('click', function(e){
    if(e.target.closest('[data-rf]')){ prices(); return; }
    if(!S.edit) return;
    var ul = e.target.closest('[data-punl]'); if(ul){ S.unl = S.unl || {}; S.unl[+ul.getAttribute('data-punl')] = 1; draw(); return; }
    var d = e.target.closest('[data-due]'); if(d){ var id = d.getAttribute('data-due'); S.F.dues[id] = !S.F.dues[id]; draw(); save(); return; }
    if(e.target.closest('[data-addx]')){ S.F.expenses.push({ id:'ex' + Date.now(), label:'', amount:'' }); draw(); save(); var ins = document.querySelectorAll('[data-f$=".label"][data-f^="expenses"]'); if(ins.length) ins[ins.length - 1].focus(); return; }
    if(e.target.closest('[data-fadd]')){ S.F.future.push({ date:new Date().toISOString().slice(0, 10), from:'', to:'', amt:0, pick:'', note:'' }); draw(); save(); return; }
    var fd = e.target.closest('[data-fdel]'); if(fd){ if(!confirm('Remove this trade?')) return; S.F.future.splice(+fd.getAttribute('data-fdel'), 1); draw(); save(); return; }
    var r = e.target.closest('[data-rmx]'); if(r){ S.F.expenses.splice(+r.getAttribute('data-rmx'), 1); draw(); save(); return; }
  });
  function toast(m){ var t = $('toast'); t.textContent = m; t.hidden = false; clearTimeout(t._h); t._h = setTimeout(function(){ t.hidden = true; }, 2600); }

  // ---------- live prices ----------
  function j(u){ return fetch(u).then(function(r){ return r.ok ? r.json() : null; }).catch(function(){ return null; }); }
  function spot(p){ return j('https://api.coinbase.com/v2/prices/' + p + '/spot').then(function(d){ var v = parseFloat(d && d.data && d.data.amount); return v > 0 ? v : null; }); }
  function prices(){
    return Promise.all([spot('BTC-USD'), spot('ZEC-USD'), j('https://api.dexscreener.com/latest/dex/tokens/' + ZCAT)]).then(function(r){
      var px = { btc:r[0], zec:r[1], zcat:null }, best = null;
      ((r[2] && r[2].pairs) || []).forEach(function(p){ var l = (p.liquidity && p.liquidity.usd) || 0; if(!best || l > best.l) best = { l:l, v:parseFloat(p.priceUsd) }; });
      if(best && best.v > 0) px.zcat = best.v;
      if(!px.btc || !px.zec) return j('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,zcash&vs_currencies=usd').then(function(g){ if(g){ px.btc = px.btc || (g.bitcoin && g.bitcoin.usd); px.zec = px.zec || (g.zcash && g.zcash.usd); } return px; });
      return px;
    }).then(function(px){ Object.keys(px).forEach(function(k){ if(px[k] > 0) S.px[k] = px[k]; }); S.pxAt = Date.now(); if(S.F) soon(); });
  }

  var DEMO = { dues:{ 'Entertainment 720':1, 'Bloodfeast Islandmen':1, 'Breaking My Back':1, 'Diamond Dogs':1, 'Windy City Wet Bandits':1, 'Full Blown Trash':1, 'The Ligers':1, 'Prestige Worldwide':1, 'Viva La Resistance':1, 'Wad of Hell':1 }, luxTax:{ 'Bloodfeast Islandmen':50, 'Full Blown Trash':30, 'Prestige Worldwide':20 },
    btcQty:'0.029215448496', btcCost:'2260', zecQty:'0.25193138', zecCost:'282.50', zcatQty:'3211', zcatCost:'282.50', expenses:[{ label:'League trophy engraving', amount:65 }, { label:'Draft night food & venue', amount:180 }],
    penalties:Array.from({ length:13 }, function(_, i){ return { week:i + 1, name:i === 0 ? 'Wad of Hell' : i === 1 ? 'The Scallywags' : '', btc:i === 0 ? '0.00052' : i === 1 ? '0.00048' : '' }; }) };
  function legacy(){ return Promise.resolve(D.LOCAL ? DEMO : null); }

  Promise.all([D.shell('finances'), D.content('finance')]).then(function(r){
    S.edit = !!(r[0] && r[0].commish);
    if(r[1] && r[1].payouts){ S.F = r[1]; S.from = 'kv'; return; }
    return legacy().then(function(f){ S.F = convert(f); S.from = f ? 'legacy' : 'seed'; });
  }).then(function(){ var F = S.F; F.dues = F.dues || {}; F.luxTax = F.luxTax || {}; F.expenses = F.expenses || []; F.payouts = F.payouts || seed().payouts; F.penalties = F.penalties && F.penalties.length ? F.penalties : seed().penalties; draw(); });
  prices(); setInterval(prices, 60000);
  D.futureFromTrades().then(function(a){ S.auto = a; if(S.F) draw(); });
  D.api('liveScoring').then(function(j){ var w = Math.min(13, num(j && j.liveScoring && j.liveScoring.week)); if(!w) return []; return D.lowScores(w); }).then(function(L){
    var r = null; (L || []).forEach(function(x){ if(x.top && x.top.s > 0 && (!r || x.top.s > r.s)) r = { w:x.w, id:x.top.id, s:x.top.s }; });
    S.hi = r; if(S.F) draw();
  }).catch(function(){ S.hiErr = 1; if(S.F) draw(); });
})();
