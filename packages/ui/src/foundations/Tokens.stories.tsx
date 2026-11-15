import type { Meta, StoryObj } from "@storybook/react-vite";
import "@thorbde/tokens/tokens.css";
import primitives from "@thorbde/tokens/tokens/primitives.json";
import semantic from "@thorbde/tokens/tokens/semantic.json";
import type { CSSProperties, ReactNode } from "react";

// A living overview of @thorbde/tokens, read straight from the DTCG files, so it
// can never drift from them. Every swatch and sample uses the generated CSS variable.

type Group = Record<string, unknown>;
type Token = { path: string[]; description?: string };

/** Every token in a DTCG group: objects with a $value. */
function tokensIn(group: Group, path: string[] = []): Token[] {
	return Object.entries(group).flatMap(([key, value]) => {
		if (key.startsWith("$") || typeof value !== "object" || value === null)
			return [];
		const node = value as Group;
		if ("$value" in node) {
			return [
				{
					path: [...path, key],
					description:
						typeof node.$description === "string"
							? node.$description
							: undefined,
				},
			];
		}
		return tokensIn(node, [...path, key]);
	});
}

const cssVar = (path: string[]) => `--${path.join("-")}`;
const group = (root: Group, key: string) => (root[key] ?? {}) as Group;

const page: CSSProperties = {
	padding: 24,
	display: "grid",
	gap: 32,
	alignContent: "start",
	background: "var(--color-bg-page)",
	color: "var(--color-text-default)",
	fontFamily: "var(--font-ui)",
	minHeight: "100vh",
};

function Section({
	title,
	note,
	children,
}: {
	title: string;
	note?: string;
	children: ReactNode;
}) {
	return (
		<section style={{ display: "grid", gap: 12 }}>
			<header>
				<h2 style={{ margin: 0, fontSize: "var(--font-size-lg)" }}>{title}</h2>
				{note && (
					<p style={{ margin: "4px 0 0", color: "var(--color-text-muted)" }}>
						{note}
					</p>
				)}
			</header>
			{children}
		</section>
	);
}

const label: CSSProperties = {
	fontSize: "var(--font-size-xs)",
	color: "var(--color-text-muted)",
	fontFamily: "ui-monospace, monospace",
};

function Swatches({ tokens }: { tokens: Token[] }) {
	return (
		<div
			style={{
				display: "grid",
				gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))",
				gap: 12,
			}}
		>
			{tokens.map((token) => (
				<div key={token.path.join(".")} style={{ display: "grid", gap: 6 }}>
					<div
						style={{
							height: 56,
							borderRadius: "var(--radius-md)",
							background: `var(${cssVar(token.path)})`,
							border: "1px solid var(--color-border-default)",
						}}
					/>
					<code style={label}>{cssVar(token.path)}</code>
					{token.description && <span style={label}>{token.description}</span>}
				</div>
			))}
		</div>
	);
}

const meta: Meta = { title: "Foundations/Tokens" };
export default meta;

export const Colours: StoryObj = {
	render: () => (
		<div style={page}>
			<Section
				title="Semantic colours"
				note="What components and the app use. The palette is a greyscale placeholder until it's chosen (docs/design/brief.md)."
			>
				<Swatches tokens={tokensIn(group(semantic, "color"), ["color"])} />
			</Section>
			<Section
				title="Primitive colours"
				note="Raw values behind the semantic tokens."
			>
				<Swatches tokens={tokensIn(group(primitives, "color"), ["color"])} />
			</Section>
		</div>
	),
};

export const Typography: StoryObj = {
	render: () => {
		const font = group(primitives, "font");
		return (
			<div style={page}>
				<Section
					title="Font roles"
					note="Placeholders until the fonts are chosen."
				>
					{tokensIn(group(semantic, "font"), ["font"]).map((token) => (
						<div key={token.path.join(".")} style={{ display: "grid", gap: 4 }}>
							<code style={label}>{cssVar(token.path)}</code>
							<span
								style={{
									fontFamily: `var(${cssVar(token.path)})`,
									fontSize: "var(--font-size-xl)",
								}}
							>
								Côte d'Ivoire, São Tomé and Hà Nội: 12 / 195 countries
							</span>
						</div>
					))}
				</Section>
				<Section title="Sizes">
					{tokensIn(group(font, "size"), ["font", "size"]).map((token) => (
						<div
							key={token.path.join(".")}
							style={{
								display: "grid",
								gridTemplateColumns: "180px 1fr",
								alignItems: "baseline",
							}}
						>
							<code style={label}>{cssVar(token.path)}</code>
							<span
								style={{
									fontSize: `var(${cssVar(token.path)})`,
									lineHeight: "var(--font-line-height-tight)",
								}}
							>
								Geography and nature
							</span>
						</div>
					))}
				</Section>
				<Section title="Weights and line heights">
					{tokensIn(group(font, "weight"), ["font", "weight"]).map((token) => (
						<div
							key={token.path.join(".")}
							style={{
								fontWeight: `var(${cssVar(token.path)})`,
							}}
						>
							<code style={label}>{cssVar(token.path)}</code> Continue writing
						</div>
					))}
					{tokensIn(group(font, "line-height"), ["font", "line-height"]).map(
						(token) => (
							<div key={token.path.join(".")} style={{ maxWidth: 520 }}>
								<code style={label}>{cssVar(token.path)}</code>
								<p
									style={{
										margin: 0,
										lineHeight: `var(${cssVar(token.path)})`,
									}}
								>
									Ghana sits on the Gulf of Guinea, a few degrees north of the
									equator. The Greenwich meridian runs through the port city of
									Tema.
								</p>
							</div>
						),
					)}
				</Section>
			</div>
		);
	},
};

export const SpaceRadiusShadow: StoryObj = {
	name: "Space, radius and shadow",
	render: () => (
		<div style={page}>
			<Section title="Space" note="A 4px grid.">
				{tokensIn(group(primitives, "space"), ["space"]).map((token) => (
					<div
						key={token.path.join(".")}
						style={{
							display: "grid",
							gridTemplateColumns: "120px 1fr",
							alignItems: "center",
						}}
					>
						<code style={label}>{cssVar(token.path)}</code>
						<div
							style={{
								height: 12,
								width: `var(${cssVar(token.path)})`,
								background: "var(--color-accent-default)",
							}}
						/>
					</div>
				))}
			</Section>
			<Section title="Radius">
				<div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
					{tokensIn(group(primitives, "radius"), ["radius"]).map((token) => (
						<div
							key={token.path.join(".")}
							style={{ display: "grid", gap: 6, justifyItems: "start" }}
						>
							<div
								style={{
									width: 72,
									height: 72,
									borderRadius: `var(${cssVar(token.path)})`,
									background: "var(--color-bg-surface)",
									border: "1px solid var(--color-border-default)",
								}}
							/>
							<code style={label}>{cssVar(token.path)}</code>
						</div>
					))}
				</div>
			</Section>
			<Section title="Shadow">
				{tokensIn(group(primitives, "shadow"), ["shadow"]).map((token) => (
					<div
						key={token.path.join(".")}
						style={{
							width: 280,
							padding: "var(--space-4)",
							borderRadius: "var(--radius-lg)",
							background: "var(--color-bg-surface)",
							boxShadow: `var(${cssVar(token.path)})`,
						}}
					>
						<code style={label}>{cssVar(token.path)}</code>
						<div>{token.description}</div>
					</div>
				))}
			</Section>
		</div>
	),
};
