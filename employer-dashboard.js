/* =========================================================
   EMPLOYER DASHBOARD — WorkHive
========================================================= */

let EMPLOYER_PROFILE = null;
let MY_JOBS = [];
let MY_APPLICATIONS = [];
let MY_CONVERSATIONS = [];
let activeConversationId = null;

document.addEventListener("DOMContentLoaded", async () => {
    EMPLOYER_PROFILE = await requireRole("employer");
    if (!EMPLOYER_PROFILE) return;

    const nameEl = document.getElementById("employerName");
    if (nameEl) nameEl.innerHTML = (EMPLOYER_PROFILE.company_name || EMPLOYER_PROFILE.full_name || EMPLOYER_PROFILE.username) + "<small>Employer</small>";

    fillProfileView();
    await loadEmployerData();

    initViewSwitching();
    initModals();
    initDemoButtons();
    initSearch();
    initJobForm();
    initProfileForm();
    initMessages();
});

window.addEventListener("pageshow", async function (event) {
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (!session) window.location.replace("index.html");
});

/* =========================
   VIEW SWITCHING (SPA nav)
========================= */
function initViewSwitching() {
    function showView(view) {
        document.querySelectorAll(".view").forEach(v => v.classList.remove("active"));
        const target = document.getElementById("view-" + view);
        if (target) target.classList.add("active");
        document.querySelectorAll(".nav a").forEach(a => a.classList.remove("active"));
        const navLink = document.querySelector('.nav a[data-view="' + view + '"]');
        if (navLink) navLink.classList.add("active");
        window.scrollTo(0, 0);
    }
    window.showView = showView;
    document.querySelectorAll("[data-view]").forEach(el => {
        el.addEventListener("click", e => {
            e.preventDefault();
            showView(el.dataset.view);
            if (el.dataset.modal) openModal(el.dataset.modal);
        });
    });
}

function initModals() {
    window.openModal = id => document.getElementById(id).classList.add("open");
    window.closeModal = id => document.getElementById(id).classList.remove("open");
    window.addEventListener("click", event => {
        document.querySelectorAll(".modal").forEach(modal => {
            if (event.target === modal) modal.classList.remove("open");
        });
    });
}

function initDemoButtons() {
    document.querySelectorAll("[data-demo]").forEach(button => {
        button.addEventListener("click", async () => {
            if (button.dataset.demo === "logout") {
                await supabaseClient.auth.signOut();
                window.location.href = "index.html";
            }
        });
    });
}

/* =========================
   SEARCH
========================= */
function initSearch() {
    document.querySelectorAll(".search").forEach(input => {
        input.addEventListener("input", () => {
            const term = input.value.toLowerCase();
            const scope = input.closest(".view") || document;
            scope.querySelectorAll("[data-searchable]").forEach(row => {
                row.style.display = row.innerText.toLowerCase().includes(term) ? "" : "none";
            });
        });
    });

    const jobsFilterStatus = document.getElementById("jobsFilterStatus");
    const jobsFilterCategory = document.getElementById("jobsFilterCategory");
    if (jobsFilterStatus) jobsFilterStatus.addEventListener("change", renderJobs);
    if (jobsFilterCategory) jobsFilterCategory.addEventListener("change", renderJobs);

    const applicantsFilterJob = document.getElementById("applicantsFilterJob");
    const applicantsFilterStatus = document.getElementById("applicantsFilterStatus");
    if (applicantsFilterJob) applicantsFilterJob.addEventListener("change", renderApplicants);
    if (applicantsFilterStatus) applicantsFilterStatus.addEventListener("change", renderApplicants);
}

/* =========================
   DATA LOADING
========================= */
async function loadEmployerData() {
    const [{ data: jobs }, { data: apps }, { data: convos }] = await Promise.all([
        supabaseClient.from("jobs").select("*").eq("employer_id", EMPLOYER_PROFILE.id).order("created_at", { ascending: false }),
        supabaseClient.from("applications").select("*, jobs!inner(title, employer_id), profiles!applications_applicant_id_fkey(id, full_name, username, headline)").eq("jobs.employer_id", EMPLOYER_PROFILE.id).order("created_at", { ascending: false }),
        supabaseClient.from("conversations").select("*, profiles!conversations_jobseeker_id_fkey(full_name, username)").eq("employer_id", EMPLOYER_PROFILE.id).order("created_at", { ascending: false })
    ]);

    MY_JOBS = jobs || [];
    MY_APPLICATIONS = apps || [];
    MY_CONVERSATIONS = convos || [];

    renderStats();
    renderRecentCandidates();
    renderJobs();
    populateJobFilterOptions();
    renderApplicants();
    renderConversationList();
}

function renderStats() {
    document.getElementById("statActiveJobs").textContent = MY_JOBS.filter(j => j.status === "active").length;
    document.getElementById("statTotalApplicants").textContent = MY_APPLICATIONS.length;
    document.getElementById("statShortlisted").textContent = MY_APPLICATIONS.filter(a => a.status === "shortlisted").length;
    document.getElementById("statInterviews").textContent = MY_APPLICATIONS.filter(a => a.status === "interview").length;
}

function statusBadgeClass(status) {
    return { pending: "pending", shortlisted: "short", interview: "active", accepted: "active", rejected: "rejected" }[status] || "pending";
}

function renderRecentCandidates() {
    const body = document.getElementById("recentCandidatesBody");
    if (!body) return;
    body.innerHTML = MY_APPLICATIONS.slice(0, 5).map(a => (
        '<tr data-searchable>' +
            '<td><div class="applicant"><div class="avatar">' + initials(a.profiles) + '</div><div><b>' + fullName(a.profiles) + '</b><small>' + (a.profiles?.headline || '') + '</small></div></div></td>' +
            '<td>' + (a.jobs ? a.jobs.title : '') + '</td>' +
            '<td>' + new Date(a.created_at).toLocaleDateString() + '</td>' +
            '<td><span class="badge ' + statusBadgeClass(a.status) + '">' + a.status + '</span></td>' +
            '<td><a class="btn outline" data-view="applicants">View</a></td>' +
        '</tr>'
    )).join("") || '<tr><td colspan="5" style="padding:20px;text-align:center;color:#888">No applications yet.</td></tr>';
    // Reattach nav-link behaviour for the newly inserted "View" links
    body.querySelectorAll("[data-view]").forEach(el => el.addEventListener("click", e => { e.preventDefault(); window.showView(el.dataset.view); }));
}

function renderJobs() {
    const el = document.getElementById("employerJobsList");
    if (!el) return;
    const statusFilter = document.getElementById("jobsFilterStatus")?.value || "";
    const catFilter = document.getElementById("jobsFilterCategory")?.value || "";
    const jobs = MY_JOBS.filter(j => (!statusFilter || j.status === statusFilter) && (!catFilter || j.category === catFilter));

    el.innerHTML = jobs.map(j => {
        const count = MY_APPLICATIONS.filter(a => a.job_id === j.id).length;
        return (
            '<div class="job" data-searchable>' +
                '<div>' +
                    '<h3>' + j.title + '</h3>' +
                    '<p>📍 ' + (j.location || '') + ' &nbsp; 💰 ' + (j.salary || '') + '</p>' +
                    '<p>' + (j.job_type || '') + ' · ' + count + ' applicants' + (j.deadline ? ' · Deadline: ' + j.deadline : '') + '</p>' +
                '</div>' +
                '<div class="job-right">' +
                    '<span class="badge ' + (j.status === 'active' ? 'active' : 'pending') + '">' + (j.status === 'active' ? 'Active' : 'Closed') + '</span>' +
                    '<div class="actions" style="margin-top:10px">' +
                        '<button class="btn outline" data-view-applicants-for="' + j.id + '">Applicants</button>' +
                        '<button class="btn danger" data-close-job="' + j.id + '">' + (j.status === 'active' ? 'Close' : 'Reopen') + '</button>' +
                        '<button class="btn danger" data-delete-job="' + j.id + '">Delete</button>' +
                    '</div>' +
                '</div>' +
            '</div>'
        );
    }).join("") || '<p style="color:#888;font-size:13px">No job listings yet. Click "+ Post New Job" to create one.</p>';

    el.querySelectorAll("[data-view-applicants-for]").forEach(btn => btn.addEventListener("click", () => {
        document.getElementById("applicantsFilterJob").value = btn.dataset.viewApplicantsFor;
        window.showView("applicants");
        renderApplicants();
    }));
    el.querySelectorAll("[data-close-job]").forEach(btn => btn.addEventListener("click", async () => {
        const job = MY_JOBS.find(j => j.id === btn.dataset.closeJob);
        const newStatus = job.status === "active" ? "closed" : "active";
        const { error } = await supabaseClient.from("jobs").update({ status: newStatus }).eq("id", job.id);
        if (error) { toast("Could not update job: " + error.message, "error"); return; }
        await loadEmployerData();
    }));
    el.querySelectorAll("[data-delete-job]").forEach(btn => btn.addEventListener("click", async () => {
        if (!(await confirmDialog("Delete this job listing? This cannot be undone."))) return;
        const { error } = await supabaseClient.from("jobs").delete().eq("id", btn.dataset.deleteJob);
        if (error) { toast("Could not delete job: " + error.message, "error"); return; }
        await loadEmployerData();
    }));
}

function populateJobFilterOptions() {
    const sel = document.getElementById("applicantsFilterJob");
    if (!sel) return;
    const current = sel.value;
    sel.innerHTML = '<option value="">All Jobs</option>' + MY_JOBS.map(j => '<option value="' + j.id + '">' + j.title + '</option>').join("");
    sel.value = current;
}

function renderApplicants() {
    const body = document.getElementById("applicantsBody");
    if (!body) return;
    const jobFilter = document.getElementById("applicantsFilterJob")?.value || "";
    const statusFilter = document.getElementById("applicantsFilterStatus")?.value || "";
    const list = MY_APPLICATIONS.filter(a => (!jobFilter || a.job_id === jobFilter) && (!statusFilter || a.status === statusFilter));

    body.innerHTML = list.map(a => (
        '<tr data-searchable>' +
            '<td><div class="applicant"><div class="avatar">' + initials(a.profiles) + '</div><div><b>' + fullName(a.profiles) + '</b><small>' + (a.profiles?.headline || '') + '</small></div></div></td>' +
            '<td>' + (a.jobs ? a.jobs.title : '') + '</td>' +
            '<td>' + new Date(a.created_at).toLocaleDateString() + '</td>' +
            '<td><span class="badge ' + statusBadgeClass(a.status) + '">' + a.status + '</span></td>' +
            '<td><div class="actions">' +
                '<button class="btn outline" data-message="' + a.profiles?.id + '">Message</button>' +
                '<button class="btn primary" data-set-status="interview" data-app-id="' + a.id + '">Interview</button>' +
                '<button class="btn outline" data-set-status="shortlisted" data-app-id="' + a.id + '">Shortlist</button>' +
                '<button class="btn danger" data-set-status="rejected" data-app-id="' + a.id + '">Reject</button>' +
            '</div></td>' +
        '</tr>'
    )).join("") || '<tr><td colspan="5" style="padding:20px;text-align:center;color:#888">No applicants match.</td></tr>';

    body.querySelectorAll("[data-set-status]").forEach(btn => btn.addEventListener("click", async () => {
        const { error } = await supabaseClient.from("applications").update({ status: btn.dataset.setStatus }).eq("id", btn.dataset.appId);
        if (error) { toast("Could not update: " + error.message, "error"); return; }
        await loadEmployerData();
    }));
    body.querySelectorAll("[data-message]").forEach(btn => btn.addEventListener("click", async () => {
        await openOrCreateConversation(btn.dataset.message);
        window.showView("messages");
    }));
}

function initials(profile) {
    const n = fullName(profile);
    return n.split(" ").map(p => p[0]).slice(0, 2).join("").toUpperCase();
}
function fullName(profile) {
    return (profile && (profile.full_name || profile.username)) || "Applicant";
}

/* =========================
   POST JOB FORM
========================= */
function initJobForm() {
    const jobForm = document.getElementById("jobForm");
    if (!jobForm) return;
    jobForm.addEventListener("submit", async event => {
        event.preventDefault();
        const inputs = jobForm.querySelectorAll("input, select, textarea");
        const [title, category, description, requirements, salary, jobType, location, vacancies, deadline] =
            Array.from(inputs).map(i => i.value);

        const { error } = await supabaseClient.from("jobs").insert({
            employer_id: EMPLOYER_PROFILE.id,
            title, category, description, requirements, salary,
            job_type: jobType, location,
            vacancies: parseInt(vacancies, 10) || 1,
            deadline: deadline || null,
            status: "active"
        });

        if (error) { toast("Could not post job: " + error.message, "error"); return; }

        closeModal("jobModal");
        jobForm.reset();
        await loadEmployerData();
        toast("Job posted successfully!");
    });
}

/* =========================
   PROFILE
========================= */
function fillProfileView() {
    const p = EMPLOYER_PROFILE;
    document.getElementById("profileCompanyName").textContent = p.company_name || p.full_name || p.username;
    document.getElementById("profileCategory").textContent = "Employer";
    document.getElementById("profileLogo").textContent = (p.company_name || p.full_name || "🏪")[0];
    document.getElementById("profileAddress").textContent = p.headline || "—";
    document.getElementById("profilePhone").textContent = p.phone || "—";
    document.getElementById("profileEmail").textContent = p.email;

    document.getElementById("formCompanyName").value = p.company_name || "";
    document.getElementById("formBio").value = p.bio || "";
    document.getElementById("formAddress").value = p.headline || "";
    document.getElementById("formPhone").value = p.phone || "";
    document.getElementById("formEmail").value = p.email;
}

function initProfileForm() {
    const profileForm = document.getElementById("profileForm");
    if (!profileForm) return;
    profileForm.addEventListener("submit", async event => {
        event.preventDefault();
        const updates = {
            company_name: document.getElementById("formCompanyName").value.trim(),
            bio: document.getElementById("formBio").value.trim(),
            headline: document.getElementById("formAddress").value.trim(),
            phone: document.getElementById("formPhone").value.trim()
        };
        const { error } = await supabaseClient.from("profiles").update(updates).eq("id", EMPLOYER_PROFILE.id);
        if (error) { toast("Could not save: " + error.message, "error"); return; }
        Object.assign(EMPLOYER_PROFILE, updates);
        fillProfileView();
        toast("Changes saved successfully.");
    });
}

/* =========================
   MESSAGES (real, employer <-> job seeker)
========================= */
function initMessages() {
    const messageForm = document.getElementById("messageForm");
    if (messageForm) {
        messageForm.addEventListener("submit", async event => {
            event.preventDefault();
            const input = document.getElementById("messageInput");
            const text = input.value.trim();
            if (!text || !activeConversationId) return;

            const { error } = await supabaseClient.from("messages").insert({
                conversation_id: activeConversationId,
                sender_id: EMPLOYER_PROFILE.id,
                body: text
            });
            if (error) { toast("Could not send: " + error.message, "error"); return; }
            input.value = "";
            await renderChat();
        });
    }
}

function renderConversationList() {
    const list = document.getElementById("conversationList");
    if (!list) return;
    list.innerHTML = "";
    if (!activeConversationId && MY_CONVERSATIONS[0]) activeConversationId = MY_CONVERSATIONS[0].id;

    MY_CONVERSATIONS.forEach(c => {
        const div = document.createElement("div");
        div.className = "conversation" + (c.id === activeConversationId ? " active" : "");
        const name = c.profiles ? (c.profiles.full_name || c.profiles.username) : "Job Seeker";
        div.innerHTML = '<div class="avatar">' + name.split(" ").map(p => p[0]).slice(0, 2).join("").toUpperCase() + '</div>' +
            '<div><b>' + name + '</b><small>Tap to view conversation</small></div>';
        div.addEventListener("click", () => {
            activeConversationId = c.id;
            renderConversationList();
            renderChat();
        });
        list.appendChild(div);
    });

    if (!MY_CONVERSATIONS.length) {
        list.innerHTML = '<div style="padding:16px;color:#888;font-size:13px">No conversations yet. Message an applicant from the Applications tab.</div>';
    }

    renderChat();
}

async function renderChat() {
    const head = document.getElementById("chatHead");
    const body = document.getElementById("chatBody");
    if (!head || !body) return;
    const c = MY_CONVERSATIONS.find(x => x.id === activeConversationId);
    if (!c) { head.innerHTML = ""; body.innerHTML = ""; return; }

    const name = c.profiles ? (c.profiles.full_name || c.profiles.username) : "Job Seeker";
    head.innerHTML = name + "<small>Job Seeker</small>";

    const { data: messages } = await supabaseClient.from("messages").select("*").eq("conversation_id", c.id).order("created_at", { ascending: true });
    body.innerHTML = "";
    (messages || []).forEach(m => {
        const bubble = document.createElement("div");
        bubble.className = "bubble" + (m.sender_id === EMPLOYER_PROFILE.id ? " mine" : "");
        bubble.textContent = m.body;
        body.appendChild(bubble);
    });
    body.scrollTop = body.scrollHeight;
}

async function openOrCreateConversation(jobseekerId) {
    if (!jobseekerId) return;
    let convo = MY_CONVERSATIONS.find(c => c.jobseeker_id === jobseekerId);
    if (!convo) {
        const { data, error } = await supabaseClient.from("conversations")
            .insert({ employer_id: EMPLOYER_PROFILE.id, jobseeker_id: jobseekerId })
            .select("*, profiles!conversations_jobseeker_id_fkey(full_name, username)")
            .single();
        if (error) { toast("Could not start conversation: " + error.message, "error"); return; }
        MY_CONVERSATIONS.unshift(data);
        convo = data;
    }
    activeConversationId = convo.id;
    renderConversationList();
}