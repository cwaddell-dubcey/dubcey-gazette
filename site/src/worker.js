// dubcey.party — Cloudflare Worker: MFL data proxy, owner sign-in, and MFL write actions.
// Static pages in /public are served by the assets binding; this script only handles /api, /auth and /act.
const L = '18919', Y = '2026', HOST = 'https://www45.myfantasyleague.com', API = 'https://api.myfantasyleague.com';

// public league data: cached at the edge for N seconds
const PUB = { liveScoring:30, leagueStandings:300, schedule:900, league:3600, rosters:120, players:86400, playerScores:300, injuries:900, transactions:60, weeklyResults:600, nflByeWeeks:86400, nflSchedule:600, projectedScores:900, topAdds:900, topDrops:900, topStarters:900, topOwns:900, futureDraftPicks:3600, draftResults:3600, auctionResults:3600, freeAgents:300, salaryAdjustments:900, rules:86400, calendar:3600, pointsAllowed:3600, playerRanks:3600, playerProfile:3600, appearance:86400, accounting:900, pool:900, playoffBrackets:600, playoffBracket:600, messageBoard:60, messageBoardThread:60, polls:120, siteNews:3600, survivorPool:900 };
// owner-specific data: needs sign-in, never cached
const PRIV = { myleagues:1, pendingWaivers:1, pendingTrades:1, myWatchList:1, tradeBait:1, assets:1, myDraftList:1, lineup:1 };
// write actions passed through to MFL with the owner's own login
const ACT = { lineup:1, fcfsWaiver:1, blindBidWaiverRequest:1, waiverRequest:1, tradeProposal:1, tradeResponse:1, tradeBait:1, myWatchList:1, myDraftList:1, draftResults:1, auctionResults:1, messageBoard:1, pollVote:1, keepers:1 };

const arr = x => x == null ? [] : Array.isArray(x) ? x : [x];
const json = (o, s = 200, h = {}) => new Response(JSON.stringify(o), { status: s, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...h } });
const UA = { 'User-Agent': 'dubcey.party' };

function session(req) {
  const m = /(?:^|;\s*)dc_s=([^;]+)/.exec(req.headers.get('Cookie') || '');
  if (!m) return null;
  try { return JSON.parse(atob(decodeURIComponent(m[1]))); } catch (e) { return null; }
}
const cookie = (v, age) => `dc_s=${v}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${age}`;
const sameOrigin = (req, u) => { const o = req.headers.get('Origin'); return !o || o === u.origin; };

export default {
  async fetch(req, env, ctx) {
    const u = new URL(req.url), p = u.pathname;

    // ---- sign in with MFL credentials (password is sent to MFL once and never stored) ----
    if (p === '/auth/login' && req.method === 'POST') {
      if (!sameOrigin(req, u)) return json({ ok: false }, 403);
      const b = await req.json().catch(() => ({}));
      if (!b.username || !b.password) return json({ ok: false, error: 'Enter your MFL username and password.' }, 400);
      const qs = `USERNAME=${encodeURIComponent(b.username.trim())}&PASSWORD=${encodeURIComponent(b.password)}&XML=1`;
      let tok = '', why = '';
      for (const base of [API, HOST]) {
        for (const method of ['POST', 'GET']) {
          try {
            const r = await fetch(method === 'GET' ? `${base}/${Y}/login?${qs}` : `${base}/${Y}/login`, method === 'GET' ? { headers: UA, redirect: 'manual' } : { method, headers: { ...UA, 'Content-Type': 'application/x-www-form-urlencoded' }, body: qs, redirect: 'manual' });
            const t = await r.text();
            const sc = r.headers.get('Set-Cookie') || '';
            const m = /cookie_value="([^"]+)"/i.exec(t) || /MFL_USER_ID="([^"]+)"/i.exec(t) || /MFL_USER_ID=([^;,\s]+)/.exec(sc);
            if (m) { tok = m[1]; break; }
            why = (/<error[^>]*>([\s\S]*?)<\/error>/i.exec(t) || [])[1] || t.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 160) || ('HTTP ' + r.status);
          } catch (e) { why = String(e && e.message || e); }
        }
        if (tok) break;
      }
      if (!tok) return json({ ok: false, error: 'MFL said: ' + (why || 'no response') }, 401);
      let fid = '';
      try {
        const ml = await fetch(`${API}/${Y}/export?TYPE=myleagues&YEAR=${Y}&JSON=1`, { headers: { ...UA, Cookie: 'MFL_USER_ID=' + tok } }).then(x => x.json());
        const lg = arr(ml.leagues && ml.leagues.league).find(x => String(x.league_id) === L);
        fid = (lg && lg.franchise_id) || '';
      } catch (e) {}
      const v = encodeURIComponent(btoa(JSON.stringify({ t: tok, f: fid, u: String(b.username).slice(0, 60) })));
      return json({ ok: true, franchise: fid }, 200, { 'Set-Cookie': cookie(v, 60 * 60 * 24 * 90) });
    }
    if (p === '/auth/me') { const s = session(req); return json(s ? { user: s.u, franchise: s.f } : {}); }
    if (p === '/auth/logout') return json({ ok: true }, 200, { 'Set-Cookie': cookie('', 0) });

    // ---- read league data ----
    if (p.startsWith('/api/')) {
      const type = p.slice(5), s = session(req);
      if (!PUB[type] && !PRIV[type]) return json({ error: 'unknown' }, 404);
      if (PRIV[type] && !s) return json({ error: 'sign in' }, 401);
      const q = new URLSearchParams(u.search);
      ['TYPE', 'L', 'JSON', 'APIKEY'].forEach(k => q.delete(k));
      const extra = q.toString();
      const target = `${HOST}/${Y}/export?TYPE=${type}&L=${L}&JSON=1${extra ? '&' + extra : ''}`;
      if (PRIV[type]) {
        const r = await fetch(target, { headers: { ...UA, Cookie: 'MFL_USER_ID=' + s.t } });
        return new Response(r.body, { status: r.status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
      }
      const cache = caches.default, key = new Request(target);
      let res = await cache.match(key);
      if (!res) {
        const m = await fetch(target, { headers: UA });
        res = new Response(m.body, m);
        res.headers.set('Cache-Control', 'public, max-age=' + PUB[type]);
        if (m.ok) ctx.waitUntil(cache.put(key, res.clone()));
      }
      return res;
    }

    // ---- write actions: lineups, waivers, trades, etc. ----
    if (p.startsWith('/act/') && req.method === 'POST') {
      const type = p.slice(5), s = session(req);
      if (!ACT[type]) return json({ ok: false, error: 'unknown action' }, 404);
      if (!s) return json({ ok: false, error: 'Sign in first.' }, 401);
      if (!sameOrigin(req, u)) return json({ ok: false }, 403);
      const b = await req.json().catch(() => ({}));
      const q = new URLSearchParams();
      Object.keys(b).forEach(k => { if (!/^(TYPE|L|JSON|APIKEY)$/i.test(k)) q.set(k, String(b[k])); });
      const r = await fetch(`${HOST}/${Y}/import?TYPE=${type}&L=${L}`, { method: 'POST', headers: { ...UA, Cookie: 'MFL_USER_ID=' + s.t, 'Content-Type': 'application/x-www-form-urlencoded' }, body: q.toString() });
      const t = await r.text();
      const ok = /<status>\s*OK\s*<\/status>/i.test(t) || /"status"\s*:\s*"OK"/i.test(t);
      const err = (/<error[^>]*>([\s\S]*?)<\/error>/i.exec(t) || [])[1];
      return json({ ok, error: ok ? '' : (err || t.replace(/<[^>]+>/g, ' ').trim().slice(0, 200) || 'MFL rejected the request.') }, ok ? 200 : 400);
    }

    return env.ASSETS.fetch(req);
  }
};
