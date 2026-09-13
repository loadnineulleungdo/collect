import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

const SUPABASE_URL = "https://wddaondcevbcjvopbizq.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_zL2wP5o0XSvEjW1y9KOhMw_VpXt6h00";
const BOSS_SUPABASE_URL = "https://ijefdhqxhokyiodgjjct.supabase.co";
const BOSS_SUPABASE_ANON_KEY = "sb_publishable__lSPCq2eXCqO299El9fCTA_5vnLhXvV";

export const APP_SETTINGS_TABLE = "app_settings";
export const ADMIN_PASSWORD_KEY = "admin_password";
export const DISTRIBUTION_BOSS_RULES_TABLE = "distribution_boss_rules";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
export const bossSupabase = BOSS_SUPABASE_URL && BOSS_SUPABASE_ANON_KEY
  ? createClient(BOSS_SUPABASE_URL, BOSS_SUPABASE_ANON_KEY)
  : null;
