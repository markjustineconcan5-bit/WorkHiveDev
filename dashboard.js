
let ADMIN_PROFILE = null;
let ALL_JOBS = [];
let ALL_APPLICATIONS = [];
let ALL_JOBSEEKERS = [];

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


async function loadAdminData() {
    const [{ data: jobs }, { data: apps }, { data: seekers }] = await Promise.all([
        supabaseClient.from('jobs').select('*, profiles!jobs_employer_id_fkey(company_name, full_name)').order('created_at', { ascending: false }),
        supabaseClient.from('applications').select('*, jobs(title), profiles!applications_applicant_id_fkey(full_name, username, email)').order('created_at', { ascending: false }),
        supabaseClient.from('profiles').select('*').eq('role', 'jobseeker').order('created_at', { ascending: false })
    ]);

    ALL_JOBS = jobs || [];
    ALL_APPLICATIONS = apps || [];
    ALL_JOBSEEKERS = seekers || [];

    renderStats();
    renderOverviewCandidates();
    renderJobs();
    renderApplications();
    renderJobSeekers();
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
            if (!(await confirmDialog('Delete this job listing?'))) return;
            const { error } = await supabaseClient.from('jobs').delete().eq('id', btn.dataset.jobId);
            if (error) { toast('Could not delete: ' + error.message, "error"); return; }
            await loadAdminData();
        });
    });
}

function renderJobSeekers() {
    const body = document.getElementById('jobSeekersBody');
    if (!body) return;
    body.innerHTML = ALL_JOBSEEKERS.map(u => (
        '<tr data-searchable class="border-b border-gray-100 text-sm">' +
            '<td class="py-3 px-4 text-xs text-gray-400">' + u.id.slice(0, 8) + '</td>' +
            '<td class="py-3 px-4">' + (u.full_name || u.username) + '</td>' +
            '<td class="py-3 px-4 text-xs">' + (u.skills || '—') + '</td>' +
            '<td class="py-3 px-4"><span class="px-2 py-1 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-700">Active</span></td>' +
            '<td class="py-3 px-4"><button data-user-id="' + u.id + '" class="remove-seeker text-[10px] text-red-500 hover:underline">Remove</button></td>' +
        '</tr>'
    )).join('') || '<tr><td colspan="5" class="py-6 text-center text-gray-400">No job seekers yet.</td></tr>';

    body.querySelectorAll('.remove-seeker').forEach(btn => {
        btn.addEventListener('click', async () => {
            if (!(await confirmDialog('Remove this job seeker profile record?'))) return;
            const { error } = await supabaseClient.from('profiles').delete().eq('id', btn.dataset.userId);
            if (error) { toast('Could not remove: ' + error.message, "error"); return; }
            await loadAdminData();
        });
    });
}


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
}

function filterSearchable(term, scopeEl) {
    const t = term.toLowerCase();
    (scopeEl || document).querySelectorAll('[data-searchable]').forEach(row => {
        row.style.display = row.innerText.toLowerCase().includes(t) ? '' : 'none';
    });
}


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
