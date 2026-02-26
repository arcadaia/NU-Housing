// ==============================
// MAP SETUP
// ==============================

const NU = { lat: 42.055984, lng: -87.675171 };

const map = L.map("map").setView([NU.lat, NU.lng], 14);

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution: "&copy; OpenStreetMap contributors",
  maxZoom: 19
}).addTo(map);

// Campus dot
L.circleMarker([NU.lat, NU.lng], {
  radius: 6,
  color: "#4e2a84",
  fillColor: "#4e2a84",
  fillOpacity: 1
}).addTo(map);


// ==============================
// CUSTOM MARKER ICONS
// ==============================

// Make sure map_marker.png is inside /assets folder

const defaultIcon = L.icon({
  iconUrl: "./assets/map_marker.png",
  iconSize: [32, 42],
  iconAnchor: [16, 42],
  popupAnchor: [0, -40]
});

// Lighter selected version (we tint using CSS filter)
const selectedIcon = L.icon({
  iconUrl: "./assets/map_marker.png",
  iconSize: [36, 48], // slightly bigger
  iconAnchor: [18, 48],
  popupAnchor: [0, -45]
});


// ==============================
// PANEL ELEMENTS
// ==============================

const panel = document.getElementById("panel");
const panelTitle = document.getElementById("panelTitle");
const panelAddress = document.getElementById("panelAddress");
const panelBody = document.getElementById("panelBody");
const panelClose = document.getElementById("panelClose");

let activeMarker = null;


// ==============================
// DISTANCE FUNCTION
// ==============================

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


// ==============================
// PANEL LOGIC
// ==============================

function openPanel(apt) {
  const dist = milesBetween(NU.lat, NU.lng, apt.lat, apt.lng).toFixed(2);

  panelTitle.textContent = apt.name;
  panelAddress.textContent = apt.address;

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
        ${apt.website ? `<a href="${apt.website}" target="_blank">Property Site</a>` : ""}
      </div>
    </div>

    <div class="card">
      <div class="section-title">Notes</div>
      <div>${apt.notes || "—"}</div>
    </div>
  `;

  panel.classList.remove("hidden");
}

function closePanel() {
  panel.classList.add("hidden");

  if (activeMarker) {
    activeMarker.setIcon(defaultIcon);
    activeMarker = null;
  }
}

panelClose.addEventListener("click", closePanel);

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closePanel();
});


// ==============================
// LOAD APARTMENTS
// ==============================

fetch("./apartments.json")
  .then(res => {
    if (!res.ok) throw new Error("Failed to load apartments.json");
    return res.json();
  })
  .then(apartments => {

    apartments.forEach(apt => {

      const marker = L.marker(
        [Number(apt.lat), Number(apt.lng)],
        { icon: defaultIcon }
      ).addTo(map);

      marker.on("click", () => {

        // Reset previous marker
        if (activeMarker) {
          activeMarker.setIcon(defaultIcon);
        }

        // Set this one active
        activeMarker = marker;
        marker.setIcon(selectedIcon);

        map.flyTo([apt.lat, apt.lng], 16, { duration: 0.6 });

        openPanel(apt);
      });

    });

  })
  .catch(err => {
    console.error(err);
    alert("Could not load apartments.json");
  });
