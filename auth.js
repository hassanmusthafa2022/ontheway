import app from './firebaseConfig.js';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";

const auth = getAuth(app);

console.log("Auth instance:", auth);

// Registration
if (document.getElementById('registerForm')) {
    document.getElementById('registerForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;

        console.log("Attempting to register user:", email, password);

        if (email && password) {
            try {
                const userCredential = await createUserWithEmailAndPassword(auth, email, password);
                console.log("Registration successful:", userCredential);
                alert("Registration successful! You can now log in.");
                window.location.href = "login.html";  // Redirect to login page
            } catch (error) {
                console.error("Error during registration:", error.message);
                alert(error.message);
            }
        } else {
            alert("Please enter both email and password.");
        }
    });
}

// Login
if (document.getElementById('loginForm')) {
    document.getElementById('loginForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;

        console.log("Attempting to log in user:", email, password);

        if (email && password) {
            try {
                const userCredential = await signInWithEmailAndPassword(auth, email, password);
                console.log("Login successful:", userCredential);
                alert("Login successful!");
                window.location.href = "index.html";  // Redirect to home page
            } catch (error) {
                console.error("Error during login:", error.message);
                alert(error.message);
            }
        } else {
            alert("Please enter both email and password.");
        }
    });
}
