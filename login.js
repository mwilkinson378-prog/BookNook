/* =========================================================
   LOGIN SYSTEM
========================================================= */
const loginForm =
    document.getElementById("login-form");

const emailInput =
    document.getElementById("email");

const passwordInput =
    document.getElementById("password");

const message =
    document.getElementById("login-message");

const formTitle =
    document.getElementById("form-title");

const formSubtitle =
    document.getElementById("form-subtitle");

const submitButton =
    document.getElementById("submit-button");

const switchButton =
    document.getElementById("switch-button");

const switchText =
    document.getElementById("switch-text");

const guestButton =
    document.getElementById("guest-button");

const nameInput = document.getElementById("name");
const nameGroup = document.getElementById("name-group");

let isCreatingAccount = false;

switchButton.addEventListener("click", () => {
    isCreatingAccount = !isCreatingAccount;
    message.textContent = "";
    passwordInput.value = "";


    if (isCreatingAccount) {

        /* SIGN UP */
        nameGroup.style.display = "block";
nameInput.required = true;

        formTitle.textContent =
            "Create your account";
        formSubtitle.textContent =
            "Create an account to start your reading journey.";
        submitButton.textContent =
            "Create Account";
        switchText.textContent =
            "Already have an account?";
        switchButton.textContent =
            "Sign in";
        passwordInput.autocomplete =
            "new-password";

    } else {

        /* SIGN IN */
        nameGroup.style.display = "none";
nameInput.required = false;
nameInput.value = "";

        formTitle.textContent =
            "Welcome back";
        formSubtitle.textContent =
            "Sign in to continue to your library.";
        submitButton.textContent =
            "Sign In";
        switchText.textContent =
            "Don't have an account?";
        switchButton.textContent =
            "Create one";
        passwordInput.autocomplete =
            "current-password";
    }

});


loginForm.addEventListener("submit", (event) => {

    event.preventDefault();

    message.textContent = "";

    const email =
        emailInput.value.trim().toLowerCase();

    const password =
        passwordInput.value;

    if (!email || !password) {

        message.textContent =
            "Please enter your email and password.";

        return;
    }
    if (isCreatingAccount) {

        const savedUser =
            localStorage.getItem(
                "readingCompanionUser"
            );
        /* Check if account already exists */

        if (savedUser) {

            const existingUser =
                JSON.parse(savedUser);


            if (existingUser.email === email) {

                message.textContent =
                    "An account with this email already exists.";

                return;
            }
        }

       const name = nameInput.value.trim();

const newUser = {
    name: name,
    email: email,
    password: password
};

        localStorage.setItem(
            "readingCompanionUser",
            JSON.stringify(newUser)
        );
        localStorage.setItem(
            "readingCompanionLoggedIn",
            "true"
        );
        localStorage.removeItem(
            "readingCompanionGuest"
        );

        window.location.href =
            "home.html";

        return;
    }


    const savedUser =
        localStorage.getItem(
            "readingCompanionUser"
        );

    if (!savedUser) {

        message.textContent =
            "No account found. Please create an account first.";

        return;
    }

    const user =
        JSON.parse(savedUser);
    if (
        user.email === email &&
        user.password === password
    ) {
        localStorage.setItem(
            "readingCompanionLoggedIn",
            "true"
        );

        localStorage.removeItem(
            "readingCompanionGuest"
        );

        window.location.href =
            "home.html";

    } else {

        message.textContent =
            "Incorrect email or password.";

    }

});

guestButton.addEventListener("click", function () {

    // Save guest name
    const guestUser = {
        name: "Guest"
    };

    localStorage.setItem(
        "readingCompanionUser",
        JSON.stringify(guestUser)
    );

    // Mark as logged in
    localStorage.setItem(
        "readingCompanionLoggedIn",
        "true"
    );

    // Mark as guest
    localStorage.setItem(
        "readingCompanionGuest",
        "true"
    );

    // Go to home page
    window.location.href = "home.html";

});