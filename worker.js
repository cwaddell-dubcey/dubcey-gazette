// dubcey.party — Cloudflare Worker: MFL data proxy, owner sign-in, and MFL write actions.
// Static pages in /public are served by the assets binding; this script only handles /api, /auth and /act.
const L = '18919', Y = '2026', HOST = 'https://www45.myfantasyleague.com', API = 'https://api.myfantasyleague.com';

// public league data: cached at the edge for N seconds
const PUB = { salaries:300, liveScoring:12, leagueStandings:300, schedule:900, league:3600, rosters:120, players:86400, playerScores:60, injuries:900, transactions:60, weeklyResults:600, nflByeWeeks:86400, nflSchedule:20, projectedScores:900, topAdds:900, topDrops:900, topStarters:900, topOwns:900, futureDraftPicks:3600, draftResults:3600, auctionResults:3600, freeAgents:300, salaryAdjustments:900, rules:86400, allRules:86400, calendar:3600, pointsAllowed:3600, playerRanks:3600, playerProfile:3600, appearance:86400, accounting:900, pool:900, playoffBrackets:600, playoffBracket:600, polls:120, siteNews:3600, survivorPool:900 };
// owner-specific data: needs sign-in, never cached
const PRIV = { myleagues:1, pendingWaivers:1, pendingTrades:1, myWatchList:1, tradeBait:1, assets:1, myDraftList:1, lineup:1 };
// write actions passed through to MFL with the owner's own login
const ACT = { lineup:1, fcfsWaiver:1, blindBidWaiverRequest:1, waiverRequest:1, tradeProposal:1, tradeResponse:1, tradeBait:1, myWatchList:1, myDraftList:1, draftResults:1, auctionResults:1, pollVote:1, keepers:1 };

const arr = x => x == null ? [] : Array.isArray(x) ? x : [x];
const json = (o, s = 200, h = {}) => new Response(JSON.stringify(o), { status: s, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...h } });
const UA = { 'User-Agent': 'dubcey.party' };

// session cookie = base64(JSON) + "." + HMAC signature; the key is generated once and kept in KV
let HK = null;
async function hkey(env) {
  if (HK) return HK;
  let k = env.SESSION_SECRET || (env.DC && await env.DC.get('sk'));
  if (!k) { k = [...crypto.getRandomValues(new Uint8Array(32))].map(b => b.toString(16).padStart(2, '0')).join(''); if (env.DC) await env.DC.put('sk', k); }
  HK = await crypto.subtle.importKey('raw', new TextEncoder().encode(k), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
  return HK;
}
const b64u = buf => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
async function signV(env, v) { return v + '.' + b64u(await crypto.subtle.sign('HMAC', await hkey(env), new TextEncoder().encode(v))); }
async function session(req, env) {
  const m = /(?:^|;\s*)dc_s=([^;]+)/.exec(req.headers.get('Cookie') || '');
  if (!m) return null;
  const raw = decodeURIComponent(m[1]), i = raw.lastIndexOf('.');
  if (i < 1) return null;
  const v = raw.slice(0, i);
  if ((await signV(env, v)) !== raw) return null;
  try { return JSON.parse(atob(v)); } catch (e) { return null; }
}
const cookie = (v, age) => `dc_s=${v}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${age}`;
const sameOrigin = (req, u) => { const o = req.headers.get('Origin'); return !o || o === u.origin; };
const isCommish = (s, env) => !!(s && s.f && String(env.COMMISH || '').split(',').includes(s.f));
const isClerk = (s, env) => !!(s && s.f && (String(env.CLERK || '').split(',').includes(s.f) || isCommish(s, env)));
const CONTENT = { clerk:1, column:1, teams:1, calendar:1, bylaws:1, popups:1, finance:1 };
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

// Box-score stat lines from ESPN's public NFL feed, one call per week → { "lamar jackson|BAL": "274 PASS YDS · 3 PASS TD" }
const ESPN = 'https://site.api.espn.com/apis/site/v2/sports/football/nfl';
async function cachedJSON(ctx, url, ttl) {
  const key = new Request(url), hit = await caches.default.match(key);
  if (hit) return hit.json();
  const r = await fetch(url, { headers: UA }); if (!r.ok) throw new Error('HTTP ' + r.status);
  const t = await r.text();
  ctx.waitUntil(caches.default.put(key, new Response(t, { headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=' + ttl } })));
  return JSON.parse(t);
}
function nkey(n) { return String(n || '').toLowerCase().replace(/[.'’]/g, '').replace(/\s+(jr|sr|ii|iii|iv|v)$/, '').replace(/[^a-z ]/g, '').replace(/\s+/g, ' ').trim(); }
async function espnWeek(ctx, w, raw) {
  const sb = await cachedJSON(ctx, `${ESPN}/scoreboard?dates=${Y}&seasontype=2&week=${w}`, 20);
  const out = {};
  await Promise.all((sb.events || []).map(async ev => {
    const st = ev.competitions && ev.competitions[0] && ev.competitions[0].status && ev.competitions[0].status.type || {};
    if (st.state === 'pre') return;
    let s; try { s = await cachedJSON(ctx, `${ESPN}/summary?event=${ev.id}`, st.completed ? 86400 : 20); } catch (e) { return; }
    const P = {};
    ((s.boxscore && s.boxscore.players) || []).forEach(tm => {
      const ab = tm.team && tm.team.abbreviation;
      (tm.statistics || []).forEach(cat => {
        const L = (cat.labels || []).map(x => String(x).toUpperCase());
        (cat.athletes || []).forEach(a => {
          const nm = a.athlete && a.athlete.displayName; if (!nm) return;
          const k = nkey(nm) + '|' + ab, o = P[k] = P[k] || {}, v = lab => { const i = L.indexOf(lab); return i > -1 ? a.stats[i] : ''; };
          if (cat.name === 'passing') { o.py = v('YDS'); o.pt = v('TD'); o.int = v('INT'); o.ca = v('C/ATT'); }
          if (cat.name === 'rushing') { o.ry = v('YDS'); o.rt = v('TD'); o.car = v('CAR'); }
          if (cat.name === 'receiving') { o.rec = v('REC'); o.cy = v('YDS'); o.ct = v('TD'); o.tgt = v('TGTS'); }
          if (cat.name === 'fumbles') { o.fl = v('LOST'); }
          if (cat.name === 'kicking') { o.fg = v('FG'); o.xp = v('XP'); }
        });
      });
    });
    if (raw) { Object.keys(P).forEach(k => { const o = P[k], n = x => +String(x || '0').split('/')[0] || 0, ca = String(o.ca || '').split('/'); out[k] = { cmp: +ca[0] || 0, att: +ca[1] || 0, py: n(o.py), pt: n(o.pt), int: n(o.int), car: n(o.car), ry: n(o.ry), rt: n(o.rt), tgt: n(o.tgt), rec: n(o.rec), cy: n(o.cy), ct: n(o.ct) }; }); return; }
    Object.keys(P).forEach(k => {
      const o = P[k], n = x => +String(x || '0').split('/')[0] || 0, s2 = [];
      if (n(o.py)) s2.push(o.py + ' PASS YDS'); if (n(o.pt)) s2.push(o.pt + ' PASS TD'); if (n(o.int)) s2.push(o.int + ' INT');
      if (n(o.ry)) s2.push(o.ry + ' RUSH YDS'); if (n(o.rt)) s2.push(o.rt + ' RUSH TD');
      if (n(o.rec)) s2.push(o.rec + ' REC'); if (n(o.cy)) s2.push(o.cy + ' REC YDS'); if (n(o.ct)) s2.push(o.ct + ' REC TD');
      if (o.fg) s2.push('FG ' + o.fg); if (o.xp && !o.fg) s2.push('XP ' + o.xp); if (n(o.fl)) s2.push(o.fl + ' FUM');
      out[k] = s2.slice(0, 4).join(' · ') || 'NO STATS';
    });
  }));
  return out;
}

// Player card: MFL's own player page, news and projections, fetched server-side with a member login (MFL blocks browsers from other sites)
const MFLP = { page: id => `player?L=${L}&P=${id}`, news: id => `news_articles?L=${L}&PLAYERS=${id}&DAYS=30`, proj: id => `player?L=${L}&P=${id}&YEAR=${Y}&DISPLAY_TYPE=projections&PROJSRC=mfl` };
async function mflPage(env, ctx, s, kind, id) {
  const key = new Request(`https://mflp.dubcey/${kind}/${id}`);
  const hit = await caches.default.match(key); if (hit) return hit.text();
  const tok = (s && s.t) || (env.DC && await env.DC.get('svc'));
  const r = await fetch(`${HOST}/${Y}/${MFLP[kind](id)}`, { headers: tok ? { ...UA, Cookie: 'MFL_USER_ID=' + tok } : UA });
  let h = await r.text();
  h = h.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '');
  if (r.ok) ctx.waitUntil(caches.default.put(key, new Response(h, { headers: { 'Cache-Control': 'public, max-age=' + (kind === 'news' ? 600 : 1800) } })));
  return h;
}

// MFL's processed-waivers page (league members only) → plain rows, using the commissioner's saved login
async function waivers(env, s, run, fk) {
  const tok = (env.DC && await env.DC.get('svc')) || (s && s.t);
  if (!tok) return { error: 'sign in' };
  // the run picker is a form on MFL's page: replay it with the chosen run (fk = "action|selectName|hidden=..&..")
  let url = `${HOST}/${Y}/processed_waivers?L=${L}`;
  if (run && fk) { const [act, nm, hid] = fk.split('|'); const q = new URLSearchParams(hid || ''); q.set('L', L); q.set(nm, run); url = new URL(act || 'processed_waivers', `${HOST}/${Y}/`).href.split('?')[0] + '?' + q.toString(); }
  const r = await fetch(url, { headers: { ...UA, Cookie: 'MFL_USER_ID=' + tok } });
  const h = await r.text();
  const fm = /<form([^>]*)>([\s\S]*?)<\/form>/gi; let form = '';
  for (const m of h.matchAll(fm)) { if (!/<select/i.test(m[2])) continue; const act = (/action="([^"]*)"/i.exec(m[1]) || [])[1] || ''; const nm = (/<select[^>]*name="([^"]+)"/i.exec(m[2]) || [])[1] || '';
    const hid = [...m[2].matchAll(/<input[^>]*type="hidden"[^>]*>/gi)].map(x => { const n = (/name="([^"]+)"/i.exec(x[0]) || [])[1], v = (/value="([^"]*)"/i.exec(x[0]) || [])[1] || ''; return n ? encodeURIComponent(n) + '=' + encodeURIComponent(v) : ''; }).filter(Boolean).join('&');
    if (nm) { form = act.replace(/&amp;/g, '&') + '|' + nm + '|' + hid; break; } }
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
    return { heads, rows, runs, form };
  }
  return { heads: [], rows: [], runs, form };
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
      const v = encodeURIComponent(await signV(env, btoa(JSON.stringify({ t: tok, f: fid, u: String(b.username).slice(0, 60) }))));
      return json({ ok: true, franchise: fid }, 200, { 'Set-Cookie': cookie(v, 60 * 60 * 24 * 90) });
    }
    if (p === '/auth/me') { const s = (await session(req, env)); return json(s ? { user: s.u, franchise: s.f, commish: isCommish(s, env), clerk: isClerk(s, env) } : {}); }
    if (p === '/auth/logout') return json({ ok: true }, 200, { 'Set-Cookie': cookie('', 0) });

    // ---- suggestion box: any signed-in owner files bugs/ideas; commish sets status ----
    if (p === '/data/feedback') {
      const s = (await session(req, env)), clip = (x, n) => String(x == null ? '' : x).replace(/\s+$/,'').slice(0, n);
      const list = async () => { try { return JSON.parse((env.DC && await env.DC.get('fb')) || '[]'); } catch (e) { return []; } };
      if (req.method === 'GET') return json({ items: await list(), me: s ? s.f : '', commish: isCommish(s, env) });
      if (!sameOrigin(req, u)) return json({ ok: false }, 403);
      if (!s) return json({ ok: false, error: 'Sign in first.' }, 401);
      if (!env.DC) return json({ ok: false, error: 'Storage not set up yet.' }, 500);
      const b = await req.json().catch(() => ({})), items = await list();
      if (req.method === 'POST') {
        const title = clip(b.title, 120).trim(); if (!title) return json({ ok: false, error: 'Add a short title.' }, 400);
        const recent = items.filter(x => x.f === s.f && Date.now() - x.at < 60000).length; if (recent >= 3) return json({ ok: false, error: 'Slow down a little.' }, 429);
        items.unshift({ id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), type: b.type === 'bug' ? 'bug' : 'idea', title, body: clip(b.body, 2000), page: clip(b.page, 40), ua: clip(req.headers.get('User-Agent'), 160), f: s.f, at: Date.now(), status: 'new', note: '', votes: [s.f] });
        await env.DC.put('fb', JSON.stringify(items.slice(0, 400)));
        return json({ ok: true });
      }
      if (req.method === 'PATCH') {
        const it = items.find(x => x.id === b.id); if (!it) return json({ ok: false, error: 'Not found.' }, 404);
        if (b.vote) { it.votes = it.votes || []; const i = it.votes.indexOf(s.f); if (i > -1) it.votes.splice(i, 1); else it.votes.push(s.f); }
        else if (isCommish(s, env)) { if (b.status && /^(new|planned|doing|done|wont)$/.test(b.status)) it.status = b.status; if (b.note != null) it.note = clip(b.note, 500); if (b.remove) items.splice(items.indexOf(it), 1); }
        else return json({ ok: false, error: 'Commissioner only.' }, 403);
        await env.DC.put('fb', JSON.stringify(items));
        return json({ ok: true });
      }
    }
    // ---- site content edited by the commissioner (Dispatch, team names, calendar, by-laws, helmets) ----
    if (p.startsWith('/content/')) {
      const key = p.slice(9);
      if (key.startsWith('img/')) {
        const id = key.slice(4).replace(/[^0-9_]/g, '').slice(0, 7);
        if (req.method === 'PUT') {
          const s = (await session(req, env)); if (!isCommish(s, env) || !sameOrigin(req, u)) return json({ ok: false, error: 'Commissioner only.' }, 403);
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
        const s = (await session(req, env)), may = key === 'clerk' ? isClerk(s, env) : isCommish(s, env); if (!may || !sameOrigin(req, u)) return json({ ok: false, error: key === 'clerk' ? 'Clerk only.' : 'Commissioner only.' }, 403);
        if (!env.DC) return json({ ok: false, error: 'Storage not set up yet.' }, 500);
        const t = await req.text(); try { JSON.parse(t); } catch (e) { return json({ ok: false, error: 'Bad data.' }, 400); }
        await env.DC.put('c:' + key, t);
        return json({ ok: true });
      }
      const v = env.DC && await env.DC.get('c:' + key);
      return new Response(v || 'null', { headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
    }
    // one-time import of the old Netlify auction tracker's league financials
    if (p === '/data/legacy-fin') {
      try { const r = await fetch('https://dubcey2026.netlify.app/api/league', { headers: UA }); const d = await r.json(); return json({ finance: (d && d.finance) || null }); }
      catch (e) { return json({ finance: null }); }
    }
    if (p === '/data/mfl') {
      const kind = u.searchParams.get('k'), id = (u.searchParams.get('P') || '').replace(/\D/g, '');
      if (!MFLP[kind] || !id) return new Response('', { status: 400 });
      try { return new Response(await mflPage(env, ctx, (await session(req, env)), kind, id), { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } }); }
      catch (e) { return new Response('', { status: 502 }); }
    }
    if (p === '/data/espn') {
      const wk = (u.searchParams.get('W') || '').replace(/\D/g, '');
      if (!wk) return json({});
      try { return json(await espnWeek(ctx, wk, u.searchParams.get('raw') === '1')); } catch (e) { return json({ error: String(e.message || e) }, 502); }
    }
    // MFL "Complete Free Agent Listing": % added / % owned / projection for every free agent (MFL's export API only lists the top-owned)
    if (p === '/data/fa') {
      const key = new Request('https://fa.dubcey/' + Y), hit = await caches.default.match(key);
      if (hit) return new Response(hit.body, { headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache' } });
      try {
        const tok = env.DC && await env.DC.get('svc'), H = tok ? { ...UA, Cookie: 'MFL_USER_ID=' + tok } : UA;
        const get = async path => { const r = await fetch(`${HOST}/${Y}/${path}`, { headers: H }); return r.ok ? r.text() : ''; };
        // find the report link by its menu label, so a changed option code doesn't break it
        const home = await get(`home/${L}`), norm = h => h.replace(/&amp;/g, '&').replace(/^https?:\/\/[^/]+\/\d{4}\//, '').replace(/^\/\d{4}\//, '');
        // every menu link that mentions free agents, best match first, then MFL's usual report codes as a fallback
        const links = [...home.matchAll(/href="([^"]+)"[^>]*>([^<]*free\s*agent[^<]*)</gi)].sort((x, y) => (/complete/i.test(y[2]) ? 1 : 0) - (/complete/i.test(x[2]) ? 1 : 0)).map(x => norm(x[1]));
        links.unshift('reports?L=' + L + '&R=FULLFA&PROJSRC=mfl&SORT=own&PAGE=ALL');
        let t = '';
        for (const path of links.slice(0, 8)) {
          const html = await get(path);
          t = (html.match(/<table[\s\S]*?<\/table>/gi) || []).find(x => /OWN\s*(PCT|%)|%\s*OWN/i.test(x)) || '';
          if (t) break;
        }
        if (!t) throw new Error('report not found; tried ' + links.slice(0, 8).join(' , '));
        const clean = s => s.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
        const hrow = (t.match(/<tr[^>]*>[\s\S]*?<\/tr>/gi) || []).find(x => /OWN/i.test(x)) || '';
        const head = (hrow.match(/<t[hd][\s\S]*?<\/t[hd]>/gi) || []).map(x => clean(x).toUpperCase());
        const ix = re => head.findIndex(h => re.test(h));
        const cA = ix(/ADD/), cO = ix(/OWN/), cP = ix(/PROJ/), cS = ix(/SALARY/), out = {};
        (t.match(/<tr[^>]*>[\s\S]*?<\/tr>/gi) || []).slice(1).forEach(row => {
          const id = (/[?&;]P=(\d+)/.exec(row) || [])[1]; if (!id) return;
          const td = (row.match(/<td[\s\S]*?<\/td>/gi) || []).map(clean), n = i => i > -1 && td[i] != null && td[i] !== '' ? +String(td[i]).replace(/[^0-9.\-]/g, '') : null;
          out[id] = [n(cO), n(cA), n(cP), n(cS)];
        });
        if (!Object.keys(out).length) throw new Error('no rows parsed');
        const body = JSON.stringify(out);
        ctx.waitUntil(caches.default.put(key, new Response(body, { headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=1800' } })));
        return new Response(body, { headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache' } });
      } catch (e) { return json({ error: String(e.message || e) }, 502); }
    }
    // league-wide MFL player news (last 3 days): [{id, head, body, src, ago}]
    if (p === '/data/news') {
      const key = new Request('https://news.dubcey/' + Y), hit = await caches.default.match(key);
      if (hit) return new Response(hit.body, { headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache' } });
      try {
        const tok = env.DC && await env.DC.get('svc');
        const r = await fetch(`${HOST}/${Y}/news_articles?L=${L}&DAYS=3`, { headers: tok ? { ...UA, Cookie: 'MFL_USER_ID=' + tok } : UA });
        const html = r.ok ? await r.text() : '';
        const clean = s => String(s || '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&#39;|&apos;/g, "'").replace(/&quot;/g, '"').replace(/\s+/g, ' ').trim();
        const out = [];
        (html.match(/<tr[^>]*>[\s\S]*?<\/tr>/gi) || []).forEach(row => {
          const id = (/[?&;]P=(\d+)/.exec(row) || [])[1]; if (!id) return;
          const td = row.match(/<td[\s\S]*?<\/td>/gi) || [];
          const hd = td.find(x => /class="headline"/i.test(x)) || td[0] || '', ts = td.find(x => /class="timestamp"/i.test(x)) || td[td.length - 1] || '';
          const body = td.filter(x => x !== hd && x !== ts).map(clean).join(' ');
          const src = (/^\(([^)]+)\)/.exec(body) || [])[1] || '';
          out.push({ id, head: clean(hd), body: body.replace(/^\([^)]+\)\s*/, '').replace(new RegExp('\\s*' + src + '\\s*$'), ''), src, ago: clean(ts) });
        });
        const bodyJ = JSON.stringify(out.slice(0, 400));
        if (out.length) ctx.waitUntil(caches.default.put(key, new Response(bodyJ, { headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=900' } })));
        return new Response(bodyJ, { headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache' } });
      } catch (e) { return json({ error: String(e.message || e) }, 502); }
    }
    if (p === '/data/nflgames') {
      const wk = (u.searchParams.get('W') || '').replace(/\D/g, '');
      try {
        const sb = await cachedJSON(ctx, `${ESPN}/scoreboard?dates=${Y}&seasontype=2${wk ? '&week=' + wk : ''}`, 20);
        const OFF = { passing: 1, rushing: 1, receiving: 1 };
        const games = await Promise.all((sb.events || []).map(async ev => {
          const c = (ev.competitions || [])[0] || {}, st = (c.status && c.status.type) || {};
          const side = x => x ? { ab: x.team && x.team.abbreviation, name: x.team && x.team.shortDisplayName, logo: x.team && x.team.logo, score: x.score, rec: ((x.records || [])[0] || {}).summary || '' } : {};
          const T = c.competitors || [], g = { id: ev.id, kick: Date.parse(ev.date) || 0, state: st.state, detail: st.shortDetail || st.detail || '', away: side(T.find(x => x.homeAway === 'away')), home: side(T.find(x => x.homeAway === 'home')), box: {} };
          const od = (c.odds || [])[0];
          if (od) { // ESPN moved moneylines from awayTeamOdds/homeTeamOdds into od.moneyline.{away,home}.{close,open}.odds — read both shapes
            const pick = (...v) => { for (const x of v) if (x != null && x !== '' && x !== 'OFF') return x; return null; };
            const mlv = (t, side) => { const m = od.moneyline && od.moneyline[side]; return pick(t && t.moneyLine, t && t.moneyline && t.moneyline.close && t.moneyline.close.odds, m && m.close && m.close.odds, m && m.open && m.open.odds, m && m.current && m.current.odds); };
            g.odds = { line: od.details || '', ou: od.overUnder != null ? od.overUnder : '', mlA: mlv(od.awayTeamOdds, 'away'), mlH: mlv(od.homeTeamOdds, 'home'), by: (od.provider && od.provider.name) || '' }; }
          const tv = []; (c.broadcasts || []).forEach(b => (b.names || []).forEach(n => tv.indexOf(n) < 0 && tv.push(n))); (c.geoBroadcasts || []).forEach(b => { const n = b.media && b.media.shortName; if (n && tv.indexOf(n) < 0) tv.push(n); });
          g.tv = tv.slice(0, 3).join(' / ');
          // scoreboard often ships spread/total without moneylines — fill them from the game summary's pickcenter
          const noML = g.odds && g.odds.mlA == null && g.odds.mlH == null;
          if (st.state === 'pre') {
            if (noML) { try { const s0 = await cachedJSON(ctx, `${ESPN}/summary?event=${ev.id}`, 900); const pc = ((s0.pickcenter || [])[0]) || ((s0.odds || [])[0]); if (pc) { const m = pc.moneyline || {}; const pk = (...v) => { for (const x of v) if (x != null && x !== '' && x !== 'OFF') return x; return null; };
              g.odds.mlA = pk(pc.awayTeamOdds && pc.awayTeamOdds.moneyLine, m.away && m.away.close && m.away.close.odds, m.away && m.away.open && m.away.open.odds);
              g.odds.mlH = pk(pc.homeTeamOdds && pc.homeTeamOdds.moneyLine, m.home && m.home.close && m.home.close.odds, m.home && m.home.open && m.home.open.odds); } } catch (e) {} }
            return g;
          }
          let s; try { s = await cachedJSON(ctx, `${ESPN}/summary?event=${ev.id}`, st.completed ? 86400 : 20); } catch (e) { return g; }
          ((s.boxscore && s.boxscore.players) || []).forEach(tm => {
            const ab = tm.team && tm.team.abbreviation, o = g.box[ab] = {};
            (tm.statistics || []).forEach(cat => { if (!OFF[cat.name]) return; o[cat.name] = { labels: cat.labels || [], rows: (cat.athletes || []).map(a => [a.athlete && a.athlete.displayName, a.athlete && a.athlete.id].concat(a.stats || [])) }; });
          });
          return g;
        }));
        return json({ week: (sb.week && sb.week.number) || +wk || 0, games: games.sort((a, b) => a.kick - b.kick) });
      } catch (e) { return json({ error: String(e.message || e) }, 502); }
    }
    if (p === '/data/stats') {
      const wk = (u.searchParams.get('W') || '').replace(/\D/g, ''), ids = (u.searchParams.get('P') || '').split(',').filter(x => /^\d+$/.test(x));
      if (!wk || !ids.length) return json({});
      return json(await stats(env, ctx, wk, ids, u.searchParams.get('live') === '1', (await session(req, env))));
    }
    if (p === '/data/waivers') {
      const key = new Request(u.origin + '/data/waivers-v2?run=' + (u.searchParams.get('run') || ''));
      let res = await caches.default.match(key);
      if (!res) { const d = await waivers(env, (await session(req, env)), u.searchParams.get('run') || '', u.searchParams.get('fk') || ''); res = json(d, d.error ? 401 : 200, d.error ? {} : { 'Cache-Control': 'public, max-age=600' }); if (!d.error) ctx.waitUntil(caches.default.put(key, res.clone())); }
      return res;
    }

    // ---- read league data ----
    if (p.startsWith('/api/')) {
      const type = p.slice(5), s = (await session(req, env));
      if (!PUB[type] && !PRIV[type]) return json({ error: 'unknown' }, 404);
      if (PRIV[type] && !s) return json({ error: 'sign in' }, 401);
      const q = new URLSearchParams(u.search);
      // ME=1 on transactions: fetch with the owner's login so their own pending blind-bid requests are included
      const asMe = type === 'transactions' && q.get('ME') === '1' && !!s;
      ['TYPE', 'L', 'JSON', 'APIKEY', 'ME'].forEach(k => q.delete(k));
      const extra = q.toString();
      // NFL-wide data lives on MFL's API host and must not carry the league id
      const NFLWIDE = { injuries:1, nflSchedule:1, nflByeWeeks:1, playerProfile:1, allRules:1, topAdds:1, topDrops:1, topStarters:1, topOwns:1 };
      const scoped = q.get('LG') === '1' && /^top(Owns|Adds|Drops)$/.test(type); q.delete('LG'); const extra2 = q.toString();
      const target = scoped ? `${HOST}/${Y}/export?TYPE=${type}&L=${L}&JSON=1${extra2 ? '&' + extra2 : ''}` : NFLWIDE[type] ? `${API}/${Y}/export?TYPE=${type}&JSON=1${extra ? '&' + extra : ''}` : `${HOST}/${Y}/export?TYPE=${type}&L=${L}&JSON=1${extra ? '&' + extra : ''}`;
      if (PRIV[type] || asMe) {
        const r = await fetch(target, { headers: { ...UA, Cookie: 'MFL_USER_ID=' + s.t } });
        return new Response(r.body, { status: r.status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
      }
      const cache = caches.default, key = new Request(target);
      let res = await cache.match(key);
      if (!res) {
        let m = await fetch(target, { headers: UA });
        let txt = await m.text(), bad = !m.ok || /^\s*\{[^{]*"error"/.test(txt);
        // private-league exports (e.g. calendar) need a member login: retry with the commissioner's saved one
        if (bad && !NFLWIDE[type]) { const svc = env.DC && await env.DC.get('svc'); if (svc) { m = await fetch(target, { headers: { ...UA, Cookie: 'MFL_USER_ID=' + svc } }); txt = await m.text(); bad = !m.ok || /^\s*\{[^{]*"error"/.test(txt); } }
        res = new Response(txt, { status: m.status, headers: { 'Content-Type': 'application/json', 'Cache-Control': bad ? 'no-store' : 'public, max-age=' + PUB[type] } });
        if (!bad) ctx.waitUntil(cache.put(key, res.clone()));
      }
      const out = new Response(res.body, res); out.headers.set('Cache-Control', 'no-cache'); out.headers.set('X-Fetched', res.headers.get('Date') || new Date().toUTCString());
      return out;
    }

    // ---- write actions: lineups, waivers, trades, etc. ----
    if (p.startsWith('/act/') && req.method === 'POST') {
      const type = p.slice(5), s = (await session(req, env));
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
