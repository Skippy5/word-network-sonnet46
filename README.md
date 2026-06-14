# IT Ticket Word Network — Sonnet46

An interactive **word co-occurrence network** for IT service-desk tickets.
Upload a CSV from ServiceNow (or any ITSM tool) to visualise problem clusters and discover how issues relate to one another.

> Developed with **Claude Sonnet 4.6** via Claude Code.

---

## Features

- **Force-directed graph** — colour-coded clusters (Louvain), physics with drag/zoom/pan
- **Drill-in** — click any node or edge to see every incident behind it
- **Filters** — multi-select by business unit, location, country, state, category, priority, status; cascading geography
- **Text pipeline** — HTML stripping, stop-word removal, lemmatization, synonym collapse, phrase detection
- **Editable settings** — stop words, synonym map, phrases persisted to `localStorage`
- **Light / dark mode** toggle
- **Export** — filtered incidents, node list, edge list (all as CSV)
- **All processing is client-side** — ticket data never leaves your browser

---

## Stack

| Layer | Library |
|---|---|
| Framework | Next.js 16 (App Router, TypeScript) |
| Styling | Tailwind CSS |
| Graph | react-force-graph-2d (canvas) |
| Graph model | graphology + graphology-communities-louvain |
| State | Zustand |
| CSV parsing | PapaParse |
| Tests | Vitest |

---

## Quickstart

```bash
npm install
npm run dev        # http://localhost:3000
```

---

## Deploy targets

### 1. Vercel (recommended for zero-config hosting)

1. Push this repo to GitHub.
2. Go to [vercel.com](https://vercel.com) and click **Add New Project**.
3. Import the GitHub repo — accept all defaults, no configuration needed.
4. Every `git push` to `main` redeploys automatically.

### 2. Node server (any Linux/AWS EC2 box)

```bash
npm install
npm run build
npm start          # serves on port 3000
```

### 3. Docker on AWS (EC2 / Lightsail / ECS)

Enable standalone output by setting `output: 'standalone'` in `next.config.mjs`, then:

```bash
docker build -t word-network-sonnet46 .
docker run -p 3000:3000 word-network-sonnet46
```

Open `http://<your-server-ip>:3000`.

### 4. Static export (S3 + CloudFront / nginx)

Uncomment `output: 'export'` in `next.config.mjs`, then:

```bash
npm run build      # produces out/
npx serve out      # local preview
```

Upload the `out/` folder to S3 or serve via nginx:

```nginx
server {
  root /var/www/word-network/out;
  index index.html;
  location / { try_files $uri $uri.html $uri/ =404; }
}
```

---

## CSV format

| Column | Role |
|---|---|
| `ticket_id` | Required — drill-in key |
| `short_description` | Text source (highest signal) |
| `work_notes` | Text source |
| `close_notes` | Text source |
| `business_unit`, `location`, `country`, `state` | Filters |
| `category`, `subcategory`, `assignment_group`, `priority`, `status` | Optional filters |
| `opened_at` | Date metadata |

Extra columns are passed through and appear in the drill-in panel.

---

## Tests

```bash
npm test           # run once
npm run test:watch # watch mode
```

Tests cover: HTML stripping, synonym collapse (`pwd->password`), phrase detection, PMI math, and edge-to-incident lookup.

---

## Data privacy

All CSV parsing, text processing, co-occurrence computation, and graph rendering run entirely in your browser.
No data is transmitted to any server. The only persistence is `localStorage` for UI settings (stop words, synonyms).
