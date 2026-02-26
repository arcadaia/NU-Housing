const NU = { lat: 42.055984, lng: -87.675171 };

const map = L.map("map").setView([NU.lat, NU.lng], 14);

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution: "&copy; OpenStreetMap contributors",
  maxZoom: 19
}).addTo(map);

L.circleMarker([NU.lat, NU.lng], { radius: 6 }).addTo(map);

const panel = document.getElementById("panel");
const panelTitle = document.getElementById("panelTitle");
const panelAddress = document.getElementById("panelAddress");
const panelBody = document.getElementById("panelBody");
const panelClose = document.getElementById("panelClose");

let activeMarker = null;

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

  panelTitle.textContent = apt.name;
  panelAddress.textContent = apt.address;

  panelBody.innerHTML = `
    <div class="hero">
      <img src="${apt.image || 'https://source.unsplash.com/800x600/?modern,apartment'}">
    </div>

    <div class="card">
      <div class="section-title">Overview</div>
      <div class="kv">
        <div class="k">Distance</div><div class="v">${dist} mi</div>
        <div class="k">1BR</div><div class="v">${apt.one_bed_price}</div>
        <div class="k">AC</div><div class="v">${apt.ac}</div>
        <div class="k">Parking</div><div class="v">${apt.parking}</div>
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
    activeMarker.getElement().classList.remove("selected-marker");
  }
}

panelClose.addEventListener("click", closePanel);
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closePanel();
});

fetch("./apartments.json")
  .then(res => res.json())
  .then(apartments => {
    apartments.forEach(apt => {
      const marker = L.marker([apt.lat, apt.lng]).addTo(map);

      marker.on("click", () => {
        if (activeMarker) {
          activeMarker.getElement().classList.remove("selected-marker");
        }

        activeMarker = marker;

        setTimeout(() => {
          marker.getElement().classList.add("selected-marker");
        }, 50);

        map.flyTo([apt.lat, apt.lng], 16, { duration: 0.6 });
        openPanel(apt);
      });
    });
  });
