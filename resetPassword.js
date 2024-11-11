// resetPassword.js

import { app, db } from './firebaseConfig.js';
import { 
  getAuth, 
  sendPasswordResetEmail,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";

const auth = getAuth(app);

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
        const errorMessageContainer = document.getElementById('reset-error-message');
        const successMessageContainer = document.getElementById('reset-success-message');
        if (errorMessageContainer) {
            errorMessageContainer.textContent = '';
        }
        if (successMessageContainer) {
            successMessageContainer.textContent = '';
        }

        try {
            await sendPasswordResetEmail(auth, resetEmail);
            if (successMessageContainer) {
                successMessageContainer.textContent = "Password reset email sent! Please check your inbox.";
            }
            resetPasswordForm.reset();
        } catch (error) {
            console.error("Password Reset Error:", error);
            let errorMessage = "Failed to send password reset email. Please try again.";
            if (error.code === 'auth/user-not-found') {
                errorMessage = "No user found with this email.";
            } else if (error.code === 'auth/invalid-email') {
                errorMessage = "Invalid email address.";
            }
            if (errorMessageContainer) {
                errorMessageContainer.textContent = errorMessage;
            }
        } finally {
            // Hide Loading Spinner
            if (loadingSpinner) {
                loadingSpinner.style.display = 'none';
            }
        }
    });
}
