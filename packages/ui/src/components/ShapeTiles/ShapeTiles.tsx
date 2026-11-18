import { mergeProps } from "@base-ui/react/merge-props";
import { useRender } from "@base-ui/react/use-render";
import type { ComponentProps, CSSProperties, ReactElement } from "react";
import styles from "./ShapeTiles.module.css";

export interface ShapeTile {
	/** The name under the outline. It is the link's text. */
	name: string;
	/** A second, muted line under the name, such as "55 countries". */
	detail?: string;
	/** The outline: an SVG path drawn in a 100 × 100 box. */
	d: string;
	/** Filled in the written colour instead of the pale one. */
	written?: boolean;
	/** Where the tile leads, for a plain link. */
	href?: string;
	/** A router's link to use instead of an `<a>`: `render: <RouterLink to="/se" />`. */
	render?: ReactElement;
}

export interface ShapeTilesProps
	extends Omit<ComponentProps<"ul">, "children"> {
	/** The tiles, in order. */
	items: readonly ShapeTile[];
	/** How many to a row. Three for a few large tiles, four with `dense`. */
	columns?: number;
	/** Smaller outlines and tighter spacing, for many tiles. */
	dense?: boolean;
}

function Tile({ name, detail, d, written, href, render }: ShapeTile) {
	return useRender({
		defaultTagName: "a",
		render,
		props: mergeProps<"a">(
			{
				href,
				className: styles.tile,
				...(written && { "data-written": "" }),
				children: (
					<>
						<svg
							viewBox="0 0 100 100"
							className={styles.shape}
							aria-hidden="true"
						>
							<path d={d} />
						</svg>
						<span>
							{name}
							{detail && <span className={styles.detail}>{detail}</span>}
						</span>
					</>
				),
			},
			{},
		),
	});
}

/**
 * A grid of links, each a shape with its name under it: the continents of the
 * world, or the countries of a continent as their own outlines. It knows
 * nothing about maps: a shape is any SVG path in a 100 × 100 box.
 */
export function ShapeTiles({
	items,
	columns = 3,
	dense = false,
	className,
	style,
	...props
}: ShapeTilesProps) {
	return (
		<ul
			{...props}
			className={[styles.tiles, dense && styles.dense, className]
				.filter(Boolean)
				.join(" ")}
			style={{ "--columns": columns, ...style } as CSSProperties}
		>
			{items.map((item) => (
				<li key={item.name}>
					<Tile {...item} />
				</li>
			))}
		</ul>
	);
}
