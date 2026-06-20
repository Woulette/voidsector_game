from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
SOURCE_DIR = ROOT / "assets" / "enemies" / "deadly" / "source"
OUTPUT_DIR = ROOT / "assets" / "enemies" / "deadly"

TARGET_MAX_EDGE = {
    "deadly_01_emerald": 512,
    "deadly_02_amber": 512,
    "deadly_03_cyan": 576,
    "deadly_04_magenta": 576,
    "deadly_05_blue": 576,
    "deadly_06_boss": 768,
}

PADDING = 12
ALPHA_CROP_THRESHOLD = 3
WEBP_QUALITY = 92


def alpha_bbox(image: Image.Image) -> tuple[int, int, int, int]:
    alpha = image.getchannel("A")
    mask = alpha.point(lambda value: 255 if value > ALPHA_CROP_THRESHOLD else 0)
    bbox = mask.getbbox()
    if bbox is None:
        raise ValueError("Sprite entièrement transparent.")
    left, top, right, bottom = bbox
    return (
        max(0, left - PADDING),
        max(0, top - PADDING),
        min(image.width, right + PADDING),
        min(image.height, bottom + PADDING),
    )


def resize_premultiplied(image: Image.Image, size: tuple[int, int]) -> Image.Image:
    premultiplied = image.convert("RGBa")
    resized = premultiplied.resize(size, Image.Resampling.LANCZOS)
    return resized.convert("RGBA")


def optimize(source: Path, max_edge: int) -> Path:
    image = Image.open(source).convert("RGBA")
    cropped = image.crop(alpha_bbox(image))
    scale = min(1.0, max_edge / max(cropped.size))
    size = (
        max(1, round(cropped.width * scale)),
        max(1, round(cropped.height * scale)),
    )
    optimized = resize_premultiplied(cropped, size) if size != cropped.size else cropped
    output = OUTPUT_DIR / f"{source.stem}.webp"
    optimized.save(
        output,
        "WEBP",
        quality=WEBP_QUALITY,
        method=6,
        exact=True,
    )
    return output


def main() -> None:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    for name, max_edge in TARGET_MAX_EDGE.items():
        source = SOURCE_DIR / f"{name}.png"
        if not source.exists():
            raise FileNotFoundError(source)
        output = optimize(source, max_edge)
        with Image.open(output) as image:
            print(f"{output.relative_to(ROOT)} | {image.width}x{image.height} | {output.stat().st_size} bytes")


if __name__ == "__main__":
    main()
