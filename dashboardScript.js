// dashboardScript.js

import { app, db } from './firebaseConfig.js';
import { 
  getAuth, 
  onAuthStateChanged, 
  signOut 
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

const auth = getAuth(app);

// Debugging: Log when dashboardScript.js is loaded
console.log("dashboardScript.js loaded");

onAuthStateChanged(auth, async (user) => {
    const loadingSpinner = document.getElementById('loading-spinner');
    if (loadingSpinner) {
        loadingSpinner.style.display = 'block';
    }

    if (user) {
        try {
            const userDoc = await getDoc(doc(db, "users", user.uid));
            const role = userDoc.exists() ? userDoc.data().role : "unknown";

            console.log("User Role:", role); // Debugging

            if (role !== "passenger") {
                alert("Access denied. You are not authorized to view this page.");
                if (role === "rider") {
                    window.location.href = "riderDashboard.html";
                } else {
                    window.location.href = "login.html";
                }
            } else {
                // Set passenger's name in the dashboard
                const userNameSpan = document.getElementById("user-name");
                if (userNameSpan && userDoc.data().name) {
                    userNameSpan.textContent = userDoc.data().name;
                }
            }
        } catch (error) {
            console.error("Error fetching user data:", error);
            alert("An error occurred while fetching your data. Please try again.");
            window.location.href = "login.html";
        } finally {
            // Hide Loading Spinner
            if (loadingSpinner) {
                loadingSpinner.style.display = 'none';
            }
        }
    } else {
        alert("Please log in to access this page.");
        window.location.href = "login.html";
    }
});

// Logout functionality (if not handled in auth.js)
const logoutLink = document.getElementById("logout-link");
if (logoutLink) {
    logoutLink.addEventListener("click", async (e) => {
        e.preventDefault();
        try {
            await signOut(auth);
            alert("You have successfully logged out.");
            window.location.href = "login.html";
        } catch (error) {
            console.error("Logout error:", error.message);
            alert("Error logging out: " + error.message);
        }
    });
} else {
    console.warn("logout-link not found");
}
