#!/usr/bin/env python3
"""Reports fonts whose default variant cannot set its own name or the presets.

A card's preview starts as the family's own name and the presets carry digits.
A face with no lowercase renders half its own name in the browser's fallback,
which reads as a broken card rather than as a specimen. Worth knowing before a
font goes in, not after.

    python3 scripts/check-glyphs.py
    python3 scripts/check-glyphs.py --new-only   # only what is not on origin/main
"""
import json
import os
import string
import subprocess
import sys

from fontTools.ttLib import TTFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, "public/fonts/fonts-data.json")

LOWER, UPPER, DIGITS = set(string.ascii_lowercase), set(string.ascii_uppercase), set(string.digits)


def default_variant(family):
    variants = family.get("variants") or []
    return next((v for v in variants if v.get("isDefaultStyle")), variants[0] if variants else None)


def main():
    data = json.load(open(DATA, encoding="utf-8"))
    families = data["families"]

    if "--new-only" in sys.argv:
        try:
            base = json.loads(subprocess.run(
                ["git", "show", "origin/main:public/fonts/fonts-data.json"],
                cwd=ROOT, capture_output=True, text=True, check=True).stdout)
            known = {f["name"] for f in base["families"]}
            families = [f for f in families if f["name"] not in known]
            print(f"Checking {len(families)} families not on origin/main.\n")
        except Exception:
            print("Could not read origin/main; checking everything.\n")

    problems, unreadable = [], []
    for f in families:
        v = default_variant(f)
        src = os.path.join(ROOT, "public" + (v or {}).get("url", "")) if v else ""
        if not src or not os.path.exists(src):
            unreadable.append((f["name"], "no file for the default variant"))
            continue
        try:
            font = TTFont(src)
            covered = set()
            for table in font["cmap"].tables:
                covered |= {chr(c) for c in table.cmap}
        except Exception as exc:
            unreadable.append((f["name"], str(exc)[:60]))
            continue
        gaps = []
        if LOWER - covered:
            gaps.append(f"no lowercase ({len(LOWER - covered)} of 26)")
        if UPPER - covered:
            gaps.append(f"no uppercase ({len(UPPER - covered)} of 26)")
        if DIGITS - covered:
            gaps.append(f"no digits ({len(DIGITS - covered)} of 10)")
        if gaps:
            problems.append((f["name"], ", ".join(gaps)))

    if not problems and not unreadable:
        print(f"{len(families)} families checked. Every default variant sets its own name and the presets.")
        return 0

    if problems:
        print(f"{len(problems)} families with gaps:\n")
        for name, text in problems:
            print(f"  {name:34} {text}")
    if unreadable:
        print(f"\n{len(unreadable)} could not be read:\n")
        for name, text in unreadable:
            print(f"  {name:34} {text}")
    return 1


if __name__ == "__main__":
    sys.exit(main())
