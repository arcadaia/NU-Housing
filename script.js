const NU = { lat: 42.055984, lng: -87.675171 };

// ===== Map =====
const map = L.map("map").setView([NU.lat, NU.lng], 14);

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

// Only check for required elements
if (!panel || !panelTitle || !panelAddress || !panelBody || !panelClose) {
  alert("Panel HTML elements not found. Check index.html IDs.");
  throw new Error("Missing panel elements in DOM");
}

function milesBetween(lat1, lon1, lat2, lon2) {
  const R = 3958.8;
  const toRad = (d) => d * Math.PI / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

function openPanel(apt) {
  const dist = milesBetween(NU.lat, NU.lng, apt.lat, apt.lng).toFixed(2);

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
    </div>

    <div class="card">
      <div class="section-title">Notes</div>
      <div>${apt.notes || "—"}</div>
    </div>
  `;

  panel.classList.remove("hidden");

  // IMPORTANT: tell Leaflet to resize after layout change
  setTimeout(() => {
    map.invalidateSize();
    map.setView([apt.lat, apt.lng], 15);
  }, 300);
}

function closePanel() {
  panel.classList.add("hidden");

  setTimeout(() => {
    map.invalidateSize();
  }, 300);
}

// Close handlers
panelClose.addEventListener("click", closePanel);
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closePanel();
});

// Zoom to marker when clicked (and keep it visible with panel open)
function focusMarker(lat, lng) {
  map.setView([lat, lng], 16, { animate: true });

  // shift left so marker isn't hidden behind right-side panel
  setTimeout(() => {
    if (!panel.classList.contains("hidden")) {
      map.panBy([-220, 0], { animate: true });
    }
  }, 250);
}

// ===== Load apartments and add markers =====
fetch("./apartments.json")
  .then((res) => {
    if (!res.ok) throw new Error(`apartments.json failed to load (HTTP ${res.status})`);
    return res.json();
  })
  .then((apartments) => {
    if (!Array.isArray(apartments)) {
      throw new Error("apartments.json must be an array: [ { ... }, { ... } ]");
    }

    let added = 0;

    apartments.forEach((apt, idx) => {
      const lat = Number(apt.lat);
      const lng = Number(apt.lng);

      if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        console.warn(`Skipping apt[${idx}] invalid lat/lng:`, apt);
        return;
      }

      apt.lat = lat;
      apt.lng = lng;

      const marker = L.marker([lat, lng]).addTo(map);
      added++;

      marker.on("click", () => {
        focusMarker(lat, lng);
        openPanel(apt);
      });
    });

    console.log(`Markers added: ${added}/${apartments.length}`);

    if (added === 0) {
      alert("No markers were added. apartments.json loaded but lat/lng values are invalid.");
    }
  })
  .catch((err) => {
    console.error(err);
    alert(
      "Could not load apartments.json.\n\n" +
        "Check:\n" +
        "• apartments.json is in the same folder as index.html\n" +
        "• filename is exactly apartments.json (case matters)\n" +
        "• valid JSON\n\n" +
        "Error: " + err.message
    );
  });
