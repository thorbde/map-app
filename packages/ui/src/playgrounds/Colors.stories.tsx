import type { Meta, StoryObj } from "@storybook/react-vite";
import type { CSSProperties } from "react";
import mapSvg from "./assets/west-africa.svg?raw";
import {
	contrast,
	css,
	type Oklch,
	type PaletteSettings,
	type Roles,
	roles,
	type Scale,
	scale,
	steps,
	toHex,
} from "./color";

// ---------------------------------------------------------------------------
// Pieces

const MAP_STYLES = `
.pg-map svg { display: block; width: 100%; height: auto; border-radius: 8px; }
.pg-map .ocean { fill: var(--ocean); }
.pg-map path { stroke: var(--border); stroke-width: 0.6; stroke-linejoin: round; }
.pg-map .land { fill: var(--land); }
.pg-map .written { fill: var(--written); }
.pg-map .selected { fill: var(--selected); }
`;

function MapPreview({ r }: { r: Roles }) {
	const vars = {
		"--ocean": css(r.ocean),
		"--land": css(r.land),
		"--border": css(r.border),
		"--written": css(r.written),
		"--selected": css(r.selected),
	} as CSSProperties;
	return (
		<div
			className="pg-map"
			style={vars}
			// Our own build-time SVG from Natural Earth, not user content.
			// biome-ignore lint/security/noDangerouslySetInnerHtml: trusted static asset
			dangerouslySetInnerHTML={{ __html: mapSvg }}
		/>
	);
}

type Check = {
	label: string;
	a: Oklch;
	b: Oklch;
	min?: number;
	note: string;
};

function checks(r: Roles): Check[] {
	return [
		{
			label: "Text on surface",
			a: r.ink,
			b: r.surface,
			min: 4.5,
			note: "AA text",
		},
		{
			label: "Muted text on surface",
			a: r.inkMuted,
			b: r.surface,
			min: 4.5,
			note: "AA text",
		},
		{
			label: "Muted text on background",
			a: r.inkMuted,
			b: r.background,
			min: 4.5,
			note: "AA text",
		},
		{
			label: "Link (accent) on surface",
			a: r.accent,
			b: r.surface,
			min: 4.5,
			note: "AA text",
		},
		{
			label: "Button text on accent",
			a: r.onAccent,
			b: r.accent,
			min: 4.5,
			note: "AA text",
		},
		{
			label: "Written country vs land",
			a: r.written,
			b: r.land,
			min: 3,
			note: "non-text, WCAG 1.4.11",
		},
		{
			label: "Selected vs written",
			a: r.selected,
			b: r.written,
			min: 3,
			note: "non-text",
		},
		{
			label: "Land vs ocean",
			a: r.land,
			b: r.ocean,
			note: "coastline legibility, judge by eye",
		},
	];
}

function ContrastList({ r }: { r: Roles }) {
	return (
		<table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
			<tbody>
				{checks(r).map((check) => {
					const ratio = contrast(check.a, check.b);
					const pass = check.min === undefined ? undefined : ratio >= check.min;
					return (
						<tr
							key={check.label}
							style={{ borderTop: `1px solid ${css(r.line)}` }}
						>
							<td style={{ padding: "4px 0" }}>
								<span
									aria-hidden="true"
									style={{
										display: "inline-block",
										width: 10,
										height: 10,
										marginRight: 6,
										borderRadius: 2,
										background: css(check.a),
										outline: `3px solid ${css(check.b)}`,
									}}
								/>
								{check.label}
							</td>
							<td
								style={{
									textAlign: "right",
									fontVariantNumeric: "tabular-nums",
								}}
							>
								{ratio.toFixed(2)}:1
							</td>
							<td style={{ textAlign: "right", width: 92 }}>
								{pass === undefined ? "–" : pass ? "✓ pass" : "✗ fail"}
								<div style={{ opacity: 0.7 }}>{check.note}</div>
							</td>
						</tr>
					);
				})}
			</tbody>
		</table>
	);
}

function ThemeCard({
	settings,
	theme,
}: {
	settings: PaletteSettings;
	theme: "light" | "dark";
}) {
	const r = roles(settings, theme);
	return (
		<section
			aria-label={`${theme} theme`}
			style={{
				background: css(r.background),
				color: css(r.ink),
				padding: 16,
				borderRadius: 12,
				display: "grid",
				gap: 12,
			}}
		>
			<MapPreview r={r} />
			<div
				style={{
					background: css(r.surface),
					border: `1px solid ${css(r.line)}`,
					borderRadius: 10,
					padding: 16,
					display: "grid",
					gap: 8,
				}}
			>
				<span style={{ fontSize: 12, color: css(r.inkMuted) }}>
					West Africa · Written 3 November
				</span>
				<strong style={{ fontSize: 22 }}>Ghana</strong>
				<p style={{ margin: 0, lineHeight: 1.5 }}>
					The Volta was dammed into the largest reservoir on Earth.{" "}
					<a href="#ghana" style={{ color: css(r.accent) }}>
						Read the essay
					</a>
				</p>
				<div>
					<button
						type="button"
						style={{
							background: css(r.accent),
							color: css(r.onAccent),
							border: 0,
							borderRadius: 8,
							padding: "10px 16px",
							font: "inherit",
						}}
					>
						Continue writing
					</button>
				</div>
			</div>
			<ContrastList r={r} />
		</section>
	);
}

function Column({
	name,
	settings,
}: {
	name: string;
	settings: PaletteSettings;
}) {
	return (
		<div style={{ display: "grid", gap: 12, alignContent: "start" }}>
			<h2 style={{ margin: 0, fontSize: 16 }}>{name}</h2>
			<ThemeCard settings={settings} theme="light" />
			<ThemeCard settings={settings} theme="dark" />
		</div>
	);
}

function ScaleRow({ label, s }: { label: string; s: Scale }) {
	const white: Oklch = { l: 1, c: 0, h: 0 };
	const black: Oklch = { l: 0, c: 0, h: 0 };
	return (
		<div>
			<h3 style={{ margin: "0 0 6px", fontSize: 14 }}>{label}</h3>
			<div
				style={{
					display: "grid",
					gridTemplateColumns: "repeat(11, minmax(0, 1fr))",
					gap: 4,
				}}
			>
				{steps.map((step) => {
					const color = s[step];
					const onWhite = contrast(color, white);
					const onBlack = contrast(color, black);
					return (
						<div
							key={step}
							style={{ fontSize: 11, fontVariantNumeric: "tabular-nums" }}
						>
							<div
								style={{ height: 48, borderRadius: 6, background: css(color) }}
							/>
							<div style={{ fontWeight: 600 }}>{step}</div>
							<div>{toHex(color)}</div>
							<div title="Contrast with white">○ {onWhite.toFixed(1)}</div>
							<div title="Contrast with black">● {onBlack.toFixed(1)}</div>
						</div>
					);
				})}
			</div>
		</div>
	);
}

// ---------------------------------------------------------------------------
// Controls

type CompareArgs = Record<
	`${"a" | "b" | "c"}_${keyof PaletteSettings}`,
	number
> & {
	a_name: string;
	b_name: string;
	c_name: string;
};

const hue = { control: { type: "range", min: 0, max: 360, step: 1 } } as const;
const chroma = {
	control: { type: "range", min: 0, max: 0.25, step: 0.005 },
} as const;

function controlsFor(prefix: "a" | "b" | "c", category: string) {
	const table = { table: { category } };
	return {
		[`${prefix}_name`]: { control: "text", name: "name", ...table },
		[`${prefix}_accentHue`]: { ...hue, name: "accent hue", ...table },
		[`${prefix}_accentChroma`]: { ...chroma, name: "accent chroma", ...table },
		[`${prefix}_neutralHue`]: {
			...hue,
			name: "neutral hue (warmth)",
			...table,
		},
		[`${prefix}_neutralChroma`]: {
			...chroma,
			name: "neutral chroma",
			...table,
		},
		[`${prefix}_oceanHue`]: { ...hue, name: "ocean hue", ...table },
		[`${prefix}_oceanChroma`]: { ...chroma, name: "ocean chroma", ...table },
	};
}

const pick = (args: CompareArgs, p: "a" | "b" | "c"): PaletteSettings => ({
	accentHue: args[`${p}_accentHue`],
	accentChroma: args[`${p}_accentChroma`],
	neutralHue: args[`${p}_neutralHue`],
	neutralChroma: args[`${p}_neutralChroma`],
	oceanHue: args[`${p}_oceanHue`],
	oceanChroma: args[`${p}_oceanChroma`],
});

const meta: Meta<CompareArgs> = {
	title: "Playgrounds/Colour palettes",
	args: {
		a_name: "A: Atlas blue (the canvas)",
		a_accentHue: 245,
		a_accentChroma: 0.12,
		a_neutralHue: 110,
		a_neutralChroma: 0.006,
		a_oceanHue: 230,
		a_oceanChroma: 0.03,
		b_name: "B: Lagoon teal",
		b_accentHue: 195,
		b_accentChroma: 0.11,
		b_neutralHue: 200,
		b_neutralChroma: 0.01,
		b_oceanHue: 215,
		b_oceanChroma: 0.04,
		c_name: "C: Terracotta on paper",
		c_accentHue: 35,
		c_accentChroma: 0.13,
		c_neutralHue: 80,
		c_neutralChroma: 0.012,
		c_oceanHue: 225,
		c_oceanChroma: 0.03,
	},
	argTypes: {
		...controlsFor("a", "Palette A"),
		...controlsFor("b", "Palette B"),
		...controlsFor("c", "Palette C"),
	},
};

export default meta;
type Story = StoryObj<CompareArgs>;

export const Compare: Story = {
	name: "Compare three palettes",
	render: (args) => (
		<div style={{ padding: 16, fontFamily: "system-ui, sans-serif" }}>
			<style>{MAP_STYLES}</style>
			<p style={{ marginTop: 0, maxWidth: 720 }}>
				Each palette is built from a few dials in OKLCH, so equal steps look
				equally different. Every text pair shows its WCAG contrast. Change the
				dials in the Controls panel.
			</p>
			<div
				style={{
					display: "grid",
					gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
					gap: 16,
				}}
			>
				<Column name={args.a_name} settings={pick(args, "a")} />
				<Column name={args.b_name} settings={pick(args, "b")} />
				<Column name={args.c_name} settings={pick(args, "c")} />
			</div>
		</div>
	),
};

export const Scales: Story = {
	name: "Scales of palette A",
	render: (args) => {
		const p = pick(args, "a");
		return (
			<div
				style={{
					padding: 16,
					display: "grid",
					gap: 16,
					fontFamily: "system-ui, sans-serif",
				}}
			>
				<p style={{ margin: 0 }}>
					The full scales behind palette A, with each step's contrast against
					white (○) and black (●). 4.5 is the minimum for body text, 3 for large
					text and shapes.
				</p>
				<ScaleRow label="Accent" s={scale(p.accentHue, p.accentChroma)} />
				<ScaleRow label="Neutral" s={scale(p.neutralHue, p.neutralChroma)} />
				<ScaleRow label="Ocean" s={scale(p.oceanHue, p.oceanChroma)} />
			</div>
		);
	},
};
