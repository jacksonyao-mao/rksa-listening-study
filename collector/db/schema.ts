import { sqliteTable, text, primaryKey } from "drizzle-orm/sqlite-core";
export const submissions = sqliteTable("submissions", {
  study: text("study").notNull(),
  participant: text("participant").notNull(),
  receipt: text("receipt").notNull(),
  submitted: text("submitted").notNull(),
  ratings: text("ratings").notNull(),
}, t => [primaryKey({columns:[t.study,t.participant]})]);
