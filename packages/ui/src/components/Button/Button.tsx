import { Button as BaseButton } from "@base-ui/react/button";
import styles from "./Button.module.css";

export interface ButtonProps
	extends Omit<BaseButton.Props, "className" | "render"> {
	/**
	 * `primary` for the main action on a screen, `secondary` for the rest.
	 * `link` reads as a link in text, for a small action inside content, such as
	 * "9 more" after a list. It is still a button: it does something on the page.
	 */
	variant?: "primary" | "secondary" | "link";
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
			className={[
				variant === "link" ? styles.link : styles.button,
				variant !== "link" && styles[variant],
				className,
			]
				.filter(Boolean)
				.join(" ")}
		/>
	);
}
