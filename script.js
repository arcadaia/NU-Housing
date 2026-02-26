 // ==============================
// FIREBASE
// ==============================

firebase.initializeApp({
  apiKey: "AIzaSyA7f1UN1easzEer490PYRigygmLUE_xGMw",
  authDomain: "nu-housing-comments.firebaseapp.com",
  projectId: "nu-housing-comments",
}); 

const db = firebase.firestore();

// ==============================
// MAP
// ==============================

const NU = { lat: 42.055984, lng: -87.675171 };
const map = L.map("map").setView([NU.lat, NU.lng], 14);

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution: "&copy; OpenStreetMap contributors",
}).addTo(map);

const defaultIcon = L.icon({
  iconUrl: "assets/map_marker.png",
  iconSize: [32, 42],
  iconAnchor: [16, 42],
});

function milesBetween(lat1, lon1, lat2, lon2) {
  const R = 3958.8;
  const toRad = d => d * Math.PI / 180;
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
// STATE
// ==============================

let apartments = [];
let compareMode = false;
let compareSelection = [];

// ==============================
// LOAD APARTMENTS
// ==============================

fetch("apartments.json")
  .then(res => res.json())
  .then(data => {
    apartments = data;

    apartments.forEach(apt => {
      apt.distance = milesBetween(
        NU.lat,
        NU.lng,
        Number(apt.lat),
        Number(apt.lng)
      );
    });

    apartments.sort((a,b) => a.distance - b.distance);
    apartments.forEach((apt,i) => apt.rank = i+1);

    renderMarkers();
  });

function renderMarkers() {
  apartments.forEach(apt => {
    const marker = L.marker([apt.lat, apt.lng], { icon: defaultIcon })
      .addTo(map);

    setTimeout(() => {
      marker.getElement()?.classList.add("marker-fade-in");
    }, 0);

    marker.on("click", () => {
      if (compareMode) {
        toggleCompare(apt);
      } else {
        openPanel(apt);
      }
    });
  });
}

// ==============================
// PANEL
// ==============================

function openPanel(apt) {
  document.getElementById("panelTitle").textContent = apt.name;
  document.getElementById("panelAddress").textContent = apt.address;

  document.getElementById("panelBody").innerHTML = `
    <div class="card">
      <div>${apt.distance.toFixed(2)} mi (${apt.rank}${ordinal(apt.rank)} closest)</div>
      <div>${apt.one_bed_price || "TBD"}</div>
      <div>${apt.ac || "TBD"}</div>
      <div>${apt.parking || "TBD"}</div>
    </div>

    <div class="card">
      <div>Sticky Notes</div>
      <div id="notesContainer"></div>
      <textarea id="noteText"></textarea>
      <button id="addNoteBtn">Add Note</button>
    </div>
  `;

  document.getElementById("panel").classList.remove("hidden");
  loadNotes(apt.address);

  document.getElementById("addNoteBtn").onclick = async () => {
    const text = document.getElementById("noteText").value.trim();
    if (!text) return;

    await db.collection("comments").add({
      apartmentId: apt.address,
      text,
      createdAt: Date.now()
    });

    document.getElementById("noteText").value = "";
    loadNotes(apt.address);
  };
}

document.getElementById("panelClose").onclick = () =>
  document.getElementById("panel").classList.add("hidden");

// ==============================
// NOTES
// ==============================

async function loadNotes(id) {
  const container = document.getElementById("notesContainer");
  container.innerHTML = "";

  const snapshot = await db.collection("comments")
    .where("apartmentId","==",id)
    .get();

  snapshot.forEach(doc => {
    const div = document.createElement("div");
    div.className = "sticky-note";
    div.textContent = doc.data().text;
    container.appendChild(div);
  });
}

// ==============================
// COMPARE
// ==============================

function toggleCompare(apt) {
  const idx = compareSelection.indexOf(apt.address);
  if (idx > -1) {
    compareSelection.splice(idx,1);
  } else {
    if (compareSelection.length >= 2) compareSelection.shift();
    compareSelection.push(apt.address);
  }

  document.getElementById("compareOpenBtn").disabled =
    compareSelection.length !== 2;
}

document.getElementById("compareToggleBtn").onclick = () => {
  compareMode = !compareMode;
  document.getElementById("compareToggleBtn").textContent =
    compareMode ? "Compare: On" : "Compare: Off";
};

document.getElementById("compareOpenBtn").onclick = () => {
  const a = apartments.find(x => x.address === compareSelection[0]);
  const b = apartments.find(x => x.address === compareSelection[1]);

  document.getElementById("cmpA").innerHTML =
    `<strong>${a.name}</strong><br>${a.distance.toFixed(2)} mi`;

  document.getElementById("cmpB").innerHTML =
    `<strong>${b.name}</strong><br>${b.distance.toFixed(2)} mi`;

  document.getElementById("compareModal").classList.remove("hidden");
};

document.getElementById("compareCloseBtn").onclick = () =>
  document.getElementById("compareModal").classList.add("hidden");

document.getElementById("compareBackdrop").onclick = () =>
  document.getElementById("compareModal").classList.add("hidden");

// ==============================

function ordinal(n){
  return n===1?"st":n===2?"nd":n===3?"rd":"th";
}
