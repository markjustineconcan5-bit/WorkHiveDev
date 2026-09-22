document.addEventListener('DOMContentLoaded', async () => {
  const loginForm = document.getElementById('loginForm');
  const messageEl = document.getElementById('message');
  const showPasswordCheckbox = document.getElementById('showPassword');
  const passwordInput = document.getElementById('password');

  // 1. AUTO-REDIRECT: If user is ALREADY logged in, skip login page and go straight to dashboard
  const { data: { session } } = await supabase.auth.getSession();
  if (session) {
    window.location.replace('dashboard.html');
    return;
  }

  // Toggle Password Visibility
  if (showPasswordCheckbox && passwordInput) {
    showPasswordCheckbox.addEventListener('change', () => {
      passwordInput.type = showPasswordCheckbox.checked ? 'text' : 'password';
    });
  }

  // 2. HANDLE LOGIN SUBMISSION
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const email = document.getElementById('username').value.trim();
      const password = passwordInput.value.trim();

      if (messageEl) {
        messageEl.textContent = 'Signing in...';
        messageEl.className = 'mt-3 text-sm text-center text-gray-600';
      }

      // Authenticate with Supabase
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email,
        password: password,
      });

      if (error) {
        // Display error if credentials fail
        if (messageEl) {
          messageEl.textContent = error.message;
          messageEl.className = 'mt-3 text-sm text-center text-red-500 font-semibold';
        }
      } else if (data.session) {
        // Successful login!
        if (messageEl) {
          messageEl.textContent = 'Login successful! Redirecting...';
          messageEl.className = 'mt-3 text-sm text-center text-green-600 font-semibold';
        }

        // Redirect to dashboard while removing login page from back-button history
        setTimeout(() => {
          window.location.replace('dashboard.html');
        }, 800);
      }
    });
  }
});

// 3. PREVENT BACK-BUTTON CACHING
window.addEventListener('pageshow', function (event) {
  if (event.persisted) {
    window.location.reload();
  }
});

// dashboard.js

// 1. SESSION CHECK ON LOAD
document.addEventListener('DOMContentLoaded', async () => {
  const { data: { session } } = await supabase.auth.getSession();

  // If no active session, boot user immediately
  if (!session) {
    window.location.replace('index.html');
    return;
  }

  // Display user email
  if (session.user && session.user.email) {
    document.getElementById('userEmail').textContent = session.user.email;
    document.getElementById('userInitial').textContent = session.user.email.charAt(0).toUpperCase();
  }
});

// 2. PROPER ASYNC LOGOUT
const logoutBtn = document.getElementById('logoutBtn');
if (logoutBtn) {
  logoutBtn.addEventListener('click', async (e) => {
    e.preventDefault();

    // Force sign out from Supabase
    await supabase.auth.signOut();

    // Clear any remaining auth keys in browser storage
    localStorage.clear();
    sessionStorage.clear();

    // Redirect to login page and overwrite history
    window.location.replace('index.html');
  });
}

// 3. FORCE RE-CHECK ON BROWSER FORWARD / BACK (BFCache)
window.addEventListener('pageshow', async function (event) {
  // Always verify session status when page becomes visible
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    window.location.replace('index.html');
  }
});


// Tab Switcher Logic
        function switchTab(event, tabId) {
            event.preventDefault();

            // Hide all tab content sections
            const contents = document.querySelectorAll('.tab-content');
            contents.forEach(content => content.classList.add('hidden'));

            // Reset all sidebar links style
            const navItems = document.querySelectorAll('.nav-item');
            navItems.forEach(item => {
                item.classList.remove('bg-[#FCB800]', 'text-gray-900', 'shadow-sm');
                item.classList.add('text-gray-600', 'dark:text-gray-300', 'hover:bg-amber-50', 'dark:hover:bg-gray-700', 'hover:text-gray-900', 'dark:hover:text-white');
            });

            // Show selected tab content
            const activeContent = document.getElementById('tab-' + tabId);
            if (activeContent) {
                activeContent.classList.remove('hidden');
            }

            // Highlight clicked navigation link
            const target = event.currentTarget;
            target.classList.remove('text-gray-600', 'dark:text-gray-300', 'hover:bg-amber-50', 'dark:hover:bg-gray-700', 'hover:text-gray-900', 'dark:hover:text-white');
            target.classList.add('bg-[#FCB800]', 'text-gray-900', 'shadow-sm');
        }

        // Dark Mode Logic
        function updateToggleIcon(isDark) {
            const icon = document.getElementById('themeToggleIcon');
            if (isDark) {
                icon.classList.remove('fa-moon');
                icon.classList.add('fa-sun');
            } else {
                icon.classList.remove('fa-sun');
                icon.classList.add('fa-moon');
            }
        }

        function toggleDarkMode() {
            const isDark = document.documentElement.classList.toggle('dark');
            localStorage.setItem('theme', isDark ? 'dark' : 'light');
            updateToggleIcon(isDark);
        }

        // Initialize theme on page load
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


// ---------- Supabase Auth ----------

// Only signed-in users can see the dashboard
(async function requireLogin() {
    const { data } = await supabaseClient.auth.getSession();
    if (!data.session) {
        window.location.replace('index.html');
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

// Cancel button
function closeLogoutModal() {
    document.getElementById('logoutModal').classList.add('hidden');
}

// Logout button: end the Supabase session, then go back to the login page
async function executeLogout() {
    await supabaseClient.auth.signOut();
    window.location.href = 'index.html';
}