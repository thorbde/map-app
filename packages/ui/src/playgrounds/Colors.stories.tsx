import type { Meta, StoryObj } from "@storybook/react-vite";
import type { CSSProperties } from "react";
import mapSvg from "./assets/west-africa.svg?raw";
import {
	contrast,
	css,
	fromHex,
	type Oklch,
	type PickedScale,
	type Picks,
	type Roles,
	roles,
	scaleAround,
	steps,
	toHex,
} from "./color";

// ---------------------------------------------------------------------------
// Pieces

const MAP_STYLES = `
.pg-map svg { display: block; width: 100%; height: auto; }
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

/** The app as designed on the canvas: the map as the base, a panel floating on top. */
function AppPreview({ r }: { r: Roles }) {
	return (
		<div
			style={{
				position: "relative",
				borderRadius: 12,
				overflow: "hidden",
				background: css(r.ocean),
			}}
		>
			<MapPreview r={r} />
			<div
				style={{
					position: "absolute",
					top: 12,
					left: 12,
					bottom: 12,
					width: "44%",
					minWidth: 220,
					boxSizing: "border-box",
					background: css(r.surface),
					color: css(r.ink),
					border: `1px solid ${css(r.line)}`,
					borderRadius: 12,
					padding: 16,
					display: "grid",
					alignContent: "start",
					gap: 8,
					boxShadow: "0 8px 24px rgb(0 0 0 / 15%)",
					fontFamily: "system-ui, sans-serif",
				}}
			>
				<span style={{ fontSize: 12, color: css(r.inkMuted) }}>
					West Africa · Written 3 November
				</span>
				<strong style={{ fontSize: 22 }}>Ghana</strong>
				<p style={{ margin: 0, fontSize: 14, lineHeight: 1.5 }}>
					The Volta was dammed into the largest reservoir on Earth.{" "}
					<a href="#ghana" style={{ color: css(r.accent) }}>
						Read the essay
					</a>
				</p>
				<div
					style={{
						fontSize: 12,
						color: css(r.inkMuted),
						background: css(r.background),
						borderRadius: 8,
						padding: "8px 10px",
					}}
				>
					Capital: Accra · Population: about 34 million (2024)
				</div>
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
							fontSize: 14,
						}}
					>
						Continue writing
					</button>
				</div>
			</div>
		</div>
	);
}

type Check = { label: string; a: Oklch; b: Oklch; min?: number; note: string };

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
			note: "shapes, WCAG 1.4.11",
		},
		{
			label: "Selected vs written",
			a: r.selected,
			b: r.written,
			min: 3,
			note: "shapes (picked to pass)",
		},
		{
			label: "Land vs ocean",
			a: r.land,
			b: r.ocean,
			note: "coastline: judge by eye",
		},
	];
}

function ContrastList({ r, theme }: { r: Roles; theme: "light" | "dark" }) {
	const ink = theme === "light" ? "#1a1d21" : "#e8eaed";
	return (
		<table
			style={{
				width: "100%",
				borderCollapse: "collapse",
				fontSize: 12,
				color: ink,
			}}
		>
			<tbody>
				{checks(r).map((check) => {
					const ratio = contrast(check.a, check.b);
					const pass = check.min === undefined ? undefined : ratio >= check.min;
					return (
						<tr
							key={check.label}
							style={{ borderTop: "1px solid rgb(128 128 128 / 30%)" }}
						>
							<td style={{ padding: "4px 0" }}>
								<span
									aria-hidden="true"
									style={{
										display: "inline-block",
										width: 10,
										height: 10,
										marginRight: 8,
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
							<td style={{ textAlign: "right", width: 120 }}>
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

function Theme({ picks, theme }: { picks: Picks; theme: "light" | "dark" }) {
	const r = roles(picks, theme);
	return (
		<section
			aria-label={`${theme} theme`}
			style={{
				background: theme === "light" ? "#ffffff" : "#111316",
				padding: 12,
				borderRadius: 14,
				display: "grid",
				gap: 12,
				alignContent: "start",
			}}
		>
			<AppPreview r={r} />
			<ContrastList r={r} theme={theme} />
		</section>
	);
}

function ScaleRow({ label, picked }: { label: string; picked: PickedScale }) {
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
					const color = picked.scale[step];
					const isPick = step === picked.anchor;
					return (
						<div
							key={step}
							style={{ fontSize: 11, fontVariantNumeric: "tabular-nums" }}
						>
							<div
								style={{
									height: 48,
									borderRadius: 6,
									background: css(color),
									outline: isPick ? "3px solid currentColor" : undefined,
									outlineOffset: 2,
								}}
							/>
							<div style={{ fontWeight: 600, marginTop: 4 }}>
								{step}
								{isPick ? " · your pick" : ""}
							</div>
							<div>{toHex(color)}</div>
							<div title="Contrast with white">
								○ {contrast(color, white).toFixed(1)}
							</div>
							<div title="Contrast with black">
								● {contrast(color, black).toFixed(1)}
							</div>
						</div>
					);
				})}
			</div>
		</div>
	);
}

const page: CSSProperties = {
	padding: 16,
	display: "grid",
	gap: 16,
	fontFamily: "system-ui, sans-serif",
};

const twoUp: CSSProperties = {
	display: "grid",
	gridTemplateColumns: "repeat(auto-fit, minmax(420px, 1fr))",
	gap: 16,
};

// ---------------------------------------------------------------------------
// Stories

const color = (name: string, description: string, category?: string) => ({
	name,
	description,
	control: { type: "color" as const, presetColors: [] as string[] },
	...(category ? { table: { category } } : {}),
});

const meta: Meta = {
	title: "Playgrounds/Colour palettes",
	// Playgrounds are design tools, not components: they deliberately show failing
	// contrast pairs and load fonts from Google, so they're not part of the tests.
	tags: ["!test"],
};
export default meta;

export const Pick: StoryObj<Picks> = {
	name: "Pick colours",
	args: { accent: "#1d5c8a", neutral: "#7a7b77", ocean: "#dce5ea" },
	argTypes: {
		accent: color(
			"accent",
			"Buttons, links and written countries, used exactly as picked in light mode",
		),
		neutral: color(
			"neutral",
			"A mid grey: sets the warmth of backgrounds, text and lines",
		),
		ocean: color(
			"ocean",
			"The sea around the land, used exactly as picked in light mode",
		),
	},
	render: (picks) => (
		<div style={page}>
			<style>{MAP_STYLES}</style>
			<p style={{ margin: 0, maxWidth: 820 }}>
				Pick the three colours in the Controls panel. Each one sits unchanged in
				its scale, at the step closest to its lightness, and the other steps are
				built around it with the same hue. Light mode uses your exact picks;
				dark mode uses the mirrored step (a pick at 600 becomes 400). The
				selected country is the nearest shade that reaches 3:1 against written
				ones.
			</p>
			<div style={twoUp}>
				<Theme picks={picks} theme="light" />
				<Theme picks={picks} theme="dark" />
			</div>
			<ScaleRow label="Accent" picked={scaleAround(fromHex(picks.accent))} />
			<ScaleRow label="Neutral" picked={scaleAround(fromHex(picks.neutral))} />
			<ScaleRow label="Ocean" picked={scaleAround(fromHex(picks.ocean))} />
		</div>
	),
};

type CompareArgs = Record<
	`${"a" | "b" | "c"}_${keyof Picks}` | `${"a" | "b" | "c"}_name`,
	string
>;

const pick = (args: CompareArgs, p: "a" | "b" | "c"): Picks => ({
	accent: args[`${p}_accent`],
	neutral: args[`${p}_neutral`],
	ocean: args[`${p}_ocean`],
});

const compareControls = (p: "a" | "b" | "c", category: string) => ({
	[`${p}_name`]: { name: "name", control: "text", table: { category } },
	[`${p}_accent`]: color("accent", "", category),
	[`${p}_neutral`]: color("neutral", "", category),
	[`${p}_ocean`]: color("ocean", "", category),
});

export const Compare: StoryObj<CompareArgs> = {
	name: "Compare three palettes",
	args: {
		a_name: "A",
		a_accent: "#1d5c8a",
		a_neutral: "#7a7b77",
		a_ocean: "#dce5ea",
		b_name: "B",
		b_accent: "#2f6f4f",
		b_neutral: "#7c786f",
		b_ocean: "#d9e4e2",
		c_name: "C",
		c_accent: "#6b3fa0",
		c_neutral: "#77767d",
		c_ocean: "#e2e3ee",
	},
	argTypes: {
		...compareControls("a", "Palette A"),
		...compareControls("b", "Palette B"),
		...compareControls("c", "Palette C"),
	},
	render: (args) => (
		<div style={page}>
			<style>{MAP_STYLES}</style>
			<div
				style={{
					display: "grid",
					gridTemplateColumns: "repeat(auto-fit, minmax(380px, 1fr))",
					gap: 16,
				}}
			>
				{(["a", "b", "c"] as const).map((p) => (
					<div
						key={p}
						style={{ display: "grid", gap: 12, alignContent: "start" }}
					>
						<h2 style={{ margin: 0, fontSize: 16 }}>{args[`${p}_name`]}</h2>
						<Theme picks={pick(args, p)} theme="light" />
						<Theme picks={pick(args, p)} theme="dark" />
					</div>
				))}
			</div>
		</div>
	),
};
