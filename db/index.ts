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
"CREATE INDEX IF NOT EXISTS idx_events_project_name_time ON events(project_id,event_name,occurred_at)",
"CREATE TABLE IF NOT EXISTS orders(id text PRIMARY KEY,project_id text NOT NULL,external_id text NOT NULL,provider text NOT NULL,status text NOT NULL,value real NOT NULL,currency text NOT NULL,utm_campaign text,utm_source text,utm_medium text,utm_content text,utm_term text,event_id text,created_at integer NOT NULL,updated_at integer NOT NULL)",
"CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_provider_external ON orders(provider,external_id)",
"CREATE INDEX IF NOT EXISTS idx_orders_project_time ON orders(project_id,created_at)",
"CREATE TABLE IF NOT EXISTS api_credentials(id text PRIMARY KEY,workspace_id text NOT NULL,project_id text NOT NULL,name text NOT NULL,provider text NOT NULL DEFAULT 'generic',token_hash text NOT NULL,active integer NOT NULL DEFAULT 1,created_at text NOT NULL,last_used_at text)",
"CREATE UNIQUE INDEX IF NOT EXISTS idx_api_credentials_token ON api_credentials(token_hash)",
"CREATE INDEX IF NOT EXISTS idx_api_credentials_workspace ON api_credentials(workspace_id)",
"CREATE INDEX IF NOT EXISTS idx_api_credentials_project ON api_credentials(project_id)",
"CREATE TABLE IF NOT EXISTS users(id text PRIMARY KEY,email text NOT NULL UNIQUE,password_hash text NOT NULL,name text,cpf text UNIQUE,created_at integer NOT NULL,role text NOT NULL DEFAULT 'member',totp_secret_cipher text,totp_iv text,totp_enabled integer NOT NULL DEFAULT 0,email_verified_at integer,failed_attempts integer NOT NULL DEFAULT 0,locked_until integer)",
"CREATE TABLE IF NOT EXISTS sessions(id text PRIMARY KEY,user_id text NOT NULL,token_hash text NOT NULL UNIQUE,is_admin integer NOT NULL DEFAULT 0,pending_2fa integer NOT NULL DEFAULT 0,expires_at integer NOT NULL,created_at integer NOT NULL,last_seen_at integer NOT NULL,ip text,user_agent text)",
"CREATE UNIQUE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token_hash)",
"CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id)",
"CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at)",
"CREATE TABLE IF NOT EXISTS login_attempts(id text PRIMARY KEY,email text,ip text,success integer NOT NULL DEFAULT 0,created_at integer NOT NULL)",
"CREATE INDEX IF NOT EXISTS idx_login_attempts_email_time ON login_attempts(email,created_at)",
"CREATE INDEX IF NOT EXISTS idx_login_attempts_ip_time ON login_attempts(ip,created_at)",
"CREATE TABLE IF NOT EXISTS password_resets(id text PRIMARY KEY,user_id text NOT NULL,token_hash text NOT NULL UNIQUE,expires_at integer NOT NULL,used_at integer,created_at integer NOT NULL)",
"CREATE INDEX IF NOT EXISTS idx_password_resets_user ON password_resets(user_id)",
"CREATE TABLE IF NOT EXISTS email_verifications(id text PRIMARY KEY,user_id text NOT NULL,token_hash text NOT NULL UNIQUE,expires_at integer NOT NULL,used_at integer,created_at integer NOT NULL)",
"CREATE INDEX IF NOT EXISTS idx_email_verifications_user ON email_verifications(user_id)",
"CREATE TABLE IF NOT EXISTS meta_oauth_states(id text PRIMARY KEY,user_id text NOT NULL,state_hash text NOT NULL,expires_at integer NOT NULL,created_at integer NOT NULL)",
"CREATE UNIQUE INDEX IF NOT EXISTS idx_meta_oauth_states_hash ON meta_oauth_states(state_hash)",
"CREATE INDEX IF NOT EXISTS idx_meta_oauth_states_user ON meta_oauth_states(user_id)",
"CREATE TABLE IF NOT EXISTS google_oauth_states(id text PRIMARY KEY,user_id text NOT NULL,state_hash text NOT NULL,expires_at integer NOT NULL,created_at integer NOT NULL)",
"CREATE UNIQUE INDEX IF NOT EXISTS idx_google_oauth_states_hash ON google_oauth_states(state_hash)",
"CREATE INDEX IF NOT EXISTS idx_google_oauth_states_user ON google_oauth_states(user_id)",
"CREATE TABLE IF NOT EXISTS meta_accounts(id text PRIMARY KEY,workspace_id text NOT NULL,user_id text NOT NULL,meta_user_id text,meta_user_name text,ad_account_id text NOT NULL,account_name text NOT NULL,currency text,timezone_name text,account_status integer,access_token_cipher text NOT NULL,access_token_iv text NOT NULL,token_expires_at integer,selected integer NOT NULL DEFAULT 0,connected_at integer NOT NULL,updated_at integer NOT NULL)",
"CREATE UNIQUE INDEX IF NOT EXISTS idx_meta_accounts_user_ad ON meta_accounts(user_id,ad_account_id)",
"CREATE INDEX IF NOT EXISTS idx_meta_accounts_workspace ON meta_accounts(workspace_id)",
"CREATE INDEX IF NOT EXISTS idx_meta_accounts_selected ON meta_accounts(user_id,selected)",
"CREATE TABLE IF NOT EXISTS meta_linked(user_id text NOT NULL,ad_account_id text NOT NULL,created_at integer NOT NULL)",
"CREATE UNIQUE INDEX IF NOT EXISTS idx_meta_linked_user_ad ON meta_linked(user_id,ad_account_id)",
"CREATE TABLE IF NOT EXISTS push_subscriptions(workspace_id text NOT NULL,endpoint text NOT NULL,p256dh text NOT NULL,auth text NOT NULL,created_at integer NOT NULL)",
"CREATE UNIQUE INDEX IF NOT EXISTS idx_push_sub_endpoint ON push_subscriptions(workspace_id,endpoint)",
"CREATE TABLE IF NOT EXISTS notification_prefs(workspace_id text PRIMARY KEY,user_id text,prefs text NOT NULL,updated_at integer NOT NULL)",
"CREATE TABLE IF NOT EXISTS sound_prefs(workspace_id text PRIMARY KEY,user_id text,prefs text NOT NULL,updated_at integer NOT NULL)",
"CREATE TABLE IF NOT EXISTS automation_rules(id text PRIMARY KEY,workspace_id text NOT NULL,user_id text NOT NULL,name text NOT NULL,level text NOT NULL,metric text NOT NULL,operator text NOT NULL,value real NOT NULL,window_days integer NOT NULL,min_spend real NOT NULL,action text NOT NULL,active integer NOT NULL DEFAULT 1,cooldown_hours integer NOT NULL DEFAULT 24,last_triggered_at integer,created_at integer NOT NULL,updated_at integer NOT NULL)",
"CREATE TABLE IF NOT EXISTS action_history(id text PRIMARY KEY,workspace_id text NOT NULL,user_id text NOT NULL,rule_id text,actor text NOT NULL,action text NOT NULL,target_level text,target_id text,target_name text,detail text,created_at integer NOT NULL)",
"CREATE INDEX IF NOT EXISTS idx_action_history_ws ON action_history(workspace_id,created_at)",
"CREATE TABLE IF NOT EXISTS plan_subscriptions(id text PRIMARY KEY,workspace_id text NOT NULL,user_id text NOT NULL,email text,plan text NOT NULL,status text NOT NULL,cakto_order_id text,cakto_subscription_id text,cakto_offer_id text,amount text,currency text,current_period_end integer,created_at integer NOT NULL,updated_at integer NOT NULL)",
"CREATE INDEX IF NOT EXISTS idx_plan_subs_workspace ON plan_subscriptions(workspace_id)",
"CREATE UNIQUE INDEX IF NOT EXISTS idx_plan_subs_cakto_sub ON plan_subscriptions(cakto_subscription_id)",
"CREATE INDEX IF NOT EXISTS idx_plan_subs_email ON plan_subscriptions(email)"
];
export async function ensureDb(){if(!initialized)initialized=(async()=>{const binding=d1();const addCols=["ALTER TABLE projects ADD COLUMN tracking_config text","ALTER TABLE orders ADD COLUMN utm_campaign text","ALTER TABLE orders ADD COLUMN utm_source text","ALTER TABLE orders ADD COLUMN utm_medium text","ALTER TABLE orders ADD COLUMN utm_content text","ALTER TABLE orders ADD COLUMN utm_term text","ALTER TABLE notification_prefs ADD COLUMN user_id text","ALTER TABLE users ADD COLUMN name text","ALTER TABLE users ADD COLUMN cpf text","ALTER TABLE users ADD COLUMN role text","ALTER TABLE users ADD COLUMN totp_secret_cipher text","ALTER TABLE users ADD COLUMN totp_iv text","ALTER TABLE users ADD COLUMN totp_enabled integer","ALTER TABLE users ADD COLUMN email_verified_at integer","ALTER TABLE users ADD COLUMN failed_attempts integer","ALTER TABLE users ADD COLUMN locked_until integer"];if(binding){for(const statement of statements)await binding.prepare(statement).run();for(const add of addCols){try{await binding.prepare(add).run()}catch{}}}else{await getSql().unsafe(statements.map(s=>s+';').join('\n'));for(const add of addCols){try{await getSql().unsafe(add)}catch{}}}})().catch(error=>{initialized=undefined;throw error});return initialized}
