import { app, db } from './firebaseConfig.js';
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
import { collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

const auth = getAuth(app);
const ridesList = document.getElementById('rides-list');

// Check if user is logged in
onAuthStateChanged(auth, async (user) => {
    if (user) {
        const q = query(collection(db, 'bookings'), where('userId', '==', user.uid));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            ridesList.innerHTML = '<p>No bookings found.</p>';
        } else {
            querySnapshot.forEach((doc) => {
                const booking = doc.data();
                ridesList.innerHTML += `
                    <div class="ride">
                        <h3>Pickup: ${booking.pickup}</h3>
                        <p>Destination: ${booking.destination}</p>
                        <p>Date: ${booking.date}</p>
                        <p>Time: ${booking.time}</p>
                        <p>Passengers: ${booking.passengers}</p>
                    </div>
                `;
            });
        }
    } else {
        alert("Please log in to view your rides.");
        window.location.href = "login.html";
    }
});

// Logout functionality
document.getElementById('logout-link').addEventListener('click', async () => {
    try {
        await signOut(auth);
        window.location.href = "login.html";
    } catch (error) {
        console.error("Logout error:", error);
    }
});
