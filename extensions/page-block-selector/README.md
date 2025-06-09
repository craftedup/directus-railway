# Page Block Selector Extension

A custom Directus interface that allows selecting blocks from the current page being edited.

## Installation

1. Navigate to this directory:

```bash
cd ptr-directus/extensions/interfaces/page-block-selector
```

2. Install dependencies:

```bash
npm install
```

3. Build the extension:

```bash
npm run build
```

4. Restart your Directus instance to load the extension.

## Usage

1. In Directus Admin, go to **Settings** → **Data Model**
2. Select your collection (e.g., `block_jump_nav`)
3. Create a new field:
   - **Key**: `target_block`
   - **Type**: `UUID`
   - **Interface**: `Page Block Selector`
   - **Related Collection**: `page_blocks`

## How it works

The interface will:

- Detect the current page being edited
- Fetch all blocks from that page
- Display them in a dropdown with readable names
- Exclude the current block (if editing a block)

## Development

```bash
npm run dev  # Watch mode for development
```

