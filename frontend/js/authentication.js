"use strict";

let USERS_API_URL = SERVER_API_BASE_URL + "/Users";

function initializeAuthentication() {
    initializeLoginForm();
    initializeRegistrationForm();
    initializePasswordVisibilityControls();
    initializeRegistrationImagePreview();
    displayLockedAccountMessage();
}

function saveLoggedInUserSession(user) {
    if (!user) {
        return;
    }

    let safeSession = {
        userID: user.userId,
        fullName: user.fullName || "",
        email: user.email || "",
        imageUrl: user.imageUrl || "",
        isAdmin: user.isAdmin === true,
        isLocked: user.isLocked === true
    };

    localStorage.setItem(
        SESSION_STORAGE_KEY,
        JSON.stringify(safeSession)
    );
}

function getLoggedInUserSession() {
    let storedSession = localStorage.getItem(SESSION_STORAGE_KEY);

    if (!storedSession) {
        return null;
    }

    try {
        let session = JSON.parse(storedSession);

        if (
            !session ||
            session.userID === null ||
            session.userID === undefined
        ) {
            clearLoggedInUserSession();
            return null;
        }

        return session;
    } catch (error) {
        clearLoggedInUserSession();
        return null;
    }
}

function clearLoggedInUserSession() {
    localStorage.removeItem(SESSION_STORAGE_KEY);
}

function isUserLoggedIn() {
    return getLoggedInUserSession() !== null;
}

function isCurrentUserAdministrator() {
    let session = getLoggedInUserSession();

    return session !== null && session.isAdmin === true;
}

function protectLoggedInPage() {
    if (!isUserLoggedIn()) {
        let currentPage = window.location.pathname.split("/").pop();
        let returnPath = currentPage + window.location.search;

        window.location.href =
            "login.html?returnUrl=" + encodeURIComponent(returnPath);

        return false;
    }

    return true;
}

function protectAdministratorPage() {
    if (!protectLoggedInPage()) {
        return false;
    }

    if (!isCurrentUserAdministrator()) {
        window.location.href = "index.html";
        return false;
    }

    return true;
}

function logoutUser() {
    clearLoggedInUserSession();
    window.location.href = "login.html";
}

function handleServerAuthorizationError(error, statusElement) {
    if (!error || error.status !== 403) {
        return false;
    }

    clearLoggedInUserSession();

    displayErrorMessage(
        statusElement,
        "This account is locked. Please contact an administrator."
    );

    window.setTimeout(function () {
        window.location.href = "login.html?locked=1";
    }, 1200);

    return true;
}

function initializeLoginForm() {
    let loginForm = document.getElementById("loginForm");

    if (!loginForm || loginForm.dataset.listenerReady === "true") {
        return;
    }

    loginForm.dataset.listenerReady = "true";
    loginForm.addEventListener("submit", handleLoginSubmit);
}

function handleLoginSubmit(event) {
    event.preventDefault();

    let emailInput = document.getElementById("loginEmail");
    let passwordInput = document.getElementById("loginPassword");
    let statusElement = document.getElementById("authenticationStatus");
    let submitButton = event.currentTarget.querySelector(
        "button[type='submit']"
    );

    let email = emailInput ? emailInput.value.trim() : "";
    let password = passwordInput ? passwordInput.value : "";

    if (!isValidEmail(email)) {
        displayErrorMessage(
            statusElement,
            "Please enter a valid email address."
        );
        return;
    }

    if (!isNonEmptyText(password)) {
        displayErrorMessage(statusElement, "Please enter your password.");
        return;
    }

    setAuthenticationSubmitState(
        submitButton,
        true,
        "Logging in..."
    );

    displayLoadingMessage(statusElement, "Checking your account...");

    let loginData = {
        email: email,
        password: password
    };

    ajaxCall(
        "POST",
        USERS_API_URL + "/login",
        JSON.stringify(loginData),
        function (user) {
            saveLoggedInUserSession(user);
            displaySuccessMessage(statusElement, "Login successful.");

            window.setTimeout(function () {
                redirectAfterAuthentication();
            }, 300);
        },
        function (error) {
            let message = "Invalid email or password.";

            if (error.status === 403) {
                message =
                    "This account is locked. Please contact an administrator.";
            } else {
                message = getAjaxErrorMessage(error, message);
            }

            displayErrorMessage(statusElement, message);

            setAuthenticationSubmitState(
                submitButton,
                false,
                "Login"
            );
        }
    );
}

function initializeRegistrationForm() {
    let registrationForm = document.getElementById("registrationForm");

    if (
        !registrationForm ||
        registrationForm.dataset.listenerReady === "true"
    ) {
        return;
    }

    registrationForm.dataset.listenerReady = "true";
    registrationForm.addEventListener(
        "submit",
        handleRegistrationSubmit
    );
}

function handleRegistrationSubmit(event) {
    event.preventDefault();

    let statusElement = document.getElementById("authenticationStatus");
    let submitButton = event.currentTarget.querySelector(
        "button[type='submit']"
    );

    let registrationData = {
        fullName: getAuthenticationInputValue("registerFullName"),
        email: getAuthenticationInputValue("registerEmail"),
        password: getAuthenticationInputValue(
            "registerPassword",
            false
        ),
        confirmPassword: getAuthenticationInputValue(
            "registerConfirmPassword",
            false
        ),
        birthDate: getAuthenticationInputValue("registerBirthDate"),
        gender: getAuthenticationInputValue("registerGender"),
        imageUrl: getAuthenticationInputValue("registerImageUrl")
    };

    let validationMessage =
        validateRegistrationValues(registrationData);

    if (validationMessage !== "") {
        displayErrorMessage(statusElement, validationMessage);
        return;
    }

    let userToRegister = {
        email: registrationData.email,
        passwordHash: registrationData.password,
        fullName: registrationData.fullName,
        birthDate: registrationData.birthDate,
        gender: registrationData.gender,
        imageUrl: registrationData.imageUrl
    };

    setAuthenticationSubmitState(
        submitButton,
        true,
        "Creating account..."
    );

    displayLoadingMessage(statusElement, "Creating your account...");

    ajaxCall(
        "POST",
        USERS_API_URL + "/register",
        JSON.stringify(userToRegister),
        function (affectedRows) {
            if (Number(affectedRows) <= 0) {
                displayErrorMessage(
                    statusElement,
                    "Registration was not completed."
                );

                setAuthenticationSubmitState(
                    submitButton,
                    false,
                    "Create Account"
                );

                return;
            }

            displaySuccessMessage(
                statusElement,
                "Registration successful. Redirecting to login..."
            );

            window.setTimeout(function () {
                window.location.href = "login.html";
            }, 700);
        },
        function (error) {
            displayErrorMessage(
                statusElement,
                getAjaxErrorMessage(error, "Registration failed.")
            );

            setAuthenticationSubmitState(
                submitButton,
                false,
                "Create Account"
            );
        }
    );
}

function getAuthenticationInputValue(identifier, shouldTrim) {
    let input = document.getElementById(identifier);

    if (!input) {
        return "";
    }

    let value = input.value;

    if (shouldTrim === false) {
        return value;
    }

    return value.trim();
}

function validateRegistrationValues(data) {
    if (!isNonEmptyText(data.fullName)) {
        return "Please enter your full name.";
    }

    if (!isValidEmail(data.email)) {
        return "Please enter a valid email address.";
    }

    if (!isValidPassword(data.password)) {
        return "The password must contain at least 8 characters.";
    }

    if (data.password !== data.confirmPassword) {
        return "The password confirmation does not match.";
    }

    if (!validateBirthDate(data.birthDate)) {
        return "Please enter a valid birth date.";
    }

    if (!isNonEmptyText(data.gender)) {
        return "Please select your gender.";
    }

    return "";
}

function initializePasswordVisibilityControls() {
    let visibilityControls = document.querySelectorAll(
        "[data-password-target]"
    );

    visibilityControls.forEach(function (control) {
        let targetIdentifier =
            control.getAttribute("data-password-target");

        let passwordInput =
            document.getElementById(targetIdentifier);

        if (!passwordInput) {
            return;
        }

        control.addEventListener("mouseenter", function () {
            passwordInput.type = "text";
        });

        control.addEventListener("mouseleave", function () {
            passwordInput.type = "password";
        });

        control.addEventListener("focus", function () {
            passwordInput.type = "text";
        });

        control.addEventListener("blur", function () {
            passwordInput.type = "password";
        });
    });
}

function initializeRegistrationImagePreview() {
    let imageUrlInput =
        document.getElementById("registerImageUrl");

    let imagePreview =
        document.getElementById("registerImagePreview");

    if (!imageUrlInput || !imagePreview) {
        return;
    }

    imageUrlInput.addEventListener("input", function () {
        let imageUrl = imageUrlInput.value.trim();

        imagePreview.src =
            imageUrl === ""
                ? DEFAULT_PROFILE_IMAGE_URL
                : imageUrl;
    });

    setImageFallback(
        imagePreview,
        DEFAULT_PROFILE_IMAGE_URL
    );
}

function setAuthenticationSubmitState(button, isLoading, text) {
    if (!button) {
        return;
    }

    button.disabled = isLoading;
    button.textContent = text;
}

function redirectAfterAuthentication() {
    let returnPath = getQueryParameter("returnUrl");

    window.location.href = getSafeReturnPath(returnPath);
}

function displayLockedAccountMessage() {
    let messageElement =
        document.getElementById("lockedAccountMessage");

    if (!messageElement) {
        return;
    }

    if (getQueryParameter("locked") === "1") {
        displayErrorMessage(
            messageElement,
            "This account is locked. Please contact an administrator."
        );
    }
}

document.addEventListener(
    "DOMContentLoaded",
    initializeAuthentication
);