#!/usr/bin/env python3
"""Extract the existing love.futbol paths from its attributed 2025 publication.

Requires Python 3, PyMuPDF, NumPy and Pillow. No network access is used. The
SHA-256 gate intentionally stops on a different PDF, rather than silently
selecting unrelated artwork by drawing index. The PDF's vector path data and
transforms are retained; this is extraction, not tracing or logo redesign.
"""

from __future__ import annotations

import argparse
from hashlib import sha256
import json
from math import ceil, floor
from pathlib import Path
import xml.etree.ElementTree as ET
from xml.sax.saxutils import quoteattr

import fitz
import numpy as np
from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
REFERENCE = ROOT / "brands/lovefutbol/reference"
PDF_NAME = "community-driven-sport-spaces-2025.pdf"
SOURCE_HASH = "4a8d88fbc8b5ee4a021b63fca3cb1aaa1a4dbfee638ae9c89aa79cf441fb9d48"
SOURCE_URL = "https://cdn.sanity.io/files/oyf3dba6/production/49cf0f4ff864cb7b66187236d4dd70bef71e32f4.pdf"
LANDING_URL = "https://www.ussoccer.com/soccer-forward/resource-hub/best-practices-for-community-driven-sport-spaces"
SVG_NS = "http://www.w3.org/2000/svg"


def numeric(value: float) -> str:
    # Preserve the source extractor's coordinates; no deliberate rounding,
    # quantization or curve simplification is applied to logo geometry.
    return repr(float(value))


def path_markup(attributes: dict[str, str], ink: str) -> str:
    attributes = {**attributes, "fill": ink}
    return "<path " + " ".join(f"{key}={quoteattr(value)}" for key, value in attributes.items()) + "/>"


def document(markup: str, viewbox: list[float], title: str, description: str) -> str:
    box = " ".join(numeric(value) for value in viewbox)
    return (
        f'<svg xmlns="{SVG_NS}" viewBox="{box}" role="img" aria-label={quoteattr(title)}>'
        f"<title>{title}</title><desc>{description}</desc>{markup}</svg>\n"
    )


def render(svg: str, scale: int) -> np.ndarray:
    doc = fitz.open(stream=svg.encode(), filetype="svg")
    pixmap = doc[0].get_pixmap(matrix=fitz.Matrix(scale, scale), alpha=True)
    return np.frombuffer(pixmap.samples, dtype=np.uint8).reshape(pixmap.height, pixmap.width, 4)


def mask_metrics(source: np.ndarray, extracted: np.ndarray) -> dict:
    intersection = int(np.count_nonzero(source & extracted))
    union = int(np.count_nonzero(source | extracted))
    return {
        "sourcePixels": int(source.sum()),
        "extractedPixels": int(extracted.sum()),
        "differentPixels": int(np.count_nonzero(source ^ extracted)),
        "intersectionOverUnion": intersection / union if union else 1,
    }


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", type=Path, default=REFERENCE / PDF_NAME)
    parser.add_argument("--out", type=Path, default=REFERENCE)
    parser.add_argument("--preview-dir", type=Path, help="Optional review PNGs, not required by the brand.")
    args = parser.parse_args()
    source_bytes = args.source.read_bytes()
    observed_hash = sha256(source_bytes).hexdigest()
    if observed_hash != SOURCE_HASH:
        raise ValueError(f"Unexpected source PDF SHA-256: {observed_hash}. Review the new source before extraction.")

    pdf = fitz.open(stream=source_bytes, filetype="pdf")
    page = pdf[0]
    assert tuple(page.rect) == (0, 0, 1080, 1361), "Unexpected source page geometry."
    assert not page.get_images(), "The source page unexpectedly contains raster images."
    drawings = page.get_drawings()[50:63]
    assert len(drawings) == 13
    assert all(item["type"] == "f" and item["even_odd"] for item in drawings)
    assert all(item["fill"] == (1, 1, 1) for item in drawings[:12])
    assert [round(channel * 255) for channel in drawings[12]["fill"]] == [237, 28, 36]
    bounds = fitz.Rect(drawings[0]["rect"])
    for drawing in drawings[1:]:
        bounds |= drawing["rect"]

    # PyMuPDF's SVG exporter keeps the paths' original local coordinates and
    # local affine transforms. get_drawings() identifies their page-space
    # bounds and independently verifies their fills. Definitions/clipping add
    # nine preceding SVG path elements, so these correspond to drawings 50:63.
    svg = ET.fromstring(page.get_svg_image(text_as_path=False))
    paths = [element for element in svg.iter() if element.tag == f"{{{SVG_NS}}}path"][59:72]
    assert len(paths) == 13
    assert all(element.get("fill") == "#ffffff" for element in paths[:12])
    assert paths[12].get("fill") == "#ed1c24"
    assert all(set(element.attrib) == {"d", "transform", "fill", "fill-rule"} for element in paths)
    assert all(element.get("fill-rule") == "evenodd" for element in paths)
    assert all(len(element.get("d", "")) > 100 for element in paths)

    source_paths = [dict(element.attrib) for element in paths]
    original = "".join(path_markup(item, item["fill"]) for item in source_paths)
    flexible = "".join(path_markup(item, "{logo}" if index < 12 else "#ED1C24") for index, item in enumerate(source_paths))
    translate = f'translate({numeric(-bounds.x0)} {numeric(-bounds.y0)})'
    markup = f'<g transform="{translate}">{flexible}</g>'
    source_markup = f'<g transform="{translate}">{original}</g>'
    viewbox = [0, 0, bounds.width, bounds.height]
    assert "<image" not in markup and "<text" not in markup and "href" not in markup
    assert markup.count("<path ") == 13 and markup.count("{logo}") == 12
    source_svg = document(source_markup, viewbox, "love.futbol source reversed logo", "Existing white artwork and red flag extracted from page 1 of the attributed 2025 love.futbol publication. Original paths and transforms retained; translated to a cropped canvas. No font or image dependency.")
    positive_svg = document(markup.replace("{logo}", "#000000"), viewbox, "love.futbol positive logo - derived colourway", "The same extracted source paths with the twelve white body paths changed to black, matching the positive treatment observed on lovefutbol.org. The flag remains red. This colourway is derived, not a separate supplied vector master.")

    # Compare the original PDF raster directly with the extracted SVG at 4x
    # source-page scale, on exactly the same pixel-aligned crop. The blue
    # channel separates white logo strokes from the orange patterned ground;
    # the red flag is checked separately against its orange ground. Thus the
    # source background artwork is not mistaken for part of the logo.
    crop = fitz.Rect(floor(bounds.x0), floor(bounds.y0), ceil(bounds.x1), ceil(bounds.y1))
    scale = 4
    source_pixmap = page.get_pixmap(matrix=fitz.Matrix(scale, scale), clip=crop, alpha=False)
    source_rgb = np.frombuffer(source_pixmap.samples, dtype=np.uint8).reshape(source_pixmap.height, source_pixmap.width, 3)
    # SVG viewBox is x y width height, not a rectangle's x0 y0 x1 y1.
    extraction_on_page = document(original, [crop.x0, crop.y0, crop.width, crop.height], "Source logo verification", "Original paths at source page coordinates.")
    extracted_rgba = render(extraction_on_page, scale)
    assert extracted_rgba.shape[:2] == source_rgb.shape[:2]
    white_source = source_rgb[:, :, 2] >= 128
    white_extracted = extracted_rgba[:, :, 2] >= 128
    white_result = mask_metrics(white_source, white_extracted)
    # MuPDF returns premultiplied RGBA. Composite on the source's documented
    # orange field for a threshold-equivalent comparison of the red flag.
    alpha = extracted_rgba[:, :, 3:4].astype(float) / 255
    composite = extracted_rgba[:, :, :3].astype(float) + (1 - alpha) * np.array([243, 163, 0])
    red_source = (source_rgb[:, :, 0] >= 190) & (source_rgb[:, :, 1] <= 80) & (source_rgb[:, :, 2] <= 80)
    red_extracted = (composite[:, :, 0] >= 190) & (composite[:, :, 1] <= 80) & (composite[:, :, 2] <= 80)
    red_result = mask_metrics(red_source, red_extracted)
    assert white_result["intersectionOverUnion"] > 0.999, white_result
    assert red_result["intersectionOverUnion"] > 0.995, red_result

    geometry = {
        "schema": "brandkit/extracted-logo-geometry/1",
        "viewBox": viewbox,
        "markup": markup,
        "pathCount": 13,
        "bodyPathCount": 12,
        "fixedAccent": "#ED1C24",
        "sourceBounds": list(bounds),
        "sourcePage": 1,
        "sourceFile": PDF_NAME,
        "sourceSha256": SOURCE_HASH,
        "sourceUrl": SOURCE_URL,
        "note": "Original cubic/line paths and local transforms preserved. A single group translation normalizes the canvas. {logo} controls only the twelve main paths; the red flag stays fixed. Positive black/red is a derived colourway matching website use, not a separately supplied vector master.",
    }
    outputs = {
        "logo-geometry.json": json.dumps(geometry, ensure_ascii=False, indent=2) + "\n",
        "logo-source-reversed.svg": source_svg,
        "logo-positive-derived.svg": positive_svg,
    }
    args.out.mkdir(parents=True, exist_ok=True)
    for name, contents in outputs.items():
        (args.out / name).write_text(contents, encoding="utf-8")
    provenance = {
        "schema": "brandkit/logo-extraction-evidence/1",
        "retrieved": "2026-10-30",
        "source": {
            "title": "Core Principles and Best Practice in Establishing Community-Driven Sport Spaces",
            "contributor": "love.futbol",
            "landingUrl": LANDING_URL,
            "fileUrl": SOURCE_URL,
            "file": PDF_NAME,
            "bytes": len(source_bytes),
            "sha256": SOURCE_HASH,
            "page": 1,
        },
        "extraction": {
            "script": "scripts/extract-lovefutbol-logo.py",
            "pymupdfVersion": fitz.VersionBind,
            "drawingIndicesZeroBased": list(range(50, 63)),
            "svgPathIndicesZeroBased": list(range(59, 72)),
            "sourceBounds": list(bounds),
            "pathCount": 13,
            "originalPathDataAndTransformsPreserved": True,
            "curveSimplification": False,
            "tracing": False,
            "imageDependencies": 0,
            "fontDependencies": 0,
        },
        "colourways": {
            "sourceReversed": "White/red extracted from the publication, with its source colours preserved.",
            "positiveDerived": "Twelve white paths changed to #000000. Red flag retained at #ED1C24. Geometry unchanged. Matches the positive appearance on the official website; not a separately supplied vector master.",
            "flagColour": "The source PDF's normalized RGB rounds to #ED1C24; no Pantone or CMYK specification is inferred.",
        },
        "verification": {
            "method": "Direct original PDF raster versus extracted SVG at four pixels per source point. White body and red flag masks are compared separately; antialiasing edge differences are reported, not hidden.",
            "scale": scale,
            "pixelAlignedSourceCrop": list(crop),
            "whiteBody": white_result,
            "redFlag": red_result,
            "thresholds": {"whiteBodyMinimumIoU": 0.999, "redFlagMinimumIoU": 0.995},
        },
        "outputs": [{"file": name, "sha256": sha256(contents.encode()).hexdigest()} for name, contents in outputs.items()],
        "rights": "The publication and logo remain their respective owners' work. This source record identifies provenance and does not grant a trademark or redistribution licence.",
    }
    (args.out / "logo-extraction.json").write_text(json.dumps(provenance, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    if args.preview_dir:
        args.preview_dir.mkdir(parents=True, exist_ok=True)
        Image.fromarray(source_rgb).save(args.preview_dir / "source-pdf-crop.png")
        Image.fromarray(np.clip(composite, 0, 255).astype(np.uint8)).save(args.preview_dir / "extracted-logo-crop.png")
        overlay = np.full_like(source_rgb, 255)
        overlay[white_source | red_source] = [0, 170, 170]
        overlay[white_extracted | red_extracted] = [190, 0, 190]
        overlay[(white_source | red_source) & (white_extracted | red_extracted)] = [30, 30, 30]
        Image.fromarray(overlay).save(args.preview_dir / "logo-overlay.png")
    print(json.dumps({"paths": 13, "viewBox": viewbox, "whiteBody": white_result, "redFlag": red_result, "output": str(args.out)}, indent=2))


if __name__ == "__main__":
    main()
