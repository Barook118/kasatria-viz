# Kasatria People Visualization

A 3D interactive data visualization built on [Three.js CSS3DRenderer](https://threejs.org/examples/#css3d_periodictable), displaying 200 people as tiles in four animated layouts — Table, Sphere, Double Helix, and Grid.

---

## Tech Stack

| Layer | Choice |
|---|---|
| Bundler | Vite 5 |
| 3D / CSS3D | Three.js 0.165 |
| Animation | @tweenjs/tween.js 21 |
| Auth | Google Identity Services (GIS) |
| Data | Google Sheets → published CSV |
| Deploy | Vercel / Netlify / GitHub Pages |

---

## Project Structure

```
kasatria-viz/
├── index.html              # HTML shell (login + app containers)
├── vite.config.js
├── package.json
├── .env.example            # copy to .env and fill in values
└── src/
    ├── main.js             # orchestration: auth → data → scene
    ├── auth.js             # Google OAuth 2.0 (GIS)
    ├── data.js             # CSV fetch + parse
    ├── tile.js             # CSS3DObject tile factory
    ├── scene.js            # Three.js scene, renderers, orbit controls
    ├── layouts.js          # Table / Sphere / Helix / Grid math
    ├── transitions.js      # TWEEN animation controller
    └── style.css
```

---

## Setup — Step by Step

### 1. Google Cloud Project + OAuth

1. Go to [console.cloud.google.com](https://console.cloud.google.com/) → create a new project.
2. **APIs & Services → OAuth consent screen**
   - User type: External
   - Fill in App name, support email, developer email → Save
3. **APIs & Services → Credentials → + Create Credentials → OAuth 2.0 Client ID**
   - Application type: **Web application**
   - Authorised JavaScript origins:
     - `http://localhost:5173` (dev)
     - `https://your-deployed-domain.com` (prod)
   - Click Create → copy the **Client ID**

### 2. Google Sheet + Publish as CSV

1. Create a new Google Sheet, import `Data_Template.csv` (File → Import).
2. Share the sheet with `lisa@kasatria.com` (Editor access).
3. **File → Share → Publish to web**
   - Select the sheet tab
   - Format: **Comma-separated values (.csv)**
   - Click Publish → copy the URL (looks like `https://docs.google.com/spreadsheets/d/…/pub?output=csv`)

### 3. Environment Variables

```bash
cp .env.example .env
```

Edit `.env`:
```
VITE_GOOGLE_CLIENT_ID=123456789-abc.apps.googleusercontent.com
VITE_SHEET_CSV_URL=https://docs.google.com/spreadsheets/d/YOUR_ID/pub?output=csv
```

### 4. Local Development

```bash
npm install
npm run dev
# Opens http://localhost:5173
```

---

## Deployment

### Option A — Vercel (recommended, ~2 minutes)

```bash
npm install -g vercel
vercel        # follow the prompts
```

When prompted for environment variables, add:
- `VITE_GOOGLE_CLIENT_ID`
- `VITE_SHEET_CSV_URL`

Then add your Vercel domain to the OAuth Client ID's "Authorised JavaScript origins" in Google Cloud Console.

### Option B — Netlify

```bash
npm run build
# Drag-and-drop the `dist/` folder at app.netlify.com/drop
```

Or via CLI:
```bash
npm install -g netlify-cli
netlify deploy --prod --dir=dist
```

Set env vars in Netlify: **Site settings → Environment variables**.

### Option C — GitHub Pages

1. Push the repo to GitHub.
2. In `vite.config.js`, change `base: '/'` to `base: '/your-repo-name/'`.
3. Add this GitHub Actions workflow at `.github/workflows/deploy.yml`:

```yaml
name: Deploy to GitHub Pages
on:
  push:
    branches: [main]
jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - run: npm ci
      - run: npm run build
        env:
          VITE_GOOGLE_CLIENT_ID: ${{ secrets.VITE_GOOGLE_CLIENT_ID }}
          VITE_SHEET_CSV_URL: ${{ secrets.VITE_SHEET_CSV_URL }}
      - uses: peaceiris/actions-gh-pages@v4
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./dist
```

4. Add `VITE_GOOGLE_CLIENT_ID` and `VITE_SHEET_CSV_URL` as **Repository Secrets** (Settings → Secrets → Actions).

---

## Layout Reference

| Mode   | Arrangement                     |
|--------|---------------------------------|
| Table  | 20 cols × 10 rows, flat         |
| Sphere | Golden-angle spiral on sphere   |
| Helix  | Double helix, 2 strands × π offset |
| Grid   | 5 layers × 4 rows × 10 cols    |

## Tile Colors (Net Worth)

| Color  | Range           |
|--------|-----------------|
| 🔴 Red    | < $100,000      |
| 🟠 Orange | $100K – $200K   |
| 🟢 Green  | > $200,000      |

---

## License

MIT
