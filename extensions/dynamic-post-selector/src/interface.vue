<template>
	<div class="dynamic-post-selector">
		<v-select
			:model-value="props.value"
			:items="availablePosts"
			:placeholder="placeholder || 'Select a featured post...'"
			:loading="loading"
			:disabled="!currentCollectionType || loading"
			:no-data-text="getNoDataText()"
			item-value="id"
			item-text="title"
			@update:model-value="handleSelection"
		>
			<template #selection="{ item }">
				<div class="selected-post">
					<div class="post-title">{{ item.title }}</div>
					<div
						class="post-meta"
						v-if="item.date_created"
					>
						{{ formatDate(item.date_created) }}
					</div>
				</div>
			</template>

			<template #item="{ item, props: itemProps }">
				<v-list-item
					v-bind="itemProps"
					class="post-list-item"
				>
					<v-list-item-content>
						<v-list-item-title class="post-title">{{ item.title }}</v-list-item-title>
						<v-list-item-subtitle class="post-meta">
							<span v-if="item.date_created">{{ formatDate(item.date_created) }}</span>
						</v-list-item-subtitle>
					</v-list-item-content>
				</v-list-item>
			</template>
		</v-select>

		<div
			v-if="!currentCollectionType"
			class="collection-warning"
		>
			<v-icon
				name="warning"
				class="warning-icon"
			/>
			<span>Please select a collection type first</span>
		</div>

		<div
			v-else-if="error"
			class="error-message"
		>
			<v-icon
				name="error"
				class="error-icon"
			/>
			<span>{{ error }}</span>
		</div>
	</div>
</template>

<script setup lang="ts">
	import { ref, computed, onMounted, inject, watch } from "vue";
	import { useApi } from "@directus/extensions-sdk";

	interface Post {
		id: number | string;
		title: string;
		date_created?: string;
		status?: string;
	}

	interface Props {
		value?: number | string | null;
		placeholder?: string;
		typeField?: string;
	}

	interface Emits {
		(event: "input", value: number | string | null): void;
	}

	const props = withDefaults(defineProps<Props>(), {
		placeholder: "Select a featured post...",
		typeField: "type",
	});

	const emit = defineEmits<Emits>();

	const api = useApi();
	const values = inject("values") as Record<string, any> | undefined;

	const loading = ref(false);
	const availablePosts = ref<Post[]>([]);
	const error = ref<string | null>(null);

	// Collection type mapping based on your BlockPostListing interface
	const COLLECTION_MAPPING = {
		guides_and_blogs: "guides_and_blogs",
		press_releases: "press_releases",
		news: "news",
		events: "events",
	} as const;

	// Get the current collection type from the parent form
	const currentCollectionType = computed(() => {
		// Try multiple possible locations for the type field
		const typeFieldValue =
			values?.[props.typeField] || // Direct access
			values?.value?.[props.typeField] || // Nested in value object
			values?.item?.[props.typeField]; // Sometimes nested in item

		// Debug logging
		console.log("🔍 Dynamic Post Selector Debug:");
		console.log("- All form values:", values);
		console.log("- Looking for field:", props.typeField);
		console.log("- Direct access:", values?.[props.typeField]);
		console.log("- In value object:", values?.value?.[props.typeField]);
		console.log("- In item object:", values?.item?.[props.typeField]);
		console.log("- Final type field value:", typeFieldValue);
		console.log("- Available mapping keys:", Object.keys(COLLECTION_MAPPING));
		console.log(
			"- Value exists in mapping?",
			typeFieldValue && typeFieldValue in COLLECTION_MAPPING
		);

		return typeFieldValue && typeFieldValue in COLLECTION_MAPPING
			? COLLECTION_MAPPING[typeFieldValue as keyof typeof COLLECTION_MAPPING]
			: null;
	});

	// Format date for display
	const formatDate = (dateString: string) => {
		try {
			return new Date(dateString).toLocaleDateString("en-US", {
				year: "numeric",
				month: "short",
				day: "numeric",
			});
		} catch {
			return dateString;
		}
	};

	// Get appropriate no-data text based on current state
	const getNoDataText = () => {
		if (!currentCollectionType.value) {
			return "Please select a collection type first";
		}
		if (loading.value) {
			return "Loading posts...";
		}
		if (error.value) {
			return error.value;
		}
		return "No posts found";
	};

	// Handle post selection
	const handleSelection = (postId: number | string | null) => {
		emit("input", postId);
	};

	// Fetch posts from the appropriate collection
	const fetchPosts = async () => {
		if (!currentCollectionType.value) {
			availablePosts.value = [];
			return;
		}

		loading.value = true;
		error.value = null;

		try {
			const response = await api.get(`/items/${currentCollectionType.value}`, {
				params: {
					filter: {
						status: { _eq: "published" },
					},
					fields: ["id", "title", "date_created"],
					sort: ["-date_created"],
					limit: 100,
				},
			});

			availablePosts.value = response.data.data || [];

			// Clear selection if current value is not in the new list
			if (props.value && !availablePosts.value.find((post) => post.id === props.value)) {
				emit("input", null);
			}
		} catch (err) {
			console.error("Error fetching posts:", err);
			error.value = `Failed to load ${currentCollectionType.value} posts`;
			availablePosts.value = [];
		} finally {
			loading.value = false;
		}
	};

	// Watch for collection type changes and refetch posts
	watch(
		currentCollectionType,
		() => {
			fetchPosts();
		},
		{ immediate: true }
	);

	// Also watch the values object directly for reactivity
	watch(
		() => values,
		() => {
			console.log("🔄 Values changed, recalculating collection type...");
		},
		{ deep: true }
	);

	onMounted(() => {
		fetchPosts();
	});
</script>

<style scoped>
	.dynamic-post-selector {
		width: 100%;
	}

	.selected-post {
		width: 100%;
	}

	.post-list-item {
		width: 100%;
	}

	.post-title {
		font-weight: 500;
		margin-bottom: 2px;
	}

	.post-meta {
		font-size: 0.875rem;
		color: var(--theme--foreground-subdued);
		display: flex;
		gap: 8px;
		align-items: center;
		margin-top: 4px;
	}

	.post-permalink {
		font-family: monospace;
		background: var(--theme--background-subdued);
		padding: 2px 6px;
		border-radius: 4px;
		font-size: 0.8rem;
	}

	.collection-warning,
	.error-message {
		display: flex;
		align-items: center;
		gap: 8px;
		margin-top: 8px;
		padding: 8px 12px;
		border-radius: 6px;
		font-size: 0.875rem;
	}

	.collection-warning {
		background: var(--theme--warning-background);
		color: var(--theme--warning);
	}

	.error-message {
		background: var(--theme--danger-background);
		color: var(--theme--danger);
	}

	.warning-icon,
	.error-icon {
		flex-shrink: 0;
	}
</style>

