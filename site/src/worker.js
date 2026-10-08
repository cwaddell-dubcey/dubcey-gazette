// dubcey.party — Cloudflare Worker: MFL data proxy, owner sign-in, and MFL write actions.
// Static pages in /public are served by the assets binding; this script only handles /api, /auth and /act.
const L = '18919', Y = '2026', HOST = 'https://www45.myfantasyleague.com', API = 'https://api.myfantasyleague.com';

// public league data: cached at the edge for N seconds
const PUB = { liveScoring:30, leagueStandings:300, schedule:900, league:3600, rosters:120, players:86400, playerScores:300, injuries:900, transactions:60, weeklyResults:600, nflByeWeeks:86400, nflSchedule:30, projectedScores:900, topAdds:900, topDrops:900, topStarters:900, topOwns:900, futureDraftPicks:3600, draftResults:3600, auctionResults:3600, freeAgents:300, salaryAdjustments:900, rules:86400, allRules:86400, calendar:3600, pointsAllowed:3600, playerRanks:3600, playerProfile:3600, appearance:86400, accounting:900, pool:900, playoffBrackets:600, playoffBracket:600, polls:120, siteNews:3600, survivorPool:900 };
// owner-specific data: needs sign-in, never cached
const PRIV = { myleagues:1, pendingWaivers:1, pendingTrades:1, myWatchList:1, tradeBait:1, assets:1, myDraftList:1, lineup:1 };
// write actions passed through to MFL with the owner's own login
const ACT = { lineup:1, fcfsWaiver:1, blindBidWaiverRequest:1, waiverRequest:1, tradeProposal:1, tradeResponse:1, tradeBait:1, myWatchList:1, myDraftList:1, draftResults:1, auctionResults:1, pollVote:1, keepers:1 };

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
const isCommish = (s, env) => !!(s && s.f && String(env.COMMISH || '').split(',').includes(s.f));
const CONTENT = { column:1, teams:1, calendar:1, bylaws:1 };
const txt = s => String(s || '').replace(/<br\s*\/?>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&#39;|&apos;/g, "'").replace(/&quot;/g, '"').replace(/\s+/g, ' ').trim();

// MFL's per-player weekly box ("detailed") page → short stat line, e.g. "245 PASS YDS · 2 PASS TD"
const SXA = [[/passing yards|pass(ing)? yds|^py$/i,'PASS YDS'],[/passing (td|touchdown)|pass td|^pt$/i,'PASS TD'],[/intercept(ion)?s? thrown|^in$|^int$/i,'INT'],
  [/rushing yards|rush(ing)? yds|^ry$/i,'RUSH YDS'],[/rushing (td|touchdown)|rush td|^rt$/i,'RUSH TD'],[/receptions?|^cc$|^rec$/i,'REC'],
  [/receiving yards|rec(eiving)? yds|^cy$/i,'REC YDS'],[/receiving (td|touchdown)|rec td|^ct$/i,'REC TD'],[/fumbles? lost|^fl$/i,'FUM'],
  [/field goals? made|^fg$/i,'FG'],[/extra points? made|^ep$/i,'XP'],[/sacks?|^sk$/i,'SACK'],[/defensive int|^if$/i,'INT'],[/two point|2pt|^p2|^r2|^c2/i,'2PT']];
function statLine(h) {
  const out = [], seen = {};
  for (const tr of h.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)) {
    const c = [...tr[1].matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)].map(x => txt(x[1])); if (c.length < 2) continue;
    const lab = c.filter(x => /[a-z]/i.test(x) && x.length < 40)[0]; if (!lab) continue;
    const nums = c.filter(x => /^-?\d+(\.\d+)?$/.test(x)), m = /\((-?\d+(?:\.\d+)?)\)/.exec(lab) || /^(-?\d+)\s/.exec(lab);
    const v = m ? m[1] : (nums.length > 1 ? nums[0] : (nums.length === 1 && !/\./.test(nums[0]) ? nums[0] : ''));
    if (!v || !parseFloat(v)) continue;
    const base = lab.replace(/\(.*?\)/g, '').replace(/^-?\d+\s/, '').trim();
    for (const [re, k] of SXA) if (re.test(base)) { if (!seen[k]) { seen[k] = 1; out.push(v + ' ' + k); } break; }
  }
  return out.slice(0, 4).join(' · ');
}
async function stats(env, ctx, w, ids, live, s) {
  const tok = (env.DC && await env.DC.get('svc')) || (s && s.t), out = {}, todo = ids.slice(0, 60);
  async function one(id) {
    const key = new Request(`https://stats.dubcey/${Y}/${w}/${id}`);
    const hit = await caches.default.match(key); if (hit) { out[id] = await hit.text(); return; }
    try {
      const r = await fetch(`${HOST}/${Y}/detailed?L=${L}&W=${w}&P=${id}&YEAR=${Y}`, { headers: tok ? { ...UA, Cookie: 'MFL_USER_ID=' + tok } : UA });
      if (!r.ok) return;
      const st = statLine(await r.text()); out[id] = st;
      if (st || !live) ctx.waitUntil(caches.default.put(key, new Response(st, { headers: { 'Cache-Control': 'public, max-age=' + (live ? 60 : 86400) } })));
    } catch (e) {}
  }
  for (let i = 0; i < todo.length; i += 6) await Promise.all(todo.slice(i, i + 6).map(one));
  return out;
}

// MFL's processed-waivers page (league members only) → plain rows, using the commissioner's saved login
async function waivers(env, s, run) {
  const tok = (env.DC && await env.DC.get('svc')) || (s && s.t);
  if (!tok) return { error: 'sign in' };
  const r = await fetch(`${HOST}/${Y}/processed_waivers?L=${L}${run ? '&RUN=' + encodeURIComponent(run) : ''}`, { headers: { ...UA, Cookie: 'MFL_USER_ID=' + tok } });
  const h = await r.text();
  const runs = [], sel = /<select[^>]*>([\s\S]*?)<\/select>/i.exec(h);
  if (sel) for (const m of sel[1].matchAll(/<option[^>]*value="([^"]*)"([^>]*)>([\s\S]*?)<\/option>/gi)) runs.push({ v: m[1], t: txt(m[3]), on: /selected/i.test(m[2]) });
  const tables = [...h.matchAll(/<table[^>]*>([\s\S]*?)<\/table>/gi)].map(m => m[1]).filter(t => /original\s+waiver\s+request/i.test(t) && !/<table/i.test(t));
  const rows = [];
  if (tables[0]) {
    const trs = [...tables[0].matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)].map(m => [...m[1].matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)].map(c => c[1]));
    const hi = trs.findIndex(c => /original\s+waiver\s+request/i.test(c.map(txt).join(' ')));
    const heads = (trs[hi] || []).map(c => txt(c).toLowerCase());
    trs.slice(hi + 1).filter(c => c.length >= 4).forEach(c => {
      const fid = (/(?:FRANCHISE_ID|FRANCHISE|F)=(\d{4})/.exec(c[0]) || [])[1] || '';
      rows.push({ f: fid, fn: txt(c[0]), cells: c.map(txt) });
    });
    return { heads, rows, runs };
  }
  return { heads: [], rows: [], runs };
}

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
      if (env.DC && String(env.COMMISH || '').split(',').includes(fid)) ctx.waitUntil(env.DC.put('svc', tok));
      const v = encodeURIComponent(btoa(JSON.stringify({ t: tok, f: fid, u: String(b.username).slice(0, 60) })));
      return json({ ok: true, franchise: fid }, 200, { 'Set-Cookie': cookie(v, 60 * 60 * 24 * 90) });
    }
    if (p === '/auth/me') { const s = session(req); return json(s ? { user: s.u, franchise: s.f, commish: isCommish(s, env) } : {}); }
    if (p === '/auth/logout') return json({ ok: true }, 200, { 'Set-Cookie': cookie('', 0) });

    // ---- site content edited by the commissioner (Dispatch, team names, calendar, by-laws, helmets) ----
    if (p.startsWith('/content/')) {
      const key = p.slice(9);
      if (key.startsWith('img/')) {
        const id = key.slice(4).replace(/\D/g, '').slice(0, 4);
        if (req.method === 'PUT') {
          const s = session(req); if (!isCommish(s, env) || !sameOrigin(req, u)) return json({ ok: false, error: 'Commissioner only.' }, 403);
          if (!env.DC) return json({ ok: false, error: 'Storage not set up yet.' }, 500);
          const buf = await req.arrayBuffer(); if (buf.byteLength > 2e6) return json({ ok: false, error: 'Image too big.' }, 400);
          await env.DC.put('img:' + id, buf, { metadata: { type: req.headers.get('Content-Type') || 'image/webp' } });
          return json({ ok: true, v: Date.now() });
        }
        const o = env.DC && await env.DC.getWithMetadata('img:' + id, 'arrayBuffer');
        if (!o || !o.value) return new Response('', { status: 404 });
        return new Response(o.value, { headers: { 'Content-Type': (o.metadata && o.metadata.type) || 'image/webp', 'Cache-Control': 'public, max-age=300' } });
      }
      if (!CONTENT[key]) return json({ error: 'unknown' }, 404);
      if (req.method === 'PUT') {
        const s = session(req); if (!isCommish(s, env) || !sameOrigin(req, u)) return json({ ok: false, error: 'Commissioner only.' }, 403);
        if (!env.DC) return json({ ok: false, error: 'Storage not set up yet.' }, 500);
        const t = await req.text(); try { JSON.parse(t); } catch (e) { return json({ ok: false, error: 'Bad data.' }, 400); }
        await env.DC.put('c:' + key, t);
        return json({ ok: true });
      }
      const v = env.DC && await env.DC.get('c:' + key);
      return new Response(v || 'null', { headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
    }
    if (p === '/data/stats') {
      const wk = (u.searchParams.get('W') || '').replace(/\D/g, ''), ids = (u.searchParams.get('P') || '').split(',').filter(x => /^\d+$/.test(x));
      if (!wk || !ids.length) return json({});
      return json(await stats(env, ctx, wk, ids, u.searchParams.get('live') === '1', session(req)));
    }
    if (p === '/data/peek') {
      const s = session(req), id = (u.searchParams.get('P') || '').replace(/\D/g, ''), wk = (u.searchParams.get('W') || '').replace(/\D/g, '');
      const tok = (env.DC && await env.DC.get('svc')) || (s && s.t);
      const r1 = await fetch(`${API}/${Y}/export?TYPE=nflSchedule&W=${wk}&JSON=1`, { headers: UA }).then(x => x.text()).catch(e => 'ERR ' + e);
      const r2 = id ? await fetch(`${HOST}/${Y}/detailed?L=${L}&W=${wk}&P=${id}&YEAR=${Y}`, { headers: tok ? { ...UA, Cookie: 'MFL_USER_ID=' + tok } : UA }).then(async x => x.status + ' ' + (await x.text())).catch(e => 'ERR ' + e) : '';
      return json({ signedIn: !!s, nflSchedule: r1.slice(0, 1500), detailed: r2 ? r2.slice(0, 200) + ' … ' + statLine(r2) : '' });
    }
    if (p === '/data/waivers') {
      const key = new Request(u.origin + '/data/waivers?run=' + (u.searchParams.get('run') || ''));
      let res = await caches.default.match(key);
      if (!res) { const d = await waivers(env, session(req), u.searchParams.get('run') || ''); res = json(d, d.error ? 401 : 200, d.error ? {} : { 'Cache-Control': 'public, max-age=600' }); if (!d.error) ctx.waitUntil(caches.default.put(key, res.clone())); }
      return res;
    }

    // ---- read league data ----
    if (p.startsWith('/api/')) {
      const type = p.slice(5), s = session(req);
      if (!PUB[type] && !PRIV[type]) return json({ error: 'unknown' }, 404);
      if (PRIV[type] && !s) return json({ error: 'sign in' }, 401);
      const q = new URLSearchParams(u.search);
      ['TYPE', 'L', 'JSON', 'APIKEY'].forEach(k => q.delete(k));
      const extra = q.toString();
      // NFL-wide data lives on MFL's API host and must not carry the league id
      const NFLWIDE = { nflSchedule:1, nflByeWeeks:1, playerProfile:1, allRules:1, topAdds:1, topDrops:1, topStarters:1, topOwns:1 };
      const target = NFLWIDE[type] ? `${API}/${Y}/export?TYPE=${type}&JSON=1${extra ? '&' + extra : ''}` : `${HOST}/${Y}/export?TYPE=${type}&L=${L}&JSON=1${extra ? '&' + extra : ''}`;
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
      if (b.FRANCHISE_ID && b.FRANCHISE_ID !== s.f && !isCommish(s, env)) return json({ ok: false, error: 'Commissioner only.' }, 403);
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
