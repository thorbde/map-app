import type { Preview } from "@storybook/react-vite";
import "@thorbde/tokens/tokens.css";
import "../src/fonts.css";
import "../src/base.css";

const preview: Preview = {
	parameters: {
		layout: "fullscreen",
		controls: { expanded: true },
		// Accessibility violations fail the story's test (pnpm test, via addon-vitest).
		a11y: { test: "error" },
	},
};

export default preview;
