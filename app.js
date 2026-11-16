const STORAGE_KEY = "rooted-dietician-workspace-v1";
const appView = document.getElementById("appView");
const modalRoot = document.getElementById("modalRoot");
const toastRoot = document.getElementById("toastRoot");
const today = new Date();
const todayISO = dateISO(today);

function dateISO(date) {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function shiftDate(date, days) {
  const next = new Date(`${date}T12:00:00`);
  next.setDate(next.getDate() + days);
  return dateISO(next);
}
function formatDate(value, options = { day: "numeric", month: "short" }) {
  if (!value) return "Not scheduled";
  return new Intl.DateTimeFormat("en-IN", options).format(new Date(`${value}T12:00:00`));
}
function initials(name = "") {
  return name.trim().split(/\s+/).slice(0, 2).map((part) => part[0] || "").join("").toUpperCase();
}
function escapeHTML(value = "") {
  return String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
}
function uid() {
  return `c-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}
function defaultPlan() {
  return null;
}
function createSeedClients() {
  return [
    { id: "demo-1", name: "Meera Nair", gender: "female", age: 34, weight: 72, height: 162, goalWeight: 64, months: 4, pal: 1.3, proteinPerKg: 1.1, fatPerKg: .7, preference: "Vegetarian", region: "South Indian", allergies: "Peanuts", conditions: "", medications: "", supplements: "", consent: true, lastVisit: shiftDate(todayISO, -12), nextVisit: shiftDate(todayISO, 2), nextTime: "10:30", status: "Active", logs: [], plan: defaultPlan(), feedback: "Enjoyed the breakfast options; needs quick lunches.", color: "sage" },
    { id: "demo-2", name: "Rohan Khanna", gender: "male", age: 41, weight: 88, height: 178, goalWeight: 80, months: 5, pal: 1.5, proteinPerKg: 1, fatPerKg: .7, preference: "Non-vegetarian", region: "North Indian", allergies: "", conditions: "", medications: "", supplements: "", consent: true, lastVisit: shiftDate(todayISO, -7), nextVisit: shiftDate(todayISO, 7), nextTime: "12:00", status: "Active", logs: [], plan: defaultPlan(), feedback: "", color: "blue" },
    { id: "demo-3", name: "Aditi Rao", gender: "female", age: 29, weight: 66, height: 165, goalWeight: 60, months: 3, pal: 1.3, proteinPerKg: 1, fatPerKg: .6, preference: "Egg", region: "Maharashtrian", allergies: "", conditions: "", medications: "", supplements: "", consent: true, lastVisit: shiftDate(todayISO, -14), nextVisit: todayISO, nextTime: "15:30", status: "Active", logs: [], plan: defaultPlan(), feedback: "Afternoon hunger is a little high.", color: "peach" },
    { id: "demo-4", name: "Kabir Das", gender: "male", age: 52, weight: 94, height: 171, goalWeight: 86, months: 4, pal: 1.2, proteinPerKg: 1, fatPerKg: .6, preference: "Vegetarian", region: "Bengali", allergies: "", conditions: "Type 2 diabetes", medications: "Client-reported; review in consultation", supplements: "", consent: true, lastVisit: shiftDate(todayISO, -17), nextVisit: shiftDate(todayISO, -3), nextTime: "11:00", status: "Needs review", logs: [], plan: defaultPlan(), feedback: "", color: "pink" }
  ];
}
function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (saved && Array.isArray(saved.clients)) return { ...saved, settings: { reminderEmail: "", remindersEnabled: false, ...(saved.settings || {}) } };
  } catch (error) {
    console.error("Could not read saved workspace data.", error);
    toast("Saved workspace data could not be read. A new demo workspace is shown.", true);
  }
  return { clients: createSeedClients(), settings: { reminderEmail: "", remindersEnabled: false } };
}
let state = loadState();
let route = "dashboard";
let selectedClientId = null;
let selectedTab = "overview";
let selectedMealDate = todayISO;
let clientQuery = "";
let clientFilter = "all";

function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    console.error("Could not save workspace data.", error);
    toast("Could not save changes in this browser. Check available storage.", true);
    return false;
  }
  updateNavCount();
  return true;
}
function toast(message, error = false) {
  const node = document.createElement("div");
  node.className = `toast${error ? " error" : ""}`;
  node.textContent = message;
  toastRoot.append(node);
  window.setTimeout(() => node.remove(), 3200);
}
function getClient(id) {
  return state.clients.find((client) => client.id === id);
}
function updateNavCount() {
  document.getElementById("clientNavCount").textContent = state.clients.length;
}
function avatarClass(client) {
  return `avatar-${client.color || "sage"}`;
}
function getCalc(client) {
  const weight = Number(client.weight);
  const height = Number(client.height);
  const months = Number(client.months);
  const goalWeight = Number(client.goalWeight);
  const pal = Number(client.pal);
  const proteinPerKg = Number(client.proteinPerKg);
  const fatPerKg = Number(client.fatPerKg);
  if (![weight, height, months, goalWeight, pal, proteinPerKg, fatPerKg].every(Number.isFinite) || weight <= 0 || height <= 0 || months <= 0 || goalWeight <= 0 || goalWeight > weight || pal <= 0 || proteinPerKg < 0 || fatPerKg < 0) return null;
  const ibw = height - (client.gender === "male" ? 100 : 105);
  const bmi = weight / ((height / 100) ** 2);
  const category = bmi < 18.5 ? "Underweight" : bmi < 25 ? "Normal" : bmi < 30 ? "Overweight" : bmi < 35 ? "Obese" : "Extremely obese";
  const bmr = weight * (client.gender === "male" ? 24 : 22.5);
  const monthlyLoss = (weight - goalWeight) / months;
  const totalDeficit = monthlyLoss * 7700;
  const dailyDeficit = totalDeficit / 30;
  const tdee = bmr * pal;
  const calories = Math.floor(tdee - dailyDeficit);
  const proteinGrams = proteinPerKg * weight;
  const proteinCalories = proteinGrams * 4;
  const fatGrams = fatPerKg * weight;
  const fatCalories = fatGrams * 9;
  const carbCalories = calories - proteinCalories - fatCalories;
  const carbGrams = carbCalories / 4;
  return { ibw, bmi, category, bmr, monthlyLoss, totalDeficit, dailyDeficit, tdee, calories, proteinGrams, proteinCalories, fatGrams, fatCalories, carbCalories, carbGrams, lossPerWeek: monthlyLoss / 4.345 };
}
function goalProgress(client) {
  const total = Number(client.weight) - Number(client.goalWeight);
  if (total <= 0) return 100;
  const start = Number(client.startWeight || client.weight);
  return Math.max(0, Math.min(100, Math.round(((start - Number(client.weight)) / (start - Number(client.goalWeight))) * 100)));
}
function isOverdue(client) {
  return client.nextVisit && client.nextVisit < todayISO;
}
function consultStatus(client) {
  if (isOverdue(client)) return "Overdue";
  if (client.nextVisit === todayISO) return "Today";
  return "Upcoming";
}
function setRoute(next) {
  route = next;
  if (next !== "detail") selectedClientId = null;
  document.querySelectorAll(".nav-link[data-route]").forEach((button) => button.classList.toggle("active", button.dataset.route === next || (next === "detail" && button.dataset.route === "clients")));
  render();
  document.getElementById("sidebar").classList.remove("open");
}
function render() {
  const labels = { dashboard: "Overview", clients: "Clients", schedule: "Consultations", settings: "Settings", detail: "Client profile" };
  document.getElementById("pageCrumb").textContent = labels[route] || "Overview";
  updateNavCount();
  if (route === "dashboard") renderDashboard();
  if (route === "clients") renderClients();
  if (route === "schedule") renderSchedule();
  if (route === "settings") renderSettings();
  if (route === "detail") renderClientDetail();
}
function heading(kicker, title, subtitle, action = "") {
  return `<div class="page-heading"><div><div class="eyebrow">${kicker}</div><h1>${title}</h1><p class="subheading">${subtitle}</p></div>${action}</div>`;
}
function statCard(label, value, foot, icon) {
  return `<article class="stat-card"><div class="stat-label">${label}<span class="stat-icon">${icon}</span></div><div class="stat-value">${value}</div><div class="stat-foot">${foot}</div></article>`;
}
function clientTableRow(client) {
  const next = client.nextVisit ? formatDate(client.nextVisit) : "Not scheduled";
  const pill = isOverdue(client) ? "warning" : client.nextVisit === todayISO ? "" : "neutral";
  const label = isOverdue(client) ? "Overdue" : client.nextVisit === todayISO ? "Today" : client.status;
  return `<tr>
    <td class="client-name-cell" data-open-client="${client.id}"><span class="avatar ${avatarClass(client)}">${initials(client.name)}</span>${escapeHTML(client.name)}</td>
    <td>${escapeHTML(client.preference || "—")}</td>
    <td>${formatDate(client.lastVisit)}</td>
    <td>${next}</td>
    <td><span class="status-pill ${pill}"><i class="mini-dot"></i>${label}</span></td>
  </tr>`;
}
function upcomingConsultations(limit = 4) {
  return state.clients.filter((client) => client.nextVisit).sort((a, b) => a.nextVisit.localeCompare(b.nextVisit)).slice(0, limit);
}
function renderDashboard() {
  const active = state.clients.filter((client) => client.status !== "Archived").length;
  const todayClients = state.clients.filter((client) => client.nextVisit === todayISO);
  const overdue = state.clients.filter(isOverdue);
  const upcoming = upcomingConsultations(4);
  const rows = state.clients.slice().sort((a, b) => (a.nextVisit || "9999").localeCompare(b.nextVisit || "9999")).slice(0, 5);
  appView.innerHTML = `${heading("MONDAY, A LITTLE MORE BALANCE", "Good morning, Priya <span aria-hidden=\"true\">✳</span>", "A clear view of your practice, and the people you care for.", `<button class="primary-button" data-action="add-client"><span>＋</span> Add a client</button>`)}
    <div class="stats-grid">
      ${statCard("Active clients", active, `<span class="positive">↑ ${Math.min(active, 3)} new this month</span>`, "♧")}
      ${statCard("Consultations today", todayClients.length, `${todayClients.length ? "Your day is taking shape" : "A little breathing room today"}`, "▦")}
      ${statCard("Follow-ups overdue", overdue.length, overdue.length ? "Worth a gentle check-in" : "Everyone is on track", "↻")}
      ${statCard("Meal logs this week", state.clients.reduce((sum, client) => sum + client.logs.filter((log) => log.date >= shiftDate(todayISO, -6)).length, 0), "Across all active clients", "☷")}
    </div>
    <div class="dashboard-grid">
      <section class="panel">
        <div class="panel-heading"><div><h2 class="panel-title">Your clients</h2><div class="panel-subtitle">A quick look at who's on your mind</div></div><button class="link-button" data-route="clients">View all clients&nbsp; →</button></div>
        ${rows.length ? `<table class="client-table"><thead><tr><th>CLIENT</th><th>PREFERENCE</th><th>LAST VISIT</th><th>NEXT VISIT</th><th>STATUS</th></tr></thead><tbody>${rows.map(clientTableRow).join("")}</tbody></table>` : `<div class="empty-state">Your client list starts here. Add your first client to get going.</div>`}
      </section>
      <section class="panel">
        <div class="panel-heading"><div><h2 class="panel-title">Coming up</h2><div class="panel-subtitle">Your next client check-ins</div></div><button class="link-button" data-route="schedule">Full schedule&nbsp; →</button></div>
        <div class="consult-list">${upcoming.length ? upcoming.map((client) => `<div class="consult-item" data-open-client="${client.id}" role="button" tabindex="0"><div class="date-tile"><strong>${new Date(`${client.nextVisit}T12:00:00`).getDate()}</strong><small>${new Intl.DateTimeFormat("en-IN", { month: "short" }).format(new Date(`${client.nextVisit}T12:00:00`))}</small></div><div class="consult-info"><strong>${escapeHTML(client.name)}</strong><small>${escapeHTML(client.preference || "Client")} · ${client.nextTime || "Time not set"}</small></div><span class="consult-time">${client.nextVisit < todayISO ? "Overdue" : client.nextVisit === todayISO ? "Today" : ""}</span></div>`).join("") : `<div class="empty-state">No consultations scheduled yet.</div>`}</div>
      </section>
    </div>
    <section class="panel activity-panel"><div class="panel-heading"><div><h2 class="panel-title">A few gentle nudges</h2><div class="panel-subtitle">Items that may need your attention</div></div></div>
      ${overdue.length ? overdue.map((client) => `<div class="activity-row"><div class="activity-mark">↻</div><div class="activity-copy"><strong>${escapeHTML(client.name)}</strong> is due for a follow-up.<small>Scheduled ${formatDate(client.nextVisit)} · Mark complete or reschedule from their profile.</small></div><button class="link-button" data-open-client="${client.id}">Take a look →</button></div>`).join("") : `<div class="activity-row"><div class="activity-mark">✓</div><div class="activity-copy"><strong>You're all caught up.</strong> Follow-ups will appear here when a client's consultation is due.<small>Everything in its own time.</small></div></div>`}
    </section>`;
}
function renderClients() {
  const filtered = state.clients.filter((client) => {
    const matchesText = `${client.name} ${client.preference} ${client.region}`.toLowerCase().includes(clientQuery.toLowerCase());
    const matchesFilter = clientFilter === "all" || (clientFilter === "overdue" ? isOverdue(client) : client.status === clientFilter);
    return matchesText && matchesFilter;
  });
  appView.innerHTML = `${heading("YOUR PRACTICE", "Clients", `${state.clients.length} client${state.clients.length === 1 ? "" : "s"} in your care. One person at a time.`, `<button class="primary-button" data-action="add-client"><span>＋</span> Add a client</button>`)}
    <div class="toolbar" style="margin-bottom:15px">
      <label class="search-box"><span>⌕</span><input id="clientSearch" type="search" placeholder="Search clients..." value="${escapeHTML(clientQuery)}" /></label>
      <select class="filter-select" id="clientFilter" aria-label="Filter clients"><option value="all" ${clientFilter === "all" ? "selected" : ""}>All clients</option><option value="Active" ${clientFilter === "Active" ? "selected" : ""}>Active</option><option value="overdue" ${clientFilter === "overdue" ? "selected" : ""}>Overdue follow-up</option><option value="Needs review" ${clientFilter === "Needs review" ? "selected" : ""}>Needs review</option></select>
    </div>
    ${filtered.length ? `<div class="client-grid">${filtered.map((client) => {
      const progress = goalProgress(client);
      return `<article class="client-card" data-open-client="${client.id}" tabindex="0">
        <div class="client-card-top"><div class="client-card-person"><span class="avatar ${avatarClass(client)}">${initials(client.name)}</span><div><strong>${escapeHTML(client.name)}</strong><small>${escapeHTML(client.preference || "Preference not set")} · ${escapeHTML(client.region || "Cuisine not set")}</small></div></div><button class="card-kebab" aria-label="Open ${escapeHTML(client.name)} profile">···</button></div>
        <div class="client-goal"><div class="client-goal-head"><span>Progress toward goal</span><strong>${progress}%</strong></div><div class="progress-track"><div class="progress-fill" style="width:${progress}%"></div></div></div>
        <div class="client-meta"><div><small>Current → goal</small><strong>${Number(client.weight)} kg → ${Number(client.goalWeight)} kg</strong></div><div><small>Next consultation</small><strong>${client.nextVisit ? formatDate(client.nextVisit) : "Not set"}</strong></div></div>
      </article>`;
    }).join("")}</div>` : `<section class="panel empty-state">${clientQuery || clientFilter !== "all" ? "No clients match this search." : "No clients yet. Add your first client to begin."}</section>`}`;
}
function renderClientDetail() {
  const client = getClient(selectedClientId);
  if (!client) { route = "clients"; renderClients(); return; }
  const calc = getCalc(client);
  const tabNames = [["overview", "Overview"], ["nutrition", "Nutrition targets"], ["meals", "Meal log"], ["plan", "7-day plan"], ["suggestions", "Suggestions"], ["consultations", "Consultations"]];
  const safeFlag = (client.conditions || "").toLowerCase().match(/pregnan|diabet|kidney|renal|eating disorder|insulin|paediatric|pediatric/);
  const alert = safeFlag ? `<div class="notice warning"><span class="notice-icon">⚠</span><span>Condition noted: <strong>${escapeHTML(client.conditions)}</strong>. Please review manually. No automated nutrition suggestions are appropriate for this client without your clinical assessment.</span></div>` : "";
  const nextDate = client.nextVisit ? `${formatDate(client.nextVisit, { weekday: "long", day: "numeric", month: "long", year: "numeric" })} · ${client.nextTime || "Time not set"}` : "Not scheduled";
  appView.innerHTML = `<button class="detail-back" data-route="clients">←&nbsp; All clients</button>
    <div class="page-heading detail-heading"><div class="detail-person"><span class="avatar ${avatarClass(client)}">${initials(client.name)}</span><div><div class="eyebrow">CLIENT PROFILE</div><h1>${escapeHTML(client.name)}</h1><p>${Number(client.age)} years · ${escapeHTML(client.preference || "Preference not set")} · ${escapeHTML(client.region || "Cuisine not set")}</p></div></div><div class="detail-actions"><button class="secondary-button" data-action="edit-client">Edit profile</button><button class="primary-button" data-action="schedule-consult">＋ Schedule follow-up</button></div></div>
    <div class="detail-tabs">${tabNames.map(([id, name]) => `<button class="detail-tab ${selectedTab === id ? "active" : ""}" data-tab="${id}">${name}</button>`).join("")}</div>
    ${alert}
    ${selectedTab === "overview" ? renderOverview(client, calc, nextDate) : ""}
    ${selectedTab === "nutrition" ? renderNutrition(client, calc) : ""}
    ${selectedTab === "meals" ? renderMeals(client) : ""}
    ${selectedTab === "plan" ? renderPlan(client, calc) : ""}
    ${selectedTab === "suggestions" ? renderSuggestions(client, calc) : ""}
    ${selectedTab === "consultations" ? renderClientConsultations(client) : ""}`;
}
function renderOverview(client, calc, nextDate) {
  const logs = client.logs || [];
  const daysWithLogs = new Set(logs.filter((log) => log.date >= shiftDate(todayISO, -6)).map((log) => log.date)).size;
  const start = Number(client.startWeight || client.weight);
  const change = start - Number(client.weight);
  return `<div class="detail-layout"><div class="detail-stack">
    <section class="panel"><div class="panel-heading"><div><h2 class="panel-title">At a glance</h2><div class="panel-subtitle">The latest from ${escapeHTML(client.name.split(" ")[0])}'s care</div></div><button class="link-button" data-tab="nutrition">View nutrition targets →</button></div>
      <div class="metric-grid"><div class="metric-box"><small>Current weight</small><strong>${Number(client.weight)}<em>kg</em></strong></div><div class="metric-box"><small>BMI</small><strong>${calc ? calc.bmi.toFixed(1) : "—"}</strong></div><div class="metric-box"><small>Daily target</small><strong>${calc ? calc.calories.toLocaleString("en-IN") : "—"}<em>kcal</em></strong></div><div class="metric-box"><small>Meals logged · 7 days</small><strong>${daysWithLogs}<em>/7 days</em></strong></div></div>
    </section>
    <section class="panel"><div class="panel-heading"><div><h2 class="panel-title">Goal progress</h2><div class="panel-subtitle">A steady, supportive approach</div></div><span class="status-pill"><i class="mini-dot"></i>${escapeHTML(client.status)}</span></div>
      <div class="goal-strip"><div class="goal-graphic">↘</div><div class="goal-copy"><strong>${Number(client.weight)} kg now · ${Number(client.goalWeight)} kg goal</strong><small>${change > 0 ? `${change.toFixed(1)} kg progress from starting weight` : "Starting point recorded for progress"}</small></div><div class="goal-value">${goalProgress(client)}%</div></div>
    </section>
    <section class="panel"><div class="panel-heading"><div><h2 class="panel-title">Care notes</h2><div class="panel-subtitle">Preferences and context for your next conversation</div></div></div>
      <div class="list-row"><span>Food preferences</span><strong>${escapeHTML(client.preference || "Not added")}</strong></div><div class="list-row"><span>Region / cuisine</span><strong>${escapeHTML(client.region || "Not added")}</strong></div><div class="list-row"><span>Allergies</span><strong>${escapeHTML(client.allergies || "None recorded")}</strong></div><div class="list-row"><span>Medical notes</span><strong>${escapeHTML(client.conditions || "None recorded")}</strong></div>${client.feedback ? `<div class="notice info" style="margin-top:11px"><span class="notice-icon">♡</span><span>Recent feedback: ${escapeHTML(client.feedback)}</span></div>` : ""}
    </section>
  </div><div class="detail-stack">
    <section class="panel"><div class="panel-heading"><div><h2 class="panel-title">Next consultation</h2><div class="panel-subtitle">${client.nextVisit && client.nextVisit < todayISO ? "This follow-up is overdue" : "A little time set aside for care"}</div></div><span class="date-tile"><strong>${client.nextVisit ? new Date(`${client.nextVisit}T12:00:00`).getDate() : "—"}</strong><small>${client.nextVisit ? new Intl.DateTimeFormat("en-IN", { month: "short" }).format(new Date(`${client.nextVisit}T12:00:00`)) : "DATE"}</small></span></div>
      <div class="list-row"><span>Date & time</span><strong>${nextDate}</strong></div><div class="list-row"><span>Last visit</span><strong>${formatDate(client.lastVisit, { day: "numeric", month: "short", year: "numeric" })}</strong></div><button class="secondary-button button-small" style="margin-top:12px;width:100%" data-action="schedule-consult">Reschedule follow-up</button>
    </section>
    <section class="panel"><div class="panel-heading"><div><h2 class="panel-title">Quick actions</h2><div class="panel-subtitle">Keep care moving gently</div></div></div><button class="secondary-button button-small" style="width:100%;margin-bottom:7px" data-tab="meals">＋ Add a meal log</button><button class="secondary-button button-small" style="width:100%;margin-bottom:7px" data-tab="plan">✳ Build a weekly plan</button><button class="secondary-button button-small" style="width:100%" data-tab="nutrition">⌁ Review calorie targets</button></section>
    <div class="notice info"><span class="notice-icon">⌑</span><span>Health details are sensitive. This prototype stores client records in this browser only.</span></div>
  </div></div>`;
}
function renderNutrition(client, calc) {
  const safe = calc && calc.lossPerWeek > 1;
  const low = calc && calc.calories < 1200;
  const total = calc ? calc.proteinCalories + calc.fatCalories + calc.carbCalories : 0;
  return `<div class="detail-layout"><div class="detail-stack">
    <section class="panel"><div class="panel-heading"><div><h2 class="panel-title">Vitals & calculation inputs</h2><div class="panel-subtitle">Adjust an input and recalculate to review every step</div></div></div>
      <form id="calcForm"><div class="calc-form-grid">
        ${inputField("Current weight (kg)", "weight", client.weight, "number", "0.1")}
        ${inputField("Height (cm)", "height", client.height, "number", "0.1")}
        ${inputField("Goal weight (kg)", "goalWeight", client.goalWeight, "number", "0.1")}
        ${inputField("Duration (months)", "months", client.months, "number", "1")}
        <div class="field-wrap"><label for="gender">Gender</label><select class="field-select" id="gender" name="gender"><option value="female" ${client.gender === "female" ? "selected" : ""}>Female</option><option value="male" ${client.gender === "male" ? "selected" : ""}>Male</option></select></div>
        <div class="field-wrap"><label for="pal">Activity level (PAL)</label><select class="field-select" id="pal" name="pal">${[[1.2,"Sedentary"],[1.3,"Lightly active"],[1.5,"Moderately active"],[1.7,"Very active"],[1.9,"Extremely active"]].map(([value,label]) => `<option value="${value}" ${Number(client.pal) === value ? "selected" : ""}>${label} · ${value}</option>`).join("")}</select></div>
        ${inputField("Protein (g/kg)", "proteinPerKg", client.proteinPerKg, "number", "0.1")}
        ${inputField("Fat (g/kg)", "fatPerKg", client.fatPerKg, "number", "0.1")}
      </div><div style="display:flex;justify-content:flex-end;margin-top:12px"><button class="primary-button button-small" type="submit">Recalculate targets</button></div></form>
    </section>
    ${!calc ? `<div class="notice warning"><span class="notice-icon">⚠</span><span>Some inputs are missing or invalid. Enter a positive height, weight, duration and valid goal weight before calculating.</span></div>` : ""}
    ${safe || low ? `<div class="notice warning"><span class="notice-icon">⚠</span><span>${safe ? `The planned rate is ${calc.lossPerWeek.toFixed(1)} kg/week, above the 1 kg/week review threshold. ` : ""}${low ? `The calculated intake is below the 1,200 kcal review floor. ` : ""}Please confirm the target is clinically appropriate before using it.</span></div>` : ""}
    ${calc ? `<section class="panel"><div class="panel-heading"><div><h2 class="panel-title">Daily macro targets</h2><div class="panel-subtitle">Calculated from the dietician's chosen grams per kg</div></div></div>
      <div class="metric-grid"><div class="metric-box"><small>Daily calories</small><strong>${calc.calories.toLocaleString("en-IN")}<em>kcal</em></strong></div><div class="metric-box"><small>Protein</small><strong>${calc.proteinGrams.toFixed(0)}<em>g</em></strong></div><div class="metric-box"><small>Fat</small><strong>${calc.fatGrams.toFixed(0)}<em>g</em></strong></div><div class="metric-box"><small>Carbohydrate</small><strong>${calc.carbGrams.toFixed(0)}<em>g</em></strong></div></div>
    </section>` : ""}
  </div><div class="detail-stack">
    ${calc ? `<section class="panel"><div class="panel-heading"><div><h2 class="panel-title">Calculation audit</h2><div class="panel-subtitle">Sheet rule of thumb · age is recorded, not used</div></div></div><div class="formula-list">
      ${formulaRow("Ideal body weight (IBW)", `Height − ${client.gender === "male" ? "100" : "105"} cm`, `${calc.ibw.toFixed(1)} kg`)}
      ${formulaRow("BMI", "Weight ÷ height²", `${calc.bmi.toFixed(1)} · ${calc.category}`)}
      ${formulaRow("BMR", `Weight × ${client.gender === "male" ? "24" : "22.5"} kcal/kg`, `${calc.bmr.toFixed(0)} kcal`)}
      ${formulaRow("Monthly weight loss", "(Current − goal) ÷ months", `${calc.monthlyLoss.toFixed(2)} kg`)}
      ${formulaRow("Total deficit", "Monthly loss × 7,700 kcal/kg", `${calc.totalDeficit.toFixed(0)} kcal`)}
      ${formulaRow("Daily deficit", "Total deficit ÷ 30 days", `${calc.dailyDeficit.toFixed(0)} kcal`)}
      ${formulaRow("TDEE", `BMR × PAL (${Number(client.pal).toFixed(1)})`, `${calc.tdee.toFixed(0)} kcal`)}
      ${formulaRow("Daily intake target", "TDEE − daily deficit, rounded down", `${calc.calories.toLocaleString("en-IN")} kcal`)}
      ${formulaRow("Protein", `${Number(client.proteinPerKg)} g/kg × ${Number(client.weight)} kg × 4`, `${calc.proteinGrams.toFixed(1)} g · ${calc.proteinCalories.toFixed(0)} kcal`)}
      ${formulaRow("Fat", `${Number(client.fatPerKg)} g/kg × ${Number(client.weight)} kg × 9`, `${calc.fatGrams.toFixed(1)} g · ${calc.fatCalories.toFixed(0)} kcal`)}
      ${formulaRow("Carbohydrate", "(Target − protein kcal − fat kcal) ÷ 4", `${calc.carbGrams.toFixed(1)} g · ${calc.carbCalories.toFixed(0)} kcal`)}
      ${formulaRow("Macro total check", "Protein + fat + carbohydrate calories", `${total.toFixed(0)} / ${calc.calories} kcal`)}
    </div></section><div class="notice info"><span class="notice-icon">i</span><span>These reproduce the PRD's spreadsheet formulas. They are decision-support only, not medical advice. Confirm all targets before sharing.</span></div>` : ""}
    </div></div>`;
}
function inputField(label, name, value, type = "text", step = "") {
  return `<div class="field-wrap"><label for="${name}">${label}</label><input class="field-input" id="${name}" name="${name}" type="${type}" value="${escapeHTML(value)}" ${step ? `step="${step}"` : ""} ${type === "number" ? 'min="0"' : ""} required></div>`;
}
function formulaRow(label, formula, result) {
  return `<div class="formula-row"><span>${label}<small>${formula}</small></span><strong>${result}</strong></div>`;
}
const foodCatalog = [
  { name: "Idli", kcal100: 146, unit: "piece", grams: 40 },
  { name: "Sambar", kcal100: 75, unit: "katori", grams: 150 },
  { name: "Cooked rice", kcal100: 130, unit: "katori", grams: 150 },
  { name: "Chapati", kcal100: 297, unit: "piece", grams: 35 },
  { name: "Dal", kcal100: 116, unit: "katori", grams: 150 },
  { name: "Paneer", kcal100: 265, unit: "grams", grams: 100 },
  { name: "Curd", kcal100: 61, unit: "katori", grams: 150 },
  { name: "Banana", kcal100: 89, unit: "piece", grams: 100 },
  { name: "Poha", kcal100: 130, unit: "cup", grams: 150 },
  { name: "Egg, boiled", kcal100: 155, unit: "piece", grams: 50 },
  { name: "Chicken, cooked", kcal100: 165, unit: "grams", grams: 100 },
  { name: "Vegetable sabzi", kcal100: 90, unit: "katori", grams: 150 }
];
const mealSlots = ["Early morning", "Breakfast", "Mid-morning", "Lunch", "Evening snack", "Dinner", "Bedtime"];
function unitGrams(food, unit, quantity) {
  const base = unit === food.unit ? food.grams : unit === "piece" ? 50 : unit === "cup" ? 150 : unit === "katori" ? 150 : unit === "tsp" ? 5 : unit === "grams" ? 1 : 100;
  return base * quantity;
}
function renderMeals(client) {
  const logs = (client.logs || []).filter((log) => log.date === selectedMealDate);
  const totalKcal = logs.reduce((sum, log) => sum + Number(log.kcal || 0), 0);
  const options = foodCatalog.map((food) => `<option value="${escapeHTML(food.name)}">${escapeHTML(food.name)}</option>`).join("");
  return `<div class="detail-layout"><div class="detail-stack">
    <section class="panel"><div class="panel-heading"><div><h2 class="panel-title">Daily meal log</h2><div class="panel-subtitle">Capture what was eaten, one meal at a time</div></div><span class="status-pill neutral">${logs.length} entr${logs.length === 1 ? "y" : "ies"}</span></div>
      <div class="meal-day-head"><span>Meals for the selected day</span><input class="field-input" id="mealDate" type="date" value="${selectedMealDate}" style="padding:6px 8px;font-size:9px"></div>
      <form id="mealForm" class="meal-entry"><select class="field-select" name="slot" aria-label="Meal slot">${mealSlots.map((slot) => `<option>${slot}</option>`).join("")}</select><input class="field-input" name="food" list="foodOptions" placeholder="Food item" aria-label="Food item" required><datalist id="foodOptions">${options}</datalist><input class="field-input" name="quantity" type="number" min=".1" step=".1" value="1" aria-label="Quantity" required><select class="field-select" name="unit" aria-label="Quantity unit"><option>piece</option><option>katori</option><option>cup</option><option>grams</option><option>tsp</option></select><button class="primary-button button-small" type="submit">＋ Add</button></form>
      ${mealSlots.map((slot) => { const items = logs.filter((log) => log.slot === slot); return items.length ? `<div class="meal-slot"><div class="meal-slot-head"><span>${slot}</span><span>${items.reduce((sum, item) => sum + item.kcal, 0).toFixed(0)} kcal approx.</span></div>${items.map((item) => `<div class="meal-item"><span>${escapeHTML(item.food)} · ${item.quantity} ${escapeHTML(item.unit)}</span><span>${Number(item.kcal).toFixed(0)} kcal</span></div>`).join("")}</div>` : ""; }).join("") || `<div class="empty-state">No meals logged for this day yet.</div>`}
    </section>
  </div><div class="detail-stack">
    <section class="panel"><div class="panel-heading"><div><h2 class="panel-title">Daily total</h2><div class="panel-subtitle">A rough estimate from a tiny demo food list</div></div></div>
      <div class="metric-box" style="margin-bottom:10px"><small>Estimated energy</small><strong>${totalKcal.toFixed(0)}<em>kcal</em></strong></div>
      <div class="notice warning"><span class="notice-icon">i</span><span>Food values are illustrative placeholders, not verified IFCT data. Confirm quantities and nutrients before using this for clinical decisions.</span></div>
    </section>
    <section class="panel"><div class="panel-heading"><div><h2 class="panel-title">Logging guide</h2></div></div><div class="list-row"><span>Client-friendly quantity</span><strong>e.g. 2 pieces / 1 katori</strong></div><div class="list-row"><span>Remember</span><strong>Oil, sauces & drinks</strong></div><div class="list-row"><span>Keep it gentle</span><strong>Missing days are okay</strong></div></section>
    <button class="secondary-button" data-action="meal-export" style="width:100%">Download meal log (CSV)</button>
  </div></div>`;
}
const planChoices = [
  ["Oats porridge + fruit", "Vegetable poha + curd", "Idli + sambar", "Besan chilla + chutney", "Egg bhurji + toast", "Dosa + sambar", "Moong dal cheela"],
  ["Seasonal fruit + curd", "Roasted chana + fruit", "Buttermilk + makhana", "Sprouts chaat", "Fruit + handful of nuts", "Boiled egg + fruit", "Yogurt + seeds"],
  ["Rice + dal + sabzi", "2 chapati + paneer + salad", "Rice + sambar + vegetables", "Millet roti + dal + sabzi", "Rice + chicken + vegetables", "Chapati + chole + salad", "Rice + rajma + vegetables"],
  ["Vegetable soup + paneer toast", "Besan chilla + curd", "Grilled paneer + vegetables", "Egg curry + chapati", "Dal khichdi + curd", "Chicken + roti + salad", "Vegetable pulao + raita"]
];
const planSlots = ["Breakfast", "Mid-morning", "Lunch", "Dinner"];
function generatePlan(client, calc) {
  const startDate = todayISO;
  const days = Array.from({ length: 7 }, (_, index) => ({
    date: shiftDate(startDate, index),
    meals: planSlots.map((slot, slotIndex) => planChoices[slotIndex][(index + slotIndex + (client.id.length % 4)) % planChoices[slotIndex].length])
  }));
  client.plan = { startDate, days, status: "Draft", targetCalories: calc?.calories || 0, updatedAt: new Date().toISOString() };
  persist();
}
function renderPlan(client, calc) {
  const plan = client.plan;
  const action = plan ? `<button class="secondary-button button-small" data-action="print-plan">↗ Print / save PDF</button>` : "";
  return `<div class="detail-layout"><div class="detail-stack">
    <section class="panel"><div class="panel-heading"><div><h2 class="panel-title">A week that works for them</h2><div class="panel-subtitle">${plan ? `Draft · week of ${formatDate(plan.startDate, { day:"numeric", month:"short", year:"numeric" })} · target ${Number(plan.targetCalories).toLocaleString("en-IN")} kcal/day` : "Start with a flexible draft, then make it yours"}</div></div><div class="plan-toolbar">${action}<button class="primary-button button-small" data-action="generate-plan">${plan ? "↻ Regenerate draft" : "✳ Generate 7-day draft"}</button></div></div>
      ${plan ? `<p class="subheading" style="margin:0 0 11px">Every meal is editable. Suggested dishes are a starting point, not clinical advice. Please review quantities and nutrition before sharing.</p><div class="plan-table-wrap"><table class="plan-table"><thead><tr><th>DAY</th>${planSlots.map((slot) => `<th>${slot}</th>`).join("")}</tr></thead><tbody>${plan.days.map((day, dayIndex) => `<tr><td>${new Intl.DateTimeFormat("en-IN", { weekday:"short", day:"numeric", month:"short" }).format(new Date(`${day.date}T12:00:00`))}</td>${day.meals.map((meal, slotIndex) => `<td><input class="plan-cell" data-plan-day="${dayIndex}" data-plan-slot="${slotIndex}" value="${escapeHTML(meal)}" aria-label="${planSlots[slotIndex]} on day ${dayIndex + 1}"></td>`).join("")}</tr>`).join("")}</tbody></table></div>` : `<div class="empty-state">A weekly draft will appear here. You can edit any meal before using it.</div>`}
    </section>
    <section class="panel"><div class="panel-heading"><div><h2 class="panel-title">Dietician review</h2><div class="panel-subtitle">Check these before you share a plan</div></div></div><div class="list-row"><span>Food preference</span><strong>${escapeHTML(client.preference || "Not set")}</strong></div><div class="list-row"><span>Allergies to avoid</span><strong>${escapeHTML(client.allergies || "None recorded")}</strong></div><div class="list-row"><span>Medical notes</span><strong>${escapeHTML(client.conditions || "None recorded")}</strong></div><div class="list-row"><span>Daily calorie target</span><strong>${calc ? `${calc.calories.toLocaleString("en-IN")} kcal` : "Review vitals first"}</strong></div></section>
  </div><div class="detail-stack">
    <section class="panel"><div class="panel-heading"><div><h2 class="panel-title">Preferences to remember</h2></div></div><div class="notice info"><span class="notice-icon">♡</span><span>${client.feedback ? `Client feedback: ${escapeHTML(client.feedback)}` : "No feedback saved yet. Add it after your next check-in."}</span></div><div style="margin-top:12px"><button class="secondary-button button-small" data-action="add-feedback">Add client feedback</button></div></section>
    <div class="notice warning"><span class="notice-icon">⚠</span><span>This prototype does not calculate verified meal macros or guarantee target tolerances. Use your professional judgement and approve every plan.</span></div>
  </div></div>`;
}
function renderSuggestions(client, calc) {
  const hasClinicalFlag = /pregnan|diabet|kidney|renal|eating disorder|insulin|paediatric|pediatric/i.test(client.conditions || "");
  const cards = hasClinicalFlag ? [] : [
    { title: "Keep an eye on breakfast protein", body: "A protein-rich first meal can support fullness. Consider adding curd, eggs, dal-based options or paneer if they fit this client's preferences.", why: "Draft observation · Review meal logs to confirm." },
    { title: "Build variety into the week", body: "Pair grains with a protein source and vegetables where practical. Ask about prep time and budget before suggesting swaps.", why: "General planning prompt · Adapt to client context." }
  ];
  return `<div class="detail-layout"><div class="detail-stack"><section class="panel"><div class="panel-heading"><div><h2 class="panel-title">Thoughtful prompts</h2><div class="panel-subtitle">Draft ideas only — you decide what belongs in the plan</div></div><span class="status-pill neutral">Drafts</span></div>
    ${hasClinicalFlag ? `<div class="notice warning"><span class="notice-icon">⚠</span><span>This client has a condition recorded. Automated suggestions are withheld; use manual clinical review.</span></div>` : cards.map((card, index) => `<article class="suggestion-card" data-suggestion="${index}"><h3>${card.title}</h3><p>${card.body}</p><p><strong>${card.why}</strong></p><div class="suggestion-actions"><button class="secondary-button button-small" data-suggestion-action="accept" data-index="${index}">Accept draft</button><button class="quiet-button button-small" data-suggestion-action="edit" data-index="${index}">Edit</button><button class="quiet-button button-small" data-suggestion-action="reject" data-index="${index}">Dismiss</button></div></article>`).join("")}
    </section></div><div class="detail-stack"><section class="panel"><div class="panel-heading"><div><h2 class="panel-title">Before making a suggestion</h2></div></div><div class="list-row"><span>Preference</span><strong>${escapeHTML(client.preference || "Not set")}</strong></div><div class="list-row"><span>Allergy notes</span><strong>${escapeHTML(client.allergies || "None recorded")}</strong></div><div class="list-row"><span>Daily target</span><strong>${calc ? `${calc.calories.toLocaleString("en-IN")} kcal` : "—"}</strong></div><div class="notice info" style="margin-top:12px"><span class="notice-icon">i</span><span>Suggestions are generic prompts, not generated from measured nutrient data. Review meal logs and clinical context before approving.</span></div></section></div></div>`;
}
function renderClientConsultations(client) {
  return `<div class="detail-layout"><div class="detail-stack"><section class="panel"><div class="panel-heading"><div><h2 class="panel-title">Follow-up rhythm</h2><div class="panel-subtitle">A 14-day cycle you can adjust to the client's needs</div></div><button class="primary-button button-small" data-action="schedule-consult">＋ Schedule</button></div>
      <div class="consultation-row"><div class="date-tile"><strong>${client.nextVisit ? new Date(`${client.nextVisit}T12:00:00`).getDate() : "—"}</strong><small>${client.nextVisit ? new Intl.DateTimeFormat("en-IN", { month:"short" }).format(new Date(`${client.nextVisit}T12:00:00`)) : "DATE"}</small></div><div class="consult-info"><strong>Next follow-up · ${client.nextTime || "Time not set"}</strong><small>${client.nextVisit ? formatDate(client.nextVisit, { weekday:"long", day:"numeric", month:"long", year:"numeric" }) : "Choose a date to get started"}</small></div><span class="status-pill ${isOverdue(client) ? "warning" : "neutral"}">${client.nextVisit ? consultStatus(client) : "Not set"}</span></div>
      <div class="consultation-row"><div class="date-tile"><strong>${client.lastVisit ? new Date(`${client.lastVisit}T12:00:00`).getDate() : "—"}</strong><small>${client.lastVisit ? new Intl.DateTimeFormat("en-IN", { month:"short" }).format(new Date(`${client.lastVisit}T12:00:00`)) : "DATE"}</small></div><div class="consult-info"><strong>Last recorded visit</strong><small>${client.lastVisit ? formatDate(client.lastVisit, { weekday:"long", day:"numeric", month:"long", year:"numeric" }) : "No visit recorded"}</small></div></div>
    </section></div><div class="detail-stack"><section class="panel"><h2 class="panel-title">Reminder setup</h2><p class="subheading" style="line-height:1.6;margin:8px 0 12px">Use the practice settings to record the reminder address. Email delivery and automatic 2-day reminders are not connected in this local prototype.</p><button class="secondary-button button-small" data-route="settings">Open settings →</button></section></div></div>`;
}
function renderSchedule() {
  const list = state.clients.filter((client) => client.nextVisit).sort((a, b) => a.nextVisit.localeCompare(b.nextVisit));
  const todayCount = list.filter((client) => client.nextVisit === todayISO).length;
  const overdueCount = list.filter(isOverdue).length;
  appView.innerHTML = `${heading("YOUR CALENDAR", "Consultations", "Keep each check-in in view. Client follow-ups are usually every 14 days.", `<button class="primary-button" data-action="schedule-consult">＋ Schedule a consultation</button>`)}
    <div class="stats-grid">${statCard("Scheduled", list.length, "Across all clients", "▦")}${statCard("Today", todayCount, todayCount ? "Your sessions for today" : "No sessions scheduled", "◷")}${statCard("Overdue", overdueCount, overdueCount ? "Follow up when you can" : "Everyone is on track", "↻")}${statCard("Reminder emails", "Off", "Delivery isn't connected in this prototype", "✉")}</div>
    <section class="panel"><div class="panel-heading"><div><h2 class="panel-title">Upcoming & overdue</h2><div class="panel-subtitle">Select a client to see their care context</div></div></div>
      ${list.length ? list.map((client) => `<div class="consultation-row" data-open-client="${client.id}" role="button" tabindex="0"><div class="date-tile"><strong>${new Date(`${client.nextVisit}T12:00:00`).getDate()}</strong><small>${new Intl.DateTimeFormat("en-IN", { month:"short" }).format(new Date(`${client.nextVisit}T12:00:00`))}</small></div><div class="consult-info"><strong>${escapeHTML(client.name)}</strong><small>${escapeHTML(client.preference || "Client")} · ${client.nextTime || "Time not set"} · Last visit ${formatDate(client.lastVisit)}</small></div><span class="status-pill ${isOverdue(client) ? "warning" : client.nextVisit === todayISO ? "" : "neutral"}"><i class="mini-dot"></i>${consultStatus(client)}</span></div>`).join("") : `<div class="empty-state">No consultations are scheduled. Add one from a client's profile.</div>`}
    </section><div class="notice info" style="margin-top:13px"><span class="notice-icon">i</span><span>Scheduling is stored locally. Automatic calendar invites, email delivery, retries and reminder logs require a secure backend and email provider.</span></div>`;
}
function renderSettings() {
  appView.innerHTML = `${heading("YOUR PRACTICE", "Settings", "Set up your workspace preferences.", `<button class="primary-button" data-action="save-settings">Save settings</button>`)}
    <div class="settings-grid"><section class="panel"><div class="panel-heading"><div><h2 class="panel-title">Consultation reminders</h2><div class="panel-subtitle">A gentle heads-up for your upcoming appointments</div></div></div>
      <div class="field-wrap" style="max-width:380px;margin:17px 0"><label for="reminderEmail">Dietician reminder email</label><input class="field-input" id="reminderEmail" type="email" placeholder="you@yourpractice.com" value="${escapeHTML(state.settings.reminderEmail)}"></div>
      <div class="setting-line"><div><strong>Enable email reminders</strong><small>2 days before and morning of consultation</small></div><button class="switch ${state.settings.remindersEnabled ? "on" : ""}" id="reminderSwitch" role="switch" aria-checked="${state.settings.remindersEnabled}" aria-label="Enable email reminders"></button></div>
      <div class="notice warning" style="margin-top:13px"><span class="notice-icon">i</span><span>Reminder settings are saved for this browser only. This prototype does not send emails. A production version needs authenticated email delivery and a secure server.</span></div>
    </section><div class="detail-stack"><section class="panel"><div class="panel-heading"><div><h2 class="panel-title">Calculation defaults</h2><div class="panel-subtitle">From the provided Vitals sheet appendix</div></div></div><div class="list-row"><span>Male BMR</span><strong>24 kcal × body weight</strong></div><div class="list-row"><span>Female BMR</span><strong>22.5 kcal × body weight</strong></div><div class="list-row"><span>Energy deficit</span><strong>7,700 kcal / kg</strong></div><div class="list-row"><span>Review flags</span><strong>&gt;1 kg/week · &lt;1,200 kcal/day</strong></div><div class="list-row"><span>Data storage</span><strong>This browser only</strong></div></section>
      <section class="panel"><div class="panel-heading"><div><h2 class="panel-title">Privacy & data</h2><div class="panel-subtitle">Health records deserve care</div></div></div><p class="subheading" style="line-height:1.7">This is a local, single-device prototype. It does not provide account security, encryption at rest, audit logs, consent workflows, backups, or DPDP compliance. Avoid entering identifiable or sensitive real-client data until a secure production backend is in place.</p><button class="quiet-button button-small" data-action="clear-demo">Restore demo data</button></section></div></div>`;
}
function showModal(title, subtitle, body, buttons = `<button type="button" class="quiet-button" data-action="close-modal">Cancel</button><button type="submit" class="primary-button">Save client</button>`, formId = "clientForm") {
  modalRoot.innerHTML = `<div class="modal-backdrop" data-action="backdrop-close"><section class="modal" role="dialog" aria-modal="true" aria-labelledby="modalTitle"><header class="modal-header"><div><h2 id="modalTitle">${title}</h2><p>${subtitle}</p></div><button type="button" class="close-button" data-action="close-modal" aria-label="Close dialog">×</button></header><form id="${formId}"><div class="modal-body">${body}</div><footer class="modal-footer">${buttons}</footer></form></section></div>`;
  const first = modalRoot.querySelector("input,select,button");
  if (first) first.focus();
}
function openClientModal(existing = null) {
  const client = existing || { name: "", gender: "female", age: "", weight: "", height: "", goalWeight: "", months: 3, pal: 1.3, proteinPerKg: 1, fatPerKg: .5, preference: "Vegetarian", region: "", allergies: "", conditions: "", medications: "", supplements: "", consent: false };
  const options = (values, selected) => values.map((value) => `<option ${selected === value ? "selected" : ""}>${value}</option>`).join("");
  const body = `<div class="modal-form-grid">
    <div class="form-section-title">Client details</div>
    <div class="field-wrap span-two"><label for="clientName">Full name *</label><input class="field-input" id="clientName" name="name" value="${escapeHTML(client.name)}" required></div>
    <div class="field-wrap"><label for="clientAge">Age *</label><input class="field-input" id="clientAge" name="age" type="number" min="18" max="120" value="${escapeHTML(client.age)}" required></div>
    <div class="field-wrap"><label for="clientGender">Gender *</label><select class="field-select" id="clientGender" name="gender"><option value="female" ${client.gender === "female" ? "selected" : ""}>Female</option><option value="male" ${client.gender === "male" ? "selected" : ""}>Male</option></select></div>
    <div class="field-wrap"><label for="clientWeight">Current weight (kg) *</label><input class="field-input" id="clientWeight" name="weight" type="number" step=".1" min=".1" value="${escapeHTML(client.weight)}" required></div>
    <div class="field-wrap"><label for="clientHeight">Height (cm) *</label><input class="field-input" id="clientHeight" name="height" type="number" step=".1" min=".1" value="${escapeHTML(client.height)}" required></div>
    <div class="field-wrap"><label for="clientGoal">Goal weight (kg) *</label><input class="field-input" id="clientGoal" name="goalWeight" type="number" step=".1" min=".1" value="${escapeHTML(client.goalWeight)}" required></div>
    <div class="field-wrap"><label for="clientMonths">Duration (months) *</label><input class="field-input" id="clientMonths" name="months" type="number" step="1" min="1" value="${escapeHTML(client.months)}" required></div>
    <div class="field-wrap"><label for="clientPAL">Activity level</label><select class="field-select" id="clientPAL" name="pal">${[[1.2,"Sedentary"],[1.3,"Lightly active"],[1.5,"Moderately active"],[1.7,"Very active"],[1.9,"Extremely active"]].map(([v,l]) => `<option value="${v}" ${Number(client.pal) === v ? "selected" : ""}>${l} · ${v}</option>`).join("")}</select></div>
    <div class="field-wrap"><label for="clientProtein">Protein (g/kg)</label><input class="field-input" id="clientProtein" name="proteinPerKg" type="number" step=".1" min="0" value="${escapeHTML(client.proteinPerKg)}"></div>
    <div class="field-wrap"><label for="clientFat">Fat (g/kg)</label><input class="field-input" id="clientFat" name="fatPerKg" type="number" step=".1" min="0" value="${escapeHTML(client.fatPerKg)}"></div>
    <div class="form-section-title">Food & care context</div>
    <div class="field-wrap"><label for="clientPreference">Food preference</label><select class="field-select" id="clientPreference" name="preference">${options(["Vegetarian","Non-vegetarian","Egg","Vegan"],client.preference)}</select></div>
    <div class="field-wrap"><label for="clientRegion">Region / cuisine</label><input class="field-input" id="clientRegion" name="region" value="${escapeHTML(client.region)}" placeholder="e.g. South Indian"></div>
    <div class="field-wrap span-two"><label for="clientAllergies">Allergies</label><input class="field-input" id="clientAllergies" name="allergies" value="${escapeHTML(client.allergies)}" placeholder="List known allergies, or leave blank"></div>
    <div class="field-wrap span-two"><label for="clientConditions">Medical conditions / clinical notes</label><textarea class="field-textarea" id="clientConditions" name="conditions" placeholder="For clinician reference">${escapeHTML(client.conditions)}</textarea></div>
    <div class="field-wrap"><label for="clientMeds">Medications</label><input class="field-input" id="clientMeds" name="medications" value="${escapeHTML(client.medications)}"></div>
    <div class="field-wrap"><label for="clientSupplements">Supplements</label><input class="field-input" id="clientSupplements" name="supplements" value="${escapeHTML(client.supplements)}"></div>
    <label class="check-line span-two"><input type="checkbox" name="consent" ${client.consent ? "checked" : ""}> Client consent recorded for storing this information in the practice workflow. (Local prototype only; not a legal consent workflow.)</label>
  </div>`;
  showModal(existing ? "Edit client profile" : "Add a client", "Start with the details that help you personalize care.", body, `<button type="button" class="quiet-button" data-action="close-modal">Cancel</button><button type="submit" class="primary-button">${existing ? "Save changes" : "Add client"}</button>`);
  modalRoot.querySelector("#clientForm").dataset.clientId = existing?.id || "";
}
function openConsultModal(clientId = "") {
  const client = getClient(clientId);
  const options = state.clients.map((item) => `<option value="${item.id}" ${item.id === clientId ? "selected" : ""}>${escapeHTML(item.name)}</option>`).join("");
  if (!state.clients.length) { toast("Add a client before scheduling a consultation.", true); return; }
  const body = `<div class="modal-form-grid"><div class="field-wrap span-two"><label for="consultClient">Client *</label><select class="field-select" id="consultClient" name="clientId" required>${options}</select></div><div class="field-wrap"><label for="consultDate">Date *</label><input class="field-input" id="consultDate" name="date" type="date" value="${shiftDate(todayISO, 14)}" required></div><div class="field-wrap"><label for="consultTime">Time</label><input class="field-input" id="consultTime" name="time" type="time" value="10:00"></div><div class="field-wrap span-two"><label for="consultNotes">Visit note (optional)</label><textarea class="field-textarea" id="consultNotes" name="notes" placeholder="A short reminder for your consultation"></textarea></div></div>`;
  showModal("Schedule a follow-up", "Choose a date that works for this client.", body, `<button type="button" class="quiet-button" data-action="close-modal">Cancel</button><button type="submit" class="primary-button">Save consultation</button>`, "consultForm");
}
function openFeedbackModal(client) {
  const body = `<div class="modal-form-grid"><div class="field-wrap"><label for="adherence">Adherence rating</label><select class="field-select" id="adherence" name="adherence"><option>Going well</option><option>Some challenges</option><option>Needs a different approach</option></select></div><div class="field-wrap"><label for="energy">Energy / hunger</label><input class="field-input" id="energy" name="energy" placeholder="e.g. hungry mid-afternoon"></div><div class="field-wrap span-two"><label for="feedbackText">What did they like or find difficult?</label><textarea class="field-textarea" id="feedbackText" name="feedback" placeholder="Capture the client's words where possible">${escapeHTML(client.feedback || "")}</textarea></div></div>`;
  showModal("Add client feedback", "A few notes can make next week's plan feel more personal.", body, `<button type="button" class="quiet-button" data-action="close-modal">Cancel</button><button type="submit" class="primary-button">Save feedback</button>`, "feedbackForm");
  modalRoot.querySelector("#feedbackForm").dataset.clientId = client.id;
}
function saveProfile(form) {
  const data = Object.fromEntries(new FormData(form).entries());
  const weight = Number(data.weight);
  const goalWeight = Number(data.goalWeight);
  const height = Number(data.height);
  const age = Number(data.age);
  const months = Number(data.months);
  const protein = Number(data.proteinPerKg);
  const fat = Number(data.fatPerKg);
  const errors = [];
  if (!data.name.trim()) errors.push("Enter the client's name.");
  if (!(height > 0)) errors.push("Height must be greater than zero.");
  if (!(weight > 0)) errors.push("Current weight must be greater than zero.");
  if (!(goalWeight > 0) || goalWeight > weight) errors.push("Goal weight must be positive and no higher than current weight.");
  if (!(months > 0)) errors.push("Duration must be greater than zero.");
  if (!(age >= 18 && age <= 120)) errors.push("This prototype is for adults aged 18–120; confirm any age outside this range manually.");
  if (![protein, fat].every((value) => Number.isFinite(value) && value >= 0)) errors.push("Protein and fat grams per kg must be zero or greater.");
  if (errors.length) { toast(errors[0], true); return; }
  const clientId = form.dataset.clientId;
  const current = clientId ? getClient(clientId) : null;
  const client = {
    ...(current || { id: uid(), lastVisit: todayISO, nextVisit: shiftDate(todayISO, 14), nextTime: "10:00", status: "Active", logs: [], plan: null, color: ["sage","peach","blue","pink"][state.clients.length % 4] }),
    name: data.name.trim(), gender: data.gender, age, weight, startWeight: current?.startWeight || weight, height, goalWeight, months, pal: Number(data.pal), proteinPerKg: protein, fatPerKg: fat, preference: data.preference, region: data.region.trim(), allergies: data.allergies.trim(), conditions: data.conditions.trim(), medications: data.medications.trim(), supplements: data.supplements.trim(), consent: form.elements.consent.checked
  };
  if (current) state.clients = state.clients.map((item) => item.id === current.id ? client : item);
  else state.clients.unshift(client);
  if (persist()) {
    modalRoot.innerHTML = "";
    selectedClientId = client.id;
    selectedTab = "overview";
    route = "detail";
    render();
    toast(current ? "Client profile updated." : "Client profile added.");
  }
}
function saveCalc(form) {
  const client = getClient(selectedClientId);
  if (!client) return;
  const data = Object.fromEntries(new FormData(form).entries());
  const next = { ...client, weight: Number(data.weight), height: Number(data.height), goalWeight: Number(data.goalWeight), months: Number(data.months), pal: Number(data.pal), proteinPerKg: Number(data.proteinPerKg), fatPerKg: Number(data.fatPerKg), gender: data.gender };
  const result = getCalc(next);
  if (!result) { toast("Check the values: all measurements must be positive and goal weight cannot exceed current weight.", true); return; }
  if (!client.startWeight) next.startWeight = client.weight;
  state.clients = state.clients.map((item) => item.id === client.id ? next : item);
  if (persist()) { render(); toast("Targets recalculated using the spreadsheet formulas."); }
}
function saveMeal(form) {
  const client = getClient(selectedClientId);
  const data = Object.fromEntries(new FormData(form).entries());
  const quantity = Number(data.quantity);
  if (!client || !(quantity > 0)) { toast("Enter a quantity greater than zero.", true); return; }
  const food = foodCatalog.find((item) => item.name === data.food);
  const unit = data.unit || food?.unit || "serving";
  const kcal = food ? (unitGrams(food, unit, quantity) * food.kcal100 / 100) : 0;
  client.logs = client.logs || [];
  client.logs.push({ id: uid(), date: selectedMealDate, slot: data.slot, food: data.food, quantity, unit, kcal: Math.round(kcal) });
  if (persist()) { render(); toast("Meal log saved."); }
}
function saveConsultation(form) {
  const data = Object.fromEntries(new FormData(form).entries());
  const client = getClient(data.clientId);
  if (!client || !data.date) { toast("Choose a client and date.", true); return; }
  client.nextVisit = data.date;
  client.nextTime = data.time || "";
  client.status = "Active";
  client.lastConsultNote = data.notes.trim();
  if (persist()) {
    modalRoot.innerHTML = "";
    selectedClientId = client.id;
    route = "detail";
    selectedTab = "consultations";
    render();
    toast("Consultation scheduled. Email reminders are not sent by this prototype.");
  }
}
function csvEscape(value) {
  return `"${String(value).replace(/"/g, '""')}"`;
}
function downloadMealCSV(client) {
  const rows = [["Date","Meal slot","Food","Quantity","Unit","Estimated kcal"], ...(client.logs || []).map((log) => [log.date, log.slot, log.food, log.quantity, log.unit, log.kcal])];
  const csv = rows.map((row) => row.map(csvEscape).join(",")).join("\n");
  const link = document.createElement("a");
  link.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  link.download = `${client.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-meal-log.csv`;
  link.click();
  URL.revokeObjectURL(link.href);
}
function updateNavCount() {
  document.getElementById("clientNavCount").textContent = state.clients.length;
}

document.getElementById("todayDate").textContent = new Intl.DateTimeFormat("en-IN", { weekday: "short", day: "numeric", month: "short" }).format(today);
document.getElementById("sidebar").addEventListener("click", (event) => {
  const button = event.target.closest("[data-route]");
  if (button) setRoute(button.dataset.route);
});
appView.addEventListener("click", (event) => {
  const routeButton = event.target.closest("[data-route]");
  if (routeButton) { setRoute(routeButton.dataset.route); return; }
  const tabButton = event.target.closest("[data-tab]");
  if (tabButton) { selectedTab = tabButton.dataset.tab; render(); return; }
  const clientOpener = event.target.closest("[data-open-client]");
  if (clientOpener) { selectedClientId = clientOpener.dataset.openClient; selectedTab = "overview"; route = "detail"; render(); return; }
  const action = event.target.closest("[data-action]");
  if (action) {
    switch (action.dataset.action) {
      case "add-client": openClientModal(); break;
      case "edit-client": openClientModal(getClient(selectedClientId)); break;
      case "schedule-consult": openConsultModal(selectedClientId || ""); break;
      case "generate-plan": {
        const client = getClient(selectedClientId);
        if (client) { generatePlan(client, getCalc(client)); render(); toast("A flexible 7-day draft is ready to edit."); }
        break;
      }
      case "print-plan": window.print(); break;
      case "add-feedback": { const client = getClient(selectedClientId); if (client) openFeedbackModal(client); break; }
      case "meal-export": { const client = getClient(selectedClientId); if (client) downloadMealCSV(client); break; }
      case "save-settings": {
        const email = document.getElementById("reminderEmail").value.trim();
        if (state.settings.remindersEnabled && email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { toast("Enter a valid reminder email address.", true); break; }
        state.settings.reminderEmail = email;
        if (persist()) toast("Settings saved in this browser. No email will be sent.");
        break;
      }
      case "clear-demo":
        showModal("Restore demo data?", "This replaces the current client list in this browser with sample profiles.", `<div class="notice warning"><span class="notice-icon">⚠</span><span>Any client records and meal logs saved here will be replaced. Export anything you need first.</span></div>`, `<button type="button" class="quiet-button" data-action="close-modal">Cancel</button><button type="button" class="primary-button" data-action="confirm-reset">Restore demo data</button>`, "resetForm");
        break;
      case "confirm-reset":
        state = { clients: createSeedClients(), settings: { reminderEmail: "", remindersEnabled: false } };
        persist(); modalRoot.innerHTML = ""; setRoute("dashboard"); toast("Demo data restored."); break;
      case "close-modal": modalRoot.innerHTML = ""; break;
      case "backdrop-close": if (event.target === action) modalRoot.innerHTML = ""; break;
      default: break;
    }
    return;
  }
  const suggestionAction = event.target.closest("[data-suggestion-action]");
  if (suggestionAction) {
    const index = Number(suggestionAction.dataset.index);
    if (suggestionAction.dataset.suggestionAction === "edit") {
      const card = suggestionAction.closest(".suggestion-card");
      const title = card.querySelector("h3").textContent;
      const body = card.querySelector("p").textContent;
      const editBody = `<div class="modal-form-grid"><div class="field-wrap span-two"><label for="suggestionText">Dietician-edited draft</label><textarea class="field-textarea" id="suggestionText" name="text" required>${escapeHTML(title + "\n" + body)}</textarea></div></div>`;
      showModal("Edit suggestion", "Review and adapt this draft to the client.", editBody, `<button type="button" class="quiet-button" data-action="close-modal">Cancel</button><button type="submit" class="primary-button">Save edited draft</button>`, "suggestionForm");
      modalRoot.querySelector("#suggestionForm").dataset.index = index;
    } else {
      suggestionAction.closest(".suggestion-card").remove();
      toast(suggestionAction.dataset.suggestionAction === "accept" ? "Suggestion marked for your review." : "Suggestion dismissed.");
    }
  }
});
appView.addEventListener("input", (event) => {
  if (event.target.id === "clientSearch") { clientQuery = event.target.value; renderClients(); const input = document.getElementById("clientSearch"); input.focus(); input.setSelectionRange(input.value.length, input.value.length); }
  if (event.target.matches("[data-plan-day]")) {
    const client = getClient(selectedClientId);
    const day = client?.plan?.days?.[Number(event.target.dataset.planDay)];
    if (day) { day.meals[Number(event.target.dataset.planSlot)] = event.target.value; client.plan.updatedAt = new Date().toISOString(); persist(); }
  }
});
appView.addEventListener("change", (event) => {
  if (event.target.id === "clientFilter") { clientFilter = event.target.value; renderClients(); }
  if (event.target.id === "mealDate") { selectedMealDate = event.target.value || todayISO; render(); }
});
appView.addEventListener("submit", (event) => {
  event.preventDefault();
  if (event.target.id === "calcForm") saveCalc(event.target);
  if (event.target.id === "mealForm") saveMeal(event.target);
});
modalRoot.addEventListener("click", (event) => {
  const action = event.target.closest("[data-action]");
  if (!action) return;
  if (action.dataset.action === "close-modal") modalRoot.innerHTML = "";
  if (action.dataset.action === "backdrop-close" && event.target === action) modalRoot.innerHTML = "";
  if (action.dataset.action === "confirm-reset") {
    state = { clients: createSeedClients(), settings: { reminderEmail: "", remindersEnabled: false } };
    persist(); modalRoot.innerHTML = ""; setRoute("dashboard"); toast("Demo data restored.");
  }
});
modalRoot.addEventListener("submit", (event) => {
  event.preventDefault();
  if (event.target.id === "clientForm") saveProfile(event.target);
  if (event.target.id === "consultForm") saveConsultation(event.target);
  if (event.target.id === "feedbackForm") {
    const client = getClient(event.target.dataset.clientId);
    if (client) {
      const data = Object.fromEntries(new FormData(event.target).entries());
      client.feedback = `${data.adherence}. ${data.energy ? `Energy / hunger: ${data.energy}. ` : ""}${data.feedback}`.trim();
      if (persist()) { modalRoot.innerHTML = ""; render(); toast("Client feedback saved."); }
    }
  }
  if (event.target.id === "suggestionForm") {
    const card = appView.querySelector(`.suggestion-card[data-suggestion="${event.target.dataset.index}"]`);
    if (card) { const parts = event.target.elements.text.value.split("\n"); card.querySelector("h3").textContent = parts.shift() || "Edited suggestion"; card.querySelector("p").textContent = parts.join("\n"); }
    modalRoot.innerHTML = ""; toast("Edited draft saved for this view.");
  }
});
document.getElementById("mobileMenu").addEventListener("click", () => document.getElementById("sidebar").classList.toggle("open"));
document.addEventListener("click", (event) => {
  if (event.target.id === "reminderSwitch") {
    state.settings.remindersEnabled = !state.settings.remindersEnabled;
    event.target.classList.toggle("on", state.settings.remindersEnabled);
    event.target.setAttribute("aria-checked", String(state.settings.remindersEnabled));
    persist();
  }
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") modalRoot.innerHTML = "";
  if ((event.key === "Enter" || event.key === " ") && event.target.matches("[data-open-client][role='button']")) {
    selectedClientId = event.target.dataset.openClient; selectedTab = "overview"; route = "detail"; render();
  }
});
render();
