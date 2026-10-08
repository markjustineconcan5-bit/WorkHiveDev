window.addEventListener('pageshow', async (event) => {
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (session) {
        const profile = await getCurrentProfile();
        if (profile) window.location.replace(dashboardUrlForRole(profile.role));
    }
});

if (window.history && window.history.pushState) {
    window.history.pushState(null, null, window.location.href);
    window.onpopstate = function () {
        window.history.pushState(null, null, window.location.href);
    };
}

const loginForm = document.getElementById("loginForm");
const message = document.getElementById("message");
const showPassword = document.getElementById("showPassword");
const passwordInput = document.getElementById("password");


showPassword.addEventListener("change", () => {
    passwordInput.type = showPassword.checked ? "text" : "password";
});


loginForm.addEventListener("submit", async function(event) {
    event.preventDefault();

    const identifier = document.getElementById("username").value.trim();
    const pass = passwordInput.value;
    const submitBtn = loginForm.querySelector('button[type="submit"]');

    if (identifier === "" || pass === "") {
        message.style.color = "red";
        message.textContent = "Fill the Blanks";
        return;
    }

    submitBtn.disabled = true;
    message.textContent = "Logging in...";
    message.style.color = "#333";

    try {
       
        const email = await resolveLoginEmail(identifier);
        if (!email) {
            submitBtn.disabled = false;
            message.style.color = "red";
            message.textContent = "Invalid Username or Password";
            return;
        }

        
        const { data: authData, error: authError } = await supabaseClient.auth.signInWithPassword({
            email: email,
            password: pass
        });

        if (authError) {
            submitBtn.disabled = false;
            message.style.color = "red";

            if (authError.code === "email_not_confirmed" || authError.message === "Email not confirmed") {
                message.textContent = "Please confirm your email first. Check your inbox.";
            } else if (authError.code === "user_banned" || /banned/i.test(authError.message || "")) {
                message.textContent = "This account has been suspended by the admin.";
            } else {
                message.textContent = "Invalid Username or Password";
            }
            return;
        }

        
        const { data: profileData, error: profileError } = await supabaseClient
            .from('profiles')
            .select('role')
            .eq('id', authData.user.id)
            .single();

        if (profileError) {
            submitBtn.disabled = false;
            message.style.color = "red";
            message.textContent = "Could not fetch user role profile.";
            console.error(profileError);
            return;
        }

        message.style.color = "green";
        message.textContent = "LogIn Successfully";

        
        const userRole = profileData ? profileData.role : 'jobseeker';

        setTimeout(function() {
            window.location.href = dashboardUrlForRole(userRole);
        }, 800);

    } catch (err) {
        console.error("Login error:", err);
        submitBtn.disabled = false;
        message.style.color = "red";
        message.textContent = "Something went wrong. Please try again.";
    }
});


window.addEventListener('pageshow', function (event) {
    if (event.persisted) {
        window.location.reload();
    }
});
