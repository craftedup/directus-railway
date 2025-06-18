# Dynamic Post Selector Extension

A custom Directus interface that dynamically selects posts from different collections based on another field's value.

## Purpose

This extension was created for the Block Post Listing component to allow selecting a featured post that changes its source collection based on the selected `type` field.

## How it Works

1. The interface reads the value of a sibling field (default: `type`) in the same form
2. Based on that value, it maps to the appropriate collection:
   - `guides_and_blogs` → `guides_and_blogs` collection
   - `press_releases` → `press_releases` collection
   - `news` → `news` collection
   - `events` → `events` collection
3. It fetches published posts from the mapped collection
4. Displays them in a searchable dropdown with title, date, and permalink
5. Stores the selected post's ID

## Usage

### In Your Schema

Add a field to your collection with:

- **Interface**: Dynamic Post Selector
- **Type**: Integer
- **Required**: No (optional)

### Field Configuration

The interface supports these options:

- **Placeholder**: Custom placeholder text (default: "Select a featured post...")
- **Type Field**: Name of the field containing the collection type (default: "type")

### Example

For the `block_post_listing` collection:

```sql
-- Add featured_post_id field
ALTER TABLE block_post_listing
ADD COLUMN featured_post_id INTEGER NULL;
```

Then in Directus admin:

1. Go to Settings → Data Model → Block Post Listing
2. Add a new field called `featured_post_id`
3. Set the interface to "Dynamic Post Selector"
4. Configure the Type Field option to "type" (if different)

## Building & Installing

```bash
cd directus-railway/extensions/dynamic-post-selector
npm run build
```

The extension will be automatically available in your Directus instance after building.

## Data Structure

The extension stores just the post ID. To use it in your frontend:

1. The ID can be used with any collection based on the `type` field
2. Fetch the full post data in your frontend based on the collection type
3. The post will be from the collection specified by the `type` field

## Error Handling

- Shows a warning if no collection type is selected
- Clears the selection if the collection type changes and the selected post doesn't exist in the new collection
- Displays error messages if API calls fail
- Gracefully handles missing or invalid data

