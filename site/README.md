# dubcey.party

Lives in the `site/` folder of the `dubcey-gazette` repo.

```
site/
  wrangler.jsonc      Cloudflare settings (name, domain, which paths the worker handles)
  src/worker.js       MFL data connection, owner sign-in, write actions
  public/             the pages
    index.html        Home — standings shelf, this week, Dispatch, team takes, awards, wire
    scores.html       Scores — week picker, all games, matchup shelf, starters/bench, live refresh
    standings.html    Standings — table, power rankings, road ahead (remaining schedule)
    teams.html        Teams — any roster, cap, compare two teams
    myteam.html       My Team (sign-in) — set lineup, trade offers + propose, waiver claims
    players.html      Players — free agents, search, player cards, waiver claims
    wire.html         The Wire — every transaction, filters, biggest bids, by team
    dispatch.html     The Dispatch — every week's column
    league.html       League — settings, message board
    css/app.css       all styling
    js/core.js        shared: teams, helmets, data, sign-in, header
    js/home.js, js/scores.js
    h/                trimmed helmets (~45 KB each)
    demo/             sample data for local preview only
```

## Deploy (once)
1. Upload this `site/` folder into the `dubcey-gazette` repo.
2. Cloudflare → Workers & Pages → Create → **Import a repository** → pick `dubcey-gazette`.
3. Root directory: `site`. Build command: leave empty. Deploy command: `npx wrangler deploy`.
4. After the first deploy, every push to GitHub redeploys automatically.

The `routes` entry in `wrangler.jsonc` attaches **dubcey.party**. To test privately first, delete that `routes` block — the site will only be at `dubcey-site.<you>.workers.dev`.

## Sign-in
Owners sign in with their MFL username and password. The worker sends them to MFL once, keeps only MFL's session token in a secure cookie, and never stores the password. Lineups, waiver bids and trades are sent to MFL with that owner's own session, so MFL's permissions still apply.

## Needs a live test after deploy
These send changes to MFL and can't be tested until the site is live. Try each once with your own team:
- Save a lineup (My Team → Lineup)
- Send, accept and decline a trade (My Team → Trades)
- Submit a waiver claim (Players → Add)
- Post on the message board (League)
If MFL rejects one, the site shows MFL's error message — send it to me and I'll adjust the format.
