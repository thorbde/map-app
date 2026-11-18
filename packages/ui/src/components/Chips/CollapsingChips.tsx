import { Collapsible } from "@base-ui/react/collapsible";
import {
	type ComponentProps,
	type FocusEvent,
	type KeyboardEvent,
	type ReactNode,
	useRef,
	useState,
} from "react";
import styles from "./Chips.module.css";

export interface CollapsingChipsProps
	extends Omit<ComponentProps<"nav">, "aria-label"> {
	/** Names the group for screen readers, such as "Continents". */
	label: string;
	/** The view that is showing, such as "Africa". It is what the closed control reads. */
	current: ReactNode;
	/** The other views, as `Chip` links. They slide out when the control opens. */
	children: ReactNode;
	/** Start open. */
	defaultOpen?: boolean;
}

/**
 * Chips that collapse into the current one, to leave the map free. The rest
 * slide out beside it when the pointer is over the control, when the keyboard
 * focus arrives, or when it is pressed (touch screens have no hover). Escape,
 * choosing a chip, and moving away close it.
 *
 * Built on Base UI's Collapsible: the current chip is a button that says
 * whether the rest are showing, and the rest are ordinary links in a `<nav>`.
 */
export function CollapsingChips({
	label,
	current,
	children,
	defaultOpen = false,
	className,
	...props
}: CollapsingChipsProps) {
	const [open, setOpen] = useState(defaultOpen);
	const trigger = useRef<HTMLButtonElement>(null);
	// The mouse is over the control: a click then must not close it again.
	const hovering = useRef(false);
	// Just closed on purpose (Escape, or a chip was chosen): stay closed until
	// the pointer or the focus has left.
	const held = useRef(false);

	const close = () => {
		held.current = true;
		setOpen(false);
	};

	const onKeyDown = (event: KeyboardEvent) => {
		if (event.key !== "Escape" || !open) return;
		close();
		trigger.current?.focus();
	};

	const onBlur = (event: FocusEvent<HTMLElement>) => {
		if (event.currentTarget.contains(event.relatedTarget)) return;
		held.current = false;
		if (!hovering.current) setOpen(false);
	};

	return (
		<Collapsible.Root
			open={open}
			// A press toggles it, except under a mouse, where hovering already opened it.
			onOpenChange={(next) => {
				held.current = false;
				setOpen(hovering.current ? true : next);
			}}
			render={<nav {...props} aria-label={label} />}
			className={[styles.collapsing, className].filter(Boolean).join(" ")}
			onKeyDown={onKeyDown}
			onBlur={onBlur}
			onPointerEnter={(event) => {
				if (event.pointerType !== "mouse") return;
				hovering.current = true;
				if (!held.current) setOpen(true);
			}}
			onPointerLeave={(event) => {
				if (event.pointerType !== "mouse") return;
				hovering.current = false;
				held.current = false;
				// Stay open only while the keyboard focus is inside; a chip that was
				// merely clicked with the mouse doesn't hold it open.
				if (!event.currentTarget.querySelector(":focus-visible")) {
					setOpen(false);
				}
			}}
		>
			<Collapsible.Trigger
				ref={trigger}
				className={styles.trigger}
				// Arriving by keyboard opens it; a tap or click is handled as a press.
				onFocus={(event) => {
					if (!held.current && event.currentTarget.matches(":focus-visible")) {
						setOpen(true);
					}
				}}
			>
				{current}
			</Collapsible.Trigger>
			<Collapsible.Panel
				keepMounted
				className={styles.panel}
				render={<ul />}
				// Choosing a chip closes the control; the new page sets `current`.
				onClick={(event) => {
					if ((event.target as HTMLElement).closest("a")) close();
				}}
			>
				{children}
			</Collapsible.Panel>
		</Collapsible.Root>
	);
}
