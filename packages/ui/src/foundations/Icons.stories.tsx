import type { Meta, StoryObj } from "@storybook/react-vite";
import type { IconProps } from "@thorbde/icons";
import * as icons from "@thorbde/icons";
import type { ComponentType } from "react";

const all = Object.entries(icons) as [string, ComponentType<IconProps>][];

const meta: Meta = {
	title: "Foundations/Icons",
	parameters: { layout: "padded" },
};
export default meta;

/** Every icon in both variants and all three sizes: the sheet Thor approves icons from. */
export const Gallery: StoryObj = {
	render: () => (
		<table
			style={{ borderCollapse: "collapse", color: "var(--color-text-default)" }}
		>
			<thead>
				<tr>
					<th
						scope="col"
						style={{ textAlign: "left", padding: "var(--space-2)" }}
					>
						Icon
					</th>
					<th scope="col" colSpan={3} style={{ padding: "var(--space-2)" }}>
						Duotone (default)
					</th>
					<th scope="col" colSpan={3} style={{ padding: "var(--space-2)" }}>
						Solid (active)
					</th>
				</tr>
			</thead>
			<tbody>
				{all.map(([name, Icon]) => (
					<tr key={name}>
						<th
							scope="row"
							style={{
								textAlign: "left",
								padding: "var(--space-2)",
								fontWeight: 400,
							}}
						>
							<code>{name}</code>
						</th>
						{(["duotone", "solid"] as const).flatMap((variant) =>
							(["lg", "md", "sm"] as const).map((size) => (
								<td key={variant + size} style={{ padding: "var(--space-2)" }}>
									<Icon variant={variant} size={size} />
								</td>
							)),
						)}
					</tr>
				))}
			</tbody>
		</table>
	),
};

/** An icon that means something on its own gets a label, which screen readers announce. */
export const WithLabel: StoryObj = {
	render: () => <icons.ErrorIcon label="Error" />,
};
