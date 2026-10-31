"""Pack generated flipbook cells into a small, consistently anchored runtime atlas.

Only crops, translates, resizes and encodes the existing RGBA frames. The image
generator supplies the artwork and transparent edges; no background is keyed out.
"""
import argparse
import json
from pathlib import Path

from PIL import Image


def inspect_frame(frame):
    pixels = frame.load()
    visible = []
    root_rows = {}
    for y in range(frame.height):
        for x in range(frame.width):
            r, g, b, a = pixels[x, y]
            if a > 24:
                visible.append((x, y))
            if a > 90 and min(r, g, b) > 160:
                root_rows.setdefault(y, []).append(x)
    if not visible or not root_rows:
        raise ValueError("An atlas cell contains no visible flame or bright root")
    root_y = next((y for y in sorted(root_rows) if len(root_rows[y]) >= 3), min(root_rows))
    root_points = [x for y, xs in root_rows.items() if root_y <= y < root_y + 6 for x in xs]
    root_x = sum(root_points) / len(root_points)
    bounds = (min(x for x, _ in visible), min(y for _, y in visible), max(x for x, _ in visible), max(y for _, y in visible))
    return root_x, root_y, bounds


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("source", type=Path)
    parser.add_argument("destination", type=Path)
    args = parser.parse_args()
    source = Image.open(args.source)
    if source.mode != "RGBA":
        raise ValueError("Expected a generated RGBA source with actual transparency")
    if source.width % 4 or source.height % 2:
        raise ValueError("Expected four columns and two rows")
    if source.getchannel("A").getextrema()[0] != 0:
        raise ValueError("The source has no fully transparent pixels")
    cell_w, cell_h = source.width // 4, source.height // 2
    frames = [source.crop(((i % 4) * cell_w, (i // 4) * cell_h, (i % 4 + 1) * cell_w, (i // 4 + 1) * cell_h)) for i in range(8)]
    anchors = [inspect_frame(frame) for frame in frames]
    below = max(bounds[3] - y for _, y, bounds in anchors)
    left = max(x - bounds[0] for x, _, bounds in anchors)
    right = max(bounds[2] - x for x, _, bounds in anchors)
    scale = min(120 / max(1, below), 58 / max(1, left + right))
    atlas = Image.new("RGBA", (256, 256), (0, 0, 0, 0))
    for i, (frame, (root_x, root_y, _)) in enumerate(zip(frames, anchors)):
        tile = Image.new("RGBA", (64, 128), (0, 0, 0, 0))
        resized = frame.resize((round(frame.width * scale), round(frame.height * scale)), Image.Resampling.LANCZOS)
        tile.alpha_composite(resized, (round(32 - root_x * scale), round(4 - root_y * scale)))
        atlas.alpha_composite(tile, ((i % 4) * 64, (i // 4) * 128))
    args.destination.parent.mkdir(parents=True, exist_ok=True)
    atlas.save(args.destination, "WEBP", quality=90, method=6, exact=True)
    metadata = {"frames":8, "columns":4, "rows":2, "frameWidth":64, "frameHeight":128, "root":[32, 4],
                "sourceSize":list(source.size), "scale":round(scale, 5), "sourceAnchors":[[round(x, 2), y] for x, y, _ in anchors],
                "bytes":args.destination.stat().st_size}
    args.destination.with_suffix(".json").write_text(json.dumps(metadata, indent=2), encoding="utf-8")
    print(json.dumps(metadata))


if __name__ == "__main__":
    main()
