#!/usr/bin/env node
/**
 * Creates two demo accounts (one cliente, one admin_pjm) using the Supabase
 * Admin API — the officially supported way to create auth users
 * programmatically. This is NOT a SQL seed: Supabase manages `auth.users`
 * internally (password hashing, confirmation tokens, etc.) and directly
 * INSERTing into that table from `seed.sql` is unsupported and easy to get
 * subtly wrong (e.g. logins that silently fail). If you don't want to run
 * this script, create the same two users by hand — see "Usuarios de
 * ejemplo" in the README — and skip this file entirely.
 *
 * Safe to run against a fresh/dev/staging Supabase project. Do NOT run this
 * against a production project: it creates real, working login credentials
 * with a publicly-known demo password.
 *
 * Usage:
 *   node --env-file=.env.local scripts/seed-demo-users.mjs
 *
 * Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (the
 * service role key bypasses RLS and must never be exposed to the browser —
 * this script only ever runs locally/in CI, never in the Next.js app).
 */
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const DEMO_PASSWORD = process.env.DEMO_SEED_PASSWORD || 'PjmDemo2026!';

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error(
    'Faltan NEXT_PUBLIC_SUPABASE_URL y/o SUPABASE_SERVICE_ROLE_KEY.\n' +
      'Corré: node --env-file=.env.local scripts/seed-demo-users.mjs'
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const DEMO_USERS = [
  {
    email: 'cliente.demo@pjm.local',
    role: 'cliente',
    full_name: 'Cliente Demo',
    phone: '+54 9 11 5555-0001',
    company: {
      business_name: 'Importadora Demo SRL',
      cuit: '30-12345678-9',
      tax_condition: 'responsable_inscripto',
      address: 'Av. Siempre Viva 123, CABA',
      industry: 'Electrónica de consumo',
      import_frequency: 'ocasional',
      usual_transport_mode: 'maritima',
      usual_products: 'Notebooks y accesorios electrónicos',
    },
  },
  {
    email: 'admin.demo@pjm.local',
    role: 'admin_pjm',
    full_name: 'Admin PJM Demo',
    phone: '+54 9 11 5555-0002',
    company: null,
  },
];

async function findUserByEmail(email) {
  // admin.listUsers is paginated; fine for the handful of demo accounts here.
  const { data, error } = await supabase.auth.admin.listUsers({ page: 1, perPage: 200 });
  if (error) throw error;
  return data.users.find((u) => u.email === email) ?? null;
}

async function main() {
  for (const demo of DEMO_USERS) {
    const existing = await findUserByEmail(demo.email);
    let userId = existing?.id;

    if (existing) {
      console.log(`= ${demo.email} ya existe (${existing.id}), no se recrea.`);
    } else {
      const { data, error } = await supabase.auth.admin.createUser({
        email: demo.email,
        password: DEMO_PASSWORD,
        email_confirm: true,
        user_metadata: {
          full_name: demo.full_name,
          phone: demo.phone,
          role: demo.role,
          accepted_terms: true,
          accepted_estimate_notice: true,
          accepted_commercial_contact: false,
        },
      });
      if (error) {
        console.error(`x Error creando ${demo.email}:`, error.message);
        continue;
      }
      userId = data.user.id;
      console.log(`+ Creado ${demo.email} (${demo.role}) — id ${userId}`);
    }

    if (demo.company && userId) {
      const { data: existingCompany } = await supabase
        .from('companies')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();

      if (!existingCompany) {
        const { error: companyError } = await supabase
          .from('companies')
          .insert({ user_id: userId, ...demo.company });
        if (companyError) {
          console.error(`x Error creando empresa para ${demo.email}:`, companyError.message);
        } else {
          console.log(`  + Empresa demo creada para ${demo.email}`);
        }
      }
    }
  }

  console.log('\nListo. Credenciales de prueba:');
  for (const demo of DEMO_USERS) {
    console.log(`  ${demo.role.padEnd(10)} ${demo.email} / ${DEMO_PASSWORD}`);
  }
  console.log('\nCambiá DEMO_SEED_PASSWORD si querés otra contraseña, y no uses este script contra producción.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
