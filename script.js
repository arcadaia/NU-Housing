// Evanston Apartment Map (Leaflet) — Zillow-style side panel + click-to-get-coordinates
// - Click an apartment marker: opens big right-side panel, recenters/zooms map so marker is visible
// - Click map: shows popup with lat/lng you can copy into apartments.json
// - No tiny bindPopup for apartments (panel only)

const NU = { name: "Northwestern (Evanston)", lat: 42.055984, lng: -87.675171 };

// ===== Map init =====
const map = L.map("map", { zoomControl: true }).setView([NU.lat, NU.lng], 14);

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution: "&copy; OpenStreetMap contributors",
  maxZoom: 19
}).addTo(map);

// Campus marker (optional popup)
L.circleMarker([NU.lat, NU.lng], { radius: 7 }).addTo(map);

// Click map to get coordinates (helps you fix marker placement)
map.on("click", (e) => {
  const { lat, lng } = e.latlng;
  L.popup()
    .setLatLng(e.latlng)
    .setContent(
      `<b>Coordinates</b><br>${lat.toFixed(6)}, ${lng.toFixed(6)}<br><span style="opacity:0.7">Copy into apartments.json</span>`
    )
    .openOn(map);
});

// ===== Panel elements (must exist in index.html) =====
const panel = document.getElementById("panel");
const backdrop = document.getElementById("backdrop");
const panelTitle = document.getElementById("panelTitle");
const panelAddress = document.getElementById("panelAddress");
const panelBody = document.getElementById("panelBody");
const panelClose = document.getElementById("panelClose");

// ===== Helpers =====
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

function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => {
    return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
  });
}

function openPanel(apt) {
  const dist = milesBetween(NU.lat, NU.lng, apt.lat, apt.lng).toFixed(2);
  const directions = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
    apt.address || `${apt.lat},${apt.lng}`
  )}`;

  panelTitle.textContent = apt.name || "Apartment";
  panelAddress.textContent = apt.address || "";

  // Optional links
  const websiteLink = apt.website
    ? `<a href="${esc(apt.website)}" target="_blank" rel="noopener">Property site</a>`
    : "";
  const zillowLink = apt.zillow
    ? `<a href="${esc(apt.zillow)}" target="_blank" rel="noopener">Zillow</a>`
    : "";

  panelBody.innerHTML = `
    <div class="card">
      <div class="section-title">Overview</div>
      <div class="kv">
        <div class="k">Distance</div><div class="v">${dist} mi to campus</div>
        <div class="k">1BR</div><div class="v">${esc(apt.one_bed_price || "TBD")}</div>
        <div class="k">AC</div><div class="v">${esc(apt.ac || "TBD")}</div>
        <div class="k">Parking</div><div class="v">${esc(apt.parking || "TBD")}</div>
      </div>
      <div class="links">
        ${websiteLink}
        ${zillowLink}
        <a href="${directions}" target="_blank" rel="noopener">Directions</a>
      </div>
    </div>

    <div class="card">
      <div class="section-title">Notes</div>
      <div class="note">${esc(apt.notes || "—")}</div>
    </div>
  `;

  panel.classList.remove("hidden");
  backdrop.classList.remove("hidden");
  panel.setAttribute("aria-hidden", "false");
  backdrop.setAttribute("aria-hidden", "false");
}

function closePanel() {
  panel.classList.add("hidden");
  backdrop.classList.add("hidden");
  panel.setAttribute("aria-hidden", "true");
  backdrop.setAttribute("aria-hidden", "true");
}

panelClose?.addEventListener("click", closePanel);
backdrop?.addEventListener("click", closePanel);
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closePanel();
});

// Recenter/zoom so the marker is visible even with the right-side panel open
function focusMarker(lat, lng) {
  const targetZoom = 16;

  // Step 1: zoom to marker
  map.setView([lat, lng], Math.max(map.getZoom(), targetZoom), { animate: true });

  // Step 2: if panel open, shift view left so marker isn't hidden behind it
  const panelIsOpen = !panel.classList.contains("hidden");
  if (panelIsOpen) {
    // shift about ~25% of screen width (tweak if you want more/less)
    const shiftPx = Math.floor(window.innerWidth * 0.25);
    setTimeout(() => map.panBy([-shiftPx, 0], { animate: true }), 250);
  }
}

// ===== Load apartments and add markers =====
fetch("./apartments.json")
  .then((res) => {
    if (!res.ok) throw new Error("Could not load apartments.json");
    return res.json();
  })
  .then((apartments) => {
    const bounds = [[NU.lat, NU.lng]];

    apartments.forEach((apt) => {
      // Guard: if lat/lng are strings, convert to numbers
      const lat = Number(apt.lat);
      const lng = Number(apt.lng);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

      const marker = L.marker([lat, lng]).addTo(map);

      // BIG PANEL behavior (no tiny Leaflet popup)
      marker.on("click", () => {
        // ensure the object has numeric lat/lng for distance calc
        apt.lat = lat;
        apt.lng = lng;

        openPanel(apt);
        focusMarker(lat, lng);
      });

      bounds.push([lat, lng]);
    });

    // Initial view: show everything (campus + all apartments)
    map.fitBounds(bounds, { padding: [40, 40] });
  })
  .catch((err) => {
    console.error(err);
    alert("Error loading apartments.json. Make sure it exists in the repo root.");
  });
