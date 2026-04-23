let rawData = [];
let data = [];

let FIELDS = {
  category: null,
  subIssue: null,
  symptomId: null,
  symptomDesc: null,
  actionSupport: null,
  actionField: null,
  sparePart: null,
  sopLink: null
};

const state = {
  category: null,
  subIssue: null,
  symptomId: null,
  confirmedGroup: null
};

const categorySelect = document.getElementById("categorySelect");
const subIssueSelect = document.getElementById("subIssueSelect");
const skipSubIssueBtn = document.getElementById("skipSubIssueBtn");

const symptomSearch = document.getElementById("symptomSearch");
const symptomSelect = document.getElementById("symptomSelect");

const actionsSection = document.getElementById("actionsSection");
const actionsList = document.getElementById("actionsList");

const maintenanceSection = document.getElementById("maintenanceSection");
const maintenanceContent = document.getElementById("maintenanceContent");

/* =============================
   LOAD DATA
============================= */
fetch("data.json")
  .then(r => r.json())
  .then(json => {
    rawData = Array.isArray(json)
      ? json
      : Array.isArray(json.rows)
        ? json.rows
        : Object.values(json);

    detectFields(rawData[0]);
    data = rawData;

    populateCategories();
    populateSubIssues();
    populateSymptoms();
  });

/* =============================
   FIELD DETECTION
============================= */
function detectFields(sample) {
  const keys = Object.keys(sample);

  FIELDS.category      = keys.find(k => k.toLowerCase().includes("category"));
  FIELDS.subIssue      = keys.find(k => k.toLowerCase().includes("sub"));
  FIELDS.actionSupport = keys.find(k => k.toLowerCase().includes("support"));
  FIELDS.actionField   = keys.find(k => k.toLowerCase().includes("actions for field"));
  FIELDS.sparePart     = keys.find(k => k.toLowerCase().includes("spare"));
  FIELDS.sopLink       = keys.find(k => k.toLowerCase().includes("sop"));

  FIELDS.symptomId = keys.find(k => /^s-\d+/i.test(String(sample[k])));
  FIELDS.symptomDesc = keys.find(k => {
    const v = String(sample[k] || "");
    return v && k !== FIELDS.symptomId && !/^s-\d+/i.test(v);
  });
}

/* =============================
   CATEGORY
============================= */
function populateCategories() {
  categorySelect.innerHTML = '<option value="">-- Choose category --</option>';

  [...new Set(data.map(r => r[FIELDS.category]))]
    .filter(Boolean)
    .sort()
    .forEach(c => {
      const opt = document.createElement("option");
      opt.value = c;
      opt.textContent = c;
      categorySelect.appendChild(opt);
    });
}

categorySelect.addEventListener("change", e => {
  state.category = e.target.value || null;
  state.subIssue = null;
  state.symptomId = null;
  resetUI();
  populateSubIssues();
  populateSymptoms(symptomSearch.value);
});

/* =============================
   SUB-ISSUE
============================= */
function populateSubIssues() {
  subIssueSelect.innerHTML = '<option value="">-- Choose sub-issue --</option>';

  [...new Set(
    data
      .filter(r => !state.category || r[FIELDS.category] === state.category)
      .map(r => r[FIELDS.subIssue])
  )]
    .filter(Boolean)
    .sort()
    .forEach(s => {
      const opt = document.createElement("option");
      opt.value = s;
      opt.textContent = s;
      subIssueSelect.appendChild(opt);
    });
}

subIssueSelect.addEventListener("change", e => {
  state.subIssue = e.target.value || null;
  state.symptomId = null;
  resetUI();
  populateSymptoms(symptomSearch.value);
});

/* =============================
   SKIP / I DON’T KNOW
============================= */
skipSubIssueBtn.addEventListener("click", () => {
  state.subIssue = null;
  state.symptomId = null;
  resetUI();
  populateSymptoms(symptomSearch.value);
});

/* =============================
   SYMPTOMS
============================= */
function populateSymptoms(filter = "") {
  symptomSelect.innerHTML = '<option value="">-- Choose symptom --</option>';
  const f = filter.toLowerCase();

  const filtered = data.filter(r =>
    (!state.category || r[FIELDS.category] === state.category) &&
    (!state.subIssue || r[FIELDS.subIssue] === state.subIssue)
  );

  const map = {};
  filtered.forEach(r => {
    const id = r[FIELDS.symptomId];
    if (!map[id]) map[id] = r[FIELDS.symptomDesc];
  });

  Object.keys(map)
    .sort()
    .filter(id => `${id} ${map[id]}`.toLowerCase().includes(f))
    .forEach(id => {
      const opt = document.createElement("option");
      opt.value = id;
      opt.textContent = `${id} — ${map[id]}`;
      symptomSelect.appendChild(opt);
    });
}

symptomSearch.addEventListener("input", e => {
  populateSymptoms(e.target.value);
});

symptomSelect.addEventListener("change", e => {
  resetUI();
  state.symptomId = e.target.value;
  if (state.symptomId) loadActionsForSymptom();
});

/* =============================
   FIELD ORDER
============================= */
function getFieldOrder(row) {
  const m = String(row[FIELDS.actionField] || "").match(/^(\d+)_/);
  return m ? parseInt(m[1], 10) : 999;
}

/* =============================
   ACTIONS — SINGLE SYMPTOM
============================= */
function loadActionsForSymptom() {
  actionsSection.classList.remove("hidden");
  actionsList.innerHTML = "";

  const rows = data.filter(r =>
    r[FIELDS.symptomId] === state.symptomId &&
    (!state.category || r[FIELDS.category] === state.category) &&
    (!state.subIssue || r[FIELDS.subIssue] === state.subIssue) &&
    String(r[FIELDS.actionSupport] || "").trim() !== "/"
  );

  renderActions(actionsList, rows);
}

/* =============================
   RENDER SUPPORT ACTIONS
============================= */
function renderActions(container, rows) {
  const bySupport = {};

  rows.forEach(r => {
    if (!bySupport[r[FIELDS.actionSupport]]) {
      bySupport[r[FIELDS.actionSupport]] = [];
    }
    bySupport[r[FIELDS.actionSupport]].push(r);
  });

  Object.values(bySupport)
    .sort((a, b) =>
      Math.min(...a.map(getFieldOrder)) - Math.min(...b.map(getFieldOrder))
    )
    .forEach(group => {
      const first = group[0];

      const sop = String(first[FIELDS.sopLink] || "").trim().toUpperCase();
      const showHowTo = sop && sop !== "/" && sop !== "I";

      const div = document.createElement("div");
      div.className = "action-line assess";
      div.innerHTML = `
        <div class="action-text">${first[FIELDS.actionSupport]}</div>
        <div class="action-buttons">
          <button class="issue-btn">Issue confirmed</button>
          ${showHowTo ? `<button class="howto-btn">How to</button>` : ""}
        </div>
      `;

      div.querySelector(".issue-btn").onclick = () => {
        state.confirmedGroup = group;
        showMaintenance();
      };

      if (showHowTo) {
        div.querySelector(".howto-btn").onclick = () => {
          window.open(first[FIELDS.sopLink], "_blank");
        };
      }

      container.appendChild(div);
    });
}

/* =============================
   MAINTENANCE (🔥 FIX HERE)
============================= */
function showMaintenance() {
  const rows = state.confirmedGroup;
  if (!rows || !rows.length) return;

  const base = rows[0];
  const symptomText = `${base[FIELDS.symptomId]} — ${base[FIELDS.symptomDesc]}`;

  const actions = rows
    .sort((a, b) => getFieldOrder(a) - getFieldOrder(b))
    .map(r => r[FIELDS.actionField]);

  const spare = String(base[FIELDS.sparePart] || "").trim();
  const showSpare = spare && spare !== "/";

  maintenanceContent.innerHTML = `
    <div class="maintenance-box">
      <div class="maintenance-row">
        <div class="maintenance-label">Sub issue:</div>
        <div class="maintenance-value">${base[FIELDS.subIssue]}</div>
      </div>
      <div class="maintenance-row">
        <div class="maintenance-label">Symptom to confirm on site:</div>
        <div class="maintenance-value">${symptomText}</div>
      </div>
      <div class="maintenance-row">
        <div class="maintenance-label">Actions to do:</div>
        <div class="maintenance-value">
          ${actions.map(a =>
            `<label class="checkbox-item"><input type="checkbox" /> ${a}</label>`
          ).join("")}
        </div>
      </div>
      ${showSpare ? `
      <div class="maintenance-row">
        <div class="maintenance-label">Spare parts needed:</div>
        <div class="maintenance-value">
          <label class="checkbox-item"><input type="checkbox" /> ${spare}</label>
        </div>
      </div>` : ""}
    </div>
  `;

  // 🔥 THIS WAS MISSING
  maintenanceSection.classList.remove("hidden");
}

/* =============================
   RESET
============================= */
function resetUI() {
  actionsSection.classList.add("hidden");
  maintenanceSection.classList.add("hidden");
  state.confirmedGroup = null;
}
