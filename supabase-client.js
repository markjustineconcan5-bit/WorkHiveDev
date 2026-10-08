
const SUPABASE_URL = "https://dqekyrtibpnvaghogwsa.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRxZWt5cnRpYnBudmFnaG9nd3NhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg0NjcwMzUsImV4cCI6MjEwNDA0MzAzNX0.ggdaEHSheJZWfMpUYQN6I_HgB0qwvmnryKFKfMTvVhA";

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

if (SUPABASE_URL.includes("PASTE_YOUR") || SUPABASE_ANON_KEY.includes("PASTE_YOUR")) {
    console.warn("[Supabase] Add your new project URL and anon key in supabase-client.js");
} else {
    console.log("[Supabase] client ready");
}



async function resolveLoginEmail(identifier) {
    if (identifier.includes("@")) return identifier;
    const { data, error } = await supabaseClient.rpc("username_to_email", { p_username: identifier });
    if (error || !data) return null;
    return data;
}


async function getCurrentProfile() {
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (!session) return null;
    const { data, error } = await supabaseClient
        .from("profiles")
        .select("*")
        .eq("id", session.user.id)
        .single();
    if (error) {
        console.error("[Supabase] could not load profile:", error.message);
        return null;
    }
    return data;
}


function dashboardUrlForRole(role) {
    if (role === "admin") return "dashboard.html";
    if (role === "employer") return "employer-dashboard.html";
    return "job-seeker-dashboard.html";
}


async function requireRole(allowedRole) {
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (!session) {
        window.location.replace("index.html");
        return null;
    }
    const profile = await getCurrentProfile();


    if (profile && (profile.is_blocked || (profile.banned_until && new Date(profile.banned_until) > new Date()))) {
        await supabaseClient.auth.signOut();
        window.location.replace("index.html");
        return null;
    }

    if (!profile || profile.role !== allowedRole) {

        window.location.replace(profile ? dashboardUrlForRole(profile.role) : "index.html");
        return null;
    }
    return profile;
}
