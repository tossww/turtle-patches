#!/bin/bash
GEN="$HOME/.hermes/scripts/codex-image-gen"
PRE="A 2x2 sprite sheet grid showing the SAME single character in 4 animation frames. Keep the character design, proportions and colors IDENTICAL in all four frames. Super-cute CHIBI kawaii style: oversized round head, tiny short body, huge sparkly round eyes, rosy blush cheeks, thick clean dark outlines, flat vibrant pastel colors."
POSE="Frame layout (one character per quadrant, centered with margin): TOP-LEFT = bashful and shy, both front flippers held up partly covering its face, big shy eyes peeking out between the flippers, heavy rosy blush. TOP-RIGHT = same shy pose but eyes blinked closed. BOTTOM-LEFT = flippers lowered a little revealing a happy open-mouth grin. BOTTOM-RIGHT = excited happy little hop with both flippers raised up, big grin. Evenly spaced 2x2 layout, pure solid white background #FFFFFF, no grid lines, no text, no shadows."
"$GEN" "$PRE The character is a chibi shy bashful lavender-shelled turtle peeking out from behind its flippers. $POSE" -o "sheets_raw/turtle_shy.png" 2>&1 | tail -1
echo "SHY_DONE"
