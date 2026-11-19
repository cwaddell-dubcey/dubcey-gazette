/* The Vault: the original dubcey.com Flash intro, played with Ruffle (self-hosted in /vault/ruffle) */
(function(){
  var D = DC; D.shell('vault');
  var stage = document.getElementById('vltstage'), post = document.getElementById('vltplay'), end = document.getElementById('vltend'), ld = document.getElementById('vltld'), pl = null;
  window.RufflePlayer = window.RufflePlayer || {};
  window.RufflePlayer.config = { publicPath: '/vault/ruffle/', polyfills: false, autoplay: 'on', unmuteOverlay: 'hidden', splashScreen: false, letterbox: 'on',
    backgroundColor: '#184C88', quality: 'high', openUrlMode: 'allow', allowScriptAccess: true, contextMenu: 'rightClickOnly', warnOnUnsupportedContent: false, showSwfDownload: false };
  function stop(){ if (pl) { try { pl.remove(); } catch(e){} pl = null; } }
  function play(){
    stop(); end.hidden = true; post.hidden = true; ld.textContent = 'LOADING…';
    var R = window.RufflePlayer.newest && window.RufflePlayer.newest();
    if (!R) { ld.textContent = ''; post.hidden = false; post.querySelector('.vltnote').textContent = 'THE FLASH PLAYER DID NOT LOAD — TRY A REFRESH'; return; }
    pl = R.createPlayer(); pl.className = 'vltpl'; stage.appendChild(pl);
    pl.addEventListener('loadedmetadata', function(){ ld.textContent = ''; });
    pl.ruffle().load({ url: '/vault/dubcey.swf', allowNetworking: 'all' }).catch(function(){ ld.textContent = ''; stop(); post.hidden = false; post.querySelector('.vltnote').textContent = 'COULD NOT LOAD THE MOVIE — TRY A REFRESH'; });
  }
  // the movie's last frame used to send you to dubcey.com/home.html; it now asks for "#vault-end", which shows the end card here
  function done(){ setTimeout(function(){ stop(); end.hidden = false; }, 400); }
  var wo = window.open;
  window.open = function(u){ if (/#vault-end$/.test(String(u || ''))) { done(); return null; } return wo.apply(window, arguments); };
  post.addEventListener('click', play);
  document.getElementById('vltagain').addEventListener('click', play);
})();
