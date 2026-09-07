#!/usr/bin/env python3
"""Marks families whose fonts actually carry small caps.

The case switch on a font page offers Small caps, and a browser will happily
fake it by shrinking the capitals when the font has no `smcp` feature. Faked
small caps are exactly the sort of thing this site exists to not do, so the
control is only offered where the glyphs are real — which is 13 families out of
251. Reads the GSUB feature list of each family's default variant and writes
`hasSmallCaps` into fonts-data.json.

    python3 scripts/detect-small-caps.py
"""
import json
import os
import sys

from fontTools.ttLib import TTFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, "public/fonts/fonts-data.json")


def features(path):
    font = TTFont(path)
    tags = set()
    if "GSUB" in font and font["GSUB"].table.FeatureList:
        for record in font["GSUB"].table.FeatureList.FeatureRecord:
            tags.add(record.FeatureTag)
    return tags


def main():
    data = json.load(open(DATA, encoding="utf-8"))
    marked = unmarked = unreadable = 0

    for family in data["families"]:
        variants = family.get("variants") or []
        variant = next((v for v in variants if v.get("isDefaultStyle")), variants[0] if variants else None)
        path = os.path.join(ROOT, "public" + (variant or {}).get("url", "")) if variant else ""
        if not path or not os.path.exists(path):
            family.pop("hasSmallCaps", None)
            unreadable += 1
            continue
        try:
            tags = features(path)
        except Exception:
            family.pop("hasSmallCaps", None)
            unreadable += 1
            continue
        if "smcp" in tags or "c2sc" in tags:
            family["hasSmallCaps"] = True
            marked += 1
        else:
            family.pop("hasSmallCaps", None)
            unmarked += 1

    json.dump(data, open(DATA, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
    open(DATA, "a").write("\n")
    print(f"{marked} families carry real small caps, {unmarked} do not, {unreadable} could not be read.")


if __name__ == "__main__":
    sys.exit(main())
