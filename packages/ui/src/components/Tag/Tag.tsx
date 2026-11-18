import { mergeProps } from "@base-ui/react/merge-props";
import { useRender } from "@base-ui/react/use-render";
import {
	Children,
	type ComponentProps,
	type ReactNode,
	useId,
	useState,
} from "react";
import { Button } from "../Button/Button";
import styles from "./Tag.module.css";

export interface TagProps extends ComponentProps<"span"> {}

/**
 * A short value that can't be pressed, such as one of a country's languages.
 * Small and square-cornered, so it is never taken for a chip (DESIGN.md).
 * It is white: made for the pale fact box.
 */
export function Tag({ className, children, ...props }: TagProps) {
	return (
		<span
			// A tag is one line; should a very long value be cut, this is its full text.
			title={typeof children === "string" ? children : undefined}
			{...props}
			className={[styles.tag, className].filter(Boolean).join(" ")}
		>
			{children}
		</span>
	);
}

export interface TagLinkProps extends useRender.ComponentProps<"a"> {}

/**
 * A tag that is a link, such as a neighbouring country. As small as a Tag, but
 * a pill, because it can be pressed. Renders an `<a>` by default. To use a
 * router's link, pass it as `render`: `<TagLink render={<RouterLink to="/" />}>`.
 */
export function TagLink({ render, className, ...props }: TagLinkProps) {
	return useRender({
		defaultTagName: "a",
		render,
		props: mergeProps<"a">(
			{ className: [styles.tagLink, className].filter(Boolean).join(" ") },
			props,
		),
	});
}

export interface TagListProps extends Omit<ComponentProps<"ul">, "children"> {
	/** The tags: `Tag` or `TagLink` elements. */
	children: ReactNode;
	/**
	 * Show only this many, followed by a button that shows the rest ("9 more",
	 * then "Show fewer"). Leave it out to always show them all.
	 */
	limit?: number;
	/** With `limit`: start with all of them showing. */
	defaultOpen?: boolean;
}

/** A wrapping list of tags, which can hold back all but the first few. */
export function TagList({
	children,
	limit,
	defaultOpen = false,
	className,
	...props
}: TagListProps) {
	const [open, setOpen] = useState(defaultOpen);
	const listId = useId();
	const tags = Children.toArray(children);
	const hidden = limit === undefined ? 0 : tags.length - limit;
	const shown = open || hidden <= 0 ? tags : tags.slice(0, limit);
	return (
		<ul
			{...props}
			id={listId}
			className={[styles.list, className].filter(Boolean).join(" ")}
		>
			{shown.map((tag, index) => (
				// biome-ignore lint/suspicious/noArrayIndexKey: the tags keep their order.
				<li key={index} className={styles.item}>
					{tag}
				</li>
			))}
			{hidden > 0 && (
				<li className={styles.item}>
					<Button
						variant="link"
						aria-expanded={open}
						aria-controls={listId}
						onClick={() => setOpen(!open)}
					>
						{open ? "Show fewer" : `${hidden} more`}
					</Button>
				</li>
			)}
		</ul>
	);
}
