import InterfaceComponent from "./interface.vue";

export default {
	id: "oembed-field",
	name: "oEmbed",
	icon: "video_library",
	description: "Embed content from external providers like YouTube, Vimeo, etc.",
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
				default_value: "Paste a URL (YouTube, Vimeo, etc.)",
			},
		},
		{
			field: "auto_fetch",
			name: "Auto-fetch oEmbed Data",
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

