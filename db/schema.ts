// Intentionally empty by default.
// Add Drizzle tables here when the site actually needs a database.
// See examples/d1/db/schema.ts for an opt-in example.
import {sqliteTable,text,integer,index} from 'drizzle-orm/sqlite-core';
export const projects=sqliteTable('projects',{
 id:text('id').primaryKey(),owner:text('owner').notNull(),title:text('title').notNull(),
 source:text('source').notNull(),notes:text('notes').notNull(),script:text('script').notNull().default(''),
 scenes:text('scenes').notNull().default('[]'),status:text('status').notNull().default('collected'),
 research:text('research').notNull().default('{}'),
 revision:integer('revision').notNull().default(0),board:text('board'),lock:text('lock'),
 lockAt:integer('lock_at'),updated:integer('updated').notNull()
},t=>[index('projects_owner_updated').on(t.owner,t.updated)]);
