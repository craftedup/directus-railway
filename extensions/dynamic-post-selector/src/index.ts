import InterfaceComponent from "./interface.vue";

export default {
	id: "dynamic-post-selector",
	name: "Dynamic Post Selector",
	icon: "article",
	description: "Select a post from a collection based on the block type",
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
				default_value: "Select a featured post...",
			},
		},
		{
			field: "type_field",
			name: "Type Field",
			type: "string",
			meta: {
				width: "full",
				interface: "input",
				note: "Field name that contains the collection type (defaults to 'type')",
			},
			schema: {
				default_value: "type",
			},
		},
	],
	types: ["integer", "string", "uuid"],
};

