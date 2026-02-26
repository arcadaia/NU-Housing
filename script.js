// ===== Leaflet marker icon fix for GitHub Pages =====
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png"
});

// Northwestern (Evanston campus) center
const NU = { name: "Northwestern (Evanston)", lat: 42.055984, lng: -87.675171 };

// ===== Map =====
const map = L.map("map", { zoomControl: true }).setView([NU.lat, NU.lng], 14);

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution: "&copy; OpenStreetMap contributors",
  maxZoom: 19
}).addTo(map);

// Campus marker
L.circleMarker([NU.lat, NU.lng], { radius: 6 }).addTo(map);

// ===== Panel elements =====
const panel = document.getElementById("panel");
const panelTitle = document.getElementById("panelTitle");
const panelAddress = document.getElementById("panelAddress");
const panelBody = document.getElementById("panelBody");
const panelClose = document.getElementById("panelClose");

if (!panel || !panelTitle || !panelAddress || !panelBody || !panelClose) {
  alert("Panel elements not found. Check index.html IDs.");
  throw new Error("Missing panel elements");
}

function milesBetween(lat1, lon1, lat2, lon2) {
  const R = 3958.8;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

function openPanel(apt) {
  const dist = milesBetween(NU.lat, NU.lng, apt.lat, apt.lng).toFixed(2);
  const directions = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
    apt.address || `${apt.lat},${apt.lng}`
  )}`;

  panelTitle.textContent = apt.name || "Apartment";
  panelAddress.textContent = apt.address || "";

  panelBody.innerHTML = `
    <div class="card">
      <div class="section-title">Overview</div>
      <div class="kv">
        <div class="k">Distance</div><div class="v">${dist} mi</div>
        <div class="k">1BR</div><div class="v">${apt.one_bed_price || "TBD"}</div>
        <div class="k">AC</div><div class="v">${apt.ac || "TBD"}</div>
        <div class="k">Parking</div><div class="v">${apt.parking || "TBD"}</div>
      </div>

      <div class="links">
        ${apt.website ? `<a href="${apt.website}" target="_blank" rel="noopener">Property site</a>` : ""}
        <a href="${directions}" target="_blank" rel="noopener">Directions</a>
      </div>
    </div>

    <div class="card">
      <div class="section-title">Notes</div>
      <div>${apt.notes || "—"}</div>
    </div>
  `;

  panel.classList.remove("hidden");
  panel.setAttribute("aria-hidden", "false");

  // Let the layout update, then resize Leaflet
  setTimeout(() => {
    map.invalidateSize();
    map.flyTo([apt.lat, apt.lng], 15, { animate: true, duration: 0.5 });
  }, 50);
}

function closePanel() {
  panel.classList.add("hidden");
  panel.setAttribute("aria-hidden", "true");

  setTimeout(() => {
    map.invalidateSize();
  }, 50);
}

panelClose.addEventListener("click", closePanel);
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closePanel();
});

// ===== Load apartments and add markers =====
fetch("./apartments.json")
  .then((res) => {
    if (!res.ok) throw new Error(`apartments.json failed to load (HTTP ${res.status})`);
    return res.json();
  })
  .then((apartments) => {
    if (!Array.isArray(apartments)) throw new Error("apartments.json must be an array");

    const bounds = [[NU.lat, NU.lng]];

    apartments.forEach((apt) => {
      const lat = Number(apt.lat);
      const lng = Number(apt.lng);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

      apt.lat = lat;
      apt.lng = lng;

      const marker = L.marker([lat, lng]).addTo(map);
      bounds.push([lat, lng]);

      marker.on("click", () => openPanel(apt));
    });

    // Fit all points on first load
    map.fitBounds(bounds, { padding: [40, 40] });
  })
  .catch((err) => {
    console.error(err);
    alert("Error loading apartments.json: " + err.message);
  });
