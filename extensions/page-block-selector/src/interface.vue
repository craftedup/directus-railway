<template>
	<div>
		<v-list>
			<v-list-item
				v-for="block in formattedBlocks"
				:key="block.value"
				:value="block.value"
				@click="toggleSelection(block.value)"
				:active="selectedBlocks.includes(block.value)"
				clickable
			>
				<v-list-item-content>
					<v-list-item-title>{{ block.title }}</v-list-item-title>
				</v-list-item-content>

				<template #append>
					<v-icon
						v-if="selectedBlocks.includes(block.value)"
						name="check"
						class="text-success"
					/>
				</template>
			</v-list-item>

			<v-list-item v-if="loading">
				<v-list-item-content>
					<v-list-item-title>Loading blocks...</v-list-item-title>
				</v-list-item-content>
			</v-list-item>

			<v-list-item v-else-if="!currentPageId">
				<v-list-item-content>
					<v-list-item-title>No page context found</v-list-item-title>
				</v-list-item-content>
			</v-list-item>

			<v-list-item v-else-if="formattedBlocks.length === 0">
				<v-list-item-content>
					<v-list-item-title>No blocks found on this page</v-list-item-title>
				</v-list-item-content>
			</v-list-item>
		</v-list>

		<!-- Sortable list of selected blocks -->
		<div
			v-if="sortedBlocks.length > 0"
			class="mt-4"
		>
			<div class="text-sm font-medium mb-2">Selected blocks (drag to reorder):</div>
			<draggable
				v-model="sortedBlocks"
				item-key="id"
				@change="handleSort"
				class="space-y-2"
			>
				<template #item="{ element }">
					<div class="flex items-center p-2 bg-gray-50 rounded border cursor-move">
						<v-icon
							name="drag_indicator"
							class="mr-2 text-gray-400"
						/>
						<span>{{ element.display_name }}</span>
						<v-btn
							icon
							size="small"
							variant="text"
							@click="removeBlock(element.id)"
							class="ml-auto"
						>
							<v-icon name="close" />
						</v-btn>
					</div>
				</template>
			</draggable>
		</div>
	</div>
</template>

<script setup lang="ts">
	import { ref, computed, onMounted, inject, watch } from "vue";
	import { useApi } from "@directus/extensions-sdk";
	import draggable from "vuedraggable";

	interface Props {
		value?: string[] | null;
		placeholder?: string;
	}

	interface Emits {
		(event: "input", value: string[] | null): void;
	}

	const props = withDefaults(defineProps<Props>(), {
		placeholder: "Select blocks from this page",
	});

	const emit = defineEmits<Emits>();

	const api = useApi();
	const values = inject("values") as Record<string, any> | undefined;

	const loading = ref(false);
	const availableBlocks = ref<Array<{ id: string; display_name: string; collection: string }>>([]);
	const sortedBlocks = ref<Array<{ id: string; display_name: string; collection: string }>>([]);

	// Get selected block IDs
	const selectedBlocks = computed(() => {
		return props.value || [];
	});

	// Format blocks for v-select (Vuetify expects specific structure)
	const formattedBlocks = computed(() => {
		const formatted = availableBlocks.value.map((block) => ({
			title: block.display_name,
			value: block.id,
			...block, // Keep original data
		}));
		return formatted;
	});

	// Get the current page ID from the editing context
	const currentPageId = computed(() => {
		// Extract page ID from URL path (when editing pages directly)
		const urlPath = window.location.pathname;
		const pageMatch = urlPath.match(/\/pages\/([a-f0-9-]+)/);
		if (pageMatch) {
			return pageMatch[1];
		}

		return null;
	});

	const fetchPageBlocks = async () => {
		if (!currentPageId.value) {
			console.warn("No page ID found for block selector");
			return;
		}

		loading.value = true;
		try {
			// First, get the page_blocks with basic info (collection and item ID)
			const response = await api.get("/items/page_blocks", {
				params: {
					filter: {
						page: { _eq: currentPageId.value },
						hide_block: { _neq: true },
					},
					fields: ["id", "collection", "sort", "item"],
					sort: ["sort"],
				},
			});

			// Now fetch the actual block data for each block
			const blocksWithData = await Promise.all(
				response.data.data
					.filter((block: any) => block.id !== values?.id) // Exclude current block if editing a block
					.map(async (block: any) => {
						try {
							// Fetch the actual block data from its collection
							const blockResponse = await api.get(`/items/${block.collection}/${block.item}`);
							const itemData = blockResponse.data.data;

							// Try to get a meaningful display name from various possible fields
							const displayName =
								itemData?.headline ||
								itemData?.title ||
								itemData?.heading ||
								itemData?.name ||
								itemData?.eyebrow ||
								itemData?.tagline ||
								itemData?.eyebrow_heading ||
								itemData?.subheading ||
								itemData?.label ||
								// Then check for specific content indicators
								(itemData?.numOfColumns ? `${itemData.numOfColumns} columns` : null) ||
								(itemData?.alignment ? `Alignment: ${itemData.alignment}` : null) ||
								(itemData?.text ? itemData.text.substring(0, 50) + "..." : null) ||
								(itemData?.content ? itemData.content.substring(0, 50) + "..." : null) ||
								// Fallback to any string field that might be meaningful
								(() => {
									const stringFields = Object.entries(itemData || {}).filter(
										([key, value]) =>
											typeof value === "string" &&
											value.length > 0 &&
											value.length < 100 &&
											!key.includes("id") &&
											!key.includes("date") &&
											!key.includes("user")
									);
									return stringFields.length > 0 ? stringFields[0][1] : "Untitled Block";
								})();

							const blockType = block.collection
								.replace("block_", "")
								.replace(/_/g, " ")
								.replace(/\b\w/g, (l: string) => l.toUpperCase());

							const result = {
								id: block.id,
								display_name: `${blockType}: ${displayName}`,
								collection: block.collection,
								item_id: block.item,
							};

							return result;
						} catch (error) {
							console.error(
								`Error fetching block data for ${block.collection}/${block.item}:`,
								error
							);

							// Fallback to just collection name if we can't fetch the block data
							const blockType = block.collection
								.replace("block_", "")
								.replace(/_/g, " ")
								.replace(/\b\w/g, (l: string) => l.toUpperCase());

							return {
								id: block.id,
								display_name: `${blockType}: [Error loading data]`,
								collection: block.collection,
								item_id: block.item,
							};
						}
					})
			);

			availableBlocks.value = blocksWithData;

			// Update sorted blocks with full block data
			updateSortedBlocks();
		} catch (error) {
			console.error("Error fetching page blocks:", error);
			availableBlocks.value = [];
		} finally {
			loading.value = false;
		}
	};

	const updateSortedBlocks = () => {
		if (!selectedBlocks.value.length) {
			sortedBlocks.value = [];
			return;
		}

		sortedBlocks.value = selectedBlocks.value
			.map((id) => availableBlocks.value.find((block) => block.id === id))
			.filter(Boolean) as Array<{ id: string; display_name: string; collection: string }>;
	};

	const toggleSelection = (blockId: string) => {
		const currentSelection = [...selectedBlocks.value];
		const index = currentSelection.indexOf(blockId);

		if (index > -1) {
			currentSelection.splice(index, 1);
		} else {
			currentSelection.push(blockId);
		}

		emit("input", currentSelection);
	};

	const handleSort = () => {
		// Extract IDs in the new order
		const newOrder = sortedBlocks.value.map((block) => block.id);
		emit("input", newOrder);
	};

	const removeBlock = (blockId: string) => {
		const newSelection = selectedBlocks.value.filter((id) => id !== blockId);
		emit("input", newSelection);
	};

	// Watch for changes in selection to update sorted blocks
	watch(selectedBlocks, updateSortedBlocks, { immediate: true });

	// Watch for changes in page context
	watch(
		currentPageId,
		(newPageId) => {
			if (newPageId) {
				fetchPageBlocks();
			} else {
				availableBlocks.value = [];
			}
		},
		{ immediate: true }
	);

	onMounted(() => {
		fetchPageBlocks();
	});
</script>

<style scoped>
	.v-list {
		max-height: 300px;
		overflow-y: auto;
		border: var(--theme--border-width) solid var(--theme--form--field--input--border-color);
		border-radius: var(--theme--border-radius);
		background-color: var(--theme--background);
	}

	.text-success {
		color: var(--theme--success);
	}
</style>

