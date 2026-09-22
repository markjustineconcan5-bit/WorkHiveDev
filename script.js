window.addEventListener('pageshow', async (event) => {
  const { data: { session } } = await supabase.auth.getSession();


  if (session) {
    window.location.replace('dashboard.html');
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
const password = document.getElementById("password");

loginForm.addEventListener("submit", async function(event)
{
    event.preventDefault();

    const email = document.getElementById("username").value.trim();
    const pass = password.value;
    const submitBtn = loginForm.querySelector('button[type="submit"]');

    if(email === "" || pass === "")
    {
        message.style.color = "red";
        message.textContent = "Fill the Blanks";
        return;
    }

    submitBtn.disabled = true;

    try
    {
        const { error } = await supabaseClient.auth.signInWithPassword({
            email: email,
            password: pass
        });

        if(error)
        {
            submitBtn.disabled = false;
            message.style.color = "red";

            if(error.code === "email_not_confirmed" || error.message === "Email not confirmed")
            {
                message.textContent = "Please confirm your email first. Check your inbox.";
            }
            else
            {
                message.textContent = "Invalid Username or Password";
            }
            return;
        }

        message.style.color = "green";
        message.textContent = "LogIn Successfully";

        setTimeout(function() {
            window.location.href = "dashboard.html";
        }, 1000);
    }
    catch(err)
    {
        console.error("Login error:", err);
        submitBtn.disabled = false;
        message.style.color = "red";
        message.textContent = "Something went wrong. Please try again.";
    }
});

showPassword.addEventListener("change", () => {
    password.type = showPassword.checked ? "text" : "password";
});

window.addEventListener('pageshow', function (event) {
  if (event.persisted) {
    window.location.reload();
  }
});