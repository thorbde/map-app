import type { ComponentProps, ReactNode } from "react";
import styles from "./FactBox.module.css";

export interface FactBoxProps extends ComponentProps<"dl"> {
	/** The facts, in the order they are shown. */
	facts: readonly { label: string; value: ReactNode }[];
	/** Where each label sits: beside its value, or above it (more room for long values). */
	labels?: "beside" | "above";
}

/**
 * The fact box: a short list of reference facts, each a label and its value,
 * in the one pale block a panel may hold (DESIGN.md). A description list, so
 * screen readers announce each value with its label.
 */
export function FactBox({
	facts,
	labels = "beside",
	className,
	...props
}: FactBoxProps) {
	return (
		<dl
			{...props}
			className={[styles.box, styles[labels], className]
				.filter(Boolean)
				.join(" ")}
		>
			{facts.map(({ label, value }) => (
				<div key={label} className={styles.fact}>
					<dt className={styles.label}>{label}</dt>
					<dd className={styles.value}>{value}</dd>
				</div>
			))}
		</dl>
	);
}
