const NU = { lat: 42.055984, lng: -87.675171 };

const map = L.map("map").setView([NU.lat, NU.lng], 14);

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution: "&copy; OpenStreetMap contributors",
  maxZoom: 19
}).addTo(map);

// Campus marker
L.circleMarker([NU.lat, NU.lng], { radius: 6 }).addTo(map);

// Optional: coordinate helper. If you don't want this popup, delete this block.
map.on("click", (e) => {
  const { lat, lng } = e.latlng;
  L.popup()
    .setLatLng(e.latlng)
    .setContent(`<b>Coordinates</b><br>${lat.toFixed(6)}, ${lng.toFixed(6)}`)
    .openOn(map);
});

// ===== Panel elements =====
const panel = document.getElementById("panel");
const backdrop = document.getElementById("backdrop");
const panelTitle = document.getElementById("panelTitle");
const panelAddress = document.getElementById("panelAddress");
const panelBody = document.getElementById("panelBody");
const panelClose = document.getElementById("panelClose");

function milesBetween(lat1, lon1, lat2, lon2) {
  const R = 3958.8;
  const toRad = (d) => d * Math.PI / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat/2)**2 +
    Math.cos(toRad(lat1)) *
    Math.cos(toRad(lat2)) *
    Math.sin(dLon/2)**2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

function openPanel(apt) {
  const dist = milesBetween(NU.lat, NU.lng, apt.lat, apt.lng).toFixed(2);
  const directions = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(apt.address)}`;

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
  backdrop.classList.remove("hidden");
  panel.setAttribute("aria-hidden", "false");
}

function closePanel() {
  panel.classList.add("hidden");
  backdrop.classList.add("hidden");
  panel.setAttribute("aria-hidden", "true");
}

// Close handlers (THIS is what fixes your X not working)
panelClose.addEventListener("click", closePanel);
backdrop.addEventListener("click", closePanel);
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closePanel();
});

// Zoom to marker when clicked (and keep it visible)
function focusMarker(lat, lng) {
  map.setView([lat, lng], 16, { animate: true });

  // If panel is open on the right, shift view left a bit so marker isn't hidden
  setTimeout(() => {
    if (!panel.classList.contains("hidden")) {
      map.panBy([-220, 0], { animate: true }); // tweak this if needed
    }
  }, 250);
}

// Load apartments + add markers (NO Leaflet popups)
fetch("./apartments.json")
  .then(res => res.json())
  .then(apartments => {
    apartments.forEach(apt => {
      apt.lat = Number(apt.lat);
      apt.lng = Number(apt.lng);
      if (!Number.isFinite(apt.lat) || !Number.isFinite(apt.lng)) return;

      const marker = L.marker([apt.lat, apt.lng]).addTo(map);

      marker.on("click", () => {
        map.closePopup();         // kills the coordinate popup if one is open
        focusMarker(apt.lat, apt.lng);
        openPanel(apt);
      });
    });
  });
