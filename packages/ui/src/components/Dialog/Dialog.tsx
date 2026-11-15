import { Dialog as BaseDialog } from "@base-ui/react/dialog";
import type { ReactElement, ReactNode } from "react";
import { Button, type ButtonProps } from "../Button/Button";
import styles from "./Dialog.module.css";

export interface DialogProps {
	/** The element that opens the dialog, usually a Button. */
	trigger: ReactElement;
	/** The dialog's heading. It also names the dialog for screen readers. */
	title: string;
	/** A sentence under the title, linked to the dialog for screen readers. */
	description?: string;
	/** Extra content between the description and the actions. */
	children?: ReactNode;
	/** The buttons at the bottom. Use `DialogClose` for the one that just closes it. */
	actions: ReactNode;
	/** For a controlled dialog. Leave both out and the dialog manages itself. */
	open?: boolean;
	onOpenChange?: (open: boolean) => void;
}

/**
 * A modal dialog. Focus moves into it, stays inside while it's open, and goes back
 * to the trigger when it closes. Escape and clicking the backdrop close it.
 * Built on Base UI's Dialog.
 */
export function Dialog({
	trigger,
	title,
	description,
	children,
	actions,
	open,
	onOpenChange,
}: DialogProps) {
	return (
		<BaseDialog.Root open={open} onOpenChange={onOpenChange}>
			<BaseDialog.Trigger render={trigger} />
			<BaseDialog.Portal>
				<BaseDialog.Backdrop className={styles.backdrop} />
				<BaseDialog.Popup className={styles.popup}>
					<BaseDialog.Title className={styles.title}>{title}</BaseDialog.Title>
					{description && (
						<BaseDialog.Description className={styles.description}>
							{description}
						</BaseDialog.Description>
					)}
					{children}
					<div className={styles.actions}>{actions}</div>
				</BaseDialog.Popup>
			</BaseDialog.Portal>
		</BaseDialog.Root>
	);
}

/** A Button that closes the dialog it's in. Secondary by default. */
export function DialogClose({ variant = "secondary", ...props }: ButtonProps) {
	return <BaseDialog.Close render={<Button variant={variant} {...props} />} />;
}
