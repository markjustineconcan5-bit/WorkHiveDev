const SUPABASE_URL = "https://zrrkbhzsrurdmnnghqyl.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpycmtiaHpzcnVyZG1ubmdocXlsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk5NzA5MzQsImV4cCI6MjEwNTU0NjkzNH0.U39D2Bk0iymmnq4MCiWpNWVaxkgzAAnlPzWgDoPyrbs";
 
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
 
if (SUPABASE_URL.includes("YOUR-PROJECT-REF") || SUPABASE_ANON_KEY.includes("YOUR-ANON")) {
    console.warn("[Supabase] Add your Project URL and anon key in supabase-client.js");
} else {
    console.log("[Supabase] client ready");
}

async function testSupabaseConnection() {
    const { data, error } = await supabaseClient
        .from("project_tasks")
        .select("id")
        .limit(1);

    if (error) {
        console.error("[Supabase] connection test failed:", error.message);
    } else {
        console.log("[Supabase] connection OK", data);
    }
}