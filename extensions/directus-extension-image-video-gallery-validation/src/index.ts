import { defineHook } from "@directus/extensions-sdk";

export default defineHook(({ filter }) => {
  // Validate on item updates (this is where O2M changes happen)
  filter("items.update", async (payload, meta, context) => {
    if (meta.collection === "block_image_video_gallery") {
      await validateImageVideoGallery(payload, context, meta.keys);
    }
    return payload;
  });

  // Also validate on create (for new image video gallery blocks)
  filter("items.create", async (payload, meta, context) => {
    if (meta.collection === "block_image_video_gallery") {
      await validateImageVideoGallery(payload, context, null);
    }
    return payload;
  });

  async function validateImageVideoGallery(
    payload: any,
    context: any,
    keys: string[] | null
  ) {
    const { database } = context;

    // Only validate if items are being modified
    if (!payload.items) {
      return payload;
    }

    const { create = [], delete: deleteItems = [] } = payload.items;

    // Get current count for existing image video gallery blocks
    let currentCount = 0;

    if (keys && keys.length > 0) {
      const galleryId = keys[0];

      try {
        const result = await database("block_image_video_gallery_item")
          .where("block_image_video_gallery", galleryId)
          .count("* as count");

        currentCount = parseInt(result[0].count);
      } catch (error) {
        console.error(
          "Image video gallery validation: Database query failed",
          error
        );
        return payload; // Skip validation if DB query fails
      }
    }

    // Calculate final count: current + creates - deletes
    const finalCount = currentCount + create.length - deleteItems.length;

    // Validate minimum and maximum count
    const MIN_ITEMS = 3;
    const MAX_ITEMS = 10;

    if (finalCount < MIN_ITEMS) {
      throw new Error(
        `Block image video gallery must have at least ${MIN_ITEMS} items. Current: ${currentCount}, After changes: ${finalCount}`
      );
    }

    if (finalCount > MAX_ITEMS) {
      throw new Error(
        `Block image video gallery cannot have more than ${MAX_ITEMS} items. Current: ${currentCount}, After changes: ${finalCount}`
      );
    }

    return payload;
  }

  console.log("🚀 Block Image Video Gallery Validation Extension loaded!");
});
