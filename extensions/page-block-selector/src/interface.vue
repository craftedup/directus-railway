<template>
	<div>
		<v-list>
			<v-list-item
				v-for="block in formattedBlocks"
				:key="block.value"
				:value="block.value"
				@click="toggleSelection(block.value)"
				:active="selectedBlockIds.includes(block.value)"
				clickable
			>
				<v-list-item-content>
					<v-list-item-title>{{ block.title }}</v-list-item-title>
				</v-list-item-content>

				<template #append>
					<v-icon
						v-if="selectedBlockIds.includes(block.value)"
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

		<!-- Sortable list of selected blocks with label inputs -->
		<div
			v-if="selectedItems.length > 0"
			class="mt-4"
		>
			<div class="text-sm font-medium mb-2">Selected blocks (drag to reorder, edit labels):</div>
			<draggable
				v-model="selectedItems"
				item-key="block_id"
				@change="handleSort"
				class="space-y-2"
			>
				<template #item="{ element }">
					<div class="jump-nav-item">
						<v-icon
							name="drag_indicator"
							class="drag-handle"
						/>

						<div class="block-info">
							<div class="block-name">
								{{
									availableBlocks.find((block) => block.id === element.block_id)?.display_name ||
									"Unknown Block"
								}}
							</div>
							<input
								type="text"
								:value="element.label"
								@input="(e) => handleLabelInput(element.block_id, e)"
								placeholder="Enter navigation label..."
								class="label-input"
							/>
						</div>

						<v-btn
							icon
							size="small"
							variant="text"
							@click="removeBlock(element.block_id)"
							class="remove-btn"
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

	interface JumpNavItem {
		block_id: string;
		label: string;
	}

	interface Props {
		value?: JumpNavItem[] | null;
		placeholder?: string;
	}

	interface Emits {
		(event: "input", value: JumpNavItem[] | null): void;
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

	// Get selected block IDs for easy lookup
	const selectedBlockIds = computed(() => {
		return props.value?.map((item) => item.block_id) || [];
	});

	// Get selected items with labels
	const selectedItems = computed(() => {
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
		if (!selectedItems.value.length) {
			sortedBlocks.value = [];
			return;
		}

		sortedBlocks.value = selectedItems.value
			.map((item) => availableBlocks.value.find((block) => block.id === item.block_id))
			.filter(Boolean) as Array<{ id: string; display_name: string; collection: string }>;
	};

	const toggleSelection = (blockId: string) => {
		const currentSelection = [...selectedItems.value];
		const existingIndex = currentSelection.findIndex((item) => item.block_id === blockId);

		if (existingIndex > -1) {
			// Remove the item
			currentSelection.splice(existingIndex, 1);
		} else {
			// Add new item with default label from block display name
			const blockInfo = availableBlocks.value.find((block) => block.id === blockId);
			currentSelection.push({
				block_id: blockId,
				label: blockInfo?.display_name || "Untitled Block",
			});
		}

		emit("input", currentSelection);
	};

	const updateLabel = (blockId: string, newLabel: string) => {
		const currentSelection = [...selectedItems.value];
		const item = currentSelection.find((item) => item.block_id === blockId);
		if (item) {
			item.label = newLabel;
			emit("input", currentSelection);
		}
	};

	const handleLabelInput = (blockId: string, event: Event) => {
		const target = event.target as HTMLInputElement;
		updateLabel(blockId, target.value);
	};

	const handleSort = () => {
		// Extract items in the new order
		const newOrder = sortedBlocks.value.map((block) => {
			const existingItem = selectedItems.value.find((item) => item.block_id === block.id);
			return existingItem || { block_id: block.id, label: block.display_name };
		});
		emit("input", newOrder);
	};

	const removeBlock = (blockId: string) => {
		const newSelection = selectedItems.value.filter((item) => item.block_id !== blockId);
		emit("input", newSelection);
	};

	// Watch for changes in selection to update sorted blocks
	watch(selectedItems, updateSortedBlocks, { immediate: true });

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

	.jump-nav-item {
		display: flex;
		align-items: center;
		padding: 12px;
		background-color: var(--theme--background-subdued);
		border: var(--theme--border-width) solid var(--theme--form--field--input--border-color);
		border-radius: var(--theme--border-radius);
		gap: 12px;
	}

	.drag-handle {
		color: var(--theme--foreground-subdued);
		cursor: grab;
	}

	.drag-handle:active {
		cursor: grabbing;
	}

	.block-info {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	.block-name {
		font-size: 12px;
		color: var(--theme--foreground-subdued);
		font-weight: 500;
	}

	.label-input {
		width: 100%;
		padding: 6px 8px;
		border: var(--theme--border-width) solid var(--theme--form--field--input--border-color);
		border-radius: var(--theme--border-radius);
		background-color: var(--theme--background);
		color: var(--theme--foreground);
		font-size: 14px;
	}

	.label-input:focus {
		outline: none;
		border-color: var(--theme--primary);
		box-shadow: 0 0 0 2px var(--theme--primary--25);
	}

	.remove-btn {
		color: var(--theme--danger);
	}
</style>

