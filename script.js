// Northwestern (Evanston campus) center point
const NU = { name: "Northwestern (Evanston)", lat: 42.055984, lng: -87.675171 };

// Create map
const map = L.map("map").setView([NU.lat, NU.lng], 14);

// Base tiles (free)
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution: "&copy; OpenStreetMap contributors"
}).addTo(map);

// Campus marker
L.circleMarker([NU.lat, NU.lng], {
  radius: 8
}).addTo(map).bindPopup(`<div class="popup-title">${NU.name}</div>`);

// Helper: Haversine distance (miles)
function milesBetween(lat1, lon1, lat2, lon2) {
  const R = 3958.8; // Earth radius in miles
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

function popupHTML(apt) {
  const dist = milesBetween(NU.lat, NU.lng, apt.lat, apt.lng).toFixed(2);

  // Google Maps directions link (works anywhere)
  const gmaps = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(apt.address)}`;

  return `
    <div class="popup-title">${apt.name}</div>
    <div class="popup-row popup-muted">${apt.address}</div>
    <div class="popup-row"><b>Distance to campus:</b> ${dist} mi</div>
    <div class="popup-row"><b>1BR:</b> ${apt.one_bed_price ?? "TBD"}</div>
    <div class="popup-row"><b>AC:</b> ${apt.ac ?? "TBD"}</div>
    <div class="popup-row"><b>Parking:</b> ${apt.parking ?? "TBD"}</div>
    <div class="popup-row"><b>Notes:</b> ${apt.notes ?? ""}</div>
    <div class="popup-row"><a href="${gmaps}" target="_blank" rel="noopener">Open directions</a></div>
  `;
}

// Load apartments data + add markers
fetch("./apartments.json")
  .then((res) => {
    if (!res.ok) throw new Error("Could not load apartments.json");
    return res.json();
  })
  .then((apartments) => {
    const bounds = [];

    apartments.forEach((apt) => {
      const marker = L.marker([apt.lat, apt.lng]).addTo(map);
      marker.bindPopup(popupHTML(apt), { maxWidth: 280 });
      bounds.push([apt.lat, apt.lng]);
    });

    // Zoom to fit all points (campus + apartments)
    bounds.push([NU.lat, NU.lng]);
    map.fitBounds(bounds, { padding: [40, 40] });
  })
  .catch((err) => {
    console.error(err);
    alert("Error loading apartments.json. Make sure it exists in the repo root.");
  });
