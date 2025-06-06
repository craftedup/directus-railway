declare module "*.vue" {
	import { DefineComponent } from "vue";
	const component: DefineComponent<{}, {}, any>;
	export default component;
}

declare module "vuedraggable" {
	import { DefineComponent } from "vue";
	const draggable: DefineComponent<any, any, any>;
	export default draggable;
}

