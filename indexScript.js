import { app, db } from './firebaseConfig.js';
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
import { collection, addDoc } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

const auth = getAuth(app);
const bookingForm = document.getElementById('bookingForm');
const destinationInput = document.getElementById('destination');
const pickupInput = document.getElementById('pickup');
const autocompleteResults = document.getElementById('autocomplete-results');
const pickupAutocompleteResults = document.getElementById('pickup-autocomplete-results');

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

    // Add OpenStreetMap tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    // Add a marker for the user's current location (pickup) with a custom icon
    userMarker = L.marker([latitude, longitude], { icon: pickupIcon }).addTo(map)
        .bindPopup('Your Current Location')
        .openPopup();
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
        pickupInput.value = data.display_name;
    } catch (error) {
        console.error("Error with reverse geocoding:", error);
    }
}

// Call getUserLocation to auto-detect and populate the pickup location
getUserLocation();

// Function to request and display the best routes from OSRM
async function displayMultipleRoutes(startLat, startLng, endLat, endLng) {
    try {
        const response = await fetch(`https://router.project-osrm.org/route/v1/driving/${startLng},${startLat};${endLng},${endLat}?overview=full&geometries=geojson&alternatives=3`);
        const data = await response.json();

        routeLayers.forEach(layer => map.removeLayer(layer));
        routeLayers = [];

        if (data.routes && data.routes.length > 0) {
            data.routes.forEach((route, index) => {
                const routeCoordinates = route.geometry.coordinates.map(coord => [coord[1], coord[0]]);
                const isShortest = index === 0;

                const routeColor = isShortest ? 'green' : 'blue';
                const routeLayer = L.polyline(routeCoordinates, { color: routeColor, weight: isShortest ? 5 : 3 }).addTo(map);
                routeLayers.push(routeLayer);

                const distanceKm = (route.distance / 1000).toFixed(2);
                const durationMinutes = Math.ceil(route.duration / 60);

                routeLayer.bindPopup(`
                    <b>${isShortest ? 'Shortest Route' : `Alternative Route ${index + 1}`}</b><br>
                    <b>Distance:</b> ${distanceKm} km<br>
                    <b>Estimated Time:</b> ${durationMinutes} min
                `).openPopup();
            });

            const bounds = L.latLngBounds(routeLayers.flatMap(layer => layer.getLatLngs()));
            map.fitBounds(bounds);
        } else {
            console.warn("No route found between the specified points.");
        }
    } catch (error) {
        console.error("Error fetching route:", error);
    }
}

// Function to update the destination marker with a custom destination icon
async function updateDestinationMarker(address) {
    try {
        const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${address}&addressdetails=1&limit=1`);
        const data = await response.json();

        if (data.length > 0) {
            const { lat, lon } = data[0];

            if (destinationMarker) {
                destinationMarker.setLatLng([lat, lon]).bindPopup("Destination").openPopup();
            } else {
                destinationMarker = L.marker([lat, lon], { icon: destinationIcon }).addTo(map).bindPopup("Destination").openPopup();
            }

            displayMultipleRoutes(userMarker.getLatLng().lat, userMarker.getLatLng().lng, lat, lon);
        } else {
            console.warn("No results found for the specified destination.");
        }
    } catch (error) {
        console.error("Error fetching destination coordinates:", error);
    }
}

// Event listener for destination input with autocomplete
destinationInput.addEventListener('input', async () => {
    const query = destinationInput.value.trim();
    if (query.length < 3) {
        autocompleteResults.innerHTML = '';
        return;
    }

    try {
        const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${query}&addressdetails=1&limit=5`);
        const data = await response.json();

        autocompleteResults.innerHTML = data.map(place => `
            <div class="autocomplete-item" data-name="${place.display_name}" data-lat="${place.lat}" data-lon="${place.lon}">
                ${place.display_name}
            </div>
        `).join('');

        document.querySelectorAll('.autocomplete-item').forEach(item => {
            item.addEventListener('click', () => {
                destinationInput.value = item.getAttribute('data-name');
                autocompleteResults.innerHTML = '';

                const lat = parseFloat(item.getAttribute('data-lat'));
                const lon = parseFloat(item.getAttribute('data-lon'));
                updateDestinationMarker(destinationInput.value);
            });
        });
    } catch (error) {
        console.error("Error fetching autocomplete suggestions:", error);
    }
});

// Event listener for changes in the "Your Current Location" field with autocomplete
pickupInput.addEventListener('input', async () => {
    const query = pickupInput.value.trim();
    if (query.length < 3) {
        pickupAutocompleteResults.innerHTML = '';  // Clear results if query is too short
        return;
    }

    try {
        const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${query}&addressdetails=1&limit=5`);
        const data = await response.json();

        pickupAutocompleteResults.innerHTML = data.map(place => `
            <div class="autocomplete-item" data-name="${place.display_name}" data-lat="${place.lat}" data-lon="${place.lon}">
                ${place.display_name}
            </div>
        `).join('');

        document.querySelectorAll('#pickup-autocomplete-results .autocomplete-item').forEach(item => {
            item.addEventListener('click', () => {
                pickupInput.value = item.getAttribute('data-name');
                pickupAutocompleteResults.innerHTML = '';  // Clear results after selection

                const lat = parseFloat(item.getAttribute('data-lat'));
                const lon = parseFloat(item.getAttribute('data-lon'));
                updatePickupMarker(lat, lon);
            });
        });
    } catch (error) {
        console.error("Error fetching autocomplete suggestions for pickup:", error);
    }
});

// Function to update the pickup marker on the map when a new location is selected
function updatePickupMarker(lat, lon) {
    if (userMarker) {
        userMarker.setLatLng([lat, lon]).bindPopup("Your New Location").openPopup();
    } else {
        userMarker = L.marker([lat, lon], { icon: pickupIcon }).addTo(map).bindPopup("Your New Location").openPopup();
    }
    map.setView([lat, lon], 13);  // Center the map on the new location

    if (destinationMarker) {
        displayMultipleRoutes(lat, lon, destinationMarker.getLatLng().lat, destinationMarker.getLatLng().lng);
    }
}

// Booking form submission handler
bookingForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const pickup = pickupInput.value;
    const destination = destinationInput.value;
    const passengers = document.getElementById('passengers').value;

    const user = auth.currentUser;
    if (user) {
        try {
            await addDoc(collection(db, 'bookings'), {
                userId: user.uid,
                email: user.email,
                pickup,
                destination,
                passengers,
                timestamp: new Date()
            });
            alert("Booking successful!");
            bookingForm.reset();
        } catch (error) {
            console.error("Error adding booking:", error);
            alert("Failed to book the ride. Please try again.");
        }
    } else {
        alert("Please log in to book a ride.");
    }
});

// User authentication state management
onAuthStateChanged(auth, (user) => {
    if (user) {
        document.getElementById('welcome-message').style.display = 'block';
        document.getElementById('user-name').textContent = user.email;
        document.getElementById('login-link').style.display = 'none';
        document.getElementById('signup-link').style.display = 'none';
        document.getElementById('logout-link').style.display = 'block';
    } else {
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
        window.location.href = "login.html";
    } catch (error) {
        console.error("Logout error:", error.message);
        alert("Error logging out: " + error.message);
    }
});
