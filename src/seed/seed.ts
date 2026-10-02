import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import * as argon2 from 'argon2';
import { eq, and, isNull } from 'drizzle-orm';
import * as schema from '../db/schema';

// Load environment variables
dotenv.config();

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('❌ Error: DATABASE_URL is not set in environment variables.');
  process.exit(1);
}

const pool = new Pool({ connectionString });
const db = drizzle(pool, { schema });

async function seed() {
  console.log('🌱 Starting Regidoo Phase 1 Database Seeding...\n');

  try {
    // -----------------------------------------------------------------
    // 1. SEED REFERENCE DATA: COUNTRIES
    // -----------------------------------------------------------------
    console.log('📍 Seeding Countries...');
    const countriesData = [
      { code: 'SE', name: 'Sweden', isActive: true },
      { code: 'NO', name: 'Norway', isActive: true },
      { code: 'DK', name: 'Denmark', isActive: true },
      { code: 'FI', name: 'Finland', isActive: true },
      { code: 'DE', name: 'Germany', isActive: true },
      { code: 'ES', name: 'Spain', isActive: true },
    ];

    const seededCountries: Record<string, schema.Country> = {};
    for (const c of countriesData) {
      let [existing] = await db
        .select()
        .from(schema.countries)
        .where(and(eq(schema.countries.code, c.code), isNull(schema.countries.deletedAt)));

      if (!existing) {
        const [inserted] = await db.insert(schema.countries).values(c).returning();
        existing = inserted;
        console.log(`   ➕ Inserted country: ${c.name} (${c.code})`);
      } else {
        console.log(`   ✔ Country exists: ${c.name} (${c.code})`);
      }
      seededCountries[c.code] = existing;
    }

    // -----------------------------------------------------------------
    // 2. SEED REFERENCE DATA: LANGUAGES
    // -----------------------------------------------------------------
    console.log('\n🌐 Seeding Languages...');
    const languagesData = [
      { code: 'en', name: 'English', isActive: true },
      { code: 'sv', name: 'Swedish', isActive: true },
      { code: 'nb', name: 'Norwegian', isActive: true },
      { code: 'da', name: 'Danish', isActive: true },
      { code: 'de', name: 'German', isActive: true },
      { code: 'es', name: 'Spanish', isActive: true },
    ];

    const seededLanguages: Record<string, schema.Language> = {};
    for (const lang of languagesData) {
      let [existing] = await db
        .select()
        .from(schema.languages)
        .where(and(eq(schema.languages.code, lang.code), isNull(schema.languages.deletedAt)));

      if (!existing) {
        const [inserted] = await db.insert(schema.languages).values(lang).returning();
        existing = inserted;
        console.log(`   ➕ Inserted language: ${lang.name} (${lang.code})`);
      } else {
        console.log(`   ✔ Language exists: ${lang.name} (${lang.code})`);
      }
      seededLanguages[lang.code] = existing;
    }

    // -----------------------------------------------------------------
    // 3. SEED PLATFORM SETTINGS (SINGLETON)
    // -----------------------------------------------------------------
    console.log('\n⚙️ Seeding Platform Settings (Singleton)...');
    const [existingSettings] = await db.select().from(schema.platformSettings).limit(1);

    if (!existingSettings) {
      await db.insert(schema.platformSettings).values({
        singleton: true,
        status: 'operational',
        defaultCountryId: seededCountries['SE'].id,
        defaultLanguageId: seededLanguages['en'].id,
        securityStatus: 'configured',
        environment: 'development',
      });
      console.log('   ➕ Inserted singleton platform settings.');
    } else {
      console.log('   ✔ Platform settings already present.');
    }

    // -----------------------------------------------------------------
    // 4. SEED SUBSCRIPTION PLANS CATALOGUE
    // -----------------------------------------------------------------
    console.log('\n💳 Seeding Subscription Plans Catalogue...');
    const plansData: Array<schema.NewSubscription> = [
      // Personal Plans
      {
        planName: 'Starter',
        accountType: 'personal',
        maxProducts: 5,
        monthlyPrice: '0.00',
        annualPrice: '0.00',
        currencyCode: 'EUR',
        isActive: true,
      },
      {
        planName: 'Small',
        accountType: 'personal',
        maxProducts: 25,
        monthlyPrice: '9.00',
        annualPrice: '90.00',
        currencyCode: 'EUR',
        isActive: true,
      },
      {
        planName: 'Medium',
        accountType: 'personal',
        maxProducts: 100,
        monthlyPrice: '19.00',
        annualPrice: '190.00',
        currencyCode: 'EUR',
        isActive: true,
      },
      {
        planName: 'Large',
        accountType: 'personal',
        maxProducts: 500,
        monthlyPrice: '39.00',
        annualPrice: '390.00',
        currencyCode: 'EUR',
        isActive: true,
      },
      {
        planName: 'Premium',
        accountType: 'personal',
        maxProducts: null, // Unlimited
        monthlyPrice: '79.00',
        annualPrice: '790.00',
        currencyCode: 'EUR',
        isActive: true,
      },
      // Family Plans
      {
        planName: 'Family Starter',
        accountType: 'family',
        maxProducts: 50,
        monthlyPrice: '19.00',
        annualPrice: '190.00',
        currencyCode: 'EUR',
        isActive: true,
      },
      {
        planName: 'Family Premium',
        accountType: 'family',
        maxProducts: null, // Unlimited
        monthlyPrice: '49.00',
        annualPrice: '490.00',
        currencyCode: 'EUR',
        isActive: true,
      },
      // Business Plans
      {
        planName: 'Business',
        accountType: 'business',
        maxProducts: 500,
        monthlyPrice: '99.00',
        annualPrice: '990.00',
        currencyCode: 'EUR',
        isActive: true,
      },
      {
        planName: 'Enterprise',
        accountType: 'business',
        maxProducts: null, // Unlimited
        monthlyPrice: '299.00',
        annualPrice: '2990.00',
        currencyCode: 'EUR',
        isActive: true,
      },
    ];

    for (const plan of plansData) {
      let [existing] = await db
        .select()
        .from(schema.subscriptions)
        .where(
          and(eq(schema.subscriptions.planName, plan.planName), isNull(schema.subscriptions.deletedAt))
        );

      if (!existing) {
        await db.insert(schema.subscriptions).values(plan);
        console.log(`   ➕ Inserted plan: ${plan.planName} (${plan.accountType})`);
      } else {
        console.log(`   ✔ Plan exists: ${plan.planName}`);
      }
    }

    // -----------------------------------------------------------------
    // 5. SEED INITIAL SUPER ADMIN (TASK-04 REQUIREMENTS)
    // -----------------------------------------------------------------
    console.log('\n👑 Seeding Super Admin (TASK-04)...');
    const adminEmail = process.env.INITIAL_ADMIN_EMAIL || 'admin@regidoo.com';
    const adminUsername = process.env.INITIAL_ADMIN_USERNAME || 'admin';
    const adminTempPassword = process.env.INITIAL_ADMIN_PASSWORD || 'TempAdmin@2026!';

    let [existingAdmin] = await db
      .select()
      .from(schema.users)
      .where(and(eq(schema.users.email, adminEmail), isNull(schema.users.deletedAt)));

    if (!existingAdmin) {
      console.log(`   🔒 Hashing temporary password with Argon2id...`);
      const passwordHash = await argon2.hash(adminTempPassword, {
        type: argon2.argon2id,
        memoryCost: 65536,
        timeCost: 3,
        parallelism: 4,
      });

      const [newAdmin] = await db
        .insert(schema.users)
        .values({
          username: adminUsername,
          email: adminEmail,
          passwordHash,
          city: 'Stockholm',
          countryId: seededCountries['SE'].id,
          languageId: seededLanguages['en'].id,
          accountType: 'personal',
          systemRole: 'system_admin',
          status: 'active',
          mustChangePassword: true, // Enforce forced password change on first login
        })
        .returning();

      console.log(`   ✅ Super Admin created successfully!`);
      console.log(`      • Username: ${newAdmin.username}`);
      console.log(`      • Email:    ${newAdmin.email}`);
      console.log(`      • Role:     ${newAdmin.systemRole}`);
      console.log(`      • Temp Pass: ${adminTempPassword}`);
      console.log(`      • Must Change Password: ${newAdmin.mustChangePassword}`);

      // Record in audit logs
      await db.insert(schema.auditLogs).values({
        actorUserId: newAdmin.id,
        action: 'admin.seeded',
        entityType: 'user',
        entityId: newAdmin.id,
        actionData: {
          username: newAdmin.username,
          email: newAdmin.email,
          systemRole: newAdmin.systemRole,
          mustChangePassword: true,
          seededAt: new Date().toISOString(),
        },
      });
      console.log(`   📜 Recorded initial provisioning in audit_logs (action = 'admin.seeded').`);
    } else {
      console.log(`   🔒 Resetting Super Admin to seed state with Argon2id...`);
      const passwordHash = await argon2.hash(adminTempPassword, {
        type: argon2.argon2id,
        memoryCost: 65536,
        timeCost: 3,
        parallelism: 4,
      });

      await db
        .update(schema.users)
        .set({
          passwordHash,
          mustChangePassword: true,
          status: 'active',
          updatedAt: new Date(),
        })
        .where(eq(schema.users.id, existingAdmin.id));

      console.log(`   ✔ Super Admin reset to initial temporary password (mustChangePassword: true).`);
    }

    console.log('\n🎉 Database seeding completed successfully!\n');
  } catch (error) {
    console.error('❌ Seeding failed with error:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Execute seed function
seed();
