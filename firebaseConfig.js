import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";


const firebaseConfig = {
  apiKey: "AIzaSyD3NIPennDkJfK4MZap9pC_0R64_ED69CY",
  authDomain: "ontheway-7a170.firebaseapp.com",
  projectId: "ontheway-7a170",
  storageBucket: "ontheway-7a170.appspot.com",
  messagingSenderId: "2572780749",
  appId: "1:2572780749:web:e75ee0e14a26d137621584",
  measurementId: "G-WTPBRM9KG1"
};

// Initialize Firebase App and Firestore
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
console.log("Firebase initialized:", app);  // Add this line to confirm Firebase initialization

// Export app and db so they can be imported in other files
export { app, db };
