import type { ComponentProps, ReactNode } from "react";
import styles from "./FactBox.module.css";

export interface FactBoxProps extends ComponentProps<"dl"> {
	/** The facts, in the order they are shown. */
	facts: readonly { label: string; value: ReactNode }[];
}

/**
 * The fact box: a short list of reference facts, each a small label with its
 * value under it,
 * in the one pale block a panel may hold (DESIGN.md). A description list, so
 * screen readers announce each value with its label.
 */
export function FactBox({ facts, className, ...props }: FactBoxProps) {
	return (
		<dl
			{...props}
			className={[styles.box, className].filter(Boolean).join(" ")}
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
