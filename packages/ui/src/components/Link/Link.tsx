import { mergeProps } from "@base-ui/react/merge-props";
import { useRender } from "@base-ui/react/use-render";
import buttonStyles from "../Button/Button.module.css";
import styles from "./Link.module.css";

export interface LinkProps extends useRender.ComponentProps<"a"> {
	/**
	 * `inline` for links in text. `primary` and `secondary` look like the Button's
	 * variants, for links that read as actions ("Next: Senegal →").
	 */
	variant?: "inline" | "primary" | "secondary";
}

/**
 * A link. Renders an `<a>` by default. To use a router's link (client-side
 * navigation), pass it as `render`: `<Link render={<RouterLink to="/" />}>`.
 */
export function Link({
	variant = "inline",
	render,
	className,
	...props
}: LinkProps) {
	const variantClass =
		variant === "inline"
			? styles.inline
			: [buttonStyles.button, buttonStyles[variant]].join(" ");
	return useRender({
		defaultTagName: "a",
		render,
		props: mergeProps<"a">(
			{
				className: [variantClass, className].filter(Boolean).join(" "),
			},
			props,
		),
	});
}
