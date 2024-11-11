// riderDashboardScript.js

import { app, db } from './firebaseConfig.js';
import { 
    getAuth, 
    onAuthStateChanged, 
    signOut 
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
import { 
    doc, 
    getDoc 
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

const auth = getAuth(app);

// Elements
const riderNameElement = document.getElementById('rider-name');
const currentLocationInput = document.getElementById('current-location');
const destinationLocationInput = document.getElementById('destination-location');
const waypointInput = document.getElementById('waypoint-location');
const startTripBtn = document.getElementById('start-trip-btn');
const toggleWaypointBtn = document.getElementById('toggle-waypoint-btn');
const waypointContainer = document.getElementById('waypoint-container');
const notificationsList = document.getElementById('notifications-list');
const logoutBtn = document.getElementById('logout-link');

let map, userMarker, destinationMarker, routeLayers = [];
let carMarker; // For real-time tracking

// Icons for map markers
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

const waypointIcon = L.icon({
    iconUrl: 'icons/waypoint-icon.png', // Ensure this file exists
    iconSize: [30, 40],
    iconAnchor: [15, 40]
});

const carIcon = L.icon({
    iconUrl: 'icons/car-icon.png',
    iconSize: [40, 40],
    iconAnchor: [20, 20]
});

// Authentication state management
onAuthStateChanged(auth, async (user) => {
    if (user) {
        const userName = user.displayName || await fetchUserName(user.uid);
        riderNameElement.textContent = userName;
        document.getElementById('welcome-message').style.display = 'block';
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

// Fetch user's name from Firestore
async function fetchUserName(uid) {
    try {
        const userDoc = await getDoc(doc(db, "users", uid));
        if (userDoc.exists()) {
            return userDoc.data().name;
        }
    } catch (error) {
        console.error("Error fetching user name:", error);
    }
    return "Rider";
}

// Logout functionality
logoutBtn.addEventListener('click', async (e) => {
    e.preventDefault();
    try {
        await signOut(auth);
        window.location.href = 'login.html';
    } catch (error) {
        console.error("Logout failed:", error);
    }
});

// Initialize map and set current location
function initMap(latitude, longitude) {
    map = L.map('map').setView([latitude, longitude], 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    userMarker = L.marker([latitude, longitude], { icon: pickupIcon }).addTo(map)
        .bindPopup('Your Current Location')
        .openPopup();

    // Perform reverse geocoding to get a readable address
    reverseGeocode(latitude, longitude)
        .then(address => {
            if (address) {
                currentLocationInput.value = address;
                // Optionally, trigger route update if destination is already set
                if (destinationLocationInput.value.trim()) {
                    updateRoute();
                }
            } else {
                currentLocationInput.value = `${latitude}, ${longitude}`;
            }
        })
        .catch(error => {
            console.error("Reverse Geocoding Error:", error);
            currentLocationInput.value = `${latitude}, ${longitude}`;
        });
}

// Function to reverse geocode coordinates to a readable address
async function reverseGeocode(latitude, longitude) {
    try {
        const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
        const data = await response.json();
        if (data && data.display_name) {
            return data.display_name;
        }
    } catch (error) {
        console.error("Error with reverse geocoding:", error);
    }
    return null;
}

// Get user's current location and initialize map
navigator.geolocation.getCurrentPosition(position => {
    const latitude = position.coords.latitude;
    const longitude = position.coords.longitude;
    initMap(latitude, longitude);
}, error => {
    console.error("Error getting location:", error);
    alert("Unable to retrieve your location.");
});

// Toggle waypoint input visibility
toggleWaypointBtn.addEventListener('click', () => {
    waypointContainer.style.display = waypointContainer.style.display === 'none' ? 'block' : 'none';
});

// -----------------------------------
// 2. Handling Enter Keypresses
// -----------------------------------

// Function to handle Enter keypress on Current Location and Waypoint inputs
function handleGeocodeAndPlot(event, inputElement, markerType) {
    if (event.key === 'Enter') {
        event.preventDefault(); // Prevent default behavior like form submission
        const location = inputElement.value.trim();
        if (!location) {
            alert("Please enter a location.");
            return;
        }
        geocodeAddress(location).then(coords => {
            if (coords) {
                plotLocationOnMap(coords, markerType);
                updateRoute(); // Call updateRoute to draw the route
            } else {
                alert("Location not found. Please try another place.");
            }
        }).catch(error => {
            console.error("Geocoding error:", error);
            alert("An error occurred while geocoding the location.");
        });
    }
}

// Function to handle Enter keypress on Destination Location input
function handleDestinationEnter(event) {
    if (event.key === 'Enter') {
        event.preventDefault(); // Prevent default behavior like form submission
        const destination = destinationLocationInput.value.trim();
        if (!destination) {
            alert("Please enter a destination.");
            return;
        }
        geocodeAddress(destination).then(coords => {
            if (coords) {
                plotLocationOnMap(coords, 'destination');
                updateRoute(); // Call updateRoute to draw the route
            } else {
                alert("Destination not found. Please try another place.");
            }
        }).catch(error => {
            console.error("Geocoding error:", error);
            alert("An error occurred while geocoding the destination.");
        });
    }
}

// Attach Enter key listener to Current Location input
if (currentLocationInput) {
    currentLocationInput.addEventListener('keydown', (e) => {
        handleGeocodeAndPlot(e, currentLocationInput, 'current');
    });
}

// Attach Enter key listener to Waypoint input
if (waypointInput) {
    waypointInput.addEventListener('keydown', (e) => {
        handleGeocodeAndPlot(e, waypointInput, 'waypoint');
    });
}

// Attach Enter key listener to Destination Location input
if (destinationLocationInput) {
    destinationLocationInput.addEventListener('keydown', handleDestinationEnter);
}

// -----------------------------------
// 3. Geocoding and Plotting Functions
// -----------------------------------

// Geocode address to coordinates
async function geocodeAddress(address) {
    try {
        const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`);
        const data = await response.json();
        if (data.length > 0) {
            return {
                lat: parseFloat(data[0].lat),
                lon: parseFloat(data[0].lon)
            };
        }
    } catch (error) {
        console.error("Error in geocoding:", error);
    }
    return null;
}

// Plot location on map based on marker type
function plotLocationOnMap(coords, markerType) {
    // Remove existing marker of the same type if exists
    if (markerType === 'current') {
        if (userMarker) {
            map.removeLayer(userMarker);
        }
        userMarker = L.marker([coords.lat, coords.lon], { icon: pickupIcon }).addTo(map)
            .bindPopup('Your Current Location')
            .openPopup();
    } else if (markerType === 'destination') {
        if (destinationMarker) {
            map.removeLayer(destinationMarker);
        }
        destinationMarker = L.marker([coords.lat, coords.lon], { icon: destinationIcon }).addTo(map)
            .bindPopup('Your Destination')
            .openPopup();
    } else if (markerType === 'waypoint') {
        // Handle waypoint marker
        // Assuming multiple waypoints are allowed, append new markers
        const waypointMarker = L.marker([coords.lat, coords.lon], { icon: waypointIcon }).addTo(map)
            .bindPopup('Waypoint')
            .openPopup();
        // Optionally, add to markers array if you need to manage waypoints
    }

    // Optionally, center the map to the new marker
    map.setView([coords.lat, coords.lon], 13);
}

// -----------------------------------
// 4. Route and Tracking Functions
// -----------------------------------

// Start trip: Focuses map on current position with slight zoom and starts real-time tracking
startTripBtn.addEventListener('click', () => {
    if (userMarker) {
        map.setView(userMarker.getLatLng(), 14, { animate: true });
        startRealTimeTracking();
    } else {
        alert("Current location not set.");
    }
});

// Update route with current inputs
async function updateRoute() {
    const currentLocation = currentLocationInput.value.trim();
    const destinationLocation = destinationLocationInput.value.trim();
    const waypointLocation = waypointInput.value.trim();

    if (!currentLocation || !destinationLocation) {
        alert("Please enter both current location and destination.");
        return;
    }

    const startCoords = await geocodeAddress(currentLocation);
    const endCoords = await geocodeAddress(destinationLocation);
    const waypointCoords = waypointLocation ? await geocodeAddress(waypointLocation) : null;

    console.log("Start Coordinates:", startCoords);
    console.log("End Coordinates:", endCoords);
    console.log("Waypoint Coordinates:", waypointCoords);

    if (startCoords && endCoords) {
        drawRoute(startCoords, endCoords, waypointCoords);
    } else {
        alert("Unable to find coordinates for the provided addresses.");
    }
}

// Draw route on map
function drawRoute(startCoords, endCoords, waypointCoords) {
    // Clear existing route layers
    routeLayers.forEach(layer => map.removeLayer(layer));
    routeLayers = [];

    // Collect waypoints
    const waypoints = [startCoords];
    if (waypointCoords) waypoints.push(waypointCoords);
    waypoints.push(endCoords);

    // Construct the coordinate string for OSRM (lon,lat)
    const coordsString = waypoints.map(coords => `${coords.lon},${coords.lat}`).join(';');

    console.log("OSRM Request URL:", `https://router.project-osrm.org/route/v1/driving/${coordsString}?overview=full&geometries=geojson&alternatives=false`);

    // Fetch route from OSRM
    fetch(`https://router.project-osrm.org/route/v1/driving/${coordsString}?overview=full&geometries=geojson&alternatives=false`)
        .then(response => response.json())
        .then(data => {
            console.log("OSRM Response Data:", data); // Debugging

            if (data.routes && data.routes.length > 0) {
                const route = data.routes[0];
                const routeCoords = route.geometry.coordinates.map(coord => [coord[1], coord[0]]); // [lat, lon]

                // Draw the route on the map
                const routeLayer = L.polyline(routeCoords, { color: 'blue', weight: 5 }).addTo(map);
                routeLayers.push(routeLayer);

                // Bind popup with distance and duration
                routeLayer.bindPopup(`
                    <b>Route Details</b><br>
                    <b>Distance:</b> ${(route.distance / 1000).toFixed(2)} km<br>
                    <b>Estimated Time:</b> ${Math.ceil(route.duration / 60)} mins
                `).openPopup();

                // Fit the map to the route
                map.fitBounds(routeLayer.getBounds());
            } else {
                alert("No route found between the selected locations.");
            }
        })
        .catch(error => {
            console.error("Error fetching route from OSRM:", error);
            alert("An error occurred while fetching the route.");
        });
}

// Real-time location tracking for the moving vehicle
function startRealTimeTracking() {
    if (carMarker) map.removeLayer(carMarker); // Remove existing car marker if present
    carMarker = L.marker(userMarker.getLatLng(), { icon: carIcon }).addTo(map);

    if (navigator.geolocation) {
        navigator.geolocation.watchPosition(position => {
            const latitude = position.coords.latitude;
            const longitude = position.coords.longitude;

            if (carMarker) {
                carMarker.setLatLng([latitude, longitude]);
                map.setView([latitude, longitude], 14, { animate: true });
            }

            // Update rider's location in Firestore
            updateRiderLocation(latitude, longitude);
        }, error => {
            console.error("Error tracking location:", error);
        }, { enableHighAccuracy: true });
    } else {
        alert("Geolocation is not supported by your browser.");
    }
}

// Update rider's location in Firestore
async function updateRiderLocation(lat, lon) {
    const riderId = auth.currentUser.uid;
    const riderLocationRef = doc(db, 'riderLocations', riderId);
    const locationData = {
        latitude: lat,
        longitude: lon,
        lastUpdated: new Date()
    };

    try {
        await updateDoc(riderLocationRef, locationData);
    } catch (error) {
        // If document does not exist, create it
        try {
            await setDoc(riderLocationRef, locationData);
        } catch (setError) {
            console.error("Error setting rider location:", setError);
        }
    }
}

// Setup autocomplete functionality for location fields
function setupAutocomplete(inputElement, resultsContainer, updateFunction) {
    inputElement.addEventListener('input', async () => {
        const query = inputElement.value.trim();
        if (query.length < 3) {
            resultsContainer.innerHTML = '';
            return;
        }

        try {
            const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&addressdetails=1&limit=5`);
            const data = await response.json();

            resultsContainer.innerHTML = data.map(place => `
                <div class="autocomplete-item" data-name="${place.display_name}" data-lat="${place.lat}" data-lon="${place.lon}">
                    ${place.display_name}
                </div>
            `).join('');

            document.querySelectorAll('.autocomplete-item').forEach(item => {
                item.addEventListener('click', () => {
                    inputElement.value = item.getAttribute('data-name');
                    resultsContainer.innerHTML = '';
                    updateFunction({ lat: parseFloat(item.getAttribute('data-lat')), lon: parseFloat(item.getAttribute('data-lon')) }); // Pass coordinates
                    updateRoute(); // Ensure route is updated after selection
                });
            });
        } catch (error) {
            console.error("Error fetching autocomplete suggestions:", error);
        }
    });

    document.addEventListener('click', event => {
        if (!inputElement.contains(event.target) && !resultsContainer.contains(event.target)) {
            resultsContainer.innerHTML = '';
        }
    });
}

// Initialize autocomplete for current location, destination, and waypoint inputs
setupAutocomplete(currentLocationInput, document.getElementById('current-location-autocomplete'), plotLocationOnMap);
setupAutocomplete(destinationLocationInput, document.getElementById('destination-location-autocomplete'), plotLocationOnMap);
setupAutocomplete(waypointInput, document.getElementById('waypoint-autocomplete'), plotLocationOnMap);

// Listen for notifications
function listenForNotifications() {
    const notificationsQuery = query(collection(db, 'notifications'), where('riderId', '==', auth.currentUser.uid));
    onSnapshot(notificationsQuery, snapshot => {
        notificationsList.innerHTML = '';
        if (snapshot.empty) {
            notificationsList.innerHTML = '<li>No new notifications.</li>';
            return;
        }
        snapshot.forEach(doc => {
            const notification = doc.data();
            const li = document.createElement('li');
            li.textContent = notification.message;
            notificationsList.appendChild(li);
        });
    });
}

// Call listenForNotifications if user is authenticated
onAuthStateChanged(auth, (user) => {
    if (user) {
        listenForNotifications();
    }
});
