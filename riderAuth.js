// riderAuth.js

import { app, db } from './firebaseConfig.js';
import { 
    getAuth, 
    signInWithEmailAndPassword, 
    createUserWithEmailAndPassword 
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
import { 
    doc, 
    setDoc, 
    getDoc 
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

// Initialize Firebase Auth
const auth = getAuth(app);

// Get references to the forms and elements
const riderLoginForm = document.getElementById('riderLoginForm');
const riderRegisterForm = document.getElementById('riderRegisterForm');
const errorMessage = document.getElementById('error-message');
const loadingSpinner = document.getElementById('loading-spinner');

// Function to display error messages
function displayError(message) {
    if (errorMessage) {
        errorMessage.textContent = message;
        errorMessage.className = 'error-message active';
    } else {
        alert(message);
    }
}

// Function to clear error messages
function clearError() {
    if (errorMessage) {
        errorMessage.textContent = '';
        errorMessage.className = 'error-message';
    }
}

// Function to show loading spinner
function showLoading() {
    if (loadingSpinner) {
        loadingSpinner.style.display = 'block';
    }
}

// Function to hide loading spinner
function hideLoading() {
    if (loadingSpinner) {
        loadingSpinner.style.display = 'none';
    }
}

// Handle Rider Login
if (riderLoginForm) {
    riderLoginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        clearError();

        const email = document.getElementById('rider-email').value.trim();
        const password = document.getElementById('rider-password').value.trim();

        if (!email || !password) {
            displayError("Please enter both email and password.");
            return;
        }

        try {
            showLoading();
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            // Fetch user role from Firestore
            const userDoc = await getDoc(doc(db, "users", user.uid));
            if (userDoc.exists()) {
                const userData = userDoc.data();
                if (userData.role !== 'rider') {
                    displayError("You do not have rider privileges.");
                    // Optionally, sign out the user
                    await auth.signOut();
                    return;
                }
            } else {
                displayError("User data not found. Please contact support.");
                // Optionally, sign out the user
                await auth.signOut();
                return;
            }

            // Redirect to Rider Dashboard
            window.location.href = 'riderDashboard.html';
        } catch (error) {
            console.error("Rider Login Error:", error);
            switch (error.code) {
                case 'auth/user-not-found':
                    displayError("No user found with this email.");
                    break;
                case 'auth/wrong-password':
                    displayError("Incorrect password.");
                    break;
                case 'auth/invalid-email':
                    displayError("Invalid email address.");
                    break;
                default:
                    displayError("Login failed. Please try again.");
            }
        } finally {
            hideLoading();
        }
    });
}

// Handle Rider Registration
if (riderRegisterForm) {
    riderRegisterForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        clearError();

        const name = document.getElementById('rider-name').value.trim();
        const email = document.getElementById('rider-email').value.trim();
        const password = document.getElementById('rider-password').value.trim();

        if (!name || !email || !password) {
            displayError("Please fill in all required fields.");
            return;
        }

        try {
            showLoading();
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            // Save user data in Firestore with role 'rider'
            await setDoc(doc(db, "users", user.uid), {
                name: name,
                email: email,
                role: 'rider',
                createdAt: new Date()
            });

            // Redirect to Rider Dashboard
            window.location.href = 'riderDashboard.html';
        } catch (error) {
            console.error("Rider Registration Error:", error);
            switch (error.code) {
                case 'auth/email-already-in-use':
                    displayError("This email is already in use.");
                    break;
                case 'auth/invalid-email':
                    displayError("Invalid email address.");
                    break;
                case 'auth/weak-password':
                    displayError("Password should be at least 6 characters.");
                    break;
                default:
                    displayError("Registration failed. Please try again.");
            }
        } finally {
            hideLoading();
        }
    });
}
