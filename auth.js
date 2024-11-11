// auth.js

import { app, db } from './firebaseConfig.js';
import { 
  getAuth, 
  createUserWithEmailAndPassword, 
  sendEmailVerification,
  signInWithEmailAndPassword, 
  sendPasswordResetEmail,
  onAuthStateChanged, 
  signOut 
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
import { doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

const auth = getAuth(app);

/**
 * Utility function to determine the expected role based on the current page.
 * Returns "passenger" for passenger login/registration pages,
 * and "rider" for rider login/registration pages.
 */
function getExpectedRole() {
    const currentPage = window.location.pathname.split("/").pop();
    if (currentPage === "login.html") {
        return "passenger";
    } else if (currentPage === "riderLogin.html") {
        return "rider";
    } else if (currentPage === "register.html") {
        return "passenger";
    } else if (currentPage === "riderRegister.html") {
        return "rider";
    }
    return null;
}

const expectedRole = getExpectedRole();

// Function to display error messages inline
function displayError(message, containerId) {
    const errorMessageContainer = document.getElementById(containerId);
    if (errorMessageContainer) {
        errorMessageContainer.textContent = message;
        errorMessageContainer.classList.add('active');
        errorMessageContainer.classList.remove('success');
    } else {
        alert(message);
    }
}

// Function to display success messages inline
function displaySuccess(message, containerId) {
    const successMessageContainer = document.getElementById(containerId);
    if (successMessageContainer) {
        successMessageContainer.textContent = message;
        successMessageContainer.classList.add('active', 'success');
        successMessageContainer.classList.remove('error');
    }
}

// Registration Handler for Passenger and Rider Users
const registerForm = document.getElementById("registerForm");
if (registerForm) {
    registerForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const name = document.getElementById("name").value.trim();
        const email = document.getElementById("email").value.trim();
        const password = document.getElementById("password").value;

        // Show Loading Spinner
        const loadingSpinner = document.getElementById('loading-spinner');
        if (loadingSpinner) {
            loadingSpinner.style.display = 'block';
        }

        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            // Send Email Verification
            await sendEmailVerification(user);

            // Set user document in Firestore with role
            await setDoc(doc(db, "users", user.uid), { 
                name, 
                email, 
                role: expectedRole 
            });

            displaySuccess(`Registration successful! A verification email has been sent to your email address. Please verify your email before logging in as a ${expectedRole}.`, 'message-container');
            registerForm.reset();

            // Optionally, redirect to the appropriate login page after a short delay
            setTimeout(() => {
                window.location.href = expectedRole === "passenger" ? "login.html" : "riderLogin.html";
            }, 3000); // 3-second delay
        } catch (error) {
            console.error("Registration Error:", error);
            let errorMessage = "Registration failed. Please try again.";
            if (error.code === 'auth/email-already-in-use') {
                errorMessage = "This email is already in use. Please use a different email.";
            } else if (error.code === 'auth/invalid-email') {
                errorMessage = "The email address is invalid. Please enter a valid email.";
            } else if (error.code === 'auth/weak-password') {
                errorMessage = "The password is too weak. Please choose a stronger password.";
            }
            displayError(errorMessage, 'error-message');
        } finally {
            // Hide Loading Spinner
            if (loadingSpinner) {
                loadingSpinner.style.display = 'none';
            }
        }
    });
}

// Login Handler for Passenger and Rider Users
const loginForm = document.getElementById("loginForm");
if (loginForm) {
    loginForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const email = document.getElementById("email").value.trim();
        const password = document.getElementById("password").value;

        // Show Loading Spinner
        const loadingSpinner = document.getElementById('loading-spinner');
        if (loadingSpinner) {
            loadingSpinner.style.display = 'block';
        }

        // Clear any previous error messages
        displayError('', 'error-message');
        displaySuccess('', 'message-container');

        try {
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            // Check if email is verified
            if (!user.emailVerified) {
                await signOut(auth);
                displayError("Your email is not verified. Please check your inbox for the verification email.", 'error-message');
                return;
            }

            // Retrieve user role from Firestore
            const userDoc = await getDoc(doc(db, "users", user.uid));
            const role = userDoc.exists() ? userDoc.data().role : null;

            if (!role) {
                await signOut(auth);
                displayError("User role not found. Please contact support.", 'error-message');
                return;
            }

            if (role === expectedRole) {
                // Redirect to the appropriate dashboard
                if (role === "passenger") {
                    window.location.href = "index.html";
                } else if (role === "rider") {
                    window.location.href = "riderDashboard.html";
                }
            } else {
                await signOut(auth);
                displayError(`This email is registered as a ${role}. Please log in through the appropriate ${role === "passenger" ? "Passenger" : "Rider"} login page.`, 'error-message');
            }
        } catch (error) {
            console.error("Login Error:", error);
            let errorMessage = "Login failed. Please try again.";
            if (error.code === 'auth/user-not-found') {
                errorMessage = "No user found with this email.";
            } else if (error.code === 'auth/wrong-password') {
                errorMessage = "Incorrect password. Please try again.";
            } else if (error.code === 'auth/invalid-email') {
                errorMessage = "Invalid email address.";
            }
            displayError(errorMessage, 'error-message');
        } finally {
            // Hide Loading Spinner
            if (loadingSpinner) {
                loadingSpinner.style.display = 'none';
            }
        }
    });
}

// Password Reset Handler
const resetPasswordForm = document.getElementById("resetPasswordForm");
if (resetPasswordForm) {
    resetPasswordForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const resetEmail = document.getElementById("reset-email").value.trim();

        // Show Loading Spinner
        const loadingSpinner = document.getElementById('loading-spinner');
        if (loadingSpinner) {
            loadingSpinner.style.display = 'block';
        }

        // Clear any previous messages
        displayError('', 'reset-error-message');
        displaySuccess('', 'reset-success-message');

        try {
            await sendPasswordResetEmail(auth, resetEmail);
            displaySuccess("Password reset email sent! Please check your inbox.", 'reset-success-message');
            resetPasswordForm.reset();
        } catch (error) {
            console.error("Password Reset Error:", error);
            let errorMessage = "Failed to send password reset email. Please try again.";
            if (error.code === 'auth/user-not-found') {
                errorMessage = "No user found with this email.";
            } else if (error.code === 'auth/invalid-email') {
                errorMessage = "Invalid email address.";
            }
            displayError(errorMessage, 'reset-error-message');
        } finally {
            // Hide Loading Spinner
            if (loadingSpinner) {
                loadingSpinner.style.display = 'none';
            }
        }
    });
}

// Listen for Auth State Changes to update UI elements (e.g., welcome message, logout link)
onAuthStateChanged(auth, async (user) => {
    // Only manipulate UI elements if they exist on the current page
    const welcomeMessage = document.getElementById('welcome-message');
    const logoutLink = document.getElementById('logout-link');

    if (user) {
        // Fetch user details from Firestore
        const userDoc = await getDoc(doc(db, "users", user.uid));
        const name = userDoc.exists() ? userDoc.data().name : "User";

        if (welcomeMessage) {
            welcomeMessage.style.display = 'block';
            welcomeMessage.innerHTML = `Welcome, <span id="user-name">${name}</span>!`;
        }

        if (logoutLink) {
            logoutLink.style.display = 'inline-block';
        }
    } else {
        if (welcomeMessage) {
            welcomeMessage.style.display = 'none';
        }

        if (logoutLink) {
            logoutLink.style.display = 'none';
        }
    }
});

// Handle Logout
const logoutLinkElement = document.getElementById('logout-link');
if (logoutLinkElement) {
    logoutLinkElement.addEventListener('click', async (e) => {
        e.preventDefault();
        try {
            await signOut(auth);
            showMessage("You have successfully logged out.", "success");
            window.location.href = "login.html";
        } catch (error) {
            console.error("Logout error:", error.message);
            showMessage("Error logging out: " + error.message, "error");
        }
    });
}
