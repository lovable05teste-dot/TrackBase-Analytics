import {drizzle as drizzleD1,type DrizzleD1Database} from "drizzle-orm/d1";
import {drizzle as drizzlePg} from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

type D1Binding={prepare(sql:string):{run():Promise<unknown>};};
let pgClient:ReturnType<typeof postgres>|undefined;
let initialized:Promise<void>|undefined;
function d1(){const binding=(process.env as unknown as {DB?:D1Binding}).DB;if(binding&&typeof binding.prepare==="function")return binding;return null}
function url(){const value=process.env.DATABASE_URL||process.env.POSTGRES_URL||process.env.STORAGE_DATABASE_URL||process.env.STORAGE_POSTGRES_URL;if(!value)throw new Error("Banco de dados não configurado.");return value.trim()}
export function getSql(){if(d1())throw new Error("SQL direto indisponível no D1; use getDb().");if(!pgClient)pgClient=postgres(url(),{prepare:false,max:3,idle_timeout:20,connect_timeout:15});return pgClient}
export function getDb():DrizzleD1Database<typeof schema>{const binding=d1();if(binding)return drizzleD1(binding as never,{schema});if(!pgClient)pgClient=postgres(url(),{prepare:false,max:3,idle_timeout:20,connect_timeout:15});return drizzlePg(pgClient,{schema}) as unknown as DrizzleD1Database<typeof schema>}
const statements=[
"CREATE TABLE IF NOT EXISTS workspaces(id text PRIMARY KEY,name text NOT NULL,created_at text NOT NULL)",
"CREATE TABLE IF NOT EXISTS members(id text PRIMARY KEY,workspace_id text NOT NULL,user_id text NOT NULL,email text,role text NOT NULL DEFAULT 'member')",
"CREATE UNIQUE INDEX IF NOT EXISTS idx_members_workspace_user ON members(workspace_id,user_id)",
"CREATE TABLE IF NOT EXISTS projects(id text PRIMARY KEY,workspace_id text NOT NULL,name text NOT NULL,domain text,public_key text,webhook_secret_hash text,pixel_id text,meta_token_cipher text,meta_token_iv text,meta_test_code text,meta_connected_at text,tracking_config text,created_at text NOT NULL)",
"CREATE UNIQUE INDEX IF NOT EXISTS idx_projects_public_key ON projects(public_key)",
"CREATE INDEX IF NOT EXISTS idx_projects_workspace ON projects(workspace_id)",
"CREATE TABLE IF NOT EXISTS events(id text PRIMARY KEY,project_id text NOT NULL,event_id text NOT NULL,event_name text NOT NULL,source text NOT NULL,occurred_at integer NOT NULL,visitor_id text,fbclid text,fbp text,fbc text,utm_source text,utm_campaign text,utm_medium text,utm_content text,utm_term text,value real,currency text,payload text)",
"CREATE UNIQUE INDEX IF NOT EXISTS idx_events_project_event ON events(project_id,event_id)",
"CREATE INDEX IF NOT EXISTS idx_events_project_time ON events(project_id,occurred_at)",
"CREATE TABLE IF NOT EXISTS orders(id text PRIMARY KEY,project_id text NOT NULL,external_id text NOT NULL,provider text NOT NULL,status text NOT NULL,value real NOT NULL,currency text NOT NULL,event_id text,created_at integer NOT NULL,updated_at integer NOT NULL)",
"CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_provider_external ON orders(provider,external_id)",
"CREATE TABLE IF NOT EXISTS api_credentials(id text PRIMARY KEY,workspace_id text NOT NULL,project_id text NOT NULL,name text NOT NULL,provider text NOT NULL DEFAULT 'generic',token_hash text NOT NULL,active integer NOT NULL DEFAULT 1,created_at text NOT NULL,last_used_at text)",
"CREATE UNIQUE INDEX IF NOT EXISTS idx_api_credentials_token ON api_credentials(token_hash)",
"CREATE TABLE IF NOT EXISTS meta_oauth_states(id text PRIMARY KEY,user_id text NOT NULL,state_hash text NOT NULL,expires_at integer NOT NULL,created_at integer NOT NULL)",
"CREATE UNIQUE INDEX IF NOT EXISTS idx_meta_oauth_states_hash ON meta_oauth_states(state_hash)",
"CREATE TABLE IF NOT EXISTS meta_accounts(id text PRIMARY KEY,workspace_id text NOT NULL,user_id text NOT NULL,meta_user_id text,meta_user_name text,ad_account_id text NOT NULL,account_name text NOT NULL,currency text,timezone_name text,account_status integer,access_token_cipher text NOT NULL,access_token_iv text NOT NULL,token_expires_at integer,selected integer NOT NULL DEFAULT 0,connected_at integer NOT NULL,updated_at integer NOT NULL)",
"CREATE UNIQUE INDEX IF NOT EXISTS idx_meta_accounts_user_ad ON meta_accounts(user_id,ad_account_id)",
"CREATE TABLE IF NOT EXISTS meta_linked(user_id text NOT NULL,ad_account_id text NOT NULL,created_at integer NOT NULL)",
"CREATE UNIQUE INDEX IF NOT EXISTS idx_meta_linked_user_ad ON meta_linked(user_id,ad_account_id)",
"CREATE TABLE IF NOT EXISTS push_subscriptions(workspace_id text NOT NULL,endpoint text NOT NULL,p256dh text NOT NULL,auth text NOT NULL,created_at integer NOT NULL)",
"CREATE UNIQUE INDEX IF NOT EXISTS idx_push_sub_endpoint ON push_subscriptions(workspace_id,endpoint)"
];
export async function ensureDb(){if(!initialized)initialized=(async()=>{const binding=d1();if(binding){for(const statement of statements)await binding.prepare(statement).run();}else{await getSql().unsafe(statements.map(s=>s+';').join('\n'));}})().catch(error=>{initialized=undefined;throw error});return initialized}
