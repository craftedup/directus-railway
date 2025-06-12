import InterfaceComponent from "./interface.vue";

export default {
	id: "video-embed-field",
	name: "Video Embed",
	icon: "video_library",
	description: "Embed videos from YouTube, Vimeo, and other video platforms",
	component: InterfaceComponent,
	options: [
		{
			field: "placeholder",
			name: "Placeholder Text",
			type: "string",
			meta: {
				width: "full",
				interface: "input",
			},
			schema: {
				default_value: "Paste a video URL (YouTube, Vimeo, etc.)",
			},
		},
		{
			field: "auto_fetch",
			name: "Auto-process URLs",
			type: "boolean",
			meta: {
				width: "half",
				interface: "boolean",
			},
			schema: {
				default_value: true,
			},
		},
		{
			field: "show_preview",
			name: "Show Preview",
			type: "boolean",
			meta: {
				width: "half",
				interface: "boolean",
			},
			schema: {
				default_value: true,
			},
		},
	],
	types: ["json"],
};

