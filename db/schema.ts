import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';
export const rooms = sqliteTable('rooms', {code:text('code').primaryKey(),data:text('data').notNull(),revision:integer('revision').notNull().default(0),expires:integer('expires').notNull()}, t=>[index('idx_rooms_expires').on(t.expires)]);

export const authProfiles=sqliteTable('auth_profiles',{id:text('id').primaryKey(),googleSub:text('google_sub').notNull().unique(),displayName:text('display_name').notNull(),created:integer('created').notNull()});
export const authSessions=sqliteTable('auth_sessions',{hash:text('hash').primaryKey(),userId:text('user_id').notNull(),csrf:text('csrf').notNull(),expires:integer('expires').notNull()},t=>[index('idx_auth_sessions_expiry').on(t.expires),index('idx_auth_sessions_user').on(t.userId)]);
export const authChallenges=sqliteTable('auth_challenges',{hash:text('hash').primaryKey(),nonce:text('nonce').notNull(),csrf:text('csrf').notNull(),expires:integer('expires').notNull()},t=>[index('idx_auth_challenges_expiry').on(t.expires)]);

export const matchQueue=sqliteTable('match_queue',{auth:text('auth').primaryKey(),searchId:text('search_id').notNull(),bucket:text('bucket').notNull(),name:text('name').notNull(),status:text('status').notNull().default('waiting'),created:integer('created').notNull(),leaseUntil:integer('lease_until').notNull(),roomCode:text('room_code')},t=>[index('idx_match_queue_waiting').on(t.bucket,t.status,t.leaseUntil,t.created)]);

export const retiredSearches=sqliteTable('retired_searches',{id:text('id').primaryKey(),expires:integer('expires').notNull()},t=>[index('idx_retired_searches_expires').on(t.expires)]);

export const requestLimits=sqliteTable('request_limits',{id:text('id').primaryKey(),count:integer('count').notNull(),expires:integer('expires').notNull()},t=>[index('idx_request_limits_expires').on(t.expires)]);
