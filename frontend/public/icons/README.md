# PWA Icons

Place the following PNG files in this directory before mainnet launch:

| File | Size | Used for |
|------|------|----------|
| `icon-72x72.png` | 72×72px | Android legacy |
| `icon-96x96.png` | 96×96px | Android |
| `icon-128x128.png` | 128×128px | Chrome Web Store |
| `icon-144x144.png` | 144×144px | Windows tile |
| `icon-152x152.png` | 152×152px | iOS |
| `icon-192x192.png` | 192×192px | Android home screen |
| `icon-384x384.png` | 384×384px | Splash screen |
| `icon-512x512.png` | 512×512px | PWA install prompt |
| `icon-maskable-192x192.png` | 192×192px | Android adaptive icon (safe zone: inner 75%) |
| `icon-maskable-512x512.png` | 512×512px | Android adaptive icon large |

## Quick generation (requires ImageMagick)

```bash
# Start from a 1024x1024 source SVG or PNG (e.g. logo.png)
SOURCE=logo.png
for SIZE in 72 96 128 144 152 192 384 512; do
  convert "$SOURCE" -resize ${SIZE}x${SIZE} "icon-${SIZE}x${SIZE}.png"
  echo "Generated icon-${SIZE}x${SIZE}.png"
done

# Maskable: add 10% padding (safe zone)
convert "$SOURCE" -resize 80% -gravity center -extent 192x192 icon-maskable-192x192.png
convert "$SOURCE" -resize 80% -gravity center -extent 512x512 icon-maskable-512x512.png
echo "Generated maskable icons"
```

## Quick generation (Node.js — sharp)

```bash
npm install -g sharp-cli
for SIZE in 72 96 128 144 152 192 384 512; do
  sharp -i logo.png -o icon-${SIZE}x${SIZE}.png resize $SIZE $SIZE
done
```

## Design guidelines
- Background: `#00d4ff` (MetaShipX brand cyan) or transparent
- Icon: anchor/ship symbol centered, white or dark contrast
- Maskable: keep main content inside inner 75% circle (safe zone)
- No text in small sizes (72, 96) — icon only
