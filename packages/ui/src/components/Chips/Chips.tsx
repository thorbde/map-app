import { mergeProps } from "@base-ui/react/merge-props";
import { useRender } from "@base-ui/react/use-render";
import type { ComponentProps } from "react";
import styles from "./Chips.module.css";

export interface ChipsProps extends Omit<ComponentProps<"nav">, "aria-label"> {
	/** Names the group for screen readers, such as "Continents". */
	label: string;
}

/**
 * A row of chips that switch between views of the same thing, such as the
 * continents on the map. The chips are links, so the group is a `<nav>`.
 * It wraps onto more rows when it runs out of width.
 */
export function Chips({ label, className, children, ...props }: ChipsProps) {
	return (
		<nav
			{...props}
			aria-label={label}
			className={[styles.chips, className].filter(Boolean).join(" ")}
		>
			<ul className={styles.list}>{children}</ul>
		</nav>
	);
}

export interface ChipProps extends useRender.ComponentProps<"a"> {
	/**
	 * Marks the chip for the view that is showing. A router's link that sets
	 * `aria-current="page"` itself is marked without this.
	 */
	current?: boolean;
}

/**
 * One chip: a link. Renders an `<a>` by default. To use a router's link, pass
 * it as `render`: `<Chip render={<NavLink to="/africa" />}>Africa</Chip>`.
 */
export function Chip({ current, render, className, ...props }: ChipProps) {
	const link = useRender({
		defaultTagName: "a",
		render,
		props: mergeProps<"a">(
			{
				className: [styles.chip, className].filter(Boolean).join(" "),
				...(current && { "aria-current": "page" as const }),
			},
			props,
		),
	});
	return <li className={styles.item}>{link}</li>;
}
