// Northwestern (Evanston campus) center point
const NU = { name: "Northwestern (Evanston)", lat: 42.055984, lng: -87.675171 };

// ===== Map init =====
const map = L.map("map").setView([NU.lat, NU.lng], 14);

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution: "&copy; OpenStreetMap contributors",
  maxZoom: 19
}).addTo(map);

// Optional: click map to get coordinates for apartments.json
map.on("click", (e) => {
  const { lat, lng } = e.latlng;
  L.popup()
    .setLatLng(e.latlng)
    .setContent(
      `<b>Coordinates</b><br>${lat.toFixed(6)}, ${lng.toFixed(6)}<br><span style="opacity:0.7">Copy into apartments.json</span>`
    )
    .openOn(map);
});

// Campus marker (no popup/bubble)
L.circleMarker([NU.lat, NU.lng], { radius: 7 }).addTo(map);

// ===== Modal elements =====
const modal = document.getElementById("modal");
const modalBackdrop = document.getElementById("modalBackdrop");
const modalTitle = document.getElementById("modalTitle");
const modalAddress = document.getElementById("modalAddress");
const modalBody = document.getElementById("modalBody");
const modalClose = document.getElementById("modalClose");

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

function openModal(apt) {
  const dist = milesBetween(NU.lat, NU.lng, apt.lat, apt.lng).toFixed(2);
  const directions = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
    apt.address || `${apt.lat},${apt.lng}`
  )}`;

  modalTitle.textContent = apt.name || "Apartment";
  modalAddress.textContent = apt.address || "";

  const websiteLink = apt.website
    ? `<a href="${esc(apt.website)}" target="_blank" rel="noopener">Property site</a>`
    : "";
  const zillowLink = apt.zillow
    ? `<a href="${esc(apt.zillow)}" target="_blank" rel="noopener">Zillow</a>`
    : "";

  modalBody.innerHTML = `
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
      <div>${esc(apt.notes || "—")}</div>
    </div>
  `;

  modal.classList.remove("hidden");
  modalBackdrop.classList.remove("hidden");
  modal.setAttribute("aria-hidden", "false");
  modalBackdrop.setAttribute("aria-hidden", "false");
}

function closeModal() {
  modal.classList.add("hidden");
  modalBackdrop.classList.add("hidden");
  modal.setAttribute("aria-hidden", "true");
  modalBackdrop.setAttribute("aria-hidden", "true");
}

modalClose.addEventListener("click", closeModal);
modalBackdrop.addEventListener("click", closeModal);
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeModal();
});

// Zoom + center marker on click
function focusMarker(lat, lng) {
  const targetZoom = 16;
  map.setView([lat, lng], Math.max(map.getZoom(), targetZoom), { animate: true });
}

// ===== Load apartments + markers =====
fetch("./apartments.json")
  .then((res) => {
    if (!res.ok) throw new Error("Could not load apartments.json");
    return res.json();
  })
  .then((apartments) => {
    const bounds = [[NU.lat, NU.lng]];

    apartments.forEach((apt) => {
      const lat = Number(apt.lat);
      const lng = Number(apt.lng);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

      // Store numeric values back
      apt.lat = lat;
      apt.lng = lng;

      const marker = L.marker([lat, lng]).addTo(map);

      marker.on("click", () => {
        // Close any coordinate popup that might be open
        map.closePopup();

        focusMarker(lat, lng);
        openModal(apt);
      });

      bounds.push([lat, lng]);
    });

    map.fitBounds(bounds, { padding: [40, 40] });
  })
  .catch((err) => {
    console.error(err);
    alert("Error loading apartments.json. Make sure it exists in the repo root.");
  });
