import type { CSSProperties, ReactNode } from "react";
import { Chip, Chips } from "../components/Chips/Chips";
import { chipNames, FakeMap } from "./content";
import styles from "./pieces.module.css";

// PROPOSAL ONLY (M1 PR 5): the shape tiles Thor chose for the world and
// continent panels, and the stand-in shell the stories sit in. The tiles become
// a real component when the outlines have a build step of their own.

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
					<Chip key={name} href="#country" current={name === current}>
						{name}
					</Chip>
				))}
			</Chips>
		</FakeMap>
	);
}

type Item = { name: string; detail?: string };

/** Each country as its own outline with its name under it. Each is a link. */
export function ShapeTiles({
	items,
	columns = 3,
}: {
	items: readonly (Item & { d: string; written?: boolean })[];
	columns?: number;
}) {
	return (
		<ul
			className={styles.tiles}
			style={{ "--columns": columns } as CSSProperties}
		>
			{items.map(({ name, detail, d, written }) => (
				<li key={name}>
					<a
						href="#country"
						className={styles.tile}
						data-written={written ? "" : undefined}
					>
						<svg
							viewBox="0 0 100 100"
							className={styles.tileShape}
							aria-hidden="true"
						>
							<path d={d} />
						</svg>
						<span>
							{name}
							{detail && <span className={styles.tileDetail}>{detail}</span>}
						</span>
					</a>
				</li>
			))}
		</ul>
	);
}
