CREATE TYPE "public"."account_type" AS ENUM('personal', 'family', 'business');--> statement-breakpoint
CREATE TYPE "public"."billing_interval" AS ENUM('monthly', 'annual');--> statement-breakpoint
CREATE TYPE "public"."company_role" AS ENUM('company_employee', 'company_administrator');--> statement-breakpoint
CREATE TYPE "public"."company_status" AS ENUM('active', 'suspended');--> statement-breakpoint
CREATE TYPE "public"."environment_type" AS ENUM('development', 'staging', 'production');--> statement-breakpoint
CREATE TYPE "public"."family_role" AS ENUM('family_member', 'family_administrator');--> statement-breakpoint
CREATE TYPE "public"."membership_status" AS ENUM('pending', 'active');--> statement-breakpoint
CREATE TYPE "public"."payment_event_status" AS ENUM('received', 'processed', 'failed', 'ignored');--> statement-breakpoint
CREATE TYPE "public"."platform_status" AS ENUM('operational', 'degraded', 'maintenance');--> statement-breakpoint
CREATE TYPE "public"."security_config_status" AS ENUM('configured', 'not_configured');--> statement-breakpoint
CREATE TYPE "public"."stripe_customer_status" AS ENUM('pending', 'connected', 'disconnected');--> statement-breakpoint
CREATE TYPE "public"."subscription_status" AS ENUM('trialing', 'active', 'past_due', 'canceled', 'expired');--> statement-breakpoint
CREATE TYPE "public"."system_role" AS ENUM('user', 'system_admin');--> statement-breakpoint
CREATE TYPE "public"."user_status" AS ENUM('active', 'suspended');--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "audit_logs_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"actor_user_id" bigint,
	"action" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" bigint,
	"action_data" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"ip_address" "inet",
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "companies" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "companies_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"name" text NOT NULL,
	"registration_number" text NOT NULL,
	"billing_address" text NOT NULL,
	"country_id" bigint NOT NULL,
	"status" "company_status" DEFAULT 'active' NOT NULL,
	"created_by_user_id" bigint,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "company_users" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "company_users_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"company_id" bigint NOT NULL,
	"user_id" bigint,
	"invited_email" text,
	"role" "company_role" DEFAULT 'company_employee' NOT NULL,
	"status" "membership_status" DEFAULT 'pending' NOT NULL,
	"added_by_user_id" bigint,
	"joined_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "countries" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "countries_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"code" text NOT NULL,
	"name" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "families" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "families_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"name" text NOT NULL,
	"country_id" bigint NOT NULL,
	"created_by_user_id" bigint,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "family_members" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "family_members_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"family_id" bigint NOT NULL,
	"user_id" bigint,
	"invited_email" text,
	"role" "family_role" DEFAULT 'family_member' NOT NULL,
	"status" "membership_status" DEFAULT 'pending' NOT NULL,
	"invited_by_user_id" bigint,
	"joined_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "languages" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "languages_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"code" text NOT NULL,
	"name" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "password_resets" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "password_resets_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"user_id" bigint NOT NULL,
	"token_hash" text NOT NULL,
	"initiated_by_user_id" bigint,
	"requested_ip" "inet",
	"expires_at" timestamp with time zone NOT NULL,
	"used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payment_events" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "payment_events_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"stripe_customer_id" bigint,
	"stripe_event_id" text NOT NULL,
	"event_type" text NOT NULL,
	"status" "payment_event_status" DEFAULT 'received' NOT NULL,
	"is_mock" boolean DEFAULT true NOT NULL,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"error_message" text,
	"processed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "platform_settings" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "platform_settings_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"singleton" boolean DEFAULT true NOT NULL,
	"status" "platform_status" DEFAULT 'operational' NOT NULL,
	"default_language_id" bigint NOT NULL,
	"default_country_id" bigint NOT NULL,
	"security_status" "security_config_status" DEFAULT 'configured' NOT NULL,
	"environment" "environment_type" NOT NULL,
	"updated_by_user_id" bigint,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stripe_customers" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "stripe_customers_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"user_id" bigint NOT NULL,
	"stripe_customer_id" text NOT NULL,
	"status" "stripe_customer_status" DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "subscriptions" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "subscriptions_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"plan_name" text NOT NULL,
	"account_type" "account_type" NOT NULL,
	"max_products" integer,
	"monthly_price" numeric(10, 2) NOT NULL,
	"annual_price" numeric(10, 2) NOT NULL,
	"currency_code" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "user_sessions" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "user_sessions_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"user_id" bigint NOT NULL,
	"refresh_token_hash" text NOT NULL,
	"ip_address" "inet",
	"user_agent" text,
	"expires_at" timestamp with time zone NOT NULL,
	"last_used_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_subscriptions" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "user_subscriptions_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"user_id" bigint NOT NULL,
	"subscription_id" bigint NOT NULL,
	"family_id" bigint,
	"company_id" bigint,
	"status" "subscription_status" DEFAULT 'active' NOT NULL,
	"billing_interval" "billing_interval" DEFAULT 'monthly' NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone,
	"canceled_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "users_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"username" text NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"mobile_number" text,
	"city" text NOT NULL,
	"postal_code" text,
	"country_id" bigint NOT NULL,
	"language_id" bigint,
	"account_type" "account_type" DEFAULT 'personal' NOT NULL,
	"status" "user_status" DEFAULT 'active' NOT NULL,
	"system_role" "system_role" DEFAULT 'user' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "companies" ADD CONSTRAINT "companies_country_id_countries_id_fk" FOREIGN KEY ("country_id") REFERENCES "public"."countries"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "companies" ADD CONSTRAINT "companies_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "company_users" ADD CONSTRAINT "company_users_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "company_users" ADD CONSTRAINT "company_users_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "company_users" ADD CONSTRAINT "company_users_added_by_user_id_users_id_fk" FOREIGN KEY ("added_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "families" ADD CONSTRAINT "families_country_id_countries_id_fk" FOREIGN KEY ("country_id") REFERENCES "public"."countries"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "families" ADD CONSTRAINT "families_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "family_members" ADD CONSTRAINT "family_members_family_id_families_id_fk" FOREIGN KEY ("family_id") REFERENCES "public"."families"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "family_members" ADD CONSTRAINT "family_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "family_members" ADD CONSTRAINT "family_members_invited_by_user_id_users_id_fk" FOREIGN KEY ("invited_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "password_resets" ADD CONSTRAINT "password_resets_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "password_resets" ADD CONSTRAINT "password_resets_initiated_by_user_id_users_id_fk" FOREIGN KEY ("initiated_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "payment_events" ADD CONSTRAINT "payment_events_stripe_customer_id_stripe_customers_id_fk" FOREIGN KEY ("stripe_customer_id") REFERENCES "public"."stripe_customers"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "platform_settings" ADD CONSTRAINT "platform_settings_default_language_id_languages_id_fk" FOREIGN KEY ("default_language_id") REFERENCES "public"."languages"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "platform_settings" ADD CONSTRAINT "platform_settings_default_country_id_countries_id_fk" FOREIGN KEY ("default_country_id") REFERENCES "public"."countries"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "platform_settings" ADD CONSTRAINT "platform_settings_updated_by_user_id_users_id_fk" FOREIGN KEY ("updated_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "stripe_customers" ADD CONSTRAINT "stripe_customers_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "user_sessions" ADD CONSTRAINT "user_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "user_subscriptions" ADD CONSTRAINT "user_subscriptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "user_subscriptions" ADD CONSTRAINT "user_subscriptions_subscription_id_subscriptions_id_fk" FOREIGN KEY ("subscription_id") REFERENCES "public"."subscriptions"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "user_subscriptions" ADD CONSTRAINT "user_subscriptions_family_id_families_id_fk" FOREIGN KEY ("family_id") REFERENCES "public"."families"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "user_subscriptions" ADD CONSTRAINT "user_subscriptions_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_country_id_countries_id_fk" FOREIGN KEY ("country_id") REFERENCES "public"."countries"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_language_id_languages_id_fk" FOREIGN KEY ("language_id") REFERENCES "public"."languages"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
CREATE INDEX "audit_logs_actor_user_id_idx" ON "audit_logs" USING btree ("actor_user_id");--> statement-breakpoint
CREATE INDEX "audit_logs_entity_idx" ON "audit_logs" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "audit_logs_action_created_at_idx" ON "audit_logs" USING btree ("action","created_at");--> statement-breakpoint
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "companies_active_country_registration_uq" ON "companies" USING btree ("country_id","registration_number") WHERE deleted_at IS NULL;--> statement-breakpoint
CREATE INDEX "companies_country_id_idx" ON "companies" USING btree ("country_id");--> statement-breakpoint
CREATE INDEX "companies_created_by_user_id_idx" ON "companies" USING btree ("created_by_user_id");--> statement-breakpoint
CREATE INDEX "companies_status_idx" ON "companies" USING btree ("status") WHERE deleted_at IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "company_users_active_company_user_uq" ON "company_users" USING btree ("company_id","user_id") WHERE deleted_at IS NULL AND user_id IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "company_users_pending_company_email_uq" ON "company_users" USING btree ("company_id",lower("invited_email")) WHERE deleted_at IS NULL AND user_id IS NULL AND invited_email IS NOT NULL;--> statement-breakpoint
CREATE INDEX "company_users_company_id_idx" ON "company_users" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "company_users_user_id_idx" ON "company_users" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "company_users_added_by_user_id_idx" ON "company_users" USING btree ("added_by_user_id");--> statement-breakpoint
CREATE INDEX "company_users_company_role_idx" ON "company_users" USING btree ("company_id","role") WHERE deleted_at IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "countries_active_code_uq" ON "countries" USING btree ("code") WHERE deleted_at IS NULL;--> statement-breakpoint
CREATE INDEX "countries_active_idx" ON "countries" USING btree ("is_active") WHERE deleted_at IS NULL;--> statement-breakpoint
CREATE INDEX "families_country_id_idx" ON "families" USING btree ("country_id");--> statement-breakpoint
CREATE INDEX "families_created_by_user_id_idx" ON "families" USING btree ("created_by_user_id");--> statement-breakpoint
CREATE INDEX "families_created_at_idx" ON "families" USING btree ("created_at") WHERE deleted_at IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "family_members_active_family_user_uq" ON "family_members" USING btree ("family_id","user_id") WHERE deleted_at IS NULL AND user_id IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "family_members_pending_family_email_uq" ON "family_members" USING btree ("family_id",lower("invited_email")) WHERE deleted_at IS NULL AND user_id IS NULL AND invited_email IS NOT NULL;--> statement-breakpoint
CREATE INDEX "family_members_family_id_idx" ON "family_members" USING btree ("family_id");--> statement-breakpoint
CREATE INDEX "family_members_user_id_idx" ON "family_members" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "family_members_invited_by_user_id_idx" ON "family_members" USING btree ("invited_by_user_id");--> statement-breakpoint
CREATE INDEX "family_members_family_role_idx" ON "family_members" USING btree ("family_id","role") WHERE deleted_at IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "languages_active_code_uq" ON "languages" USING btree ("code") WHERE deleted_at IS NULL;--> statement-breakpoint
CREATE INDEX "languages_active_idx" ON "languages" USING btree ("is_active") WHERE deleted_at IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "password_resets_token_hash_uq" ON "password_resets" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "password_resets_user_id_idx" ON "password_resets" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "password_resets_initiated_by_user_id_idx" ON "password_resets" USING btree ("initiated_by_user_id");--> statement-breakpoint
CREATE INDEX "password_resets_pending_user_id_idx" ON "password_resets" USING btree ("user_id") WHERE used_at IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "payment_events_stripe_event_id_uq" ON "payment_events" USING btree ("stripe_event_id");--> statement-breakpoint
CREATE INDEX "payment_events_stripe_customer_id_idx" ON "payment_events" USING btree ("stripe_customer_id");--> statement-breakpoint
CREATE INDEX "payment_events_event_type_created_at_idx" ON "payment_events" USING btree ("event_type","created_at");--> statement-breakpoint
CREATE INDEX "payment_events_created_at_idx" ON "payment_events" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "platform_settings_singleton_uq" ON "platform_settings" USING btree ("singleton");--> statement-breakpoint
CREATE INDEX "platform_settings_default_language_id_idx" ON "platform_settings" USING btree ("default_language_id");--> statement-breakpoint
CREATE INDEX "platform_settings_default_country_id_idx" ON "platform_settings" USING btree ("default_country_id");--> statement-breakpoint
CREATE INDEX "platform_settings_updated_by_user_id_idx" ON "platform_settings" USING btree ("updated_by_user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "stripe_customers_active_user_uq" ON "stripe_customers" USING btree ("user_id") WHERE deleted_at IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "stripe_customers_active_stripe_customer_id_uq" ON "stripe_customers" USING btree ("stripe_customer_id") WHERE deleted_at IS NULL;--> statement-breakpoint
CREATE INDEX "stripe_customers_user_id_idx" ON "stripe_customers" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "subscriptions_active_plan_name_uq" ON "subscriptions" USING btree ("plan_name") WHERE deleted_at IS NULL;--> statement-breakpoint
CREATE INDEX "subscriptions_account_type_idx" ON "subscriptions" USING btree ("account_type") WHERE deleted_at IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "user_sessions_refresh_token_hash_uq" ON "user_sessions" USING btree ("refresh_token_hash");--> statement-breakpoint
CREATE INDEX "user_sessions_user_id_idx" ON "user_sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "user_sessions_live_user_id_idx" ON "user_sessions" USING btree ("user_id") WHERE revoked_at IS NULL;--> statement-breakpoint
CREATE INDEX "user_sessions_expires_at_idx" ON "user_sessions" USING btree ("expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "user_subscriptions_live_personal_uq" ON "user_subscriptions" USING btree ("user_id") WHERE family_id IS NULL AND company_id IS NULL AND deleted_at IS NULL AND status IN ('trialing', 'active', 'past_due');--> statement-breakpoint
CREATE UNIQUE INDEX "user_subscriptions_live_family_uq" ON "user_subscriptions" USING btree ("family_id") WHERE family_id IS NOT NULL AND deleted_at IS NULL AND status IN ('trialing', 'active', 'past_due');--> statement-breakpoint
CREATE UNIQUE INDEX "user_subscriptions_live_company_uq" ON "user_subscriptions" USING btree ("company_id") WHERE company_id IS NOT NULL AND deleted_at IS NULL AND status IN ('trialing', 'active', 'past_due');--> statement-breakpoint
CREATE INDEX "user_subscriptions_user_id_idx" ON "user_subscriptions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "user_subscriptions_subscription_id_idx" ON "user_subscriptions" USING btree ("subscription_id");--> statement-breakpoint
CREATE INDEX "user_subscriptions_family_id_idx" ON "user_subscriptions" USING btree ("family_id");--> statement-breakpoint
CREATE INDEX "user_subscriptions_company_id_idx" ON "user_subscriptions" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "user_subscriptions_status_expires_at_idx" ON "user_subscriptions" USING btree ("status","expires_at") WHERE deleted_at IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "users_active_email_uq" ON "users" USING btree ("email") WHERE deleted_at IS NULL;--> statement-breakpoint
CREATE INDEX "users_country_id_idx" ON "users" USING btree ("country_id");--> statement-breakpoint
CREATE INDEX "users_language_id_idx" ON "users" USING btree ("language_id");--> statement-breakpoint
CREATE INDEX "users_lower_username_idx" ON "users" USING btree (lower("username")) WHERE deleted_at IS NULL;--> statement-breakpoint
CREATE INDEX "users_status_account_type_idx" ON "users" USING btree ("status","account_type") WHERE deleted_at IS NULL;