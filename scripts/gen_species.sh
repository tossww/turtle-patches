#!/bin/bash
GEN="$HOME/.hermes/scripts/codex-image-gen"
OUT="sheets_raw"
PRE="A 2x2 sprite sheet grid showing the SAME single character in 4 animation frames. Keep the character design, proportions and colors IDENTICAL in all four frames. Super-cute CHIBI kawaii style: oversized round head, tiny short body, huge sparkly round eyes, rosy blush cheeks, thick clean dark outlines, flat vibrant pastel colors, simple cel shading."
POSE="Frame layout (one character per quadrant, well centered with empty margin around each): TOP-LEFT = eyes open, gentle closed-mouth smile, calm idle pose. TOP-RIGHT = eyes happily closed in a blink, same smile. BOTTOM-LEFT = big open-mouth joyful grin, eyes squished happy. BOTTOM-RIGHT = excited little hop with both front flippers raised up, big grin. Evenly spaced 2x2 layout, pure solid white background #FFFFFF, no grid lines, no borders, no text, no numbers, no drop shadows."

declare -a NAMES=(turtle_matamata turtle_spotted turtle_leatherback turtle_pignose turtle_snakeneck turtle_maryriver turtle_startortoise turtle_radiated turtle_hawksbill turtle_boxturtle turtle_snapper turtle_diamondback)
declare -a DESC=(
  "a chibi matamata turtle with a flat wide triangular head, a long pointy little snorkel nose, and a bumpy brown shell covered in small leaf-like ridges, quirky and adorable"
  "a chibi spotted turtle with a glossy black shell covered in bright yellow polka dots and little yellow spots on its cheeks"
  "a chibi leatherback sea turtle with a dark blue-black leathery shell that has seven raised ridges running down its back and tiny pale spots, with big swimming flippers"
  "a chibi pig-nosed turtle, soft gray-green, with a cute little pink pig-like snout and wide rounded swimming flippers"
  "a chibi snake-necked turtle with an extra long curvy neck, a smooth olive-brown shell and a sweet friendly face"
  "a chibi Mary River turtle with a punky bright-green algae mohawk on its head and two little soft spikes under its chin, olive-green shell"
  "a chibi Indian star tortoise with a high domed black shell covered in bright yellow radiating starburst patterns"
  "a chibi radiated tortoise with a tall domed dark shell decorated with vivid yellow starburst line patterns and a yellow face"
  "a chibi hawksbill sea turtle with a beautiful glossy amber-and-brown tortoiseshell patterned shell and a small pointed hawk-like beak"
  "a chibi eastern box turtle with a high rounded dome shell patterned in orange and yellow swirls over dark brown, with bright orange eyes"
  "a chibi alligator snapping turtle styled as a cute little dragon-turtle, a spiky ridged dark-green dinosaur-like shell and a big friendly toothy grin"
  "a chibi diamondback terrapin with concentric diamond-ring patterns on a gray shell and pale gray skin speckled with tiny black dots"
)
for f in "$OUT"/*.png; do [ -f "$f" ] && [ "$(stat -f%z "$f" 2>/dev/null || echo 0)" -lt 50000 ] && rm -f "$f"; done
for i in "${!NAMES[@]}"; do
  n="${NAMES[$i]}"; d="${DESC[$i]}"
  if [ -f "$OUT/$n.png" ] && [ "$(stat -f%z "$OUT/$n.png" 2>/dev/null || echo 0)" -ge 50000 ]; then echo "SKIP $n"; continue; fi
  echo "=== SPECIES [$((i+1))/${#NAMES[@]}] $n ==="
  "$GEN" "$PRE The character is $d. $POSE" -o "$OUT/$n.png" 2>&1 | tail -1
  echo "--- done $n: $(stat -f%z "$OUT/$n.png" 2>/dev/null || echo 0) bytes"
done
echo "ALL_SPECIES_DONE"
