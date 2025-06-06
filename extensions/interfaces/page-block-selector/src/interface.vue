<template>
	<div>
		<v-select
			:model-value="selectedBlocks"
			:items="availableBlocks"
			:loading="loading"
			:placeholder="placeholder"
			item-title="display_name"
			item-value="id"
			multiple
			chips
			closable-chips
			@update:model-value="handleSelection"
		>
			<template #no-data>
				<div class="text-center pa-4">
					<span v-if="loading">Loading blocks...</span>
					<span v-else-if="!currentPageId">No page context found</span>
					<span v-else>No blocks found on this page</span>
				</div>
			</template>
		</v-select>

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

	// Get the current page ID from the editing context
	const currentPageId = computed(() => {
		// Check if we're editing a page directly
		if (values?.id && values?.permalink) {
			return values.id;
		}

		// Check if we're editing a page block and it has a page reference
		if (values?.page) {
			return typeof values.page === "object" ? values.page.id : values.page;
		}

		// Check URL params for page context (fallback)
		const urlParams = new URLSearchParams(window.location.search);
		const pageParam = urlParams.get("page");
		if (pageParam) {
			return pageParam;
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
			const response = await api.get("/items/page_blocks", {
				params: {
					filter: {
						page: { _eq: currentPageId.value },
						hide_block: { _neq: true },
					},
					fields: [
						"id",
						"collection",
						"sort",
						"item.id",
						"item.headline",
						"item.title",
						"item.heading",
						"item.name",
						"item.tagline",
					],
					sort: ["sort"],
				},
			});

			availableBlocks.value = response.data.data
				.filter((block: any) => block.id !== values?.id) // Exclude current block if editing a block
				.map((block: any) => {
					// Try to get a meaningful display name from various possible fields
					const displayName =
						block.item?.headline ||
						block.item?.title ||
						block.item?.heading ||
						block.item?.name ||
						block.item?.tagline ||
						"Untitled Block";

					const blockType = block.collection
						.replace("block_", "")
						.replace(/_/g, " ")
						.replace(/\b\w/g, (l: string) => l.toUpperCase());

					return {
						id: block.id,
						display_name: `${blockType}: ${displayName}`,
						collection: block.collection,
					};
				});

			// Update sorted blocks with full block data
			updateSortedBlocks();

			console.log("Fetched blocks for page:", currentPageId.value, availableBlocks.value);
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

	const handleSelection = (newSelection: string[]) => {
		emit("input", newSelection);
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

