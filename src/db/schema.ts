import {
  pgTable,
  bigint,
  text,
  boolean,
  timestamp,
  numeric,
  integer,
  jsonb,
  inet,
  uniqueIndex,
  index,
  pgEnum,
} from 'drizzle-orm/pg-core';
import { sql, relations } from 'drizzle-orm';

// =====================================================================
// POSTGRESQL NATIVE ENUMS
// =====================================================================

export const accountTypeEnum = pgEnum('account_type', ['personal', 'family', 'business']);
export const userStatusEnum = pgEnum('user_status', ['active', 'suspended']);
export const systemRoleEnum = pgEnum('system_role', ['user', 'system_admin']);
export const familyRoleEnum = pgEnum('family_role', ['family_member', 'family_administrator']);
export const companyRoleEnum = pgEnum('company_role', ['company_employee', 'company_administrator']);
export const membershipStatusEnum = pgEnum('membership_status', ['pending', 'active']);
export const companyStatusEnum = pgEnum('company_status', ['active', 'suspended']);
export const billingIntervalEnum = pgEnum('billing_interval', ['monthly', 'annual']);
export const subscriptionStatusEnum = pgEnum('subscription_status', [
  'trialing',
  'active',
  'past_due',
  'canceled',
  'expired',
]);
export const stripeCustomerStatusEnum = pgEnum('stripe_customer_status', [
  'pending',
  'connected',
  'disconnected',
]);
export const paymentEventStatusEnum = pgEnum('payment_event_status', [
  'received',
  'processed',
  'failed',
  'ignored',
]);
export const platformStatusEnum = pgEnum('platform_status', ['operational', 'degraded', 'maintenance']);
export const securityConfigStatusEnum = pgEnum('security_config_status', ['configured', 'not_configured']);
export const environmentTypeEnum = pgEnum('environment_type', ['development', 'staging', 'production']);

export type AccountType = (typeof accountTypeEnum.enumValues)[number];
export type UserStatus = (typeof userStatusEnum.enumValues)[number];
export type SystemRole = (typeof systemRoleEnum.enumValues)[number];
export type FamilyRole = (typeof familyRoleEnum.enumValues)[number];
export type CompanyRole = (typeof companyRoleEnum.enumValues)[number];
export type MembershipStatus = (typeof membershipStatusEnum.enumValues)[number];
export type CompanyStatus = (typeof companyStatusEnum.enumValues)[number];
export type BillingInterval = (typeof billingIntervalEnum.enumValues)[number];
export type SubscriptionStatus = (typeof subscriptionStatusEnum.enumValues)[number];
export type StripeCustomerStatus = (typeof stripeCustomerStatusEnum.enumValues)[number];
export type PaymentEventStatus = (typeof paymentEventStatusEnum.enumValues)[number];
export type PlatformStatus = (typeof platformStatusEnum.enumValues)[number];
export type SecurityConfigStatus = (typeof securityConfigStatusEnum.enumValues)[number];
export type EnvironmentType = (typeof environmentTypeEnum.enumValues)[number];


// =====================================================================
// 1. COUNTRIES REFERENCE TABLE
// =====================================================================

export const countries = pgTable(
  'countries',
  {
    id: bigint('id', { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
    code: text('code').notNull(), // ISO 3166-1 alpha-2, e.g. "SE", "NO", "DK"
    name: text('name').notNull(),
    isActive: boolean('is_active').default(true).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => [
    uniqueIndex('countries_active_code_uq').on(table.code).where(sql`deleted_at IS NULL`),
    index('countries_active_idx').on(table.isActive).where(sql`deleted_at IS NULL`),
  ]
);

// =====================================================================
// 2. LANGUAGES REFERENCE TABLE
// =====================================================================

export const languages = pgTable(
  'languages',
  {
    id: bigint('id', { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
    code: text('code').notNull(), // ISO 639-1, e.g. "en", "sv", "nb", "da"
    name: text('name').notNull(),
    isActive: boolean('is_active').default(true).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => [
    uniqueIndex('languages_active_code_uq').on(table.code).where(sql`deleted_at IS NULL`),
    index('languages_active_idx').on(table.isActive).where(sql`deleted_at IS NULL`),
  ]
);

// =====================================================================
// 3. USERS TABLE
// =====================================================================

export const users = pgTable(
  'users',
  {
    id: bigint('id', { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
    username: text('username').notNull(),
    email: text('email').notNull(),
    passwordHash: text('password_hash').notNull(),
    mobileNumber: text('mobile_number'),
    city: text('city').notNull(),
    postalCode: text('postal_code'),
    countryId: bigint('country_id', { mode: 'number' })
      .references(() => countries.id, { onDelete: 'restrict', onUpdate: 'cascade' })
      .notNull(),
    languageId: bigint('language_id', { mode: 'number' }).references(() => languages.id, {
      onDelete: 'restrict',
      onUpdate: 'cascade',
    }),
    accountType: accountTypeEnum('account_type').default('personal').notNull(),
    status: userStatusEnum('status').default('active').notNull(),
    systemRole: systemRoleEnum('system_role').default('user').notNull(),
    mustChangePassword: boolean('must_change_password').default(false).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => [
    uniqueIndex('users_active_email_uq').on(table.email).where(sql`deleted_at IS NULL`),
    index('users_country_id_idx').on(table.countryId),
    index('users_language_id_idx').on(table.languageId),
    index('users_lower_username_idx').on(sql`lower(${table.username})`).where(sql`deleted_at IS NULL`),
    index('users_status_account_type_idx')
      .on(table.status, table.accountType)
      .where(sql`deleted_at IS NULL`),
  ]
);

// =====================================================================
// 4. USER SESSIONS
// =====================================================================

export const userSessions = pgTable(
  'user_sessions',
  {
    id: bigint('id', { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
    userId: bigint('user_id', { mode: 'number' })
      .references(() => users.id, { onDelete: 'cascade', onUpdate: 'cascade' })
      .notNull(),
    refreshTokenHash: text('refresh_token_hash').notNull(),
    ipAddress: inet('ip_address'),
    userAgent: text('user_agent'),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    lastUsedAt: timestamp('last_used_at', { withTimezone: true }),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('user_sessions_refresh_token_hash_uq').on(table.refreshTokenHash),
    index('user_sessions_user_id_idx').on(table.userId),
    index('user_sessions_live_user_id_idx').on(table.userId).where(sql`revoked_at IS NULL`),
    index('user_sessions_expires_at_idx').on(table.expiresAt),
  ]
);

// =====================================================================
// 5. PASSWORD RESETS / ACTIVATION TOKENS
// =====================================================================

export const passwordResets = pgTable(
  'password_resets',
  {
    id: bigint('id', { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
    userId: bigint('user_id', { mode: 'number' })
      .references(() => users.id, { onDelete: 'cascade', onUpdate: 'cascade' })
      .notNull(),
    tokenHash: text('token_hash').notNull(),
    initiatedByUserId: bigint('initiated_by_user_id', { mode: 'number' }).references(() => users.id, {
      onDelete: 'set null',
      onUpdate: 'cascade',
    }),
    requestedIp: inet('requested_ip'),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    usedAt: timestamp('used_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('password_resets_token_hash_uq').on(table.tokenHash),
    index('password_resets_user_id_idx').on(table.userId),
    index('password_resets_initiated_by_user_id_idx').on(table.initiatedByUserId),
    index('password_resets_pending_user_id_idx').on(table.userId).where(sql`used_at IS NULL`),
  ]
);

// =====================================================================
// 6. FAMILIES
// =====================================================================

export const families = pgTable(
  'families',
  {
    id: bigint('id', { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
    name: text('name').notNull(),
    countryId: bigint('country_id', { mode: 'number' })
      .references(() => countries.id, { onDelete: 'restrict', onUpdate: 'cascade' })
      .notNull(),
    createdByUserId: bigint('created_by_user_id', { mode: 'number' }).references(() => users.id, {
      onDelete: 'set null',
      onUpdate: 'cascade',
    }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => [
    index('families_country_id_idx').on(table.countryId),
    index('families_created_by_user_id_idx').on(table.createdByUserId),
    index('families_created_at_idx').on(table.createdAt).where(sql`deleted_at IS NULL`),
  ]
);

// =====================================================================
// 7. FAMILY MEMBERS (JUNCTION)
// =====================================================================

export const familyMembers = pgTable(
  'family_members',
  {
    id: bigint('id', { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
    familyId: bigint('family_id', { mode: 'number' })
      .references(() => families.id, { onDelete: 'cascade', onUpdate: 'cascade' })
      .notNull(),
    userId: bigint('user_id', { mode: 'number' }).references(() => users.id, {
      onDelete: 'cascade',
      onUpdate: 'cascade',
    }),
    invitedEmail: text('invited_email'),
    role: familyRoleEnum('role').default('family_member').notNull(),
    status: membershipStatusEnum('status').default('pending').notNull(),
    invitedByUserId: bigint('invited_by_user_id', { mode: 'number' }).references(() => users.id, {
      onDelete: 'set null',
      onUpdate: 'cascade',
    }),
    joinedAt: timestamp('joined_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => [
    uniqueIndex('family_members_active_family_user_uq')
      .on(table.familyId, table.userId)
      .where(sql`deleted_at IS NULL AND user_id IS NOT NULL`),
    uniqueIndex('family_members_pending_family_email_uq')
      .on(table.familyId, sql`lower(${table.invitedEmail})`)
      .where(sql`deleted_at IS NULL AND user_id IS NULL AND invited_email IS NOT NULL`),
    index('family_members_family_id_idx').on(table.familyId),
    index('family_members_user_id_idx').on(table.userId),
    index('family_members_invited_by_user_id_idx').on(table.invitedByUserId),
    index('family_members_family_role_idx')
      .on(table.familyId, table.role)
      .where(sql`deleted_at IS NULL`),
  ]
);

// =====================================================================
// 8. COMPANIES
// =====================================================================

export const companies = pgTable(
  'companies',
  {
    id: bigint('id', { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
    name: text('name').notNull(),
    registrationNumber: text('registration_number').notNull(),
    billingAddress: text('billing_address').notNull(),
    countryId: bigint('country_id', { mode: 'number' })
      .references(() => countries.id, { onDelete: 'restrict', onUpdate: 'cascade' })
      .notNull(),
    status: companyStatusEnum('status').default('active').notNull(),
    createdByUserId: bigint('created_by_user_id', { mode: 'number' }).references(() => users.id, {
      onDelete: 'set null',
      onUpdate: 'cascade',
    }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => [
    uniqueIndex('companies_active_country_registration_uq')
      .on(table.countryId, table.registrationNumber)
      .where(sql`deleted_at IS NULL`),
    index('companies_country_id_idx').on(table.countryId),
    index('companies_created_by_user_id_idx').on(table.createdByUserId),
    index('companies_status_idx').on(table.status).where(sql`deleted_at IS NULL`),
  ]
);

// =====================================================================
// 9. COMPANY USERS (JUNCTION)
// =====================================================================

export const companyUsers = pgTable(
  'company_users',
  {
    id: bigint('id', { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
    companyId: bigint('company_id', { mode: 'number' })
      .references(() => companies.id, { onDelete: 'cascade', onUpdate: 'cascade' })
      .notNull(),
    userId: bigint('user_id', { mode: 'number' }).references(() => users.id, {
      onDelete: 'cascade',
      onUpdate: 'cascade',
    }),
    invitedEmail: text('invited_email'),
    role: companyRoleEnum('role').default('company_employee').notNull(),
    status: membershipStatusEnum('status').default('pending').notNull(),
    addedByUserId: bigint('added_by_user_id', { mode: 'number' }).references(() => users.id, {
      onDelete: 'set null',
      onUpdate: 'cascade',
    }),
    joinedAt: timestamp('joined_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => [
    uniqueIndex('company_users_active_company_user_uq')
      .on(table.companyId, table.userId)
      .where(sql`deleted_at IS NULL AND user_id IS NOT NULL`),
    uniqueIndex('company_users_pending_company_email_uq')
      .on(table.companyId, sql`lower(${table.invitedEmail})`)
      .where(sql`deleted_at IS NULL AND user_id IS NULL AND invited_email IS NOT NULL`),
    index('company_users_company_id_idx').on(table.companyId),
    index('company_users_user_id_idx').on(table.userId),
    index('company_users_added_by_user_id_idx').on(table.addedByUserId),
    index('company_users_company_role_idx')
      .on(table.companyId, table.role)
      .where(sql`deleted_at IS NULL`),
  ]
);

// =====================================================================
// 10. SUBSCRIPTIONS (PLAN CATALOGUE)
// =====================================================================

export const subscriptions = pgTable(
  'subscriptions',
  {
    id: bigint('id', { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
    planName: text('plan_name').notNull(),
    accountType: accountTypeEnum('account_type').notNull(),
    maxProducts: integer('max_products'),
    monthlyPrice: numeric('monthly_price', { precision: 10, scale: 2 }).notNull(),
    annualPrice: numeric('annual_price', { precision: 10, scale: 2 }).notNull(),
    currencyCode: text('currency_code').notNull(), // e.g. "EUR", "SEK", "USD"
    isActive: boolean('is_active').default(true).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => [
    uniqueIndex('subscriptions_active_plan_name_uq')
      .on(table.planName)
      .where(sql`deleted_at IS NULL`),
    index('subscriptions_account_type_idx')
      .on(table.accountType)
      .where(sql`deleted_at IS NULL`),
  ]
);

// =====================================================================
// 11. USER SUBSCRIPTIONS (LIFECYCLE)
// =====================================================================

export const userSubscriptions = pgTable(
  'user_subscriptions',
  {
    id: bigint('id', { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
    userId: bigint('user_id', { mode: 'number' })
      .references(() => users.id, { onDelete: 'restrict', onUpdate: 'cascade' })
      .notNull(),
    subscriptionId: bigint('subscription_id', { mode: 'number' })
      .references(() => subscriptions.id, { onDelete: 'restrict', onUpdate: 'cascade' })
      .notNull(),
    familyId: bigint('family_id', { mode: 'number' }).references(() => families.id, {
      onDelete: 'restrict',
      onUpdate: 'cascade',
    }),
    companyId: bigint('company_id', { mode: 'number' }).references(() => companies.id, {
      onDelete: 'restrict',
      onUpdate: 'cascade',
    }),
    status: subscriptionStatusEnum('status').default('active').notNull(),
    billingInterval: billingIntervalEnum('billing_interval').default('monthly').notNull(),
    startedAt: timestamp('started_at', { withTimezone: true }).defaultNow().notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }),
    canceledAt: timestamp('canceled_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => [
    uniqueIndex('user_subscriptions_live_personal_uq')
      .on(table.userId)
      .where(
        sql`family_id IS NULL AND company_id IS NULL AND deleted_at IS NULL AND status IN ('trialing', 'active', 'past_due')`
      ),
    uniqueIndex('user_subscriptions_live_family_uq')
      .on(table.familyId)
      .where(
        sql`family_id IS NOT NULL AND deleted_at IS NULL AND status IN ('trialing', 'active', 'past_due')`
      ),
    uniqueIndex('user_subscriptions_live_company_uq')
      .on(table.companyId)
      .where(
        sql`company_id IS NOT NULL AND deleted_at IS NULL AND status IN ('trialing', 'active', 'past_due')`
      ),
    index('user_subscriptions_user_id_idx').on(table.userId),
    index('user_subscriptions_subscription_id_idx').on(table.subscriptionId),
    index('user_subscriptions_family_id_idx').on(table.familyId),
    index('user_subscriptions_company_id_idx').on(table.companyId),
    index('user_subscriptions_status_expires_at_idx')
      .on(table.status, table.expiresAt)
      .where(sql`deleted_at IS NULL`),
  ]
);

// =====================================================================
// 12. STRIPE CUSTOMERS
// =====================================================================

export const stripeCustomers = pgTable(
  'stripe_customers',
  {
    id: bigint('id', { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
    userId: bigint('user_id', { mode: 'number' })
      .references(() => users.id, { onDelete: 'restrict', onUpdate: 'cascade' })
      .notNull(),
    stripeCustomerId: text('stripe_customer_id').notNull(),
    status: stripeCustomerStatusEnum('status').default('pending').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => [
    uniqueIndex('stripe_customers_active_user_uq').on(table.userId).where(sql`deleted_at IS NULL`),
    uniqueIndex('stripe_customers_active_stripe_customer_id_uq')
      .on(table.stripeCustomerId)
      .where(sql`deleted_at IS NULL`),
    index('stripe_customers_user_id_idx').on(table.userId),
  ]
);

// =====================================================================
// 13. PAYMENT EVENTS (IMMUTABLE WEBHOOK LEDGER)
// =====================================================================

export const paymentEvents = pgTable(
  'payment_events',
  {
    id: bigint('id', { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
    stripeCustomerId: bigint('stripe_customer_id', { mode: 'number' }).references(
      () => stripeCustomers.id,
      { onDelete: 'set null', onUpdate: 'cascade' }
    ),
    stripeEventId: text('stripe_event_id').notNull(),
    eventType: text('event_type').notNull(),
    status: paymentEventStatusEnum('status').default('received').notNull(),
    isMock: boolean('is_mock').default(true).notNull(),
    payload: jsonb('payload').default({}).notNull(),
    errorMessage: text('error_message'),
    processedAt: timestamp('processed_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('payment_events_stripe_event_id_uq').on(table.stripeEventId),
    index('payment_events_stripe_customer_id_idx').on(table.stripeCustomerId),
    index('payment_events_event_type_created_at_idx').on(table.eventType, table.createdAt),
    index('payment_events_created_at_idx').on(table.createdAt),
  ]
);

// =====================================================================
// 14. PLATFORM SETTINGS (SINGLETON CONFIGURATION)
// =====================================================================

export const platformSettings = pgTable(
  'platform_settings',
  {
    id: bigint('id', { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
    singleton: boolean('singleton').default(true).notNull(),
    status: platformStatusEnum('status').default('operational').notNull(),
    defaultLanguageId: bigint('default_language_id', { mode: 'number' })
      .references(() => languages.id, { onDelete: 'restrict', onUpdate: 'cascade' })
      .notNull(),
    defaultCountryId: bigint('default_country_id', { mode: 'number' })
      .references(() => countries.id, { onDelete: 'restrict', onUpdate: 'cascade' })
      .notNull(),
    securityStatus: securityConfigStatusEnum('security_status').default('configured').notNull(),
    environment: environmentTypeEnum('environment').notNull(),
    updatedByUserId: bigint('updated_by_user_id', { mode: 'number' }).references(() => users.id, {
      onDelete: 'set null',
      onUpdate: 'cascade',
    }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('platform_settings_singleton_uq').on(table.singleton),
    index('platform_settings_default_language_id_idx').on(table.defaultLanguageId),
    index('platform_settings_default_country_id_idx').on(table.defaultCountryId),
    index('platform_settings_updated_by_user_id_idx').on(table.updatedByUserId),
  ]
);

// =====================================================================
// 15. AUDIT LOGS (FORENSIC APPEND-ONLY LEDGER)
// =====================================================================

export const auditLogs = pgTable(
  'audit_logs',
  {
    id: bigint('id', { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
    actorUserId: bigint('actor_user_id', { mode: 'number' }).references(() => users.id, {
      onDelete: 'set null',
      onUpdate: 'cascade',
    }),
    action: text('action').notNull(), // e.g. "user.login", "family.member_invited"
    entityType: text('entity_type').notNull(), // "user", "family", "company"
    entityId: bigint('entity_id', { mode: 'number' }),
    actionData: jsonb('action_data').default({}).notNull(),
    ipAddress: inet('ip_address'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('audit_logs_actor_user_id_idx').on(table.actorUserId),
    index('audit_logs_entity_idx').on(table.entityType, table.entityId),
    index('audit_logs_action_created_at_idx').on(table.action, table.createdAt),
    index('audit_logs_created_at_idx').on(table.createdAt),
  ]
);

// =====================================================================
// DRIZZLE ORM RELATIONS DEFINITIONS
// =====================================================================

export const countriesRelations = relations(countries, ({ many }) => ({
  users: many(users),
  families: many(families),
  companies: many(companies),
}));

export const languagesRelations = relations(languages, ({ many }) => ({
  users: many(users),
}));

export const usersRelations = relations(users, ({ one, many }) => ({
  country: one(countries, { fields: [users.countryId], references: [countries.id] }),
  language: one(languages, { fields: [users.languageId], references: [languages.id] }),
  sessions: many(userSessions),
  passwordResets: many(passwordResets),
  familyMemberships: many(familyMembers),
  companyMemberships: many(companyUsers),
  subscriptions: many(userSubscriptions),
  stripeCustomer: one(stripeCustomers, { fields: [users.id], references: [stripeCustomers.userId] }),
  auditLogs: many(auditLogs),
}));

export const userSessionsRelations = relations(userSessions, ({ one }) => ({
  user: one(users, { fields: [userSessions.userId], references: [users.id] }),
}));

export const passwordResetsRelations = relations(passwordResets, ({ one }) => ({
  user: one(users, { fields: [passwordResets.userId], references: [users.id] }),
  initiatedBy: one(users, { fields: [passwordResets.initiatedByUserId], references: [users.id] }),
}));

export const familiesRelations = relations(families, ({ one, many }) => ({
  country: one(countries, { fields: [families.countryId], references: [countries.id] }),
  createdBy: one(users, { fields: [families.createdByUserId], references: [users.id] }),
  members: many(familyMembers),
  subscriptions: many(userSubscriptions),
}));

export const familyMembersRelations = relations(familyMembers, ({ one }) => ({
  family: one(families, { fields: [familyMembers.familyId], references: [families.id] }),
  user: one(users, { fields: [familyMembers.userId], references: [users.id] }),
  invitedBy: one(users, { fields: [familyMembers.invitedByUserId], references: [users.id] }),
}));

export const companiesRelations = relations(companies, ({ one, many }) => ({
  country: one(countries, { fields: [companies.countryId], references: [countries.id] }),
  createdBy: one(users, { fields: [companies.createdByUserId], references: [users.id] }),
  users: many(companyUsers),
  subscriptions: many(userSubscriptions),
}));

export const companyUsersRelations = relations(companyUsers, ({ one }) => ({
  company: one(companies, { fields: [companyUsers.companyId], references: [companies.id] }),
  user: one(users, { fields: [companyUsers.userId], references: [users.id] }),
  addedBy: one(users, { fields: [companyUsers.addedByUserId], references: [users.id] }),
}));

export const subscriptionsRelations = relations(subscriptions, ({ many }) => ({
  userSubscriptions: many(userSubscriptions),
}));

export const userSubscriptionsRelations = relations(userSubscriptions, ({ one }) => ({
  user: one(users, { fields: [userSubscriptions.userId], references: [users.id] }),
  subscription: one(subscriptions, {
    fields: [userSubscriptions.subscriptionId],
    references: [subscriptions.id],
  }),
  family: one(families, { fields: [userSubscriptions.familyId], references: [families.id] }),
  company: one(companies, { fields: [userSubscriptions.companyId], references: [companies.id] }),
}));

export const stripeCustomersRelations = relations(stripeCustomers, ({ one, many }) => ({
  user: one(users, { fields: [stripeCustomers.userId], references: [users.id] }),
  paymentEvents: many(paymentEvents),
}));

export const paymentEventsRelations = relations(paymentEvents, ({ one }) => ({
  stripeCustomer: one(stripeCustomers, {
    fields: [paymentEvents.stripeCustomerId],
    references: [stripeCustomers.id],
  }),
}));

export const platformSettingsRelations = relations(platformSettings, ({ one }) => ({
  defaultLanguage: one(languages, {
    fields: [platformSettings.defaultLanguageId],
    references: [languages.id],
  }),
  defaultCountry: one(countries, {
    fields: [platformSettings.defaultCountryId],
    references: [countries.id],
  }),
  updatedBy: one(users, { fields: [platformSettings.updatedByUserId], references: [users.id] }),
}));

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  actor: one(users, { fields: [auditLogs.actorUserId], references: [users.id] }),
}));

// =====================================================================
// INFERRED TYPES FOR ALL ENTITIES
// =====================================================================

export type Country = typeof countries.$inferSelect;
export type NewCountry = typeof countries.$inferInsert;

export type Language = typeof languages.$inferSelect;
export type NewLanguage = typeof languages.$inferInsert;

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type UserSession = typeof userSessions.$inferSelect;
export type NewUserSession = typeof userSessions.$inferInsert;

export type PasswordReset = typeof passwordResets.$inferSelect;
export type NewPasswordReset = typeof passwordResets.$inferInsert;

export type Family = typeof families.$inferSelect;
export type NewFamily = typeof families.$inferInsert;

export type FamilyMember = typeof familyMembers.$inferSelect;
export type NewFamilyMember = typeof familyMembers.$inferInsert;

export type Company = typeof companies.$inferSelect;
export type NewCompany = typeof companies.$inferInsert;

export type CompanyUser = typeof companyUsers.$inferSelect;
export type NewCompanyUser = typeof companyUsers.$inferInsert;

export type Subscription = typeof subscriptions.$inferSelect;
export type NewSubscription = typeof subscriptions.$inferInsert;

export type UserSubscription = typeof userSubscriptions.$inferSelect;
export type NewUserSubscription = typeof userSubscriptions.$inferInsert;

export type StripeCustomer = typeof stripeCustomers.$inferSelect;
export type NewStripeCustomer = typeof stripeCustomers.$inferInsert;

export type PaymentEvent = typeof paymentEvents.$inferSelect;
export type NewPaymentEvent = typeof paymentEvents.$inferInsert;

export type PlatformSetting = typeof platformSettings.$inferSelect;
export type NewPlatformSetting = typeof platformSettings.$inferInsert;

export type AuditLog = typeof auditLogs.$inferSelect;
export type NewAuditLog = typeof auditLogs.$inferInsert;

