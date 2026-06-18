#!/bin/bash
# Generate the turtle roster via the gptimage (codex) wrapper, consistent kawaii style.
GEN="$HOME/.hermes/scripts/codex-image-gen"
OUT="assets_raw"
STYLE="Kawaii cartoon turtle mascot, flat vector illustration, thick clean dark outlines, soft rounded shapes, big friendly sparkly eyes, happy smile, vibrant pastel colors, simple cel shading, centered single character filling most of the frame, isolated on a pure solid white background (#FFFFFF), no ground shadow, no text, no watermark, mobile game sprite."

declare -a NAMES=(
  "turtle_green"
  "turtle_baby_blue"
  "turtle_sleepy_yellow"
  "turtle_snorkel"
  "turtle_pink"
  "turtle_flowercrown"
  "turtle_partyhat"
  "turtle_golden"
  "turtle_headband"
  "turtle_astronaut"
  "turtle_rainbow"
  "turtle_pirate"
  "turtle_hero"
)
declare -a DESC=(
  "a classic cute green sea turtle with a smooth round green shell"
  "a tiny adorable baby turtle with a light sky-blue shell and oversized eyes"
  "a sleepy yellow-shelled turtle with relaxed half-closed eyes and a tiny snore bubble"
  "a turquoise turtle wearing a snorkel diving mask on its forehead"
  "a sweet turtle with a pink shell decorated with little white flower patterns"
  "a green turtle wearing a crown of white daisies on its head"
  "a cheerful turtle wearing a colorful cone party hat with confetti dots"
  "a rare shiny golden turtle with a glittering metallic-gold shell"
  "a determined turtle wearing a red martial-arts headband tied around its head"
  "a turtle wearing a round glass space-helmet bubble, astronaut style"
  "a magical turtle with a rainbow-striped shell and a cheerful grin"
  "a playful turtle with an eyepatch and a tiny pirate hat"
  "a big happy green sea turtle waving one flipper hello, extra friendly and welcoming"
)

for i in "${!NAMES[@]}"; do
  n="${NAMES[$i]}"
  d="${DESC[$i]}"
  if [ -f "$OUT/$n.png" ]; then echo "SKIP $n (exists)"; continue; fi
  echo "=== GEN [$((i+1))/${#NAMES[@]}] $n ==="
  "$GEN" "$STYLE Subject: $d." -o "$OUT/$n.png" 2>&1 | tail -2
  echo "--- done $n: $(ls -la "$OUT/$n.png" 2>/dev/null | awk '{print $5}') bytes"
done
echo "ALL_ART_DONE"
