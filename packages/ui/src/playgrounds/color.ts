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

export type Scale = Record<Step, Oklch>;

export function scale(hue: number, chroma: number): Scale {
	return Object.fromEntries(
		STEPS.map((step, i) => [
			step,
			toGamut({
				l: LIGHTNESS[i] ?? 0.5,
				c: chroma * (CHROMA_SHARE[i] ?? 1),
				h: hue,
			}),
		]),
	) as Scale;
}

export const steps = STEPS;

export type PaletteSettings = {
	accentHue: number;
	accentChroma: number;
	neutralHue: number;
	neutralChroma: number;
	oceanHue: number;
	oceanChroma: number;
};

const WHITE: Oklch = { l: 1, c: 0, h: 0 };

/** The semantic roles the app needs, for one theme. */
export function roles(p: PaletteSettings, theme: "light" | "dark") {
	const accent = scale(p.accentHue, p.accentChroma);
	const neutral = scale(p.neutralHue, p.neutralChroma);
	const ocean = scale(p.oceanHue, p.oceanChroma);
	return theme === "light"
		? {
				background: neutral[50],
				surface: WHITE,
				ink: neutral[950],
				inkMuted: neutral[600],
				line: neutral[200],
				accent: accent[600],
				onAccent: WHITE,
				ocean: ocean[100],
				land: neutral[50],
				border: neutral[300],
				written: accent[600],
				selected: accent[900],
			}
		: {
				background: neutral[950],
				surface: neutral[900],
				ink: neutral[50],
				inkMuted: neutral[400],
				line: neutral[800],
				accent: accent[300],
				onAccent: neutral[950],
				ocean: ocean[950],
				land: neutral[800],
				border: neutral[700],
				written: accent[400],
				selected: accent[100],
			};
}

export type Roles = ReturnType<typeof roles>;

export const css = ({ l, c, h }: Oklch) =>
	`oklch(${(l * 100).toFixed(1)}% ${c.toFixed(3)} ${h.toFixed(1)})`;
