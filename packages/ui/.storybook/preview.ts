import type { Preview } from "@storybook/react-vite";

const preview: Preview = {
	parameters: {
		layout: "fullscreen",
		controls: { expanded: true },
		// Playgrounds deliberately show failing contrast pairs, so the checker only reports.
		a11y: { test: "todo" },
	},
};

export default preview;
