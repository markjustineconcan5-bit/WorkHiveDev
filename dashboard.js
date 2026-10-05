/* =========================================================
   ADMIN DASHBOARD — WorkHive
   Only a profile with role = 'admin' can view this page.
========================================================= */

let ADMIN_PROFILE = null;
let ALL_JOBS = [];
let ALL_APPLICATIONS = [];
let ALL_JOBSEEKERS = [];
let ALL_EMPLOYERS = [];

document.addEventListener('DOMContentLoaded', async () => {
    ADMIN_PROFILE = await requireRole('admin');
    if (!ADMIN_PROFILE) return; // requireRole already redirected

    document.getElementById('userEmail') && (document.getElementById('userEmail').textContent = ADMIN_PROFILE.email);
    document.getElementById('userInitial') && (document.getElementById('userInitial').textContent = ADMIN_PROFILE.email.charAt(0).toUpperCase());

    await loadAdminData();
    wireAdminSearch();
});

/* Keep the session valid on back/forward navigation */
window.addEventListener('pageshow', async function (event) {
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (!session) window.location.replace('index.html');
});

/* =========================
   DATA LOADING
========================= */
async function loadAdminData() {
    const [{ data: jobs }, { data: apps }, { data: seekers }, { data: employers }] = await Promise.all([
        supabaseClient.from('jobs').select('*, profiles!jobs_employer_id_fkey(company_name, full_name)').order('created_at', { ascending: false }),
        supabaseClient.from('applications').select('*, jobs(title), profiles!applications_applicant_id_fkey(full_name, username, email)').order('created_at', { ascending: false }),
        supabaseClient.from('profiles').select('*').eq('role', 'jobseeker').order('created_at', { ascending: false }),
        supabaseClient.from('profiles').select('*').eq('role', 'employer').order('created_at', { ascending: false })
    ]);

    ALL_JOBS = jobs || [];
    ALL_APPLICATIONS = apps || [];
    ALL_JOBSEEKERS = seekers || [];
    ALL_EMPLOYERS = employers || [];

    renderStats();
    renderOverviewCandidates();
    renderJobs();
    renderApplications();
    renderJobSeekers();
    renderEmployers();
}

function renderStats() {
    const activeJobs = ALL_JOBS.filter(j => j.status === 'active').length;
    const shortlisted = ALL_APPLICATIONS.filter(a => a.status === 'shortlisted').length;
    const interviews = ALL_APPLICATIONS.filter(a => a.status === 'interview').length;
    document.getElementById('statActiveJobs').textContent = activeJobs;
    document.getElementById('statTotalApplicants').textContent = ALL_APPLICATIONS.length;
    document.getElementById('statShortlisted').textContent = shortlisted;
    document.getElementById('statInterviews').textContent = interviews;
}

function statusBadge(status) {
    const map = {
        pending: 'bg-amber-100 text-amber-700',
        shortlisted: 'bg-blue-100 text-blue-700',
        interview: 'bg-emerald-100 text-emerald-700',
        rejected: 'bg-red-100 text-red-700',
        accepted: 'bg-emerald-100 text-emerald-700'
    };
    const cls = map[status] || 'bg-gray-100 text-gray-700';
    return '<span class="px-2 py-1 rounded-full text-[10px] font-semibold ' + cls + '">' + (status || 'pending') + '</span>';
}

function renderOverviewCandidates() {
    const body = document.getElementById('overviewCandidatesBody');
    if (!body) return;
    const rows = ALL_APPLICATIONS.slice(0, 6);
    body.innerHTML = rows.map(rowForApplication).join('') ||
        '<tr><td colspan="5" class="px-4 py-6 text-center text-gray-400">No applications yet.</td></tr>';
}

function rowForApplication(a) {
    const name = a.profiles ? (a.profiles.full_name || a.profiles.username) : 'Unknown';
    return (
        '<tr data-searchable class="border-b border-gray-100 dark:border-gray-700">' +
            '<td class="px-4 py-3">' + name + '</td>' +
            '<td class="px-4 py-3">' + (a.jobs ? a.jobs.title : '—') + '</td>' +
            '<td class="px-4 py-3">' + new Date(a.created_at).toLocaleDateString() + '</td>' +
            '<td class="px-4 py-3">' + statusBadge(a.status) + '</td>' +
            '<td class="px-4 py-3 text-right">' +
                '<select data-app-id="' + a.id + '" class="app-status text-[10px] border border-gray-200 rounded-md px-1 py-1">' +
                    ['pending', 'shortlisted', 'interview', 'accepted', 'rejected'].map(s =>
                        '<option value="' + s + '"' + (s === a.status ? ' selected' : '') + '>' + s + '</option>').join('') +
                '</select>' +
            '</td>' +
        '</tr>'
    );
}

function renderApplications() {
    const body = document.getElementById('applicationsBody');
    if (!body) return;
    body.innerHTML = ALL_APPLICATIONS.map(rowForApplication).join('') ||
        '<tr><td colspan="5" class="px-4 py-6 text-center text-gray-400">No applications yet.</td></tr>';

    body.querySelectorAll('.app-status').forEach(sel => {
        sel.addEventListener('change', async () => {
            const { error } = await supabaseClient.from('applications')
                .update({ status: sel.value }).eq('id', sel.dataset.appId);
            if (error) { toast('Could not update status: ' + error.message, "error"); return; }
            await loadAdminData();
        });
    });
}

function renderJobs() {
    const el = document.getElementById('adminJobsList');
    if (!el) return;
    el.innerHTML = ALL_JOBS.map(j => (
        '<div data-searchable class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 flex justify-between items-start gap-4">' +
            '<div>' +
                '<h4 class="font-bold text-sm text-gray-900 dark:text-white">' + j.title + '</h4>' +
                '<p class="text-xs text-gray-500 dark:text-gray-400 mt-1">' + (j.profiles ? (j.profiles.company_name || j.profiles.full_name) : '') + ' · ' + (j.location || '') + '</p>' +
                '<p class="text-xs text-gray-500 dark:text-gray-400">' + (j.salary || '') + ' · ' + (j.job_type || '') + '</p>' +
            '</div>' +
            '<div class="flex flex-col items-end gap-2">' +
                statusBadge(j.status) +
                '<button data-job-id="' + j.id + '" class="delete-job text-[10px] text-red-500 hover:underline">Delete</button>' +
            '</div>' +
        '</div>'
    )).join('') || '<p class="text-sm text-gray-400">No job listings yet.</p>';

    el.querySelectorAll('.delete-job').forEach(btn => {
        btn.addEventListener('click', async () => {
            if (!(await confirmDialog('Delete this job listing? Its applications will be removed too.', { confirmLabel: 'Delete' }))) return;
            const { error } = await supabaseClient.rpc('admin_delete_job', { p_job_id: btn.dataset.jobId });
            if (error) { toast('Could not delete: ' + error.message, 'error'); return; }
            toast('Job listing deleted.', 'success');
            await loadAdminData();
        });
    });
}

/* =========================
   USER MANAGEMENT (job seekers + employers)
   Ban = temporary (admin picks days), Block = no time limit (record kept),
   Delete = removes the login credentials and the profile.
========================= */
function esc(v) {
    return String(v == null ? '' : v).replace(/[&<>"']/g, ch => (
        { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]
    ));
}

function userStatus(u) {
    if (u.is_blocked) return { type: 'blocked' };
    if (u.banned_until && new Date(u.banned_until) > new Date()) return { type: 'banned', until: new Date(u.banned_until) };
    return { type: 'active' };
}

function userStatusBadge(u) {
    const st = userStatus(u);
    if (st.type === 'blocked') {
        return '<span class="px-2 py-1 rounded-full text-[10px] font-semibold bg-red-100 text-red-700">Blocked</span>';
    }
    if (st.type === 'banned') {
        return '<span class="px-2 py-1 rounded-full text-[10px] font-semibold bg-orange-100 text-orange-700">Banned until ' +
            esc(st.until.toLocaleDateString()) + '</span>';
    }
    return '<span class="px-2 py-1 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-700">Active</span>';
}

function userActionButtons(u) {
    const id = esc(u.id);
    const st = userStatus(u);
    const btn = (act, label, cls) =>
        '<button data-act="' + act + '" data-user-id="' + id + '" class="text-[10px] font-semibold ' + cls + ' hover:underline">' + label + '</button>';
    const parts = [];
    if (st.type === 'blocked') {
        parts.push(btn('unblock', 'Unblock', 'text-emerald-600'));
    } else {
        parts.push(st.type === 'banned' ? btn('unban', 'Lift Ban', 'text-emerald-600') : btn('ban', 'Ban', 'text-orange-500'));
        parts.push(btn('block', 'Block', 'text-gray-700'));
    }
    parts.push(btn('delete', 'Delete', 'text-red-500'));
    return '<div class="flex items-center gap-3">' + parts.join('') + '</div>';
}

function renderJobSeekers() {
    const body = document.getElementById('jobSeekersBody');
    if (!body) return;
    body.innerHTML = ALL_JOBSEEKERS.map(u => (
        '<tr data-searchable class="border-b border-gray-100 text-sm">' +
            '<td class="py-3 px-4 text-xs text-gray-400">' + esc(u.id.slice(0, 8)) + '</td>' +
            '<td class="py-3 px-4">' + esc(u.full_name || u.username) + '</td>' +
            '<td class="py-3 px-4 text-xs">' + esc(u.skills || '—') + '</td>' +
            '<td class="py-3 px-4">' + userStatusBadge(u) + '</td>' +
            '<td class="py-3 px-4">' + userActionButtons(u) + '</td>' +
        '</tr>'
    )).join('') || '<tr><td colspan="5" class="py-6 text-center text-gray-400">No job seekers yet.</td></tr>';
    body.onclick = handleUserAction;
}

function renderEmployers() {
    const body = document.getElementById('employersBody');
    if (!body) return;
    body.innerHTML = ALL_EMPLOYERS.map(u => (
        '<tr data-searchable class="border-b border-gray-100 text-sm">' +
            '<td class="py-3 px-4 text-xs text-gray-400">' + esc(u.id.slice(0, 8)) + '</td>' +
            '<td class="py-3 px-4">' + esc(u.full_name || u.username) + '</td>' +
            '<td class="py-3 px-4 text-xs">' + esc(u.company_name || '—') + '</td>' +
            '<td class="py-3 px-4">' + userStatusBadge(u) + '</td>' +
            '<td class="py-3 px-4">' + userActionButtons(u) + '</td>' +
        '</tr>'
    )).join('') || '<tr><td colspan="5" class="py-6 text-center text-gray-400">No employers yet.</td></tr>';
    body.onclick = handleUserAction;
}

async function handleUserAction(e) {
    const btn = e.target.closest('button[data-act]');
    if (!btn) return;
    const user = ALL_JOBSEEKERS.concat(ALL_EMPLOYERS).find(u => u.id === btn.dataset.userId);
    if (!user) return;
    const name = user.full_name || user.username || 'this user';
    const act = btn.dataset.act;

    if (act === 'ban') {
        const days = await banDialog(name);
        if (!days) return;
        await moderateUser(user.id, 'ban', days, name + ' banned for ' + days + ' day' + (days === 1 ? '' : 's') + '.');
    } else if (act === 'block') {
        if (!(await confirmDialog('Block ' + name + '? They will not be able to log in until you unblock them. Their record stays in the database.', { confirmLabel: 'Block' }))) return;
        await moderateUser(user.id, 'block', null, name + ' has been blocked.');
    } else if (act === 'unban' || act === 'unblock') {
        await moderateUser(user.id, 'unban', null, name + ' can log in again.');
    } else if (act === 'delete') {
        if (!(await confirmDialog('Permanently delete ' + name + '? This removes their login credentials and profile and cannot be undone.', { confirmLabel: 'Delete' }))) return;
        const { error } = await supabaseClient.rpc('admin_delete_user', { p_user_id: user.id });
        if (error) { toast('Could not delete: ' + error.message, 'error'); return; }
        toast(name + ' has been deleted.', 'success');
        await loadAdminData();
    }
}

async function moderateUser(userId, action, days, successMsg) {
    const { error } = await supabaseClient.rpc('admin_moderate_user', {
        p_user_id: userId, p_action: action, p_days: days
    });
    if (error) { toast('Action failed: ' + error.message, 'error'); return; }
    toast(successMsg, 'success');
    await loadAdminData();
}

/* =========================
   TOAST + DIALOGS
   (dashboard.js called toast() and confirmDialog() without ever defining
   them, which is why the Delete buttons did nothing.)
========================= */
function toast(message, type) {
    let box = document.getElementById('toastBox');
    if (!box) {
        box = document.createElement('div');
        box.id = 'toastBox';
        box.className = 'fixed top-4 right-4 z-[70] space-y-2';
        document.body.appendChild(box);
    }
    const colors = type === 'error' ? 'bg-red-600' : type === 'success' ? 'bg-emerald-600' : 'bg-gray-800';
    const el = document.createElement('div');
    el.className = colors + ' text-white text-xs font-medium px-4 py-3 rounded-lg shadow-lg max-w-xs';
    el.textContent = message;
    box.appendChild(el);
    setTimeout(() => el.remove(), 4000);
}

function openModal(innerHtml) {
    const overlay = document.createElement('div');
    overlay.className = 'fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4';
    overlay.innerHTML = '<div class="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-sm w-full shadow-xl border border-gray-200 dark:border-gray-700 space-y-4">' + innerHtml + '</div>';
    document.body.appendChild(overlay);
    return overlay;
}

function confirmDialog(message, opts) {
    const label = (opts && opts.confirmLabel) || 'Confirm';
    return new Promise(resolve => {
        const o = openModal(
            '<h3 class="text-base font-bold text-gray-900 dark:text-white">Please confirm</h3>' +
            '<p class="text-xs text-gray-500 dark:text-gray-400">' + esc(message) + '</p>' +
            '<div class="flex gap-3 pt-2">' +
                '<button data-r="no" class="flex-1 py-2 px-4 rounded-xl border border-gray-200 dark:border-gray-600 text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">Cancel</button>' +
                '<button data-r="yes" class="flex-1 py-2 px-4 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-semibold shadow-sm">' + esc(label) + '</button>' +
            '</div>'
        );
        o.addEventListener('click', ev => {
            const r = ev.target.dataset && ev.target.dataset.r;
            if (r || ev.target === o) { o.remove(); resolve(r === 'yes'); }
        });
    });
}

/* Asks the admin how many days to ban. Resolves to a whole number or null. */
function banDialog(name) {
    return new Promise(resolve => {
        const o = openModal(
            '<h3 class="text-base font-bold text-gray-900 dark:text-white">Ban ' + esc(name) + '</h3>' +
            '<p class="text-xs text-gray-500 dark:text-gray-400">Choose how many days this account is banned. They cannot log in until the ban ends.</p>' +
            '<div class="flex flex-wrap gap-2">' +
                [1, 3, 7, 14, 30].map(d => '<button data-preset="' + d + '" class="px-3 py-1 rounded-full border border-gray-200 dark:border-gray-600 text-[11px] font-semibold text-gray-700 dark:text-gray-300 hover:border-[#FCB800]">' + d + 'd</button>').join('') +
            '</div>' +
            '<input id="banDaysInput" type="number" min="1" max="3650" step="1" value="7" class="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#FCB800]">' +
            '<p id="banError" class="text-[11px] text-red-500 hidden">Enter a whole number of days from 1 to 3650.</p>' +
            '<div class="flex gap-3 pt-2">' +
                '<button data-r="no" class="flex-1 py-2 px-4 rounded-xl border border-gray-200 dark:border-gray-600 text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">Cancel</button>' +
                '<button data-r="yes" class="flex-1 py-2 px-4 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-semibold shadow-sm">Ban</button>' +
            '</div>'
        );
        const input = o.querySelector('#banDaysInput');
        o.addEventListener('click', ev => {
            const t = ev.target;
            if (t.dataset && t.dataset.preset) { input.value = t.dataset.preset; return; }
            if (t === o || (t.dataset && t.dataset.r === 'no')) { o.remove(); resolve(null); return; }
            if (t.dataset && t.dataset.r === 'yes') {
                const days = Number(input.value);
                if (!Number.isInteger(days) || days < 1 || days > 3650) {
                    o.querySelector('#banError').classList.remove('hidden');
                    return;
                }
                o.remove();
                resolve(days);
            }
        });
    });
}

/* =========================
   SEARCH (header + manage-job-seekers box)
========================= */
function wireAdminSearch() {
    const headerSearch = document.getElementById('adminSearch');
    if (headerSearch) {
        headerSearch.addEventListener('input', () => filterSearchable(headerSearch.value, document));
    }
    const seekerSearch = document.getElementById('jobSeekersSearch');
    if (seekerSearch) {
        seekerSearch.addEventListener('input', () => {
            filterSearchable(seekerSearch.value, document.getElementById('jobSeekersBody'));
        });
    }
    const employerSearch = document.getElementById('employersSearch');
    if (employerSearch) {
        employerSearch.addEventListener('input', () => {
            filterSearchable(employerSearch.value, document.getElementById('employersBody'));
        });
    }
}

function filterSearchable(term, scopeEl) {
    const t = term.toLowerCase();
    (scopeEl || document).querySelectorAll('[data-searchable]').forEach(row => {
        row.style.display = row.innerText.toLowerCase().includes(t) ? '' : 'none';
    });
}

/* =========================
   TABS
========================= */
function switchTab(event, tabId) {
    event.preventDefault();

    document.querySelectorAll('.tab-content').forEach(content => content.classList.add('hidden'));

    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('bg-[#FCB800]', 'text-gray-900', 'shadow-sm');
        item.classList.add('text-gray-600', 'dark:text-gray-300', 'hover:bg-amber-50', 'dark:hover:bg-gray-700', 'hover:text-gray-900', 'dark:hover:text-white');
    });

    const activeContent = document.getElementById('tab-' + tabId);
    if (activeContent) activeContent.classList.remove('hidden');

    const target = event.currentTarget;
    target.classList.remove('text-gray-600', 'dark:text-gray-300', 'hover:bg-amber-50', 'dark:hover:bg-gray-700', 'hover:text-gray-900', 'dark:hover:text-white');
    target.classList.add('bg-[#FCB800]', 'text-gray-900', 'shadow-sm');
}

/* =========================
   THEME TOGGLE
========================= */
function updateToggleIcon(isDark) {
    const icon = document.getElementById('themeToggleIcon');
    if (!icon) return;
    icon.classList.toggle('fa-sun', isDark);
    icon.classList.toggle('fa-moon', !isDark);
}

function toggleDarkMode() {
    const isDark = document.documentElement.classList.toggle('dark');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
    updateToggleIcon(isDark);
}

(function initTheme() {
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
        document.documentElement.classList.add('dark');
        updateToggleIcon(true);
    } else {
        document.documentElement.classList.remove('dark');
        updateToggleIcon(false);
    }
})();

/* =========================
   LOGOUT
========================= */
document.addEventListener('DOMContentLoaded', () => {
    const logoutBtn = document.querySelector('a[href="#logout"]');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (event) => {
            event.preventDefault();
            document.getElementById('logoutModal').classList.remove('hidden');
        });
    }
});

function closeLogoutModal() {
    document.getElementById('logoutModal').classList.add('hidden');
}

async function executeLogout() {
    await supabaseClient.auth.signOut();
    window.location.href = 'index.html';
}
