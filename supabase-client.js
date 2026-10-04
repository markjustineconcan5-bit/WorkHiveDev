const SUPABASE_URL = "https://occkezvsleajusicuzol.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9jY2tlenZzbGVhanVzaWN1em9sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA2MDY3NjgsImV4cCI6MjEwNjE4Mjc2OH0.aoo8M6z4DCWsUqQn6z2cwX9Gi7afmnI2ax96PvTRqaA";

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

if (SUPABASE_URL.includes("https://occkezvsleajusicuzol.supabase.co") || SUPABASE_ANON_KEY.includes("eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9jY2tlenZzbGVhanVzaWN1em9sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA2MDY3NjgsImV4cCI6MjEwNjE4Mjc2OH0.aoo8M6z4DCWsUqQn6z2cwX9Gi7afmnI2ax96PvTRqaA")) {
    console.warn("[Supabase] Add your new project URL and anon key in supabase-client.js");
} else {
    console.log("[Supabase] client ready");
}

// ---------------------------------------------------------
// On-page yes/no confirmation, replaces window.confirm() so
// destructive actions don't show the browser's native popup either.
// Usage: if (!(await confirmDialog("Delete this job?"))) return;
// ---------------------------------------------------------
function confirmDialog(message) {
    return new Promise(resolve => {
        const overlay = document.createElement("div");
        overlay.style.cssText = "position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:99998;display:flex;align-items:center;justify-content:center;padding:20px;";

        const box = document.createElement("div");
        box.style.cssText = "background:#fff;border-radius:13px;padding:22px;max-width:360px;width:100%;box-shadow:0 20px 50px rgba(0,0,0,.25);font-family:inherit;";
        box.innerHTML =
            '<p style="font-size:14px;color:#222;margin-bottom:18px;line-height:1.5;">' + message + '</p>' +
            '<div style="display:flex;gap:10px;justify-content:flex-end;">' +
                '<button data-act="cancel" style="border:1px solid #ddd;background:#fff;border-radius:7px;padding:9px 14px;font-weight:700;font-size:12px;cursor:pointer;">Cancel</button>' +
                '<button data-act="ok" style="border:0;background:#c94b4b;color:#fff;border-radius:7px;padding:9px 14px;font-weight:700;font-size:12px;cursor:pointer;">Confirm</button>' +
            '</div>';

        overlay.appendChild(box);
        document.body.appendChild(overlay);

        function close(result) {
            overlay.remove();
            resolve(result);
        }
        box.querySelector('[data-act="ok"]').addEventListener("click", () => close(true));
        box.querySelector('[data-act="cancel"]').addEventListener("click", () => close(false));
        overlay.addEventListener("click", e => { if (e.target === overlay) close(false); });
    });
}

// ---------------------------------------------------------
// Lightweight on-page notification, replaces window.alert() so
// dashboards don't show the browser's native black alert popup.
// ---------------------------------------------------------
function toast(msg, type) {
    let box = document.getElementById("wh-toast-box");
    if (!box) {
        box = document.createElement("div");
        box.id = "wh-toast-box";
        box.style.cssText = "position:fixed;top:18px;right:18px;z-index:99999;display:flex;flex-direction:column;gap:10px;max-width:320px;";
        document.body.appendChild(box);
    }
    const isError = type === "error";
    const el = document.createElement("div");
    el.style.cssText =
        "font-family:inherit;font-size:13px;font-weight:600;line-height:1.4;padding:12px 16px;border-radius:10px;" +
        "box-shadow:0 8px 20px rgba(0,0,0,.18);opacity:0;transform:translateY(-6px);transition:opacity .25s,transform .25s;" +
        (isError
            ? "background:#fde8e8;border:1px solid #f3b4b4;color:#b33b3b;"
            : "background:#fff7df;border:1px solid #f4df9c;color:#7a5b00;");
    el.textContent = msg;
    box.appendChild(el);
    requestAnimationFrame(() => { el.style.opacity = "1"; el.style.transform = "translateY(0)"; });
    setTimeout(() => {
        el.style.opacity = "0";
        el.style.transform = "translateY(-6px)";
        setTimeout(() => el.remove(), 250);
    }, 3200);
}

// ---------------------------------------------------------
// Shared helpers used across index.html, sign.html and all 3 dashboards
// ---------------------------------------------------------

// Lets people log in with either their email OR their username.
async function resolveLoginEmail(identifier) {
    if (identifier.includes("@")) return identifier;
    const { data, error } = await supabaseClient.rpc("username_to_email", { p_username: identifier });
    if (error || !data) return null;
    return data;
}

// Fetches the signed-in user's profile row (id, username, role, etc.)
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

// Sends whoever is logged in to the dashboard that matches their role.
function dashboardUrlForRole(role) {
    if (role === "admin") return "dashboard.html";
    if (role === "employer") return "employer-dashboard.html";
    return "job-seeker-dashboard.html";
}

// Guards a dashboard page: only lets a signed-in user with the right
// role stay on the page; everyone else is redirected. Call this at the
// top of every dashboard page's script. Returns the profile on success.
async function requireRole(allowedRole) {
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (!session) {
        window.location.replace("index.html");
        return null;
    }
    const profile = await getCurrentProfile();
    if (!profile || profile.role !== allowedRole) {
        // Signed in, but wrong dashboard for their role — send them to the right one.
        window.location.replace(profile ? dashboardUrlForRole(profile.role) : "index.html");
        return null;
    }
    return profile;
}
