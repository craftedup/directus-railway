import { defineHook } from "@directus/extensions-sdk";

export default defineHook(({ filter }) => {
  // Validate on item updates (this is where O2M changes happen)
  filter("items.update", async (payload, meta, context) => {
    if (meta.collection === "block_tabbed_content") {
      await validateTabbedContent(payload, context, meta.keys);
    }
    return payload;
  });

  // Also validate on create (for new tabbed content blocks)
  filter("items.create", async (payload, meta, context) => {
    if (meta.collection === "block_tabbed_content") {
      await validateTabbedContent(payload, context, null);
    }
    return payload;
  });

  async function validateTabbedContent(
    payload: any,
    context: any,
    keys: string[] | null
  ) {
    const { database } = context;

    // Only validate if tabs are being modified
    if (!payload.tabs) {
      return payload;
    }

    const { create = [], update = [], delete: deleteItems = [] } = payload.tabs;

    // Get current count for existing tabbed content blocks
    let currentCount = 0;

    if (keys && keys.length > 0) {
      const tabbedContentId = keys[0];

      try {
        const result = await database("block_tabs")
          .where("tabbed_content", tabbedContentId)
          .count("* as count");

        currentCount = parseInt(result[0].count);
      } catch (error) {
        console.error(
          "Tabbed content validation: Database query failed",
          error
        );
        return payload; // Skip validation if DB query fails
      }
    }

    // Calculate final count: current + creates + updates - deletes
    const finalCount =
      currentCount + create.length + update.length - deleteItems.length;

    // Validate minimum and maximum count
    const MIN_TABS = 2;
    const MAX_TABS = 4;

    if (finalCount < MIN_TABS) {
      throw new Error(
        `Block tabbed content must have at least ${MIN_TABS} tabs. Current: ${currentCount}, After changes: ${finalCount}`
      );
    }

    if (finalCount > MAX_TABS) {
      throw new Error(
        `Block tabbed content cannot have more than ${MAX_TABS} tabs. Current: ${currentCount}, After changes: ${finalCount}`
      );
    }

    return payload;
  }

  console.log("🚀 Block Tabbed Content Validation Extension loaded!");
});
