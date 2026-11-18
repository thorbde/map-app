import { type ComponentProps, type ReactNode, useId } from "react";
import styles from "./Panel.module.css";

export interface PanelProps extends Omit<ComponentProps<"main">, "title"> {
	/** The panel's heading, in its dark header block. It is the page's `h1`. */
	title: string;
	/**
	 * One short line under the title: text, such as "55 countries", or `Link`s
	 * written one after the other with nothing between, such as the region and
	 * the continent. The header spaces them and makes them white.
	 */
	description?: ReactNode;
	/**
	 * The panel is the page's `<main>` (ADR 0010). Use `section` for a second
	 * panel on the same page.
	 */
	as?: "main" | "section";
}

/**
 * The floating panel over the map: a dark header block with the title, and a
 * body that scrolls when it is taller than the space it is given. It doesn't
 * place itself; whoever uses it decides where it floats.
 */
export function Panel({
	title,
	description,
	as: Element = "main",
	className,
	children,
	...props
}: PanelProps) {
	const titleId = useId();
	return (
		<Element
			aria-labelledby={titleId}
			{...props}
			className={[styles.panel, className].filter(Boolean).join(" ")}
		>
			<header className={styles.header}>
				<h1 id={titleId} className={styles.title}>
					{title}
				</h1>
				{description && <p className={styles.description}>{description}</p>}
			</header>
			<div className={styles.body}>{children}</div>
		</Element>
	);
}

export interface PanelSectionProps
	extends Omit<ComponentProps<"section">, "title"> {
	/** The section's heading, an `h2`. */
	title: string;
}

/** A headed section inside a Panel's body. Sections are separated by space. */
export function PanelSection({
	title,
	className,
	children,
	...props
}: PanelSectionProps) {
	const titleId = useId();
	return (
		<section
			aria-labelledby={titleId}
			{...props}
			className={[styles.section, className].filter(Boolean).join(" ")}
		>
			<h2 id={titleId} className={styles.sectionTitle}>
				{title}
			</h2>
			{children}
		</section>
	);
}
