import type { ReactNode, SVGProps } from "react";

export interface IconProps
	extends Omit<SVGProps<SVGSVGElement>, "children" | "viewBox"> {
	/** `duotone` everywhere by default; `solid` for active and selected states. */
	variant?: "duotone" | "solid";
	/** 16, 20 or 24px, from the `size.icon` tokens. */
	size?: "sm" | "md" | "lg";
	/**
	 * Only for an icon that carries meaning on its own (an icon-only button's icon
	 * gets its name from the button instead). Without it, the icon is hidden from
	 * screen readers.
	 */
	label?: string;
}

interface DrawingProps extends IconProps {
	duotone: ReactNode;
	solid: ReactNode;
}

/** Draws one icon from its two drawings. The generated icons wrap this. */
export function Icon({
	duotone,
	solid,
	variant = "duotone",
	size = "md",
	label,
	style,
	...props
}: DrawingProps) {
	const dimension = `var(--size-icon-${size})`;
	return (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			viewBox="0 0 24 24"
			focusable="false"
			role={label ? "img" : undefined}
			aria-label={label}
			aria-hidden={label ? undefined : true}
			{...props}
			style={{ width: dimension, height: dimension, flexShrink: 0, ...style }}
		>
			{label && <title>{label}</title>}
			{variant === "solid" ? solid : duotone}
		</svg>
	);
}
