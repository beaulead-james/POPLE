import { sql } from 'drizzle-orm';
import {
  index,
  jsonb,
  pgTable,
  timestamp,
  varchar,
  text,
  integer,
  boolean,
  primaryKey,
} from "drizzle-orm/pg-core";

// Session storage table
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// Admin users table
export const admins = pgTable("admins", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: varchar("username", { length: 50 }).unique().notNull(),
  password: varchar("password", { length: 255 }).notNull(),
  email: varchar("email").unique(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// --- Analytics tables ---
export const analyticsEvents = pgTable("analytics_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  ts: timestamp("ts").notNull().defaultNow(),
  path: text("path").notNull(),
  referrer: text("referrer"),
  utmSource: varchar("utm_source", { length: 120 }),
  utmMedium: varchar("utm_medium", { length: 120 }),
  utmCampaign: varchar("utm_campaign", { length: 120 }),
  ua: text("ua"),
  ipHash: varchar("ip_hash", { length: 64 }),
  isBot: boolean("is_bot").default(false),
  userId: varchar("user_id"),
});

export const analyticsDaily = pgTable("analytics_daily", {
  day: timestamp("day").notNull(), // date로 써도 되지만 편의상 timestamp(자정)
  path: text("path").notNull(),
  pv: integer("pv").notNull().default(0),
  uv: integer("uv").notNull().default(0),
}, (t) => ({
  pk: primaryKey({ columns: [t.day, t.path] }),
  dayIdx: index("idx_analytics_daily_day").on(t.day),
}));

// Events table
export const events = pgTable("events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: varchar("title", { length: 200 }).notNull(),
  description: text("description"),
  imageUrl: varchar("image_url"),
  eventDate: timestamp("event_date"),
  location: varchar("location", { length: 200 }),
  isActive: boolean("is_active").default(true),
  createdBy: varchar("created_by").references(() => admins.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type Admin = typeof admins.$inferSelect;
export type InsertAdmin = typeof admins.$inferInsert;
export type Event = typeof events.$inferSelect;
export type InsertEvent = typeof events.$inferInsert;