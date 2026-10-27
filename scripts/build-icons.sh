#!/usr/bin/env bash
# Regenerates the PNG app icons from their SVG sources (needs ImageMagick 7: `magick`).
# The PNGs are committed; run this only after changing an SVG.
set -euo pipefail
cd "$(dirname "$0")/.."

out=public/icons
magick -background none -density 384 "$out/icon.svg" -resize 192x192 "$out/icon-192.png"
magick -background none -density 384 "$out/icon.svg" -resize 512x512 "$out/icon-512.png"
magick -background none -density 384 scripts/icons/icon-maskable.svg -resize 512x512 "$out/icon-maskable-512.png"
echo "Icons written to $out/"
