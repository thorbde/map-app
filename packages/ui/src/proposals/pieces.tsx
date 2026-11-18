import { Accordion } from "@base-ui/react/accordion";
import { PlusIcon } from "@thorbde/icons";
import { type CSSProperties, type ReactNode, useState } from "react";
import { Chip, Chips } from "../components/Chips/Chips";
import { chipNames, FakeMap } from "./content";
import styles from "./pieces.module.css";

// PROPOSALS ONLY (M1 PR 5): the alternatives Thor chooses between, built just
// well enough to judge and to use by keyboard. The chosen ones become real
// components in src/components; the rest is deleted.

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

/** A: index rows, as in an atlas's index. The whole row is one link. */
export function IndexRows({ items }: { items: readonly Item[] }) {
	return (
		<ul className={styles.rows}>
			{items.map(({ name, detail }) => (
				<li key={name}>
					<a href="#country" className={styles.row}>
						{name}
						{detail && <span className={styles.rowDetail}>{detail}</span>}
					</a>
				</li>
			))}
		</ul>
	);
}

/** A: regions that open and close. Base UI's Accordion; closed regions are still found by the browser's "find in page". */
export function RegionAccordion({
	regions,
	open,
}: {
	regions: readonly { region: string; count: number; children: ReactNode }[];
	open: string[];
}) {
	return (
		<Accordion.Root
			multiple
			defaultValue={open}
			hiddenUntilFound
			className={styles.accordion}
		>
			{regions.map(({ region, count, children }) => (
				<Accordion.Item key={region} value={region}>
					<Accordion.Header
						render={(props) => <h2 {...props} />}
						className={styles.accordionHeader}
					>
						<Accordion.Trigger className={styles.accordionTrigger}>
							<PlusIcon size="sm" className={styles.accordionIcon} />
							{region}
							<span className={styles.accordionCount}>{count}</span>
						</Accordion.Trigger>
					</Accordion.Header>
					<Accordion.Panel className={styles.accordionPanel}>
						{children}
					</Accordion.Panel>
				</Accordion.Item>
			))}
		</Accordion.Root>
	);
}

/** B: the Chip without its shadow, for inside a panel. Each is a link. */
export function FlatChips({ names }: { names: readonly string[] }) {
	return (
		<ul className={styles.flatChips}>
			{names.map((name) => (
				<li key={name}>
					<a href="#country" className={styles.flatChip}>
						{name}
					</a>
				</li>
			))}
		</ul>
	);
}

/** C: each country as its own outline with its name under it. Each is a link. */
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

/**
 * Long fact values: the first few, then a button that shows the rest.
 * `tags` sets each value as a square-cornered tag; `text` keeps plain text.
 */
export function Values({
	values,
	look,
	limit = 3,
	defaultOpen = false,
}: {
	values: readonly string[];
	look: "tags" | "text";
	limit?: number;
	defaultOpen?: boolean;
}) {
	const [open, setOpen] = useState(defaultOpen);
	const hidden = values.length - limit;
	const shown = open || hidden <= 0 ? values : values.slice(0, limit);
	return (
		<ul className={styles.values}>
			{shown.map((value, index) => (
				<li key={value} className={look === "tags" ? styles.tag : undefined}>
					{value}
					{look === "text" && index < shown.length - 1 && ","}
				</li>
			))}
			{hidden > 0 && (
				<li>
					<button
						type="button"
						className={styles.more}
						aria-expanded={open}
						onClick={() => setOpen(!open)}
					>
						{open ? "Show fewer" : `${hidden} more`}
					</button>
				</li>
			)}
		</ul>
	);
}

/** A value that can't be pressed, small and square-cornered. Not a chip. */
export function Tag({ children }: { children: ReactNode }) {
	return <span className={styles.tag}>{children}</span>;
}

/** The class that collapses a Chips group to its current chip (a sketch). */
export const collapsing = styles.collapsing;
