# typedump

A curated index of open-source typefaces — [www.typedump.com](https://www.typedump.com).

Next.js, exported as static files and served from Cloudflare Pages. The whole
catalogue is one file, `public/fonts/fonts-data.json`; the stylesheet, the cut
previews, the npm package and `llms.txt` are all generated from it.

```bash
npm run dev     # local
npm run build   # static export into out/
```

Adding or checking a font: `.claude/skills/add-font/SKILL.md`, with the tag
vocabulary next to it in `taxonomy.md`. Before publishing a batch:

```bash
node scripts/check-taxonomy.mjs --new-only
python3 scripts/check-glyphs.py --new-only
```

Architecture and conventions: `CLAUDE.md`.
