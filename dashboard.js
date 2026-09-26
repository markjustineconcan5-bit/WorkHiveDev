document.addEventListener('DOMContentLoaded', async () => {
  const loginForm = document.getElementById('loginForm');
  const messageEl = document.getElementById('message');
  const showPasswordCheckbox = document.getElementById('showPassword');
  const passwordInput = document.getElementById('password');

  const { data: { session } } = await supabase.auth.getSession();
  if (session) {
    window.location.replace('dashboard.html');
    return;
  }

  if (showPasswordCheckbox && passwordInput) {
    showPasswordCheckbox.addEventListener('change', () => {
      passwordInput.type = showPasswordCheckbox.checked ? 'text' : 'password';
    });
  }


  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const email = document.getElementById('username').value.trim();
      const password = passwordInput.value.trim();

      if (messageEl) {
        messageEl.textContent = 'Signing in...';
        messageEl.className = 'mt-3 text-sm text-center text-gray-600';
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email: email,
        password: password,
      });

      if (error) {
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

        setTimeout(() => {
          window.location.replace('dashboard.html');
        }, 800);
      }
    });
  }
});

window.addEventListener('pageshow', function (event) {
  if (event.persisted) {
    window.location.reload();
  }
});


document.addEventListener('DOMContentLoaded', async () => {
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    window.location.replace('index.html');
    return;
  }

  if (session.user && session.user.email) {
    document.getElementById('userEmail').textContent = session.user.email;
    document.getElementById('userInitial').textContent = session.user.email.charAt(0).toUpperCase();
  }
});

const logoutBtn = document.getElementById('logoutBtn');
if (logoutBtn) {
  logoutBtn.addEventListener('click', async (e) => {
    e.preventDefault();

    await supabase.auth.signOut();

    localStorage.clear();
    sessionStorage.clear();

    window.location.replace('index.html');
  });
}

window.addEventListener('pageshow', async function (event) {
  // Always verify session status when page becomes visible
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    window.location.replace('index.html');
  }
});

        function switchTab(event, tabId) {
            event.preventDefault();

            const contents = document.querySelectorAll('.tab-content');
            contents.forEach(content => content.classList.add('hidden'));

            const navItems = document.querySelectorAll('.nav-item');
            navItems.forEach(item => {
                item.classList.remove('bg-[#FCB800]', 'text-gray-900', 'shadow-sm');
                item.classList.add('text-gray-600', 'dark:text-gray-300', 'hover:bg-amber-50', 'dark:hover:bg-gray-700', 'hover:text-gray-900', 'dark:hover:text-white');
            });

            const activeContent = document.getElementById('tab-' + tabId);
            if (activeContent) {
                activeContent.classList.remove('hidden');
            }

            const target = event.currentTarget;
            target.classList.remove('text-gray-600', 'dark:text-gray-300', 'hover:bg-amber-50', 'dark:hover:bg-gray-700', 'hover:text-gray-900', 'dark:hover:text-white');
            target.classList.add('bg-[#FCB800]', 'text-gray-900', 'shadow-sm');
        }

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

function closeLogoutModal() {
    document.getElementById('logoutModal').classList.add('hidden');
}

async function executeLogout() {
    await supabaseClient.auth.signOut();
    window.location.href = 'index.html';
}
