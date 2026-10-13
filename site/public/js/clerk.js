(function(){
  var D = DC, $ = D.$, esc = D.esc, arr = D.arr;
  var COLORS = ['#FFE873', '#FFB8CB', '#B4EBC9', '#A9D8F5', '#FFCB8A'];
  var TILT = ['-2.2deg', '1.6deg', '-1deg', '2.4deg', '-1.8deg', '0.9deg'];
  var SEED = { notes:[
    { id:'pen27', title:'2027 Penalty Shots', color:'#FFE873', items:[
      { f:'0004', t:'10/8, Brad - Rostered Tyreek Hill who punched pregnant wife in her belly multiple times' },
      { f:'0011', t:'10/8, Alex - Rostering Drake Maye who doesn\u2019t believe we landed on the moon.' },
      { f:'0009', t:'10/13, Viva - 5 players scored 19 points yet they still beat NOYD. Scumbag (Jeff\u2019s words, not mine) Drew attempted to cheat with his line-up.' } ] },
    { id:'draft27', title:'Bring to the 2027 Draft', color:'#A9D8F5', items:[
      { f:'0001', t:'Draft board + stickers' }, { f:'0002', t:'Speaker & the playlist' }, { f:'0003', t:'Two dozen bagels' },
      { f:'0004', t:'Cooler, full of ice' }, { f:'0005', t:'The trophy (polished)' }, { f:'0006', t:'Four folding chairs' },
      { f:'0007', t:'Breakfast pizza' }, { f:'0008', t:'Extension cords' }, { f:'0009', t:'The penalty shot bottle' },
      { f:'0010', t:'Plates, cups, napkins' }, { f:'0011', t:'Sharpies (the good ones)' }, { f:'0012', t:'Dues. In cash.' } ] }
  ] };
  var S = { data:null, edit:false, may:false };
  function toast(m, bad){ var t = $('toast'); t.textContent = m; t.className = 'toast mono' + (bad ? ' bad' : ''); t.hidden = false; clearTimeout(t._h); t._h = setTimeout(function(){ t.hidden = true; }, 4200); }
  function stamp(n){ return n.at ? 'UPDATED ' + new Date(n.at).toLocaleDateString('en-US', { month:'numeric', day:'numeric' }) : ''; }

  function view(n, i){
    return '<article class="ckn" style="background:' + esc(n.color || COLORS[0]) + ';--r:' + TILT[i % TILT.length] + '"><h2>' + esc(n.title || 'Untitled') + '</h2><ul>' +
      arr(n.items).map(function(it){ return '<li>' + (it.f ? '<img src="' + D.helm(it.f) + '" alt="' + esc(D.SHORT[it.f] || '') + '" title="' + esc(D.NAME[it.f] || '') + '">' : '<span class="dash">\u2013</span>') + '<span>' + esc(it.t) + '</span></li>'; }).join('') +
      '</ul>' + (stamp(n) ? '<div class="ckt">' + stamp(n) + '</div>' : '') + '</article>';
  }
  function teamSel(v){ return '<select name="f"><option value="">\u2013 NONE</option>' + D.IDS.map(function(id){ return '<option value="' + id + '"' + (id === v ? ' selected' : '') + '>' + esc((D.SHORT[id] || D.NAME[id]).toUpperCase()) + '</option>'; }).join('') + '</select>'; }
  function edit(n, i){
    return '<article class="ckn" data-n="' + i + '" style="background:' + esc(n.color || COLORS[0]) + '"><input class="ckh" name="title" value="' + esc(n.title) + '" placeholder="NOTE TITLE"><div style="display:grid;gap:8px">' +
      arr(n.items).map(function(it, j){ return '<div class="cke" data-j="' + j + '">' + teamSel(it.f) + '<textarea name="t" rows="' + Math.max(1, Math.ceil((it.t || '').length / 28)) + '">' + esc(it.t) + '</textarea><button type="button" class="x" data-rmi="' + j + '" aria-label="Remove line">\u00d7</button></div>'; }).join('') +
      '</div><div class="ckf"><button type="button" data-addi>+ LINE</button><span class="ckc">' + COLORS.map(function(c){ return '<button type="button" data-col="' + c + '" class="' + (c === n.color ? 'on' : '') + '" style="background:' + c + '" aria-label="Note color"></button>'; }).join('') + '</span><button type="button" data-rmn>TOSS NOTE</button></div></article>';
  }
  function read(){
    if(!S.edit) return;
    [].forEach.call(document.querySelectorAll('.ckn[data-n]'), function(el){
      var n = S.data.notes[+el.getAttribute('data-n')], before = JSON.stringify([n.title, n.items]);
      n.title = el.querySelector('[name=title]').value.trim();
      n.items = [].map.call(el.querySelectorAll('.cke'), function(r){ return { f:r.querySelector('[name=f]').value, t:r.querySelector('[name=t]').value.trim() }; });
      if(JSON.stringify([n.title, n.items]) !== before) n.at = Date.now();
    });
  }
  function draw(){
    var N = arr(S.data.notes);
    $('ckbar').innerHTML = !S.may ? '' : S.edit
      ? '<button class="btn ghost2" type="button" id="ckadd">+ NEW NOTE</button><button class="btn ghost2" type="button" id="ckcancel">CANCEL</button><button class="btn" type="button" id="cksave">SAVE NOTES</button>'
      : '<button class="btn" type="button" id="ckedit">EDIT NOTES</button>';
    $('desk').innerHTML = N.length ? N.map(S.edit ? edit : view).join('') : '<div class="ckempty">The desk is clear.</div>';
  }

  Promise.all([D.shell('clerk'), D.content('clerk')]).then(function(r){
    var me = r[0] || {}; S.may = !!me.clerk;
    S.data = r[1] && r[1].notes ? r[1] : JSON.parse(JSON.stringify(SEED));
    draw();
  });

  document.addEventListener('click', function(e){
    var t = e.target;
    if(t.id === 'ckedit'){ S.backup = JSON.stringify(S.data); S.edit = true; draw(); return; }
    if(t.id === 'ckcancel'){ S.data = JSON.parse(S.backup); S.edit = false; draw(); return; }
    if(t.id === 'ckadd'){ read(); S.data.notes.unshift({ id:'n' + Date.now().toString(36), title:'', color:COLORS[S.data.notes.length % COLORS.length], items:[{ f:'', t:'' }], at:Date.now() }); draw(); var h = document.querySelector('.ckn .ckh'); if(h) h.focus(); return; }
    if(t.id === 'cksave'){
      read(); S.data.notes.forEach(function(n){ n.items = n.items.filter(function(it){ return it.t; }); });
      t.disabled = true;
      D.save('clerk', S.data).then(function(r){ t.disabled = false; if(r && r.ok){ S.edit = false; draw(); toast(r.demo ? 'SAVED IN THIS BROWSER (PREVIEW)' : 'NOTES SAVED'); } else toast((r && r.error) || 'COULDN\u2019T SAVE', true); });
      return;
    }
    var card = t.closest && t.closest('.ckn[data-n]'); if(!card) return;
    var n = S.data.notes[+card.getAttribute('data-n')];
    if(t.hasAttribute('data-addi')){ read(); n.items.push({ f:'', t:'' }); draw(); var rows = document.querySelectorAll('.ckn[data-n="' + card.getAttribute('data-n') + '"] textarea'); if(rows.length) rows[rows.length - 1].focus(); return; }
    if(t.hasAttribute('data-rmi')){ read(); n.items.splice(+t.getAttribute('data-rmi'), 1); n.at = Date.now(); draw(); return; }
    if(t.hasAttribute('data-col')){ read(); n.color = t.getAttribute('data-col'); draw(); return; }
    if(t.hasAttribute('data-rmn')){ if(!confirm('Toss this note?')) return; read(); S.data.notes.splice(S.data.notes.indexOf(n), 1); draw(); }
  });
})();
