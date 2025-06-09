import InterfaceComponent from "./interface.vue";

export default {
	id: "page-block-selector",
	name: "Page Block Selector",
	icon: "ballot",
	description: "Select from blocks on the current page",
	component: InterfaceComponent,
	options: [
		{
			field: "placeholder",
			name: "Placeholder",
			type: "string",
			meta: {
				width: "full",
				interface: "input",
			},
			schema: {
				default_value: "Select blocks from this page",
			},
		},
	],
	types: ["json"],
};

