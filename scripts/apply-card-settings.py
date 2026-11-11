#!/usr/bin/env python3
"""Holds every product card in the theme to the ticket 11 set-up.

Run from the repo root:  python3 scripts/apply-card-settings.py

Templates carry their own copy of the card's block settings, so the card can
drift apart page by page. This script writes the same values everywhere a
`_product-card` block appears:

  card      gap 0 (the card's own CSS sets its rhythm)
  gallery   square image ratio
  title     no extra top padding
  chips     the KONBINI chips block, right after the gallery
  grid      13px column gap; page margins on mobile where the section has the switch

It is safe to run again. It reports what it changed and touches nothing else.
"""
import glob
import json
import re

HEADER = re.compile(r"^\s*/\*.*?\*/\s*", re.S)
SKIP = {"templates/page.lab.json", "templates/page.lab-context.json"}


def fix_card(card, log):
    settings = card.setdefault("settings", {})
    if settings.get("product_card_gap") != 0:
        settings["product_card_gap"] = 0
        log.append("card gap 0")

    blocks = card.setdefault("blocks", {})
    order = card.setdefault("block_order", list(blocks))
    gallery_key = None
    for key, block in blocks.items():
        kind = block.get("type")
        block_settings = block.setdefault("settings", {})
        if kind == "_product-card-gallery":
            gallery_key = key
            if block_settings.get("image_ratio") != "square":
                block_settings["image_ratio"] = "square"
                log.append("square image")
        elif kind == "product-title":
            if block_settings.get("padding-block-start", 0) != 0:
                block_settings["padding-block-start"] = 0
                log.append("title padding 0")

    if not any(block.get("type") == "konbini-card-chips" for block in blocks.values()):
        blocks["chips"] = {"type": "konbini-card-chips"}
        at = order.index(gallery_key) + 1 if gallery_key in order else 0
        order.insert(at, "chips")
        log.append("chips block")


def walk(blocks, log):
    found = False
    for block in blocks.values():
        if block.get("type") == "_product-card":
            fix_card(block, log)
            found = True
        if "blocks" in block:
            found = walk(block["blocks"], log) or found
    return found


def main():
    for path in sorted(glob.glob("templates/*.json")):
        if path in SKIP:
            continue
        text = open(path, encoding="utf-8").read()
        header = HEADER.match(text)
        head = header.group(0) if header else ""
        data = json.loads(text[len(head):])

        log = []
        for section in data.get("sections", {}).values():
            if not walk(section.get("blocks", {}), log):
                continue
            settings = section.setdefault("settings", {})
            for key in ("columns_gap_horizontal", "columns_gap"):
                if key in settings and settings[key] != 13:
                    settings[key] = 13
                    log.append(key + " 13")
            if settings.get("full_width_on_mobile") is True:
                settings["full_width_on_mobile"] = False
                log.append("page margins on mobile")

        if log:
            with open(path, "w", encoding="utf-8") as handle:
                handle.write(head + json.dumps(data, indent=2, ensure_ascii=False) + "\n")
            print(path + ": " + ", ".join(log))
        else:
            print(path + ": nothing to change")


if __name__ == "__main__":
    main()
