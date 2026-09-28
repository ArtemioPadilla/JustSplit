#!/usr/bin/env node
// Writes the local stack's public config to .env.local (git-ignored) so
// `npm run dev` talks to `supabase start` (plan B2). Keys are read from
// `supabase status`, never committed.
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';

let status;
try {
  status = JSON.parse(execFileSync('supabase', ['status', '-o', 'json'], { encoding: 'utf8' }));
} catch {
  console.error('`supabase status` failed: start the stack first (npm run db:start).');
  process.exit(1);
}

const managed = {
  PUBLIC_SUPABASE_LOCAL: 'true',
  PUBLIC_SUPABASE_URL: status.API_URL,
  PUBLIC_SUPABASE_KEY: status.PUBLISHABLE_KEY || status.ANON_KEY,
};
const file = '.env.local';
const kept = existsSync(file)
  ? readFileSync(file, 'utf8')
      .split('\n')
      .filter((line) => line && !Object.keys(managed).some((k) => line.startsWith(`${k}=`)))
  : [];
writeFileSync(file, [...kept, ...Object.entries(managed).map(([k, v]) => `${k}=${v}`)].join('\n') + '\n');
console.log(`wrote ${Object.keys(managed).join(', ')} to ${file}`);
