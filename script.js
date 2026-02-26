// ==============================
// FIREBASE SETUP (COMPAT VERSION)
// ==============================

const firebaseConfig = {
  apiKey: "AIzaSyA7f1UN1easzEer490PYRigygmLUE_xGMw",
  authDomain: "nu-housing-comments.firebaseapp.com",
  projectId: "nu-housing-comments",
  storageBucket: "nu-housing-comments.firebasestorage.app",
  messagingSenderId: "791252409254",
  appId: "1:791252409254:web:fad82c4d93099cc4700d67"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// ==============================
// MAP SETUP
// ==============================

const NU = { lat: 42.055984, lng: -87.675171 };

const map = L.map("map").setView([NU.lat, NU.lng], 14);

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution: "&copy; OpenStreetMap contributors",
  maxZoom: 19
}).addTo(map);

// Campus marker
L.circleMarker([NU.lat, NU.lng], {
  radius: 6,
  color: "#4e2a84",
  fillColor: "#4e2a84",
  fillOpacity: 1
}).addTo(map);

// ==============================
// CUSTOM MARKER ICON
// ==============================

const defaultIcon = L.icon({
  iconUrl: "assets/map_marker.png",
  iconSize: [32, 42],
  iconAnchor: [16, 42],
  popupAnchor: [0, -40]
});

let activeMarker = null;

// ==============================
// PANEL ELEMENTS
// ==============================

const panel = document.getElementById("panel");
const panelTitle = document.getElementById("panelTitle");
const panelAddress = document.getElementById("panelAddress");
const panelBody = document.getElementById("panelBody");
const panelClose = document.getElementById("panelClose");

// ==============================
// DISTANCE CALCULATION
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
// PANEL CONTROL
// ==============================

async function openPanel(apt) {

  const dist = milesBetween(NU.lat, NU.lng, apt.lat, apt.lng).toFixed(2);

  panelTitle.textContent = apt.name;
  panelAddress.textContent = apt.address;

  panelBody.innerHTML = `
    <div class="card">
      <div class="section-title">Overview</div>

      <div class="kv-row">
        <div class="kv-item">
          <div class="kv-label">Distance</div>
          <div class="kv-value">${dist} mi</div>
        </div>

        <div class="kv-item">
          <div class="kv-label">1BR</div>
          <div class="kv-value">${apt.one_bed_price || "TBD"}</div>
        </div>
      </div>

      <div class="kv-row">
        <div class="kv-item">
          <div class="kv-label">AC</div>
          <div class="kv-value">${apt.ac || "TBD"}</div>
        </div>

        <div class="kv-item">
          <div class="kv-label">Parking</div>
          <div class="kv-value">${apt.parking || "TBD"}</div>
        </div>
      </div>

      ${apt.website ? `
        <div class="button-wrap">
          <a href="${apt.website}" target="_blank" class="primary-btn">
            View Property Website
          </a>
        </div>
      ` : ""}
    </div>

    <div class="card">
      <div class="section-title">Sticky Notes</div>
      <div id="notesContainer"></div>
      <textarea id="newNoteText" placeholder="Leave a note..."></textarea>
      <button id="addNoteBtn" class="primary-btn">Add Note</button>
    </div>
  `;

  panel.classList.remove("hidden");

  loadNotes(apt.address);

  document.getElementById("addNoteBtn").onclick = async () => {

    const textArea = document.getElementById("newNoteText");
    const text = textArea.value.trim();
    if (!text) return;

    await db.collection("comments").add({
      apartmentId: apt.address,
      text: text,
      createdAt: Date.now()
    });

    textArea.value = "";
    loadNotes(apt.address);
  };
}

function closePanel() {
  panel.classList.add("hidden");

  if (activeMarker) {
    activeMarker.getElement().classList.remove("selected-marker");
    activeMarker = null;
  }
}

panelClose.addEventListener("click", closePanel);

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closePanel();
});

// ==============================
// LOAD NOTES
// ==============================

async function loadNotes(apartmentId) {

  const notesContainer = document.getElementById("notesContainer");
  if (!notesContainer) return;

  notesContainer.innerHTML = "";

  const snapshot = await db.collection("comments")
    .where("apartmentId", "==", apartmentId)
    .get();

  snapshot.forEach(doc => {
    const data = doc.data();
    const div = document.createElement("div");
    div.className = "sticky-note";
    div.innerText = data.text;
    notesContainer.appendChild(div);
  });
}

// ==============================
// LOAD APARTMENTS
// ==============================

fetch("apartments.json")
  .then(res => res.json())
  .then(apartments => {

    apartments.forEach(apt => {

      const marker = L.marker(
        [Number(apt.lat), Number(apt.lng)],
        { icon: defaultIcon }
      ).addTo(map);

      marker.on("click", () => {

        if (activeMarker) {
          activeMarker.getElement().classList.remove("selected-marker");
        }

        activeMarker = marker;

        setTimeout(() => {
          marker.getElement().classList.add("selected-marker");
        }, 10);

        map.flyTo([apt.lat, apt.lng], 16, { duration: 0.6 });

        openPanel(apt);
      });

    });

  })
  .catch(err => {
    console.error(err);
    alert("Could not load apartments.json");
  });
