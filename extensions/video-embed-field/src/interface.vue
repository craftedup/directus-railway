<template>
	<div class="oembed-field">
		<div class="url-input-section">
			<v-input
				:model-value="url"
				:placeholder="placeholder"
				@update:model-value="onUrlChange"
				@blur="fetchOembedData"
				:disabled="disabled"
			/>
			<v-button
				v-if="url && !loading"
				@click="fetchOembedData"
				icon
				secondary
				small
				:disabled="disabled"
			>
				<v-icon name="refresh" />
			</v-button>
		</div>

		<div
			v-if="loading"
			class="loading-section"
		>
			<v-progress-circular
				indeterminate
				small
			/>
			<span class="loading-text">Processing video URL...</span>
		</div>

		<div
			v-if="error"
			class="error-section"
		>
			<v-notice
				type="warning"
				:icon="false"
			>
				{{ error }}
			</v-notice>
		</div>

		<div
			v-if="oembedData && showPreview && !loading"
			class="preview-section"
		>
			<div class="preview-header">
				<h4>Preview</h4>
				<v-button
					@click="clearData"
					icon
					secondary
					small
				>
					<v-icon name="close" />
				</v-button>
			</div>

			<div class="preview-content">
				<div
					v-if="oembedData.type === 'video'"
					class="embed-container"
				>
					<iframe
						:src="getEmbedUrl()"
						:width="oembedData.width || 560"
						:height="oembedData.height || 315"
						frameborder="0"
						allowfullscreen
					>
					</iframe>
				</div>
				<div
					v-else-if="oembedData.type === 'photo'"
					class="photo-container"
				>
					<img
						:src="oembedData.url"
						:alt="oembedData.title"
					/>
				</div>
				<div
					v-else
					class="link-container"
				>
					<h5>{{ oembedData.title }}</h5>
					<p v-if="oembedData.description">{{ oembedData.description }}</p>
					<a
						:href="url"
						target="_blank"
						rel="noopener noreferrer"
					>
						{{ url }}
					</a>
				</div>
			</div>

			<div class="metadata-section">
				<div class="metadata-grid">
					<div
						v-if="oembedData.title"
						class="metadata-item"
					>
						<strong>Title:</strong> {{ oembedData.title }}
					</div>
					<div
						v-if="oembedData.provider_name"
						class="metadata-item"
					>
						<strong>Provider:</strong> {{ oembedData.provider_name }}
					</div>
					<div
						v-if="oembedData.author_name"
						class="metadata-item"
					>
						<strong>Author:</strong> {{ oembedData.author_name }}
					</div>
					<div
						v-if="oembedData.width && oembedData.height"
						class="metadata-item"
					>
						<strong>Dimensions:</strong> {{ oembedData.width }}×{{ oembedData.height }}
					</div>
				</div>
			</div>
		</div>

		<div
			v-if="rawData && !showPreview"
			class="raw-data-section"
		>
			<v-notice type="info">
				oEmbed data stored ({{ Object.keys(rawData).length }} fields)
			</v-notice>
		</div>
	</div>
</template>

<script setup lang="ts">
	import { ref, computed, watch } from "vue";
	import { useApi } from "@directus/extensions-sdk";

	interface Props {
		value?: any;
		disabled?: boolean;
		placeholder?: string;
		auto_fetch?: boolean;
		show_preview?: boolean;
	}

	interface Emits {
		(event: "input", value: any): void;
	}

	const props = withDefaults(defineProps<Props>(), {
		placeholder: "Paste a video URL (YouTube, Vimeo, etc.)",
		auto_fetch: true,
		show_preview: true,
	});

	const emit = defineEmits<Emits>();
	const api = useApi();

	const url = ref("");
	const loading = ref(false);
	const error = ref("");
	const oembedData = ref<any>(null);
	const rawData = ref<any>(null);

	// Initialize from existing value
	if (props.value) {
		rawData.value = props.value;
		if (props.value.url) {
			url.value = props.value.url;
		}
		if (props.value.oembed) {
			oembedData.value = props.value.oembed;
		}
	}

	const placeholder = computed(() => props.placeholder);
	const showPreview = computed(() => props.show_preview);

	// oEmbed providers configuration
	const oembedProviders = [
		{
			provider: "YouTube",
			endpoint: "https://www.youtube.com/oembed",
			schemes: ["*://www.youtube.com/watch*", "*://youtu.be/*"],
		},
		{
			provider: "Vimeo",
			endpoint: "https://vimeo.com/api/oembed.json",
			schemes: ["*://vimeo.com/*"],
		},
		{
			provider: "Twitter",
			endpoint: "https://publish.twitter.com/oembed",
			schemes: ["*://twitter.com/*/status/*", "*://x.com/*/status/*"],
		},
		{
			provider: "Instagram",
			endpoint: "https://api.instagram.com/oembed",
			schemes: ["*://www.instagram.com/p/*", "*://instagram.com/p/*"],
		},
		{
			provider: "TikTok",
			endpoint: "https://www.tiktok.com/oembed",
			schemes: ["*://www.tiktok.com/*"],
		},
		{
			provider: "Spotify",
			endpoint: "https://open.spotify.com/oembed",
			schemes: ["*://open.spotify.com/*"],
		},
	];

	function findProvider(inputUrl: string): { provider: string; endpoint: string } | null {
		for (const provider of oembedProviders) {
			for (const scheme of provider.schemes) {
				const regex = new RegExp(scheme.replace(/\*/g, ".*"));
				if (regex.test(inputUrl)) {
					return provider;
				}
			}
		}
		return null;
	}

	function extractYouTubeId(url: string): string | null {
		const regex =
			/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
		const match = url.match(regex);
		return match ? match[1] : null;
	}

	function extractVimeoId(url: string): string | null {
		const regex =
			/vimeo\.com\/(?:channels\/(?:\w+\/)?|groups\/([^\/]*)\/videos\/|album\/(\d+)\/video\/|)(\d+)(?:$|\/|\?)/;
		const match = url.match(regex);
		return match ? match[3] : null;
	}

	function getEmbedUrl(): string {
		if (!oembedData.value) return "";

		if (oembedData.value.provider_name === "YouTube") {
			const videoId = extractYouTubeId(url.value);
			return videoId ? `https://www.youtube.com/embed/${videoId}` : "";
		} else if (oembedData.value.provider_name === "Vimeo") {
			const videoId = extractVimeoId(url.value);
			return videoId ? `https://player.vimeo.com/video/${videoId}` : "";
		}

		return "";
	}

	async function fetchOembedData() {
		if (!url.value || !props.auto_fetch) return;

		loading.value = true;
		error.value = "";

		try {
			const provider = findProvider(url.value);

			if (!provider) {
				throw new Error("Unsupported video platform. Supported: YouTube, Vimeo");
			}

			// Use manual parsing for common providers to avoid CORS issues
			let data;

			// For YouTube, we can extract video ID and create embed data manually
			if (provider.provider === "YouTube") {
				const videoId = extractYouTubeId(url.value);
				if (videoId) {
					data = {
						type: "video",
						version: "1.0",
						title: "YouTube Video",
						author_name: "YouTube",
						provider_name: "YouTube",
						provider_url: "https://www.youtube.com",
						thumbnail_url: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
						html: `<iframe width="560" height="315" src="https://www.youtube.com/embed/${videoId}" frameborder="0" allowfullscreen></iframe>`,
						width: 560,
						height: 315,
					};
				} else {
					throw new Error("Invalid YouTube URL");
				}
			} else if (provider.provider === "Vimeo") {
				const videoId = extractVimeoId(url.value);
				if (videoId) {
					data = {
						type: "video",
						version: "1.0",
						title: "Vimeo Video",
						author_name: "Vimeo",
						provider_name: "Vimeo",
						provider_url: "https://vimeo.com",
						html: `<iframe src="https://player.vimeo.com/video/${videoId}" width="640" height="360" frameborder="0" allowfullscreen></iframe>`,
						width: 640,
						height: 360,
					};
				} else {
					throw new Error("Invalid Vimeo URL");
				}
			} else {
				// For other providers, we'll store basic URL info
				data = {
					type: "link",
					version: "1.0",
					title: url.value,
					provider_name: provider.provider,
					provider_url: url.value,
				};
			}

			oembedData.value = data;

			// Store both URL and oEmbed data
			rawData.value = {
				url: url.value,
				oembed: data,
				fetched_at: new Date().toISOString(),
			};

			emit("input", rawData.value);
		} catch (err) {
			error.value = err instanceof Error ? err.message : "Failed to process URL";
			oembedData.value = null;

			// Still store the URL even if processing fails
			rawData.value = {
				url: url.value,
				error: error.value,
				fetched_at: new Date().toISOString(),
			};

			emit("input", rawData.value);
		} finally {
			loading.value = false;
		}
	}

	function onUrlChange(newUrl: string) {
		url.value = newUrl;

		if (!newUrl) {
			clearData();
			return;
		}

		// Auto-fetch if enabled and URL looks valid
		if (props.auto_fetch && isValidUrl(newUrl)) {
			// Debounce the fetch
			setTimeout(() => {
				if (url.value === newUrl) {
					fetchOembedData();
				}
			}, 500);
		}
	}

	function isValidUrl(string: string): boolean {
		try {
			new URL(string);
			return true;
		} catch {
			return false;
		}
	}

	function clearData() {
		url.value = "";
		oembedData.value = null;
		rawData.value = null;
		error.value = "";
		emit("input", null);
	}

	// Watch for external value changes
	watch(
		() => props.value,
		(newValue) => {
			if (newValue !== rawData.value) {
				rawData.value = newValue;
				if (newValue?.url) {
					url.value = newValue.url;
				}
				if (newValue?.oembed) {
					oembedData.value = newValue.oembed;
				}
			}
		}
	);
</script>

<style scoped>
	.oembed-field {
		width: 100%;
	}

	.url-input-section {
		display: flex;
		gap: 8px;
		align-items: center;
		margin-bottom: 16px;
	}

	.url-input-section .v-input {
		flex: 1;
	}

	.loading-section {
		display: flex;
		align-items: center;
		gap: 8px;
		margin-bottom: 16px;
		color: var(--foreground-subdued);
	}

	.loading-text {
		font-size: 14px;
	}

	.error-section {
		margin-bottom: 16px;
	}

	.preview-section {
		border: 1px solid var(--border-subdued);
		border-radius: 6px;
		overflow: hidden;
		margin-bottom: 16px;
	}

	.preview-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 12px 16px;
		background-color: var(--background-subdued);
		border-bottom: 1px solid var(--border-subdued);
	}

	.preview-header h4 {
		margin: 0;
		font-size: 14px;
		font-weight: 600;
		color: var(--foreground);
	}

	.preview-content {
		padding: 16px;
	}

	.embed-container {
		position: relative;
		width: 100%;
		max-width: 100%;
	}

	.embed-container iframe {
		max-width: 100%;
		height: auto;
	}

	.photo-container img {
		max-width: 100%;
		height: auto;
		border-radius: 4px;
	}

	.link-container h5 {
		margin: 0 0 8px 0;
		color: var(--foreground);
	}

	.link-container p {
		margin: 0 0 12px 0;
		color: var(--foreground-subdued);
		font-size: 14px;
	}

	.link-container a {
		color: var(--primary);
		text-decoration: none;
		font-size: 14px;
	}

	.link-container a:hover {
		text-decoration: underline;
	}

	.metadata-section {
		padding: 12px 16px;
		background-color: var(--background-subdued);
		border-top: 1px solid var(--border-subdued);
	}

	.metadata-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
		gap: 8px;
	}

	.metadata-item {
		font-size: 12px;
		color: var(--foreground-subdued);
	}

	.metadata-item strong {
		color: var(--foreground);
	}

	.raw-data-section {
		margin-bottom: 16px;
	}
</style>

