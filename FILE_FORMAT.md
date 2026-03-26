# Palette File Format

Documentation of the `.pal` file structure as currently understood.

This is based on reverse-engineering observation and cross-referencing with toruzz's original GBC Palette Editor utility and associated technical guides at https://toruzz.com/blog. If something here turns out to be wrong for your specific file, the source code in `src/core/palette.ts` is the authoritative reference for what the app actually does.

---

## Overview

A `.pal` file is a flat binary file containing one or more palette blocks. There is no file header. There is no metadata. It is just the color data, back to back.

Each palette block is **64 bytes**.

Each block contains **32 colors**.

Each color is encoded as a **16-bit little-endian word** (2 bytes), using a 15-bit RGB format native to the Game Boy Color.

---

## Palette count

There is no field in the file that says how many palettes it contains. The count is inferred:

```
palette_count = floor(file_size_in_bytes / 64)
```

If the file size is not a multiple of 64, the app treats it as malformed and shows a warning dialog before opening. It will load the complete palette blocks it finds and preserve the trailing bytes on save. You can choose to cancel instead.

---

## Color encoding: 15-bit RGB

The Game Boy Color hardware uses 15-bit color. Each color channel (R, G, B) has 5 bits of precision, giving values from 0 to 31 per channel.

Two bytes store one color value, packed into a 16-bit little-endian integer:

```
Bit layout (LSB to MSB):
  Bits  0–4:  Red   (5 bits)
  Bits  5–9:  Green (5 bits)
  Bits 10–14: Blue  (5 bits)
  Bit  15:    Unused (always 0)
```

To read a color from two bytes:

```
word = byte[0] | (byte[1] << 8)

r5 = (word >> 0)  & 0x1F
g5 = (word >> 5)  & 0x1F
b5 = (word >> 10) & 0x1F
```

To convert 5-bit channel values to 8-bit for display purposes:

```
r8 = (r5 * 255 + 15) / 31  // rounded
g8 = (g5 * 255 + 15) / 31
b8 = (b5 * 255 + 15) / 31
```

The naive approach of `channel8 = channel5 * 8` or `channel5 << 3` is common but slightly inaccurate at the high end. The division by 31 approach gives a proper mapping where 0 → 0 and 31 → 255.

To encode from 8-bit back to 5-bit:

```
channel5 = Math.round(channel8 * 31 / 255)
```

Clamp to 0–31 after rounding.

To pack a color back into two bytes:

```
word = (r5 & 0x1F) | ((g5 & 0x1F) << 5) | ((b5 & 0x1F) << 10)

byte[0] = word & 0xFF
byte[1] = (word >> 8) & 0xFF
```

---

## Palette block layout

A full 64-byte block encodes 32 colors sequentially:

```
Offset  Content
0x00    Color 0  (bytes 0–1)
0x02    Color 1  (bytes 2–3)
0x04    Color 2  (bytes 4–5)
...
0x3E    Color 31 (bytes 62–63)
```

Colors are stored in the order they appear in the palette. There is no internal indexing or color name data.

---

## Copy .db export format

The Copy .db feature exports the current palette block to the clipboard as plain text. Eight rows, eight bytes per row, uppercase hex, no spaces or separators:

```
FF7F9F0ECD000000
D07EDD7B6B7AE371
...
```

Eight rows of sixteen hex characters each. This is the raw 64-byte palette block exactly as it appears in the file.

---

## Potential edge cases

**File sizes that are not multiples of 64.** The app will warn and offer to open anyway, loading only the complete blocks and ignoring trailing bytes. If you save, the trailing bytes are preserved. If you have a file with non-palette header or trailer data, extract the palette portion first.

**The unused bit (bit 15).** It should always be zero. The app does not rely on it being zero, but it masks it out during encoding to ensure nothing unexpected gets written back.

**Color accuracy at extremes.** At 5-bit precision, the available shades are coarser than 8-bit. Rounding is applied consistently during encode and decode, but do not expect pixel-perfect round-trips from 8-bit values that do not map cleanly onto the 5-bit scale.

**Multiple palette blocks per file.** The swatch grid and editor operate on one block at a time. Switching the palette index loads a different block. All blocks are held in memory and written back to the file on save.

---

## Reverse-engineering notes

The format matches what toruzz documented for the original GBC Palette Editor. No novel discoveries were made during development of this tool — it is a faithful implementation of the same format.

If you encounter a `.pal` file that behaves unexpectedly, the first things to check are:

1. File size divisibility by 64
2. Whether the file contains only palette data or has a header or trailer
3. Whether bit 15 is set on any color words (it should not be)

The app's core parsing is in `src/core/palette.ts`. The relevant functions are `parsePalFile`, `decodePaletteBlock`, and `encodePaletteBlock`.
