// Colour maths for the playgrounds: OKLCH scales, sRGB conversion and WCAG contrast.
// OKLCH is perceptual: equal lightness steps look equally far apart, whatever the hue.

export type Oklch = { l: number; c: number; h: number };

const STEPS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950] as const;
type Step = (typeof STEPS)[number];

// Lightness for each step, and how much of the base chroma it gets
// (scales are less colourful at the very light and very dark ends).
const LIGHTNESS = [
	0.975, 0.94, 0.87, 0.78, 0.68, 0.58, 0.49, 0.41, 0.33, 0.26, 0.2,
];
const CHROMA_SHARE = [0.2, 0.35, 0.55, 0.75, 0.92, 1, 1, 0.92, 0.8, 0.65, 0.5];

function toLinearRgb({ l, c, h }: Oklch): [number, number, number] {
	const rad = (h * Math.PI) / 180;
	const a = c * Math.cos(rad);
	const b = c * Math.sin(rad);
	const l_ = (l + 0.3963377774 * a + 0.2158037573 * b) ** 3;
	const m_ = (l - 0.1055613458 * a - 0.0638541728 * b) ** 3;
	const s_ = (l - 0.0894841775 * a - 1.291485548 * b) ** 3;
	return [
		4.0767416621 * l_ - 3.3077115913 * m_ + 0.2309699292 * s_,
		-1.2684380046 * l_ + 2.6097574011 * m_ - 0.3413193965 * s_,
		-0.0041960863 * l_ - 0.7034186147 * m_ + 1.707614701 * s_,
	];
}

const inGamut = (rgb: number[]) =>
	rgb.every((v) => v >= -1e-4 && v <= 1 + 1e-4);

/** Lowers chroma until the colour fits in sRGB, keeping lightness and hue. */
function toGamut(color: Oklch): Oklch {
	if (inGamut(toLinearRgb(color))) return color;
	let low = 0;
	let high = color.c;
	for (let i = 0; i < 20; i++) {
		const mid = (low + high) / 2;
		if (inGamut(toLinearRgb({ ...color, c: mid }))) low = mid;
		else high = mid;
	}
	return { ...color, c: low };
}

const clamp = (v: number) => Math.min(1, Math.max(0, v));

export function toHex(color: Oklch): string {
	return `#${toLinearRgb(toGamut(color))
		.map((v) => {
			const lin = clamp(v);
			const srgb =
				lin <= 0.0031308 ? 12.92 * lin : 1.055 * lin ** (1 / 2.4) - 0.055;
			return Math.round(srgb * 255)
				.toString(16)
				.padStart(2, "0");
		})
		.join("")}`;
}

function luminance(color: Oklch): number {
	const [r, g, b] = toLinearRgb(toGamut(color)).map(clamp) as [
		number,
		number,
		number,
	];
	return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG 2 contrast ratio, from 1 to 21. */
export function contrast(a: Oklch, b: Oklch): number {
	const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [
		number,
		number,
	];
	return (hi + 0.05) / (lo + 0.05);
}

/** Parses #rrggbb into OKLCH. */
export function fromHex(hex: string): Oklch {
	const n = Number.parseInt(hex.replace("#", "").slice(0, 6), 16);
	const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
		const c = v / 255;
		return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
	}) as [number, number, number];
	const l_ = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
	const m_ = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
	const s_ = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
	const l = 0.2104542553 * l_ + 0.793617785 * m_ - 0.0040720468 * s_;
	const a = 1.9779984951 * l_ - 2.428592205 * m_ + 0.4505937099 * s_;
	const bb = 0.0259040371 * l_ + 0.7827717662 * m_ - 0.808675766 * s_;
	const h = (Math.atan2(bb, a) * 180) / Math.PI;
	return { l, c: Math.hypot(a, bb), h: h < 0 ? h + 360 : h };
}

type Scale = Record<Step, Oklch>;

/** A scale built around a picked colour, which sits unchanged at its nearest step. */
export type PickedScale = { scale: Scale; anchor: Step };

const indexOf = (step: Step) => STEPS.indexOf(step);
const stepAt = (i: number): Step =>
	STEPS[Math.min(STEPS.length - 1, Math.max(0, i))] as Step;

export function scaleAround(pick: Oklch): PickedScale {
	// The step whose lightness is closest to the pick holds the pick itself.
	let anchorIndex = 0;
	for (let i = 1; i < STEPS.length; i++) {
		const distance = Math.abs((LIGHTNESS[i] ?? 0) - pick.l);
		if (distance < Math.abs((LIGHTNESS[anchorIndex] ?? 0) - pick.l)) {
			anchorIndex = i;
		}
	}
	// The other steps keep the pick's hue, with chroma scaled from the pick's.
	const baseChroma = pick.c / (CHROMA_SHARE[anchorIndex] ?? 1);
	const scale = Object.fromEntries(
		STEPS.map((step, i) => [
			step,
			i === anchorIndex
				? pick
				: toGamut({
						l: LIGHTNESS[i] ?? 0.5,
						c: baseChroma * (CHROMA_SHARE[i] ?? 1),
						h: pick.h,
					}),
		]),
	) as Scale;
	return { scale, anchor: stepAt(anchorIndex) };
}

/** The same distance from the other end of the scale: 600 ↔ 400, 100 ↔ 900. */
const mirrored = (step: Step) => stepAt(STEPS.length - 1 - indexOf(step));

export const steps = STEPS;

/** The colours Thor picks: each is used exactly as picked in the light theme. */
export type Picks = { accent: string; neutral: string; ocean: string };

const WHITE: Oklch = { l: 1, c: 0, h: 0 };

/** Whichever of the candidates contrasts most with the background. */
const bestOn = (background: Oklch, ...candidates: Oklch[]) =>
	candidates.reduce((best, c) =>
		contrast(c, background) > contrast(best, background) ? c : best,
	);

/**
 * The first step that reaches 3:1 against `from` (WCAG 1.4.11 for shapes),
 * looking in the preferred direction first, else the strongest one.
 */
function distinctFrom(s: Scale, from: Step, direction: 1 | -1): Oklch {
	const start = indexOf(from);
	const nearestFirst = (side: 1 | -1) =>
		STEPS.filter((_, i) => (i - start) * side > 0).sort(
			(x, y) => Math.abs(indexOf(x) - start) - Math.abs(indexOf(y) - start),
		);
	const order = [
		...nearestFirst(direction),
		...nearestFirst(-direction as 1 | -1),
	];
	const base = s[from];
	const hit = order.find((step) => contrast(s[step], base) >= 3);
	return hit ? s[hit] : bestOn(base, ...order.map((step) => s[step]));
}

/** The semantic roles the app needs, for one theme. */
export function roles(p: Picks, theme: "light" | "dark") {
	const accent = scaleAround(fromHex(p.accent));
	const neutral = scaleAround(fromHex(p.neutral)).scale;
	const ocean = scaleAround(fromHex(p.ocean));
	if (theme === "light") {
		const a = accent.scale[accent.anchor];
		return {
			background: neutral[50],
			surface: WHITE,
			ink: neutral[950],
			inkMuted: neutral[600],
			line: neutral[200],
			accent: a,
			onAccent: bestOn(a, WHITE, neutral[950]),
			ocean: ocean.scale[ocean.anchor],
			land: neutral[50],
			border: neutral[300],
			written: a,
			selected: distinctFrom(accent.scale, accent.anchor, 1),
		};
	}
	const darkAccent = mirrored(accent.anchor);
	const a = accent.scale[darkAccent];
	return {
		background: neutral[950],
		surface: neutral[900],
		ink: neutral[50],
		inkMuted: neutral[400],
		line: neutral[800],
		accent: a,
		onAccent: bestOn(a, WHITE, neutral[950]),
		ocean: ocean.scale[mirrored(ocean.anchor)],
		land: neutral[800],
		border: neutral[700],
		written: a,
		selected: distinctFrom(accent.scale, darkAccent, -1),
	};
}

export type Roles = ReturnType<typeof roles>;

export const css = ({ l, c, h }: Oklch) =>
	`oklch(${(l * 100).toFixed(1)}% ${c.toFixed(3)} ${h.toFixed(1)})`;
