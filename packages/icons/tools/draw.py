"""Draws the icon SVGs from icons.json, following docs/design/icons.md.

This is an authoring tool for agents, not part of the build or CI. It writes
svg/<name>.duotone.svg and svg/<name>.solid.svg, which are committed and approved
by Thor before they merge. `pnpm icons` then turns the SVGs into React components.

    python3 -m venv .venv && .venv/bin/pip install -r requirements.txt
    .venv/bin/python draw.py              # writes ../svg/
    .venv/bin/python draw.py --sheet x.html  # also writes a preview sheet for approval

Part kinds in icons.json (the rules are in docs/design/icons.md):
  open    a line, in both variants (2px in duotone, 2.5px in solid)
  closed  a shape: outline plus a soft fill in duotone, a filled shape in solid
  inner   a detail line: a line in duotone, a cut with rounded ends in solid
  split   a fold line: a line in duotone, a straight cut with flat ends in solid
          (solidD is the cut, drawn long enough to run right through the shape)
  dot     a dot, 1.25x the line width, cut out in solid
  slash   a "turned off" line: a line with a gap cut around it, in both variants
"""

import json
import sys
from pathlib import Path

from shapely.geometry import LineString, MultiPolygon, Point, Polygon
from shapely.ops import unary_union
from svgpathtools import parse_path

HERE = Path(__file__).parent
OUT = HERE.parent / "svg"

LINE = 2.0  # duotone line weight on the 24px grid
SOLID_LINE = 2.5  # open lines in the solid variant
CUT = 2.25  # width of a cut in the solid variant
DOT = 1.25  # dots are this many times the line width
GAP = 1.5  # space between a slash and what it crosses
RADIUS = 0.6  # every corner, including those a cut creates
FILL = "var(--color-icon-fill)"
TOLERANCE = 0.015  # simplification, well under a pixel at every size


def lines_of(part):
    if "circle" in part:
        cx, cy, r = part["circle"]
        return [Point(cx, cy).buffer(r, quad_segs=32).exterior]
    path = parse_path(part["d"])
    out = []
    for sub in path.continuous_subpaths():
        n = max(24, int(sub.length() * 8))
        out.append(LineString([(p.real, p.imag) for p in (sub.point(i / n) for i in range(n + 1))]))
    return out


def area_of(part):
    if "circle" in part:
        cx, cy, r = part["circle"]
        return Point(cx, cy).buffer(r, quad_segs=32)
    return unary_union([Polygon(line.coords) for line in lines_of(part)])


def stroke(geoms, width, cap="round"):
    return unary_union([g.buffer(width / 2, cap_style=cap, join_style="round", quad_segs=16) for g in geoms])


def rounded(g):
    """Rounds every corner: convex ones (opening), then concave ones (closing)."""
    g = g.buffer(-RADIUS, quad_segs=16).buffer(RADIUS, quad_segs=16)
    return g.buffer(RADIUS, quad_segs=16).buffer(-RADIUS, quad_segs=16)


def num(v):
    return f"{v:.2f}".rstrip("0").rstrip(".")


def to_d(g):
    g = g.simplify(TOLERANCE)
    polys = [g] if isinstance(g, Polygon) else list(getattr(g, "geoms", []))
    rings = []
    for p in polys:
        if p.is_empty:
            continue
        for ring in [p.exterior, *p.interiors]:
            pts = list(ring.coords)[:-1]
            rings.append("M" + "L".join(f"{num(x)} {num(y)}" for x, y in pts) + "Z")
    return "".join(rings)


def svg(body, root=""):
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"{root}>{body}</svg>\n'


def path_el(part):
    if "circle" in part:
        cx, cy, r = part["circle"]
        return f'cx="{cx}" cy="{cy}" r="{r}"', "circle"
    return f'd="{part["d"]}"', "path"


def duotone(parts):
    stroked = ' fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"'
    slashes = [p for p in parts if p["kind"] == "slash"]
    if slashes:
        # A slash needs a gap cut around it, so this variant is built as geometry too.
        slash = unary_union([l for p in slashes for l in lines_of(p)])
        gap = slash.buffer(LINE / 2 + GAP, cap_style="flat")
        fill = unary_union([area_of(p) for p in parts if p["kind"] == "closed"]).difference(gap)
        line = stroke([l for p in parts if p["kind"] not in ("slash", "dot") for l in lines_of(p)], LINE)
        line = rounded(line.difference(gap)).union(stroke([slash], LINE))
        return svg(f'<path fill="{FILL}" d="{to_d(rounded(fill))}"/><path fill="currentColor" d="{to_d(line)}"/>')
    body = []
    for p in parts:
        # In order: a closed shape paints its fill and outline over what came before.
        if p["kind"] == "closed":
            attrs, tag = path_el(p)
            body.append(f'<{tag} {attrs} fill="{FILL}"/>')
        elif p["kind"] in ("open", "inner", "split"):
            attrs, tag = path_el(p)
            body.append(f"<{tag} {attrs}/>")
        elif p["kind"] == "dot":
            x, y = p["at"]
            body.append(f'<path d="M{x} {y}h.01" stroke-width="{LINE * DOT:g}"/>')
    return svg("".join(body), stroked)


def solid(parts):
    shapes = [area_of(p).buffer(LINE / 2, join_style="round", quad_segs=16) for p in parts if p["kind"] == "closed"]
    cuts = []
    for p in parts:
        if p["kind"] == "inner":
            cuts.append(stroke(lines_of(p), CUT))
        elif p["kind"] == "split":
            cuts.append(stroke(lines_of({"d": p["solidD"]}), CUT, cap="flat"))
        elif p["kind"] == "dot":
            x, y = p["at"]
            cuts.append(Point(x, y).buffer(CUT * DOT / 2, quad_segs=16))
        elif p["kind"] == "slash":
            cuts.append(stroke(lines_of(p), SOLID_LINE + 2 * GAP, cap="flat"))
    body = []
    if shapes:
        g = unary_union(shapes)
        if cuts:
            g = g.difference(unary_union(cuts))
        body.append(f'<path fill="currentColor" fill-rule="evenodd" d="{to_d(rounded(g))}"/>')
    open_lines = [p for p in parts if p["kind"] in ("open", "slash")]
    if open_lines:
        line = stroke([l for p in open_lines for l in lines_of(p)], SOLID_LINE)
        body.append(f'<path fill="currentColor" d="{to_d(line)}"/>')
    return svg("".join(body))


def sheet(names, path):
    """A preview sheet for approval: every icon, both variants, at 56, 24, 20 and 16px."""
    rows = []
    for name in names:
        cells = []
        for variant in ("duotone", "solid"):
            src = (OUT / f"{name}.{variant}.svg").read_text().replace(FILL, "#A8D8D0")
            for size in (56, 24, 20, 16):
                cells.append(f'<span style="width:{size}px;height:{size}px;display:inline-block">{src.replace("<svg ", f"<svg width=\"{size}\" height=\"{size}\" ")}</span>')
        rows.append(f'<div style="display:flex;gap:16px;align-items:center;padding:8px 0"><b style="width:96px;font:600 13px system-ui">{name}</b>{"".join(cells)}</div>')
    path.write_text(f'<!doctype html><meta charset="utf-8"><body style="margin:24px;color:#0B2F2C;background:#fff">{"".join(rows)}</body>')


def main():
    icons = json.loads((HERE / "icons.json").read_text())
    OUT.mkdir(exist_ok=True)
    for name, parts in sorted(icons.items()):
        (OUT / f"{name}.duotone.svg").write_text(duotone(parts))
        (OUT / f"{name}.solid.svg").write_text(solid(parts))
    if "--sheet" in sys.argv:
        sheet(sorted(icons), Path(sys.argv[sys.argv.index("--sheet") + 1]))
    print(f"Drew {len(icons)} icons, 2 variants each, in {OUT}")


if __name__ == "__main__":
    main()
