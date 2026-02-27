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
// MAP SETUP
// ==============================

const NU = { lat: 42.055984, lng: -87.675171 };

const map = L.map("map").setView([NU.lat, NU.lng], 14);

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution: "&copy; OpenStreetMap contributors",
  maxZoom: 19,
}).addTo(map);

L.circleMarker([NU.lat, NU.lng], {
  radius: 6,
  color: "#4e2a84",
  fillColor: "#4e2a84",
  fillOpacity: 1
}).addTo(map);

const defaultIcon = L.icon({
  iconUrl: "./assets/map_marker.png",
  iconSize: [32, 42],
  iconAnchor: [16, 42],
  popupAnchor: [0, -40]
});

// ==============================
// DOM ELEMENTS
// ==============================

const panel = document.getElementById("panel");
const panelTitle = document.getElementById("panelTitle");
const panelAddress = document.getElementById("panelAddress");
const panelBody = document.getElementById("panelBody");
const panelClose = document.getElementById("panelClose");

const compareToggleBtn = document.getElementById("compareToggleBtn");
const compareOpenBtn = document.getElementById("compareOpenBtn");
const compareClearBtn = document.getElementById("compareClearBtn");

const sortModeSelect = document.getElementById("sortModeSelect");
const applySortBtn = document.getElementById("applySortBtn");
const selectedListEl = document.getElementById("selectedList");
const clearListBtn = document.getElementById("clearListBtn");

const compareModal = document.getElementById("compareModal");
const compareBackdrop = document.getElementById("compareBackdrop");
const compareCloseBtn = document.getElementById("compareCloseBtn");

// Compare fields
const cmpA_name = document.getElementById("cmpA_name");
const cmpA_addr = document.getElementById("cmpA_addr");
const cmpA_dist = document.getElementById("cmpA_dist");
const cmpA_price = document.getElementById("cmpA_price");
const cmpA_ac = document.getElementById("cmpA_ac");
const cmpA_parking = document.getElementById("cmpA_parking");
const cmpA_link = document.getElementById("cmpA_link");

const cmpB_name = document.getElementById("cmpB_name");
const cmpB_addr = document.getElementById("cmpB_addr");
const cmpB_dist = document.getElementById("cmpB_dist");
const cmpB_price = document.getElementById("cmpB_price");
const cmpB_ac = document.getElementById("cmpB_ac");
const cmpB_parking = document.getElementById("cmpB_parking");
const cmpB_link = document.getElementById("cmpB_link");

// ==============================
// HELPERS
// ==============================

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

function parsePriceToNumber(priceStr) {
  if (!priceStr) return null;
  const m = priceStr.match(/(\d{1,3}(?:,\d{3})+|\d{3,6})/);
  return m ? Number(m[1].replaceAll(",", "")) : null;
}

function aptKey(apt) {
  return String(apt.address || apt.name || "").trim();
}

// ==============================
// STATE
// ==============================

let apartments = [];
let activeMarker = null;
let selectedKeys = [];
let compareMode = false;
let compareSelection = [];

const aptIndex = new Map();
let markerLayer = L.layerGroup().addTo(map);

applySortBtn.onclick = () => {
  if (selectedKeys.length === 0) return;

  const mode = sortModeSelect.value;

  selectedKeys.sort((aKey, bKey) => {
    const a = aptIndex.get(aKey).apt;
    const b = aptIndex.get(bKey).apt;

    if (mode === "cheapest") {
      if (a.priceNum == null) return 1;
      if (b.priceNum == null) return -1;
      return a.priceNum - b.priceNum;
    }

    return a.distance - b.distance;
  });

  updateSelectedList();
};

// ==============================
// SELECTED LIST
// ==============================

function updateSelectedList() {
  selectedListEl.innerHTML = "";

  selectedKeys.forEach(key => {
    const entry = aptIndex.get(key);
    if (!entry) return;

    const div = document.createElement("div");
    div.className = "selected-item";
    div.innerHTML = `
      <span>${entry.apt.name}</span>
      <button data-key="${key}">×</button>
    `;

    div.querySelector("button").onclick = (e) => {
      const k = e.target.dataset.key;
      selectedKeys = selectedKeys.filter(x => x !== k);
      updateSelectedList();
    };

    selectedListEl.appendChild(div);
  });
}

clearListBtn.onclick = () => {
  selectedKeys = [];
  updateSelectedList();
};

// ==============================
// PANEL + NOTES
// ==============================

function openPanel(apt) {

  document.body.classList.add("panel-open");

  panelTitle.textContent = apt.name;
  panelAddress.textContent = apt.address;

  panelBody.innerHTML = `
    <div class="card">
      <div class="kv-row">
        <div class="kv-label">Distance</div>
        <div class="kv-value">${apt.distance.toFixed(2)} mi</div>
      </div>
      <div class="kv-row">
        <div class="kv-label">1BR</div>
        <div class="kv-value">${apt.one_bed_price || "TBD"}</div>
      </div>
      <div class="kv-row">
        <div class="kv-label">AC</div>
        <div class="kv-value">${apt.ac || "TBD"}</div>
      </div>
      <div class="kv-row">
        <div class="kv-label">Parking</div>
        <div class="kv-value">${apt.parking || "TBD"}</div>
      </div>
      ${apt.website ? `<a href="${apt.website}" target="_blank" class="primary-btn">View website</a>` : ""}
    </div>

    <div class="card">
      <div class="section-title">Notes</div>
      <div id="notesContainer"></div>
      <textarea id="newNoteText" placeholder="Add a note..."></textarea>
      <button id="saveNoteBtn" class="primary">Save Note</button>
    </div>
  `;

  loadNotes(aptKey(apt));

  document.getElementById("saveNoteBtn").onclick = () => {
    const saveBtn = document.getElementById("saveNoteBtn");
    const textEl = document.getElementById("newNoteText");
    
    saveBtn.onclick = async () => {
      const text = textEl.value.trim();
      if (!text) return;
    
      saveBtn.disabled = true;
      saveBtn.textContent = "Saving...";
    
      try {
        await db.collection("notes").add({
          apartment: aptKey(apt),
          text,
          created: firebase.firestore.FieldValue.serverTimestamp()
        });
    
        textEl.value = "";
        await loadNotes(aptKey(apt));
      } catch (err) {
        console.error("Save note error:", err);
        alert("Save failed. Check console.");
      } finally {
        saveBtn.disabled = false;
        saveBtn.textContent = "Save Note";
      }
    };
  panel.classList.remove("hidden");
}

panelClose.onclick = () => {
  panel.classList.add("hidden");
  document.body.classList.remove("panel-open");
};

function loadNotes(key) {
  const container = document.getElementById("notesContainer");
  if (!container) return Promise.resolve();

  container.innerHTML = "";

  return db.collection("notes")
    .where("apartment", "==", key)
    .get()
    .then(snapshot => {
      const notes = [];

      snapshot.forEach(doc => notes.push(doc.data()));

      notes.sort((a, b) => {
        if (!a.created || !b.created) return 0;
        return b.created.seconds - a.created.seconds;
      });

      notes.forEach(note => {
        const div = document.createElement("div");
        div.className = "sticky-note";
        div.textContent = note.text;
        container.appendChild(div);
      });
    })
    .catch(err => {
      console.error("Notes load error:", err);
    });
}

// ==============================
// COMPARE SYSTEM
// ==============================

compareToggleBtn.onclick = () => {
  compareMode = !compareMode;
  compareToggleBtn.classList.toggle("active", compareMode);
  compareToggleBtn.textContent = compareMode
    ? "Compare mode: On"
    : "Compare mode: Off";
};

compareClearBtn.onclick = () => {
  compareSelection.forEach(key => {
    aptIndex.get(key)?.marker?.getElement()?.classList.remove("compare-selected");
  });
  compareSelection = [];
  updateCompareButtons();
};

compareOpenBtn.onclick = () => {
  if (compareSelection.length !== 2) return;

  openCompare(compareSelection[0], compareSelection[1]);
  document.body.classList.add("modal-open");
};

compareCloseBtn.onclick = closeCompare;
compareBackdrop.onclick = closeCompare;

function closeCompare() {
  compareModal.classList.add("hidden");
  document.body.classList.remove("modal-open");
}

function updateCompareButtons() {
  compareOpenBtn.textContent = `Compare (${compareSelection.length}/2)`;
  compareOpenBtn.disabled = compareSelection.length !== 2;
  compareClearBtn.disabled = compareSelection.length === 0;
}

function toggleCompareSelection(apt) {
  const key = aptKey(apt);
  const marker = aptIndex.get(key)?.marker;

  const idx = compareSelection.indexOf(key);

  if (idx >= 0) {
    compareSelection.splice(idx, 1);
    marker?.getElement()?.classList.remove("compare-selected");
  } else {
    if (compareSelection.length >= 2) {
      const old = compareSelection.shift();
      aptIndex.get(old)?.marker?.getElement()?.classList.remove("compare-selected");
    }
    compareSelection.push(key);
    marker?.getElement()?.classList.add("compare-selected");
  }

  updateCompareButtons();
}

function openCompare(keyA, keyB) {
  const a = aptIndex.get(keyA)?.apt;
  const b = aptIndex.get(keyB)?.apt;
  if (!a || !b) return;

  cmpA_name.textContent = a.name;
  cmpA_addr.textContent = a.address;
  cmpA_dist.textContent = a.distance.toFixed(2) + " mi";
  cmpA_price.textContent = a.one_bed_price || "TBD";
  cmpA_ac.textContent = a.ac || "TBD";
  cmpA_parking.textContent = a.parking || "TBD";
  cmpA_link.href = a.website || "#";

  cmpB_name.textContent = b.name;
  cmpB_addr.textContent = b.address;
  cmpB_dist.textContent = b.distance.toFixed(2) + " mi";
  cmpB_price.textContent = b.one_bed_price || "TBD";
  cmpB_ac.textContent = b.ac || "TBD";
  cmpB_parking.textContent = b.parking || "TBD";
  cmpB_link.href = b.website || "#";

  compareModal.classList.remove("hidden");
}

// ==============================
// MARKERS
// ==============================

function renderMarkers() {
  markerLayer.clearLayers();
  aptIndex.clear();

  apartments.forEach(apt => {

    const marker = L.marker([apt.lat, apt.lng], { icon: defaultIcon })
      .addTo(markerLayer);

    const key = aptKey(apt);
    aptIndex.set(key, { apt, marker });

    marker.on("click", () => {

      if (compareMode) {
        toggleCompareSelection(apt);
        return;
      }

      if (!selectedKeys.includes(key)) {
        selectedKeys.push(key);
        updateSelectedList();
      }

      if (activeMarker) {
        activeMarker.getElement()?.classList.remove("selected-marker");
      }

      activeMarker = marker;
      setTimeout(() =>
        marker.getElement()?.classList.add("selected-marker"), 10
      );

      map.flyTo([apt.lat, apt.lng], 16, { duration: 0.6 });
      openPanel(apt);
    });
  });

  updateCompareButtons();
}

// ==============================
// LOAD DATA
// ==============================

fetch("./apartments.json")
  .then(res => res.json())
  .then(data => {

    apartments = data;

    apartments.forEach(apt => {
      apt.lat = Number(apt.lat);
      apt.lng = Number(apt.lng);
      apt.distance = milesBetween(NU.lat, NU.lng, apt.lat, apt.lng);
      apt.priceNum = parsePriceToNumber(apt.one_bed_price);
    });

    renderMarkers();
  });
