import type { ReactNode } from "react";
import { Chip, Chips } from "../components/Chips/Chips";
import { chipNames, FakeMap } from "./content";

// Stories only (M1 PR 5): the stand-in shell the composed stories sit in.

/** The panel and the continent chips where the shell would put them, over a stand-in map. */
export function Shell({
	current,
	children,
}: {
	current: string;
	children: ReactNode;
}) {
	return (
		<FakeMap>
			<div
				style={{
					position: "absolute",
					inset: "var(--space-4) auto var(--space-4) var(--space-4)",
					display: "flex",
					alignItems: "flex-start",
				}}
			>
				{children}
			</div>
			<Chips
				label="Continents"
				style={{
					position: "absolute",
					inset:
						"var(--space-4) var(--space-4) auto calc(var(--size-panel) + 2 * var(--space-4))",
				}}
			>
				{chipNames.map((name) => (
					<Chip key={name} href="#" current={name === current}>
						{name}
					</Chip>
				))}
			</Chips>
		</FakeMap>
	);
}
