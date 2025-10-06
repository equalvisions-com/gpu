import { pgTable, text, timestamp, uniqueIndex, index } from "drizzle-orm/pg-core";
import { user } from "./auth-schema";

// User favorites table - stores which GPU instances users have favorited
export const userFavorites = pgTable("user_favorites", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  gpuUuid: text("gpu_uuid").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  // Prevent duplicate favorites for the same user + GPU combination
  userGpuUnique: uniqueIndex("user_gpu_unique").on(table.userId, table.gpuUuid),
  // Optimize queries for getting all favorites for a user
  userIdIndex: index("user_favorites_user_id_idx").on(table.userId),
}));
