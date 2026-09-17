// Depende de: config.js (SUPABASE_URL, SUPABASE_ANON_KEY) e do script CDN do supabase-js.
let supabaseClient = null;
let supabaseConfigError = null;

if (!SUPABASE_URL || SUPABASE_URL.includes("COLE_AQUI") || !SUPABASE_ANON_KEY || SUPABASE_ANON_KEY.includes("COLE_AQUI")) {
  supabaseConfigError = "Configuração do Supabase ausente. Edite web/assets/config.js com a URL e a anon key do seu projeto.";
} else {
  supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

function requireSupabase() {
  if (supabaseConfigError) {
    throw new Error(supabaseConfigError);
  }
  return supabaseClient;
}
