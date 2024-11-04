import { app, db } from './firebaseConfig.js';
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
import { collection, addDoc } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

const auth = getAuth(app);
const bookingForm = document.getElementById('bookingForm');
const destinationInput = document.getElementById('destination');
const pickupInput = document.getElementById('pickup');
const autocompleteResults = document.getElementById('autocomplete-results');

// Debugging to confirm the script is loaded
console.log("indexScript.js is loaded");

// Function to get the user's current location for pickup
async function getUserLocation() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(async (position) => {
            const latitude = position.coords.latitude;
            const longitude = position.coords.longitude;
            console.log("User's Current Location:", latitude, longitude);

            // Reverse geocode to get a readable address for the pickup location
            await reverseGeocode(latitude, longitude);
        }, (error) => {
            console.error("Error getting location:", error.message);
            alert("Unable to retrieve location. Please check location permissions.");
        });
    } else {
        alert("Geolocation is not supported by this browser.");
    }
}

// Function to convert latitude and longitude to a readable address (for pickup location)
async function reverseGeocode(latitude, longitude) {
    try {
        const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
        const data = await response.json();
        const address = data.display_name;

        // Set the detected address in the pickup field
        pickupInput.value = address;
        console.log("Detected Pickup Address:", address);
    } catch (error) {
        console.error("Error with reverse geocoding:", error);
    }
}

// Call getUserLocation to auto-detect and populate the pickup location
getUserLocation();

// Autocomplete function for destination input using Nominatim API
destinationInput.addEventListener('input', async () => {
    const query = destinationInput.value.trim();
    if (query.length < 3) {
        autocompleteResults.innerHTML = '';  // Clear results if query is too short
        return;
    }

    try {
        const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${query}&addressdetails=1&limit=5`);
        const data = await response.json();

        // Display autocomplete results
        autocompleteResults.innerHTML = data.map(place => `
            <div class="autocomplete-item" data-name="${place.display_name}">
                ${place.display_name}
            </div>
        `).join('');

        // Add click event to each item
        document.querySelectorAll('.autocomplete-item').forEach(item => {
            item.addEventListener('click', () => {
                destinationInput.value = item.getAttribute('data-name');
                autocompleteResults.innerHTML = '';  // Clear results after selection
            });
        });
    } catch (error) {
        console.error("Error fetching autocomplete suggestions:", error);
    }
});

// Handle form submission for booking
bookingForm.addEventListener('submit', async (e) => {
    e.preventDefault();  // Prevent default form submission
    console.log("Booking form submitted");

    // Retrieve form values
    const pickup = pickupInput.value;  // Auto-detected pickup location
    const destination = destinationInput.value;  // User-entered destination
    const passengers = document.getElementById('passengers').value;

    console.log("Pickup:", pickup);
    console.log("Destination:", destination);
    console.log("Passengers:", passengers);

    // Check if user is logged in
    const user = auth.currentUser;
    if (user) {
        try {
            // Add booking to Firestore under the 'bookings' collection
            await addDoc(collection(db, 'bookings'), {
                userId: user.uid,
                email: user.email,
                pickup,       // Store pickup location
                destination,  // Store destination
                passengers,
                timestamp: new Date()
            });

            alert("Booking successful!");
            bookingForm.reset();  // Clear the form after successful submission
        } catch (error) {
            console.error("Error adding booking:", error);
            alert("Failed to book the ride. Please try again.");
        }
    } else {
        alert("Please log in to book a ride.");
    }
});

// Display welcome message and handle user authentication state
onAuthStateChanged(auth, (user) => {
    if (user) {
        // Show welcome message with user's email
        document.getElementById('welcome-message').style.display = 'block';
        document.getElementById('user-name').textContent = user.email;

        // Update navbar to show logout instead of login/signup
        document.getElementById('login-link').style.display = 'none';
        document.getElementById('signup-link').style.display = 'none';
        document.getElementById('logout-link').style.display = 'block';
    } else {
        // No user is logged in, hide the welcome message and show login/signup options
        document.getElementById('welcome-message').style.display = 'none';
        document.getElementById('login-link').style.display = 'block';
        document.getElementById('signup-link').style.display = 'block';
        document.getElementById('logout-link').style.display = 'none';
    }
});

// Logout functionality
document.getElementById('logout-link').addEventListener('click', async (e) => {
    e.preventDefault();
    try {
        await signOut(auth);
        alert("You have successfully logged out.");
        window.location.href = "login.html"; // Redirect to login page after logout
    } catch (error) {
        console.error("Logout error:", error.message);
        alert("Error logging out: " + error.message);
    }
});

// Check if Leaflet.js is loaded
if (typeof L !== 'undefined') {
    // Get the user's current location and display it on the map
    navigator.geolocation.getCurrentPosition((position) => {
        const latitude = position.coords.latitude;
        const longitude = position.coords.longitude;

        // Initialize the map
        const map = L.map('map').setView([latitude, longitude], 13);

        // Add OpenStreetMap tiles
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; OpenStreetMap contributors'
        }).addTo(map);

        // Add a marker at the user's location
        L.marker([latitude, longitude]).addTo(map)
            .bindPopup('You are here')
            .openPopup();
    }, (error) => {
        console.error("Error getting location:", error.message);
        alert("Unable to retrieve location. Please check location permissions.");
    });
} else {
    console.error("Leaflet.js is not loaded");
}
