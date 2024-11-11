// indexScript.js

import { app, db } from './firebaseConfig.js';
import { 
  getAuth, 
  onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
import { 
  collection, 
  addDoc, 
  doc, 
  getDoc, 
  query, 
  where, 
  getDocs 
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

const auth = getAuth(app);
const bookingForm = document.getElementById('bookingForm');
const destinationInput = document.getElementById('destination');
const pickupInput = document.getElementById('pickup');
const waypointInput = document.getElementById('waypoint');
const autocompleteResults = document.getElementById('autocomplete-results');
const pickupAutocompleteResults = document.getElementById('pickup-autocomplete-results');
const waypointAutocompleteResults = document.getElementById('waypoint-autocomplete-results');
const toggleWaypointBtn = document.getElementById('toggle-waypoint-btn');
const waypointContainer = document.getElementById('waypoint-container');
const messageContainer = document.getElementById('message-container');

let map, userMarker, destinationMarker, routeLayers = [];

// Custom icons
const pickupIcon = L.icon({
    iconUrl: 'icons/pickup-icon.png',
    iconSize: [30, 40],
    iconAnchor: [15, 40]
});

const destinationIcon = L.icon({
    iconUrl: 'icons/destination-icon.png',
    iconSize: [30, 40],
    iconAnchor: [15, 40]
});

// Initialize the map and set the current location with a custom pickup icon
function initMap(latitude, longitude) {
    map = L.map('map').setView([latitude, longitude], 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);
    userMarker = L.marker([latitude, longitude], { icon: pickupIcon }).addTo(map)
        .bindPopup('Your Current Location')
        .openPopup();
}

// Function to update the pickup marker on the map
function updatePickupMarker(lat, lon) {
    if (userMarker) {
        userMarker.setLatLng([lat, lon]).bindPopup("Your Updated Location").openPopup();
    } else {
        userMarker = L.marker([lat, lon], { icon: pickupIcon }).addTo(map).bindPopup("Your Updated Location").openPopup();
    }
    map.setView([lat, lon], 13);
    if (destinationMarker) {
        displayMultipleRoutes(userMarker.getLatLng().lat, userMarker.getLatLng().lng, destinationMarker.getLatLng().lat, destinationMarker.getLatLng().lng);
    }
}

// Function to get the user's current location and initialize the map
async function getUserLocation() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(async (position) => {
            const latitude = position.coords.latitude;
            const longitude = position.coords.longitude;
            initMap(latitude, longitude);
            await reverseGeocode(latitude, longitude);
        }, (error) => {
            console.error("Error getting location:", error.message);
            showMessage("Unable to retrieve location. Please check location permissions.", "error");
        });
    } else {
        showMessage("Geolocation is not supported by this browser.", "error");
    }
}

// Function to convert latitude and longitude to a readable address (for pickup location)
async function reverseGeocode(latitude, longitude) {
    try {
        const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
        const data = await response.json();
        pickupInput.value = data.display_name;
    } catch (error) {
        console.error("Error with reverse geocoding:", error);
    }
}

// Call getUserLocation to auto-detect and populate the pickup location
getUserLocation();

// Event listener for waypoint toggle button
toggleWaypointBtn.addEventListener('click', () => {
    waypointContainer.style.display = waypointContainer.style.display === 'none' ? 'block' : 'none';
});

// Function to request and display the best routes from OSRM with waypoints
async function displayMultipleRoutes(startLat, startLng, endLat, endLng) {
    const waypoint = waypointInput.value.trim();
    const waypoints = waypoint ? await geocodeAddress(waypoint) : [];
    const routeCoordinates = waypoint && waypoints
        ? `${startLng},${startLat};${waypoints[1]},${waypoints[0]};${endLng},${endLat}`
        : `${startLng},${startLat};${endLng},${endLat}`;

    try {
        const response = await fetch(`https://router.project-osrm.org/route/v1/driving/${routeCoordinates}?overview=full&geometries=geojson&alternatives=true`);
        const data = await response.json();

        routeLayers.forEach(layer => map.removeLayer(layer));
        routeLayers = [];

        if (data.routes && data.routes.length > 0) {
            data.routes.forEach((route, index) => {
                const routeCoords = route.geometry.coordinates.map(coord => [coord[1], coord[0]]);
                const routeLayer = L.polyline(routeCoords, { color: index === 0 ? 'blue' : 'gray', weight: index === 0 ? 5 : 3 }).addTo(map);
                routeLayers.push(routeLayer);

                // Bind popup with distance and duration
                routeLayer.bindPopup(`
                    <b>Route ${index + 1}</b><br>
                    <b>Distance:</b> ${(route.distance / 1000).toFixed(2)} km<br>
                    <b>Time:</b> ${Math.ceil(route.duration / 60)} mins
                `);

                if (index === 0) routeLayer.openPopup();
            });
            map.fitBounds(routeLayers[0].getBounds());
        } else {
            showMessage("No route found.", "error");
        }
    } catch (error) {
        console.error("Error fetching route:", error);
        showMessage("Error fetching route. Please try again.", "error");
    }
}

// Helper function to convert an address to coordinates using geocoding
async function geocodeAddress(address) {
    try {
        const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&addressdetails=1&limit=1`);
        const data = await response.json();
        if (data.length > 0) {
            return [parseFloat(data[0].lat), parseFloat(data[0].lon)];
        }
    } catch (error) {
        console.error("Error in geocoding address:", error);
    }
    return null;
}

// Function to handle autocomplete suggestions for input fields
async function setupAutocomplete(input, resultsContainer, updateFunction) {
    let debounceTimeout;

    input.addEventListener('input', () => {
        clearTimeout(debounceTimeout);
        debounceTimeout = setTimeout(async () => {
            const query = input.value.trim();
            if (query.length < 3) {
                resultsContainer.innerHTML = '';
                return;
            }

            try {
                const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&addressdetails=1&limit=5`);
                const data = await response.json();

                if (data.length === 0) {
                    resultsContainer.innerHTML = '<div class="autocomplete-item">No locations found.</div>';
                    return;
                }

                resultsContainer.innerHTML = data.map(place => `
                    <div class="autocomplete-item" data-name="${place.display_name}" data-lat="${place.lat}" data-lon="${place.lon}">
                        ${place.display_name}
                    </div>
                `).join('');

                document.querySelectorAll('.autocomplete-item').forEach(item => {
                    item.addEventListener('click', () => {
                        input.value = item.getAttribute('data-name');
                        resultsContainer.innerHTML = ''; // Clear the dropdown after selection

                        const lat = parseFloat(item.getAttribute('data-lat'));
                        const lon = parseFloat(item.getAttribute('data-lon'));
                        updateFunction(lat, lon);
                    });
                });
            } catch (error) {
                console.error("Error fetching autocomplete suggestions:", error);
                showMessage("Error fetching suggestions. Please try again.", "error");
            }
        }, 300); // Debounce time of 300ms
    });

    // Handle "Enter" keypress
    input.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
            event.preventDefault(); // Prevent form submission

            const query = input.value.trim();
            if (query.length < 3) {
                showMessage("Please enter at least 3 characters for the location.", "error");
                return;
            }

            // Perform geocoding for the entered query
            geocodeAndUpdate(query, updateFunction, resultsContainer);
        }
    });

    // Hide the dropdown when clicking outside of the input or dropdown
    document.addEventListener('click', (event) => {
        if (!input.contains(event.target) && !resultsContainer.contains(event.target)) {
            resultsContainer.innerHTML = '';
        }
    });
}

// Function to geocode entered query and update the map
async function geocodeAndUpdate(query, updateFunction, resultsContainer) {
    try {
        showMessage("Searching for location...", "success"); // Inform user of ongoing search
        const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&addressdetails=1&limit=1`);
        const data = await response.json();

        if (data.length === 0) {
            showMessage("No locations found for the entered query.", "error");
            return;
        }

        const place = data[0];
        const lat = parseFloat(place.lat);
        const lon = parseFloat(place.lon);

        // Update the input field with the formatted name
        updateFunction(lat, lon);
        showMessage("Location updated successfully.", "success");
    } catch (error) {
        console.error("Error during geocoding:", error);
        showMessage("An error occurred while fetching the location.", "error");
    } finally {
        resultsContainer.innerHTML = ''; // Clear the dropdown
    }
}

// Initialize autocomplete for pickup, destination, and waypoint inputs
setupAutocomplete(pickupInput, pickupAutocompleteResults, updatePickupMarker);
setupAutocomplete(destinationInput, autocompleteResults, updateDestinationMarker);
setupAutocomplete(waypointInput, waypointAutocompleteResults, (lat, lon) => {
    if (userMarker && destinationMarker) {
        displayMultipleRoutes(userMarker.getLatLng().lat, userMarker.getLatLng().lng, destinationMarker.getLatLng().lat, destinationMarker.getLatLng().lng);
    }
});

// Function to update the destination marker on the map
async function updateDestinationMarker(lat, lon) {
    if (destinationMarker) {
        destinationMarker.setLatLng([lat, lon]).bindPopup("Destination").openPopup();
    } else {
        destinationMarker = L.marker([lat, lon], { icon: destinationIcon }).addTo(map)
            .bindPopup("Destination")
            .openPopup();
    }
    displayMultipleRoutes(userMarker.getLatLng().lat, userMarker.getLatLng().lng, lat, lon);
}

// Booking form submission handler
bookingForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const pickup = pickupInput.value.trim();
    const destination = destinationInput.value.trim();
    const waypoint = waypointInput.value.trim(); // Added waypoint
    const passengers = document.getElementById('passengers').value;

    const user = auth.currentUser;
    if (user) {
        try {
            const currentTimestamp = new Date();
            await addDoc(collection(db, 'bookings'), {
                userId: user.uid,
                email: user.email,
                pickup,
                destination,
                waypoint, // Save waypoint in Firestore
                passengers,
                timestamp: currentTimestamp
            });
            showMessage("Booking successful!", "success");
            bookingForm.reset();
            // Optionally, reset map markers
            if (userMarker && destinationMarker) {
                displayMultipleRoutes(userMarker.getLatLng().lat, userMarker.getLatLng().lng, destinationMarker.getLatLng().lat, destinationMarker.getLatLng().lng);
            }
        } catch (error) {
            console.error("Error adding booking:", error);
            showMessage("Failed to book the ride. Please try again.", "error");
        }
    } else {
        showMessage("Please log in to book a ride.", "error");
    }
});

// Function to fetch the user's name from Firestore
async function fetchUserName(uid) {
    try {
        const userDoc = await getDoc(doc(db, "users", uid));
        if (userDoc.exists()) {
            console.log("User name fetched:", userDoc.data().name); // Debug line
            return userDoc.data().name;
        } else {
            console.error("No such user document!");
            return null;
        }
    } catch (error) {
        console.error("Error fetching user document:", error);
        return null;
    }
}

// User authentication state management
onAuthStateChanged(auth, async (user) => {
    if (user) {
        console.log("User is authenticated:", user.uid); // Debug line
        const userName = await fetchUserName(user.uid); 
        if (userName) {
            document.getElementById('welcome-message').style.display = 'block';
            document.getElementById('user-name').textContent = userName;
        } else {
            document.getElementById('user-name').textContent = user.email.split('@')[0];
        }
        document.getElementById('login-link').style.display = 'none';
        document.getElementById('signup-link').style.display = 'none';
        document.getElementById('logout-link').style.display = 'block';
    } else {
        console.log("No authenticated user detected."); // Debug line
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
        showMessage("You have successfully logged out.", "success");
        window.location.href = "login.html";
    } catch (error) {
        console.error("Logout error:", error.message);
        showMessage("Error logging out: " + error.message, "error");
    }
});

// Function to display messages to the user
function showMessage(message, type) {
    if (messageContainer) {
        messageContainer.textContent = message;
        messageContainer.className = type; // 'success' or 'error'
    } else {
        // Fallback to alert if message container is not found
        if (type === 'error') {
            alert("Error: " + message);
        } else {
            alert(message);
        }
    }
}
