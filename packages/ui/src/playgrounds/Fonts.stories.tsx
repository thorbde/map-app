import type { Meta, StoryObj } from "@storybook/react-vite";
import { type CSSProperties, useEffect, useState } from "react";

// Fonts already on people's machines; everything else is loaded from Google Fonts.
// Google Fonts is only for comparing here: the app will host its fonts itself (GDPR).
const SYSTEM_FONTS = new Set([
	"system-ui",
	"Segoe UI",
	"Arial",
	"Helvetica",
	"Georgia",
	"Charter",
	"Iowan Old Style",
	"Times New Roman",
]);

const loaded = new Set<string>();

function loadFromGoogle(family: string) {
	if (SYSTEM_FONTS.has(family) || loaded.has(family)) return;
	loaded.add(family);
	const link = document.createElement("link");
	link.rel = "stylesheet";
	link.href = `https://fonts.googleapis.com/css2?family=${family.replaceAll(" ", "+")}:ital,wght@0,400;0,500;0,600;0,700;1,400&display=swap`;
	document.head.append(link);
}

/** "loading", then whether the browser really has the font (or silently fell back). */
function useFontStatus(family: string) {
	const [status, setStatus] = useState<"loading" | "loaded" | "missing">(
		"loading",
	);
	useEffect(() => {
		let active = true;
		setStatus("loading");
		if (family === "system-ui") {
			setStatus("loaded");
			return;
		}
		loadFromGoogle(family);
		const font = `400 16px "${family}"`;
		document.fonts
			.load(font)
			.then(() => {
				if (active)
					setStatus(document.fonts.check(font) ? "loaded" : "missing");
			})
			.catch(() => active && setStatus("missing"));
		// Stylesheets can arrive after the first check.
		const retry = setTimeout(() => {
			if (active && document.fonts.check(font)) setStatus("loaded");
		}, 2500);
		return () => {
			active = false;
			clearTimeout(retry);
		};
	}, [family]);
	return status;
}

const list = (value: string) =>
	value
		.split(",")
		.map((name) => name.trim())
		.filter(Boolean);

const stack = (family: string, fallback: "sans-serif" | "serif") =>
	family === "system-ui" ? "system-ui, sans-serif" : `"${family}", ${fallback}`;

type Theme = "light" | "dark";
const THEMES: Record<Theme, CSSProperties> = {
	light: { background: "#fbfbf9", color: "#1a1d21" },
	dark: { background: "#16191d", color: "#e8eaed" },
};

const ESSAY = `Ghana sits on the Gulf of Guinea, a few degrees north of the equator. The Greenwich meridian runs through the port city of Tema. Inland, the Akosombo Dam turned the Volta River into Lake Volta, the largest reservoir on Earth by surface area. Why is Accra the capital, not Cape Coast? The British moved the colonial capital there in 1877, partly because its drier climate was thought to be healthier.`;
const NAMES =
	"Côte d'Ivoire · São Tomé and Príncipe · Curaçao · Türkiye · Åland · Malmö · Kraków · Reykjavík · Hà Nội";
const NUMBERS = "0123456789 · 34 412 000 · 12 / 195 countries · 6 March 1957";

function FontStatus({ family }: { family: string }) {
	const status = useFontStatus(family);
	const source = SYSTEM_FONTS.has(family) ? "on your machine" : "Google Fonts";
	return (
		<div
			style={{
				display: "flex",
				justifyContent: "space-between",
				gap: 8,
				fontFamily: "system-ui, sans-serif",
				fontSize: 12,
				opacity: 0.8,
			}}
		>
			<strong style={{ fontSize: 13 }}>{family}</strong>
			<span>
				{source} ·{" "}
				{status === "loaded"
					? "✓ loaded"
					: status === "missing"
						? "✗ not found: showing a fallback"
						: "loading…"}
			</span>
		</div>
	);
}

function Card({
	families,
	theme,
	children,
}: {
	families: string[];
	theme: Theme;
	children: React.ReactNode;
}) {
	return (
		<section
			aria-label={families.join(" and ")}
			style={{
				...THEMES[theme],
				borderRadius: 12,
				padding: 20,
				display: "grid",
				gap: 12,
				outline: "1px solid rgb(128 128 128 / 25%)",
			}}
		>
			<header style={{ display: "grid", gap: 4 }}>
				{families.map((family) => (
					<FontStatus key={family} family={family} />
				))}
			</header>
			{children}
		</section>
	);
}

type Args = {
	candidates: string;
	size: number;
	weight: number;
	lineHeight: number;
	theme: Theme;
};

const grid: CSSProperties = {
	padding: 16,
	display: "grid",
	gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))",
	gap: 16,
};

const meta: Meta<Args> = {
	title: "Playgrounds/Fonts",
	// A design tool, not a component: not part of the tests (see Colour palettes).
	tags: ["!test"],
	argTypes: {
		candidates: {
			control: "text",
			description:
				"Comma-separated. Any Google Fonts family, or a system font (system-ui, Segoe UI, Georgia, Charter…)",
		},
		size: { control: { type: "range", min: 12, max: 24, step: 1 } },
		weight: { control: { type: "range", min: 300, max: 700, step: 100 } },
		lineHeight: { control: { type: "range", min: 1.1, max: 1.9, step: 0.05 } },
		theme: { control: "inline-radio", options: ["light", "dark"] },
	},
};

export default meta;
type Story = StoryObj<Args>;

export const Interface: Story = {
	name: "Interface fonts (sans)",
	args: {
		candidates:
			"Plus Jakarta Sans, Manrope, Sora, DM Sans, Outfit, Lexend, Figtree, Inter, IBM Plex Sans, system-ui",
		size: 15,
		weight: 400,
		lineHeight: 1.45,
		theme: "light",
	},
	render: (args) => (
		<div style={grid}>
			{list(args.candidates).map((family) => (
				<Card key={family} families={[family]} theme={args.theme}>
					<div
						style={{
							fontFamily: stack(family, "sans-serif"),
							display: "grid",
							gap: 10,
						}}
					>
						<div
							style={{
								fontSize: 28,
								fontWeight: 600,
								letterSpacing: "-0.01em",
							}}
						>
							Alex Berg's map
						</div>
						<div
							style={{
								fontSize: args.size,
								fontWeight: args.weight,
								lineHeight: args.lineHeight,
							}}
						>
							Writing my way around the world, one country a month. Click any
							country on the map to write about it.
						</div>
						<div
							style={{
								display: "flex",
								gap: 8,
								flexWrap: "wrap",
								fontSize: 14,
							}}
						>
							<span style={{ fontWeight: 600 }}>Continue writing</span>·
							<span>Settings</span>·<span>Saved</span>·
							<span style={{ fontWeight: 500 }}>In progress</span>
						</div>
						<div style={{ fontSize: 12, opacity: 0.75 }}>
							Written 3 November 2026 · Unpublished changes
						</div>
						<div
							style={{
								fontSize: args.size,
								fontVariantNumeric: "tabular-nums",
							}}
						>
							{NUMBERS}
						</div>
						<div style={{ fontSize: args.size }}>{NAMES}</div>
						<div style={{ fontSize: 13 }}>
							Il1 O0 rn m · “Quotes” — dashes – and…
						</div>
					</div>
				</Card>
			))}
		</div>
	),
};

export const Essay: Story = {
	name: "Essay fonts (serif)",
	args: {
		candidates:
			"Newsreader, Source Serif 4, Literata, Lora, Spectral, Charter, Georgia",
		size: 18,
		weight: 400,
		lineHeight: 1.6,
		theme: "light",
	},
	render: (args) => (
		<div style={grid}>
			{list(args.candidates).map((family) => (
				<Card key={family} families={[family]} theme={args.theme}>
					<article
						style={{
							fontFamily: stack(family, "serif"),
							display: "grid",
							gap: 10,
						}}
					>
						<div style={{ fontSize: 40, fontWeight: 600, lineHeight: 1.05 }}>
							Ghana
						</div>
						<div style={{ fontSize: 22, fontWeight: 600 }}>
							Geography and nature
						</div>
						<p
							style={{
								margin: 0,
								fontSize: args.size,
								fontWeight: args.weight,
								lineHeight: args.lineHeight,
								maxWidth: "65ch",
							}}
						>
							{ESSAY}
						</p>
						<p style={{ margin: 0, fontSize: args.size, fontStyle: "italic" }}>
							What I got wrong: I was sure Kumasi was the capital.
						</p>
						<p style={{ margin: 0, fontSize: args.size - 2 }}>{NAMES}</p>
					</article>
				</Card>
			))}
		</div>
	),
};

type PairingArgs = { sans: string; serif: string; theme: Theme };

export const Pairing: StoryObj<PairingArgs> = {
	name: "Pairing: interface + essay",
	args: { sans: "IBM Plex Sans", serif: "Source Serif 4", theme: "light" },
	argTypes: {
		sans: { control: "text" },
		serif: { control: "text" },
		theme: { control: "inline-radio", options: ["light", "dark"] },
	},
	render: (args) => {
		const sans = stack(args.sans, "sans-serif");
		const serif = stack(args.serif, "serif");
		return (
			<div style={{ padding: 16, maxWidth: 560 }}>
				<Card families={[args.sans, args.serif]} theme={args.theme}>
					<div style={{ display: "grid", gap: 10 }}>
						<div style={{ fontFamily: sans, fontSize: 13, opacity: 0.75 }}>
							Alex Berg / Africa · Written 3 November 2026
						</div>
						<div style={{ fontFamily: serif, fontSize: 40, fontWeight: 600 }}>
							Ghana
						</div>
						<p
							style={{
								fontFamily: serif,
								fontSize: 18,
								lineHeight: 1.6,
								margin: 0,
							}}
						>
							{ESSAY}
						</p>
						<div
							style={{
								fontFamily: sans,
								fontSize: 14,
								display: "flex",
								gap: 12,
							}}
						>
							<strong>Edit essay</strong>
							<span>← Chile</span>
							<span>Senegal →</span>
						</div>
					</div>
				</Card>
			</div>
		);
	},
};
