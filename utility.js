// utility.js

export function setupAutocomplete(inputElement, resultsContainer, updateFunction, errorCallback) {
    let debounceTimeout;

    inputElement.addEventListener('input', () => {
        clearTimeout(debounceTimeout);
        debounceTimeout = setTimeout(async () => {
            const query = inputElement.value.trim();
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
                        inputElement.value = item.getAttribute('data-name');
                        resultsContainer.innerHTML = ''; // Clear the dropdown after selection

                        const lat = parseFloat(item.getAttribute('data-lat'));
                        const lon = parseFloat(item.getAttribute('data-lon'));
                        updateFunction(lat, lon);
                    });
                });
            } catch (error) {
                console.error("Error fetching autocomplete suggestions:", error);
                if (errorCallback) {
                    errorCallback("Error fetching suggestions. Please try again.");
                }
            }
        }, 300); // Debounce time of 300ms
    });

    // Hide the dropdown when clicking outside
    document.addEventListener('click', (event) => {
        if (!inputElement.contains(event.target) && !resultsContainer.contains(event.target)) {
            resultsContainer.innerHTML = '';
        }
    });
}
