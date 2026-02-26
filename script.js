// ==============================
// FIREBASE (COMPAT)
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
  maxZoom: 19,
}).addTo(map);

// Campus marker
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
// UI ELEMENTS
// ==============================

const panel = document.getElementById("panel");
const panelTitle = document.getElementById("panelTitle");
const panelAddress = document.getElementById("panelAddress");
const panelBody = document.getElementById("panelBody");
const panelClose = document.getElementById("panelClose");

const sortSelect = document.getElementById("sortSelect");
const compareToggleBtn = document.getElementById("compareToggleBtn");
const compareOpenBtn = document.getElementById("compareOpenBtn");
const compareClearBtn = document.getElementById("compareClearBtn");

const compareModal = document.getElementById("compareModal");
const compareBackdrop = document.getElementById("compareBackdrop");
const compareCloseBtn = document.getElementById("compareCloseBtn");

// Compare fields (MATCH YOUR HTML IDs)
const cmpA_name = document.getElementById("cmpA_name");
const cmpA_addr = document.getElementById("cmpA_addr");
const cmpA_dist = document.getElementById("cmpA_dist");
const cmpA_rank = document.getElementById("cmpA_rank");
const cmpA_price = document.getElementById("cmpA_price");
const cmpA_ac = document.getElementById("cmpA_ac");
const cmpA_parking = document.getElementById("cmpA_parking");
const cmpA_link = document.getElementById("cmpA_link");

const cmpB_name = document.getElementById("cmpB_name");
const cmpB_addr = document.getElementById("cmpB_addr");
const cmpB_dist = document.getElementById("cmpB_dist");
const cmpB_rank = document.getElementById("cmpB_rank");
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

function ordinal(n) {
  return n === 1 ? "st" : n === 2 ? "nd" : n === 3 ? "rd" : "th";
}

function parsePriceToNumber(priceStr) {
  if (!priceStr || typeof priceStr !== "string") return null;
  const m = priceStr.match(/(\d{1,3}(?:,\d{3})+|\d{3,6})/);
  if (!m) return null;
  const n = Number(m[1].replaceAll(",", ""));
  return Number.isFinite(n) ? n : null;
}

function aptKey(apt) {
  return String(apt.address || apt.name || "").trim();
}

// ==============================
// STATE
// ==============================

let apartments = [];
let activeMarker = null;

let sortMode = "distance";
let compareMode = false;
let compareSelection = []; // array of keys (addresses)

const aptIndex = new Map(); // key -> { apt, marker }

// ==============================
// PANEL
// ==============================

async function openPanel(apt) {
  const dist = apt.distance.toFixed(2);
  const rank = `${apt.rank}${ordinal(apt.rank)} closest`;

  panelTitle.textContent = apt.name || "Apartment";
  panelAddress.textContent = apt.address || "";

  panelBody.innerHTML = `
    <div class="card">
      <div class="section-title">Overview</div>

      <div class="kv-row">
        <div class="kv-item">
          <div class="kv-label">Distance</div>
          <div class="kv-value">${dist} mi (${rank})</div>
        </div>
      </div>

      <div class="kv-row">
        <div class="kv-item">
          <div class="kv-label">1BR</div>
          <div class="kv-value">${apt.one_bed_price || "TBD"}</div>
        </div>

        <div class="kv-item">
          <div class="kv-label">AC</div>
          <div class="kv-value">${apt.ac || "TBD"}</div>
        </div>
      </div>

      <div class="kv-row">
        <div class="kv-item">
          <div class="kv-label">Parking</div>
          <div class="kv-value">${apt.parking || "TBD"}</div>
        </div>

        <div class="kv-item">
          <div class="kv-label">Cheapest est.</div>
          <div class="kv-value">${apt.priceNum ? `$${apt.priceNum.toLocaleString()}` : "—"}</div>
        </div>
      </div>

      ${apt.website ? `
        <div class="button-wrap">
          <a href="${apt.website}" target="_blank" rel="noopener noreferrer" class="primary-btn">
            View property website
          </a>
        </div>
      ` : ""}
    </div>

    <div class="card">
      <div class="section-title">Sticky Notes</div>

      <div id="notesContainer"></div>

      <textarea id="newNoteText" placeholder="Leave a note..."></textarea>
      <button id="addNoteBtn" class="primary-btn" type="button">Add Note</button>
    </div>
  `;

  panel.classList.remove("hidden");
  panel.setAttribute("aria-hidden", "false");
  document.body.classList.add("panel-open");

  await loadNotes(aptKey(apt));
  wireNoteSubmit(apt);

  panelBody.removeEventListener("scroll", onPanelScroll);
  panelBody.addEventListener("scroll", onPanelScroll);
}

function closePanel() {
  panel.classList.add("hidden");
  panel.setAttribute("aria-hidden", "true");
  document.body.classList.remove("panel-open");
  document.body.classList.remove("topbar-shrink");

  if (activeMarker) {
    const el = activeMarker.getElement();
    if (el) el.classList.remove("selected-marker");
    activeMarker = null;
  }
}

panelClose.addEventListener("click", closePanel);

function onPanelScroll() {
  const y = panelBody.scrollTop || 0;
  if (y > 10) document.body.classList.add("topbar-shrink");
  else document.body.classList.remove("topbar-shrink");
}

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    if (!compareModal.classList.contains("hidden")) closeCompare();
    else closePanel();
  }
});

// ==============================
// NOTES
// ==============================

function wireNoteSubmit(apt) {
  const btn = document.getElementById("addNoteBtn");
  const textArea = document.getElementById("newNoteText");
  if (!btn || !textArea) return;

  btn.onclick = async () => {
    const text = (textArea.value || "").trim();
    if (!text) return;

    await db.collection("comments").add({
      apartmentId: aptKey(apt),
      text,
      createdAt: Date.now()
    });

    textArea.value = "";
    await loadNotes(aptKey(apt));
  };
}

async function loadNotes(id) {
  const container = document.getElementById("notesContainer");
  if (!container) return;

  container.innerHTML = "";

  const snapshot = await db.collection("comments")
    .where("apartmentId", "==", id)
    .get();

  if (snapshot.empty) {
    const empty = document.createElement("div");
    empty.className = "sticky-note";
    empty.style.opacity = "0.75";
    empty.textContent = "No notes yet. Add one above.";
    container.appendChild(empty);
    return;
  }

  snapshot.forEach(doc => {
    const div = document.createElement("div");
    div.className = "sticky-note";
    div.textContent = doc.data().text || "";
    container.appendChild(div);
  });
}

// ==============================
// SORTING
// ==============================

sortSelect.addEventListener("change", () => {
  sortMode = sortSelect.value === "cheapest" ? "cheapest" : "distance";
});

// ==============================
// COMPARE MODE
// ==============================

function setCompareMode(on) {
  compareMode = !!on;
  compareToggleBtn.textContent = compareMode ? "Compare mode: On" : "Compare mode: Off";
}

function updateCompareButtons() {
  compareOpenBtn.textContent = `Compare (${compareSelection.length}/2)`;
  compareOpenBtn.disabled = compareSelection.length !== 2;
  compareClearBtn.disabled = compareSelection.length === 0;
}

function clearCompareSelection() {
  // Remove marker highlight class
  compareSelection.forEach((key) => {
    const m = aptIndex.get(key)?.marker;
    const el = m?.getElement();
    if (el) el.classList.remove("compare-selected");
  });

  compareSelection = [];
  updateCompareButtons();
}

function toggleCompareSelection(apt) {
  const key = aptKey(apt);
  const entry = aptIndex.get(key);
  const marker = entry?.marker;

  const idx = compareSelection.indexOf(key);
  if (idx >= 0) {
    compareSelection.splice(idx, 1);
    marker?.getElement()?.classList.remove("compare-selected");
  } else {
    if (compareSelection.length >= 2) {
      // remove oldest
      const oldKey = compareSelection.shift();
      const oldMarker = aptIndex.get(oldKey)?.marker;
      oldMarker?.getElement()?.classList.remove("compare-selected");
    }
    compareSelection.push(key);
    marker?.getElement()?.classList.add("compare-selected");
  }

  updateCompareButtons();
}

compareToggleBtn.addEventListener("click", () => {
  setCompareMode(!compareMode);
});

compareClearBtn.addEventListener("click", () => {
  clearCompareSelection();
});

compareOpenBtn.addEventListener("click", () => {
  if (compareSelection.length !== 2) return;
  openCompare(compareSelection[0], compareSelection[1]);
});

function openCompare(keyA, keyB) {
  const a = aptIndex.get(keyA)?.apt;
  const b = aptIndex.get(keyB)?.apt;
  if (!a || !b) return;

  fillCompareColumn("A", a);
  fillCompareColumn("B", b);

  compareModal.classList.remove("hidden");
  compareModal.setAttribute("aria-hidden", "false");
  document.body.classList.add("modal-open");
}

function closeCompare() {
  compareModal.classList.add("hidden");
  compareModal.setAttribute("aria-hidden", "true");
  document.body.classList.remove("modal-open");
}

compareBackdrop.addEventListener("click", closeCompare);
compareCloseBtn.addEventListener("click", closeCompare);

function fillCompareColumn(which, apt) {
  const dist = `${apt.distance.toFixed(2)} mi`;
  const rank = `${apt.rank}${ordinal(apt.rank)} closest`;

  const price = apt.one_bed_price || "TBD";
  const ac = apt.ac || "TBD";
  const parking = apt.parking || "TBD";
  const link = apt.website || "";

  if (which === "A") {
    cmpA_name.textContent = apt.name || "—";
    cmpA_addr.textContent = apt.address || "—";
    cmpA_dist.textContent = dist;
    cmpA_rank.textContent = rank;
    cmpA_price.textContent = price;
    cmpA_ac.textContent = ac;
    cmpA_parking.textContent = parking;

    if (link) {
      cmpA_link.href = link;
      cmpA_link.style.display = "inline-block";
    } else {
      cmpA_link.href = "#";
      cmpA_link.style.display = "none";
    }
  } else {
    cmpB_name.textContent = apt.name || "—";
    cmpB_addr.textContent = apt.address || "—";
    cmpB_dist.textContent = dist;
    cmpB_rank.textContent = rank;
    cmpB_price.textContent = price;
    cmpB_ac.textContent = ac;
    cmpB_parking.textContent = parking;

    if (link) {
      cmpB_link.href = link;
      cmpB_link.style.display = "inline-block";
    } else {
      cmpB_link.href = "#";
      cmpB_link.style.display = "none";
    }
  }
}

// ==============================
// LOAD APARTMENTS + MARKERS
// ==============================

fetch("./apartments.json")
  .then(res => {
    if (!res.ok) throw new Error("Failed to load apartments.json");
    return res.json();
  })
  .then(data => {
    apartments = data;

    // Compute distance + rank (distance-based rank)
    apartments.forEach(apt => {
      apt.lat = Number(apt.lat);
      apt.lng = Number(apt.lng);
      apt.distance = milesBetween(NU.lat, NU.lng, apt.lat, apt.lng);
      apt.priceNum = parsePriceToNumber(apt.one_bed_price);
    });

    apartments.sort((a, b) => a.distance - b.distance);
    apartments.forEach((apt, i) => apt.rank = i + 1);

    // Create markers
    apartments.forEach(apt => {
      const marker = L.marker([apt.lat, apt.lng], { icon: defaultIcon }).addTo(map);

      // Fade-in
      setTimeout(() => {
        marker.getElement()?.classList.add("marker-fade-in");
      }, 0);

      const key = aptKey(apt);
      aptIndex.set(key, { apt, marker });

      marker.on("click", () => {
        // Compare mode: select instead of opening panel
        if (compareMode) {
          toggleCompareSelection(apt);
          return;
        }

        // Normal: highlight marker and open panel
        if (activeMarker) {
          activeMarker.getElement()?.classList.remove("selected-marker");
        }
        activeMarker = marker;
        setTimeout(() => marker.getElement()?.classList.add("selected-marker"), 10);

        map.flyTo([apt.lat, apt.lng], 16, { duration: 0.6 });
        openPanel(apt);
      });
    });

    updateCompareButtons();
  })
  .catch(err => {
    console.error(err);
    alert("Could not load apartments.json");
  });
