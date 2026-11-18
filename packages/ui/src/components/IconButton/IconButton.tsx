import { Button as BaseButton } from "@base-ui/react/button";
import type { ReactNode } from "react";
import styles from "./IconButton.module.css";

export interface IconButtonProps
	extends Omit<BaseButton.Props, "className" | "render" | "children"> {
	/** What the button does, for screen readers and as its tooltip: "Zoom in". */
	label: string;
	/** One icon from `@thorbde/icons`. */
	children: ReactNode;
	className?: string;
}

/**
 * A round button with an icon and no visible text, for controls that float over
 * the map, such as zoom in and out. Built on Base UI's Button.
 */
export function IconButton({
	label,
	className,
	children,
	...props
}: IconButtonProps) {
	return (
		<BaseButton
			// A button that stops being pressable while it has focus (zoom out, at
			// the furthest zoom) keeps the focus, so a keyboard user isn't sent
			// back to the top of the page.
			focusableWhenDisabled
			{...props}
			aria-label={label}
			title={label}
			className={[styles.button, className].filter(Boolean).join(" ")}
		>
			{children}
		</BaseButton>
	);
}
