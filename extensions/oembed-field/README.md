# Directus oEmbed Field Extension

A Directus field extension that allows you to embed content from external providers like YouTube, Vimeo, Twitter, and more using the oEmbed standard.

## Features

- **URL Input**: Simply paste a URL from supported providers
- **Auto-fetch**: Automatically fetches oEmbed data when a URL is entered
- **Live Preview**: Shows a preview of the embedded content in the admin interface
- **Metadata Display**: Shows title, author, provider, and dimensions
- **Error Handling**: Graceful handling of unsupported URLs or fetch errors
- **Configurable**: Options for placeholder text, auto-fetch behavior, and preview display

## Supported Providers

- YouTube
- Vimeo
- Twitter/X
- Instagram
- TikTok
- Spotify

## Installation

1. Place this extension in your Directus `extensions` directory
2. Install dependencies: `npm install`
3. Build the extension: `npm run build`
4. Restart your Directus instance

## Usage

1. Add a new field to your collection
2. Select "oEmbed" as the field type
3. Configure options:
   - **Placeholder Text**: Custom placeholder for the input field
   - **Auto-fetch oEmbed Data**: Automatically fetch data when URL is entered
   - **Show Preview**: Display preview in the admin interface

## Data Structure

The field stores data as JSON with the following structure:

```json
{
	"url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
	"oembed": {
		"type": "video",
		"version": "1.0",
		"title": "Rick Astley - Never Gonna Give You Up",
		"author_name": "RickAstleyVEVO",
		"provider_name": "YouTube",
		"thumbnail_url": "https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg",
		"html": "<iframe width=\"480\" height=\"270\" src=\"https://www.youtube.com/embed/dQw4w9WgXcQ\" frameborder=\"0\" allowfullscreen></iframe>",
		"width": 480,
		"height": 270
	},
	"fetched_at": "2024-01-01T12:00:00.000Z"
}
```

## Frontend Usage

In your frontend application, you can use the stored data to embed content:

```javascript
// For video/rich content
if (embedData.oembed?.html) {
	// Use the HTML embed code
	container.innerHTML = embedData.oembed.html;
}

// For photos
if (embedData.oembed?.type === "photo") {
	// Use the image URL
	const img = document.createElement("img");
	img.src = embedData.oembed.url;
	img.alt = embedData.oembed.title;
}

// Access metadata
const title = embedData.oembed?.title;
const provider = embedData.oembed?.provider_name;
const thumbnail = embedData.oembed?.thumbnail_url;
```

