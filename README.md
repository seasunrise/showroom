# Showroom (source)

Source directory of the public demo site. Everything in this folder has been
audited and is safe to publish. Deployment is a **manual copy** to the public
repository:

- Source (private repo): `https://github.com/seasunrise/sandbox/ai-workspace/showroom/` ← you are here
- Publish target (public repo, GitHub Pages): `https://github.com/seasunrise/showroom`

## Directory map

```
showroom/
├── index.html                  Gallery landing page
├── .nojekyll                   Required by GitHub Pages (see notes below)
├── game/
│   ├── dorm-brawl/             Online game (needs Python backend to actually play)
│   ├── game-snake.html
│   └── tank-battle.html
├── schoolwork/
│   ├── calculus-interactive/   index.html + assets/ + _shared/fonts/
│   └── mechanical-drawing-lab.html
├── simulation/
│   ├── boids-flocking.html
│   └── dormitory-social-network.html
└── utils/
    ├── net-test.html
    └── speedtest-10mb.bin      Download payload for net-test (10 MB)
```

## Publish checklist

1. Copy the contents (including hidden files) to the public repo:

   ```sh
   rsync -av --delete --exclude '.DS_Store' \
     ~/MY/Git/sandbox/ai-workspace/showroom/ \
     ~/MY/Git/showroom/
   ```

   If copying in Finder instead, press `Cmd+Shift+.` to show hidden files and
   make sure `.nojekyll` comes along — without it GitHub Pages' Jekyll skips
   `_shared/fonts/` and the calculus page loses its fonts.

2. Confirm `utils/speedtest-10mb.bin` was copied; it is the download payload
   for the net-test page.

3. In the public repo: commit and push. GitHub Pages serves from the repo
   root, so the gallery is the site home page.

4. Smoke-test after deploy:
   - `/` — gallery loads
   - `/schoolwork/calculus-interactive/` — fonts render (validates `.nojekyll`)
   - `/utils/net-test.html` — download test measures real speed (validates the bin)
5. Replace beacon token of Cloudflare
   ```
   # old token: 5b4bb0354de74e8db5b29c3e3a4a3b8e
   # new token: 7f217925546646b2ac70e0e1ef877263
   find . -type f \( -name "*.html" -o -name "*.htm" \) -exec perl -pi -e 's/5b4bb0354de74e8db5b29c3e3a4a3b8e/7f217925546646b2ac70e0e1ef877263/g' {} +
   ```
## Do NOT publish

- `../notes/` — internal working notes containing local machine paths.
  They live outside this folder on purpose; never copy them into the public repo.
- `game/dorm-brawl/` works as a static page on GitHub Pages, but joining a
  game requires running `server.py` on a real server. Its card in the gallery
  is already annotated as such.
