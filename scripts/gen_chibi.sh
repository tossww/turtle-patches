#!/bin/bash
GEN="$HOME/.hermes/scripts/codex-image-gen"
OUT="sheets_raw"
PRE="A 2x2 sprite sheet grid showing the SAME single character in 4 animation frames. Keep the character design, proportions and colors IDENTICAL in all four frames. Super-cute CHIBI kawaii style: oversized round head, tiny short body, huge sparkly round eyes, rosy blush cheeks, thick clean dark outlines, flat vibrant pastel colors, simple cel shading."
POSE="Frame layout (one character per quadrant, well centered with empty margin around each): TOP-LEFT = eyes open, gentle closed-mouth smile, calm idle pose. TOP-RIGHT = eyes happily closed in a blink, same smile. BOTTOM-LEFT = big open-mouth joyful grin, eyes squished happy. BOTTOM-RIGHT = excited little hop with both front flippers raised up, big grin. Evenly spaced 2x2 layout, pure solid white background #FFFFFF, no grid lines, no borders, no text, no numbers, no drop shadows."

declare -a NAMES=(turtle_green turtle_baby_blue turtle_sleepy_yellow turtle_snorkel turtle_pink turtle_flowercrown turtle_partyhat turtle_golden turtle_headband turtle_astronaut turtle_rainbow turtle_pirate turtle_hero)
declare -a DESC=(
  "a classic cute chibi green sea turtle with a smooth round green shell"
  "a tiny chibi baby turtle with a light sky-blue shell"
  "a chibi turtle with a soft yellow shell and a tiny sleepy snore bubble by its nose"
  "a chibi turquoise turtle wearing a snorkel diving mask pushed up on its forehead"
  "a chibi turtle with a pink shell decorated with little white flowers"
  "a chibi green turtle wearing a crown of small white daisies"
  "a chibi turtle wearing a colorful cone party hat"
  "a rare shiny chibi golden turtle with a glittering metallic-gold shell"
  "a chibi turtle wearing a red martial-arts headband tied around its head"
  "a chibi turtle wearing a round glass space-helmet bubble like an astronaut"
  "a chibi turtle with a rainbow-striped shell"
  "a chibi turtle with a tiny pirate hat and a small eyepatch"
  "a friendly chibi green sea turtle, the happy mascot, one front flipper waving hello"
)
for i in "${!NAMES[@]}"; do
  n="${NAMES[$i]}"; d="${DESC[$i]}"
  if [ -f "$OUT/$n.png" ]; then echo "SKIP $n"; continue; fi
  echo "=== CHIBI [$((i+1))/${#NAMES[@]}] $n ==="
  "$GEN" "$PRE The character is $d. $POSE" -o "$OUT/$n.png" 2>&1 | tail -1
  echo "--- done $n: $(ls -la "$OUT/$n.png" 2>/dev/null | awk '{print $5}') bytes"
done
echo "ALL_CHIBI_DONE"
