import { defineHook } from "@directus/extensions-sdk";

export default defineHook(({ filter }) => {
  filter("items.update", async (payload, meta, context) => {
    if (meta.collection === "block_highlights") {
      await validateHighlights(payload, context, meta.keys);
    }
    return payload;
  });

  filter("items.create", async (payload, meta, context) => {
    if (meta.collection === "block_highlights") {
      await validateHighlights(payload, context, null);
    }
    return payload;
  });

  async function validateHighlights(
    payload: any,
    context: any,
    keys: string[] | null
  ) {
    const { database } = context;

    if (!payload.items) {
      return payload;
    }

    const {
      create = [],
      update = [],
      delete: deleteItems = [],
    } = payload.items;

    // Get current count for existing highlight blocks
    let currentCount = 0;

    if (keys && keys.length > 0) {
      const highlightId = keys[0];

      try {
        const result = await database("block_highlights_items")
          .where("highlights", highlightId)
          .count("* as count");

        currentCount = parseInt(result[0].count);
      } catch (error) {
        console.error("Highlights validation: Database query failed", error);
        return payload; // Skip validation if DB query fails
      }
    }

    // Calculate final count: current + creates - deletes
    const finalCount =
      currentCount + create.length + update.length - deleteItems.length;

    // Validate minimum and maximum count
    const MIN_ITEMS = 3;
    const MAX_ITEMS = 5;

    if (finalCount < MIN_ITEMS) {
      throw new Error(
        `Block highlights must have at least ${MIN_ITEMS} items. Current: ${currentCount}, After changes: ${finalCount}`
      );
    }

    if (finalCount > MAX_ITEMS) {
      throw new Error(
        `Block highlights cannot have more than ${MAX_ITEMS} items. Current: ${currentCount}, After changes: ${finalCount}`
      );
    }

    return payload;
  }

  console.log("🚀 Block Highlights Validation Extension loaded!");
});
