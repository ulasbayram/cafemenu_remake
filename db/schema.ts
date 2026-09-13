// Intentionally empty by default.
// Add Drizzle tables here when the site actually needs a database.
// See examples/d1/db/schema.ts for an opt-in example.
import {
  sqliteTable,
  text,
  integer,
  index,
  primaryKey,
} from "drizzle-orm/sqlite-core";
export const cafes = sqliteTable(
  "cafes",
  {
    id: text("id").primaryKey(),
    owner: text("owner").notNull(),
    slug: text("slug").notNull().unique(),
    name: text("name").notNull(),
    data: text("data").notNull(),
    createdAt: text("created_at").notNull(),
  },
  (t) => [index("cafes_owner_idx").on(t.owner)],
);
export const visits = sqliteTable(
  "visits",
  {
    cafe: text("cafe")
      .notNull()
      .references(() => cafes.id, { onDelete: "cascade" }),
    day: text("day").notNull(),
    visitor: text("visitor").notNull(),
    hour: integer("hour").notNull(),
  },
  (t) => [primaryKey({ columns: [t.cafe, t.day, t.visitor] })],
);
export const rates = sqliteTable("rates", {
  key: text("key").primaryKey(),
  data: text("data").notNull(),
  fetchedAt: integer("fetched_at").notNull(),
});
export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  passwordHash: text("password_hash").notNull(),
  createdAt: integer("created_at").notNull(),
});
export const sessions = sqliteTable(
  "sessions",
  {
    tokenHash: text("token_hash").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expiresAt: integer("expires_at").notNull(),
  },
  (t) => [
    index("sessions_user_idx").on(t.userId),
    index("sessions_expiry_idx").on(t.expiresAt),
  ],
);
export const authAttempts = sqliteTable(
  "auth_attempts",
  {
    key: text("key").primaryKey(),
    count: integer("count").notNull(),
    expiresAt: integer("expires_at").notNull(),
  },
  (t) => [index("auth_attempts_expiry_idx").on(t.expiresAt)],
);
