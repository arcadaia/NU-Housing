const NU = { lat: 42.055984, lng: -87.675171 };

// Create map
const map = L.map("map").setView([NU.lat, NU.lng], 14);

// Base tiles
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution: "&copy; OpenStreetMap contributors",
  maxZoom: 19
}).addTo(map);

// Campus marker (no popup)
L.circleMarker([NU.lat, NU.lng], { radius: 6 }).addTo(map);

// Click map to get coordinates helper
map.on("click", (e) => {
  const { lat, lng } = e.latlng;
  L.popup()
    .setLatLng(e.latlng)
    .setContent(
      `<b>Coordinates</b><br>${lat.toFixed(6)}, ${lng.toFixed(6)}`
    )
    .openOn(map);
});

// ===== Modal Elements =====
const modal = document.getElementById("modal");
const modalBackdrop = document.getElementById("modalBackdrop");
const modalTitle = document.getElementById("modalTitle");
const modalAddress = document.getElementById("modalAddress");
const modalBody = document.getElementById("modalBody");
const modalClose = document.getElementById("modalClose");

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

function openModal(apt) {
  const dist = milesBetween(NU.lat, NU.lng, apt.lat, apt.lng).toFixed(2);

  modalTitle.textContent = apt.name;
  modalAddress.textContent = apt.address;

  modalBody.innerHTML = `
    <div class="card">
      <div class="section-title">Overview</div>
      <div class="kv">
        <div class="k">Distance</div><div class="v">${dist} mi</div>
        <div class="k">1BR</div><div class="v">${apt.one_bed_price || "TBD"}</div>
        <div class="k">AC</div><div class="v">${apt.ac || "TBD"}</div>
        <div class="k">Parking</div><div class="v">${apt.parking || "TBD"}</div>
      </div>
      <div class="links">
        ${apt.website ? `<a href="${apt.website}" target="_blank">Property site</a>` : ""}
      </div>
    </div>

    <div class="card">
      <div class="section-title">Notes</div>
      <div>${apt.notes || "—"}</div>
    </div>
  `;

  modal.classList.remove("hidden");
  modalBackdrop.classList.remove("hidden");
}

function closeModal() {
  modal.classList.add("hidden");
  modalBackdrop.classList.add("hidden");
}

modalClose.addEventListener("click", closeModal);
modalBackdrop.addEventListener("click", closeModal);
document.addEventListener("keydown", e => {
  if (e.key === "Escape") closeModal();
});

// Zoom and center
function focusMarker(lat, lng) {
  map.setView([lat, lng], 16, { animate: true });
}

// Load apartments
fetch("./apartments.json")
  .then(res => res.json())
  .then(apartments => {
    apartments.forEach(apt => {
      const marker = L.marker([apt.lat, apt.lng]).addTo(map);

      marker.on("click", () => {
        map.closePopup(); // no little bubble
        focusMarker(apt.lat, apt.lng);
        openModal(apt);
      });
    });
  });
