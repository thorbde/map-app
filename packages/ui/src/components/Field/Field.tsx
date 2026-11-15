import { Field as BaseField } from "@base-ui/react/field";
import type { ComponentPropsWithRef } from "react";
import styles from "./Field.module.css";

export interface FieldProps
	extends Omit<ComponentPropsWithRef<"input">, "className"> {
	/** The visible label. Every field has one. */
	label: string;
	/** Help text under the input, linked to it for screen readers. */
	description?: string;
	/** An error from the server or a validator. Marks the field invalid and is announced. */
	error?: string;
	className?: string;
}

/** A labelled text input, with an optional description and error. Built on Base UI's Field. */
export function Field({
	label,
	description,
	error,
	name,
	disabled,
	className,
	...inputProps
}: FieldProps) {
	return (
		<BaseField.Root
			name={name}
			disabled={disabled}
			invalid={Boolean(error)}
			className={[styles.root, className].filter(Boolean).join(" ")}
		>
			<BaseField.Label className={styles.label}>{label}</BaseField.Label>
			<BaseField.Control {...inputProps} className={styles.control} />
			{description && (
				<BaseField.Description className={styles.description}>
					{description}
				</BaseField.Description>
			)}
			<BaseField.Error match={Boolean(error)} className={styles.error}>
				{error}
			</BaseField.Error>
		</BaseField.Root>
	);
}
