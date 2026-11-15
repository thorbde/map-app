import { Button as BaseButton } from "@base-ui/react/button";
import styles from "./Button.module.css";

export interface ButtonProps
	extends Omit<BaseButton.Props, "className" | "render"> {
	/** `primary` for the main action on a screen, `secondary` for the rest. */
	variant?: "primary" | "secondary";
	className?: string;
}

/** A button for actions. Built on Base UI's Button, so it behaves like a native one. */
export function Button({
	variant = "primary",
	className,
	...props
}: ButtonProps) {
	return (
		<BaseButton
			{...props}
			className={[styles.button, styles[variant], className]
				.filter(Boolean)
				.join(" ")}
		/>
	);
}
