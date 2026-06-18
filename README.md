# Turtle Patches 🐢

![Turtle Patches](preview.png)

A cozy ocean **Shikaku** puzzle. Wrap every sleepy turtle in a patch the size of its
number — fill the board with no overlaps and the turtles wake up!

- 50 generated stages with **verified unique solutions** (`scripts/gen_levels.mjs`)
- **Special turtle types** (from stage 21, ramping up) that change the rules:
  - **Mystery** 🟣 — number hidden; deduce it from the turtles around it
  - **Shy** 🩷 — number appears only once every neighbouring square is wrapped
  - **Snapper** 🟧 — its patch must be a perfect square (2×2, 3×3 …)
  - **Rock** 🪨 — an immovable obstacle; fit your patches around it
- Drag to draw patches, tap to remove, 💡 hints, star ratings, progress saved locally
- Chibi turtle art generated with OpenAI gpt-image as 4-frame sprite strips, animated
  with cross-faded CSS (soft blink + breathing, hop-awake on solve)
- Pure static site — no build step

## Run locally
```bash
python3 -m http.server 4173   # then open http://localhost:4173
```

## Deploy
```bash
vercel deploy --prod
```
