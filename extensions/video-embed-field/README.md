# Directus Video Embed Field Extension

A Directus field extension that allows you to embed videos from YouTube, Vimeo, and other video platforms with automatic URL parsing and preview generation.

## Features

- **URL Input**: Simply paste a video URL from supported platforms
- **Auto-processing**: Automatically parses URLs and generates embed data
- **Live Preview**: Shows a preview of the embedded video in the admin interface
- **Safe Embedding**: Generates secure iframe embed codes
- **Error Handling**: Graceful handling of unsupported URLs or invalid links
- **Configurable**: Options for placeholder text, auto-processing behavior, and preview display

## Supported Platforms

- **YouTube** - Full video embedding with player
- **Vimeo** - Clean video player integration

## Installation

1. Place this extension in your Directus `extensions` directory
2. Install dependencies: `npm install`
3. Build the extension: `npm run build`
4. Restart your Directus instance

## Usage

1. Add a new field to your collection
2. Select "Video Embed" as the field type
3. Configure options:
   - **Placeholder Text**: Custom placeholder for the input field
   - **Auto-process URLs**: Automatically process URLs when entered
   - **Show Preview**: Display video preview in the admin interface

## Data Structure

The field stores data as JSON with the following structure:

```json
{
	"url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
	"oembed": {
		"type": "video",
		"version": "1.0",
		"title": "YouTube Video",
		"author_name": "YouTube",
		"provider_name": "YouTube",
		"provider_url": "https://www.youtube.com",
		"thumbnail_url": "https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg",
		"html": "<iframe width=\"560\" height=\"315\" src=\"https://www.youtube.com/embed/dQw4w9WgXcQ\" frameborder=\"0\" allowfullscreen></iframe>",
		"width": 560,
		"height": 315
	},
	"fetched_at": "2024-01-01T12:00:00.000Z"
}
```

## Frontend Usage

In your frontend application, you can use the stored data to embed content:

```javascript
// For video content
if (embedData.oembed?.type === "video") {
	// Create iframe element safely
	const iframe = document.createElement("iframe");
	iframe.src = getEmbedSrc(embedData.url); // Your own URL parsing function
	iframe.width = embedData.oembed.width || 560;
	iframe.height = embedData.oembed.height || 315;
	iframe.setAttribute("frameborder", "0");
	iframe.setAttribute("allowfullscreen", "");
	container.appendChild(iframe);
}

// Access metadata
const title = embedData.oembed?.title;
const provider = embedData.oembed?.provider_name;
const thumbnail = embedData.oembed?.thumbnail_url;
const videoUrl = embedData.url;
```

