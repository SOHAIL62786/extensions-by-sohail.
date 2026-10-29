"use strict";

// Entries are kept in chrome.storage.local under "fosDetails" as
//   { "NAME": { finOneCode: "646180", addedAt: 1730000000000 }, ... }
// (storage does not keep key order, so rows are sorted by addedAt; older entries come first)
const STORAGE_KEY = "fosDetails";

const ICONS = {
    edit: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M11 2.5l2.5 2.5L5 13.5 1.8 14.2 2.5 11z"/></svg>',
    save: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 8.5l3.5 3.5L13 4.5"/></svg>',
    cancel: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M3.5 3.5l9 9M12.5 3.5l-9 9"/></svg>',
    delete: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M2.5 4.5h11M6 4.5V2.8h4v1.7M4 4.5l.7 9h6.6l.7-9M6.7 7v4.5M9.3 7v4.5"/></svg>',
};

const rows = document.getElementById("rows");
const emptyNote = document.getElementById("empty");
const form = document.getElementById("addForm");
const finOneInput = document.getElementById("finOneInput");
const nameInput = document.getElementById("nameInput");
const message = document.getElementById("message");

let editingName = null;

async function readEntries() {
    const result = await chrome.storage.local.get(STORAGE_KEY);
    return result[STORAGE_KEY] ?? {};
}

function writeEntries(entries) {
    return chrome.storage.local.set({ [STORAGE_KEY]: entries });
}

function showMessage(text) {
    message.textContent = text;
}

// returns an error text, or null when the values are fine
function validate(finOne, name) {
    if (!/^\d+$/.test(finOne)) {
        return "Finone must be a number";
    }
    if (!name) {
        return "Enter a name";
    }
    return null;
}

function iconButton(kind, label, name) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `icon ${kind}`;
    button.dataset.action = kind;
    button.dataset.name = name;
    button.title = label;
    button.setAttribute("aria-label", `${label} ${name}`);
    button.innerHTML = ICONS[kind];
    return button;
}

function textCell(value) {
    const cell = document.createElement("td");
    cell.textContent = value ?? "";
    return cell;
}

function inputCell(className, value) {
    const cell = document.createElement("td");
    const input = document.createElement("input");
    input.className = className;
    input.value = value ?? "";
    cell.append(input);
    return cell;
}

async function render() {
    const entries = await readEntries();
    const names = Object.keys(entries).sort((x, y) => (entries[x].addedAt ?? 0) - (entries[y].addedAt ?? 0) || x.localeCompare(y));
    rows.replaceChildren();
    names.forEach((name, index) => {
        const row = document.createElement("tr");
        const serial = textCell(index + 1);
        serial.className = "sno";
        const actions = document.createElement("td");
        actions.className = "actions";
        if (name === editingName) {
            row.className = "editing";
            row.append(serial, inputCell("edit-finone", entries[name].finOneCode), inputCell("edit-name", name));
            actions.append(iconButton("save", "Save", name), iconButton("cancel", "Cancel", name), iconButton("delete", "Delete", name));
        } else {
            row.append(serial, textCell(entries[name].finOneCode), textCell(name));
            actions.append(iconButton("edit", "Edit", name));
        }
        row.append(actions);
        rows.append(row);
    });
    emptyNote.hidden = names.length > 0;
    const firstInput = rows.querySelector("input.edit-finone");
    if (firstInput) {
        firstInput.focus();
    }
}

async function addEntry(event) {
    event.preventDefault();
    const finOne = finOneInput.value.trim();
    const name = nameInput.value.trim();
    const problem = validate(finOne, name);
    if (problem) {
        showMessage(problem);
        (name && !/^\d+$/.test(finOne) ? finOneInput : nameInput).focus();
        return;
    }
    const entries = await readEntries();
    if (name in entries) {
        showMessage("This name is already in the table");
        nameInput.focus();
        return;
    }
    entries[name] = { finOneCode: finOne, addedAt: Date.now() };
    await writeEntries(entries);
    form.reset();
    showMessage("");
    finOneInput.focus();
    render();
}

async function saveEdit(oldName) {
    const row = rows.querySelector("tr.editing");
    const finOne = row.querySelector("input.edit-finone").value.trim();
    const name = row.querySelector("input.edit-name").value.trim();
    const problem = validate(finOne, name);
    if (problem) {
        showMessage(problem);
        return;
    }
    const entries = await readEntries();
    if (name !== oldName && name in entries) {
        showMessage("This name is already in the table");
        return;
    }
    const updated = { ...entries[oldName], finOneCode: finOne };
    delete entries[oldName];
    entries[name] = updated;
    await writeEntries(entries);
    editingName = null;
    showMessage("");
    render();
}

async function deleteEntry(name) {
    if (!confirm(`Delete ${name}?`)) {
        return;
    }
    const entries = await readEntries();
    delete entries[name];
    await writeEntries(entries);
    editingName = null;
    showMessage("");
    render();
}

function handleRowClick(event) {
    const button = event.target.closest("button[data-action]");
    if (!button) {
        return;
    }
    const name = button.dataset.name;
    switch (button.dataset.action) {
        case "edit":
            editingName = name;
            showMessage("");
            render();
            break;
        case "cancel":
            editingName = null;
            showMessage("");
            render();
            break;
        case "save":
            saveEdit(name);
            break;
        case "delete":
            deleteEntry(name);
            break;
    }
}

function handleRowKey(event) {
    if (!editingName || !event.target.matches("input")) {
        return;
    }
    if (event.key === "Enter") {
        event.preventDefault();
        saveEdit(editingName);
    } else if (event.key === "Escape") {
        editingName = null;
        showMessage("");
        render();
    }
}

// ---------- pages ----------
const tabs = document.querySelectorAll(".tab");

function showPage(name) {
    tabs.forEach((tab) => tab.classList.toggle("active", tab.dataset.page === name));
    document.getElementById("page-home").hidden = name !== "home";
    document.getElementById("page-search").hidden = name !== "search";
    document.getElementById("page-menu").hidden = name !== "menu";
}

tabs.forEach((tab) => tab.addEventListener("click", () => showPage(tab.dataset.page)));

// ---------- search data page ----------
const SEARCHED_KEY = "searchedNumbers";
const searchRows = document.getElementById("searchRows");
const searchEmpty = document.getElementById("searchEmpty");

function timeAgo(iso) {
    const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
    if (Number.isNaN(seconds)) {
        return "";
    }
    if (seconds < 60) {
        return "just now";
    }
    const plural = (value, unit) => `${value} ${unit}${value === 1 ? "" : "s"} ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) {
        return plural(minutes, "min");
    }
    const hours = Math.floor(minutes / 60);
    return hours < 24 ? plural(hours, "hour") : plural(Math.floor(hours / 24), "day");
}

let searchPasswords = {};

function renderSearched(saved) {
    const entries = Object.entries(saved ?? {})
        .sort((x, y) => String(y[1].lastSearchedAt).localeCompare(String(x[1].lastSearchedAt)));
    searchRows.replaceChildren();
    entries.forEach(([number, entry], index) => {
        const row = document.createElement("tr");
        const serial = textCell(index + 1);
        serial.className = "sno";
        const count = textCell(entry.count);
        count.className = "count";
        const time = textCell(timeAgo(entry.lastSearchedAt));
        time.title = new Date(entry.lastSearchedAt).toLocaleString();
        const actions = document.createElement("td");
        actions.className = "actions";
        actions.append(iconButton("delete", "Delete", number));
        const password = textCell(searchPasswords[number] ? searchPasswords[number].password : "-");
        password.title = "Last 4 digits of the number + year of birth. Kept only until the browser is closed";
        row.append(serial, textCell(number), count, password, time, actions);
        searchRows.append(row);
    });
    searchEmpty.hidden = entries.length > 0;
}

async function loadSearched() {
    searchPasswords = (await chrome.storage.session.get("searchPasswords")).searchPasswords ?? {};
    const result = await chrome.storage.local.get(SEARCHED_KEY);
    renderSearched(result[SEARCHED_KEY]);
}

async function deleteSearched(event) {
    const button = event.target.closest("button[data-action='delete']");
    if (!button) {
        return;
    }
    const result = await chrome.storage.local.get(SEARCHED_KEY);
    const saved = result[SEARCHED_KEY] ?? {};
    delete saved[button.dataset.name];
    const session = (await chrome.storage.session.get("searchPasswords")).searchPasswords ?? {};
    delete session[button.dataset.name];
    await chrome.storage.session.set({ searchPasswords: session });
    await chrome.storage.local.set({ [SEARCHED_KEY]: saved });
}

// ---------- menu list page ----------
// stored under "menuList" as [{ name, group }]; the order in the array is the order of the buttons on the page
const MENU_KEY = "menuList";
const menuRows = document.getElementById("menuRows");
const menuEmpty = document.getElementById("menuEmpty");
const menuForm = document.getElementById("menuForm");
const menuNameInput = document.getElementById("menuNameInput");
const menuGroupInput = document.getElementById("menuGroupInput");
const menuMessage = document.getElementById("menuMessage");
let editingMenu = null; // index in the stored list

function groupSelect(selected) {
    const select = document.createElement("select");
    for (const [key, label] of Object.entries(MENU_GROUPS)) {
        select.add(new Option(label, key, false, key === selected));
    }
    return select;
}

async function readMenu() {
    const result = await chrome.storage.local.get(MENU_KEY);
    return Array.isArray(result[MENU_KEY]) ? result[MENU_KEY] : DEFAULT_MENU_LIST.map((item) => ({ ...item }));
}

function writeMenu(list) {
    return chrome.storage.local.set({ [MENU_KEY]: list });
}

async function renderMenu() {
    const list = await readMenu();
    const order = Object.keys(MENU_GROUPS);
    // grouped by page/side, the saved order is kept inside each group
    const items = list.map((item, index) => ({ ...item, index }))
        .sort((x, y) => order.indexOf(x.group) - order.indexOf(y.group) || x.index - y.index);
    menuRows.replaceChildren();
    items.forEach((item, position) => {
        const row = document.createElement("tr");
        const serial = textCell(position + 1);
        serial.className = "sno";
        const actions = document.createElement("td");
        actions.className = "actions";
        const key = String(item.index);
        if (item.index === editingMenu) {
            row.className = "editing";
            const groupCell = document.createElement("td");
            groupCell.append(groupSelect(item.group));
            row.append(serial, inputCell("edit-menu-name", item.name), groupCell);
            actions.append(iconButton("save", "Save", key), iconButton("cancel", "Cancel", key), iconButton("delete", "Delete", key));
        } else {
            row.append(serial, textCell(item.name), textCell(MENU_GROUPS[item.group] ?? item.group));
            actions.append(iconButton("edit", "Edit", key), iconButton("delete", "Delete", key));
        }
        row.append(actions);
        menuRows.append(row);
    });
    menuEmpty.hidden = items.length > 0;
    const firstInput = menuRows.querySelector("input.edit-menu-name");
    if (firstInput) {
        firstInput.focus();
    }
}

async function addMenuItem(event) {
    event.preventDefault();
    const name = menuNameInput.value.trim();
    if (!name) {
        menuMessage.textContent = "Enter a menu name";
        menuNameInput.focus();
        return;
    }
    const list = await readMenu();
    const group = menuGroupInput.value;
    if (list.some((item) => item.group === group && item.name.toLowerCase() === name.toLowerCase())) {
        menuMessage.textContent = "This menu is already in that list";
        menuNameInput.focus();
        return;
    }
    list.push({ name, group });
    await writeMenu(list);
    menuForm.reset();
    menuMessage.textContent = "";
    menuNameInput.focus();
    renderMenu();
}

async function saveMenuEdit(index) {
    const row = menuRows.querySelector("tr.editing");
    const name = row.querySelector("input.edit-menu-name").value.trim();
    const group = row.querySelector("select").value;
    if (!name) {
        menuMessage.textContent = "Enter a menu name";
        return;
    }
    const list = await readMenu();
    if (list.some((item, i) => i !== index && item.group === group && item.name.toLowerCase() === name.toLowerCase())) {
        menuMessage.textContent = "This menu is already in that list";
        return;
    }
    list[index] = { name, group };
    await writeMenu(list);
    editingMenu = null;
    menuMessage.textContent = "";
    renderMenu();
}

async function deleteMenuItem(index) {
    const list = await readMenu();
    if (!confirm(`Delete ${list[index].name}?`)) {
        return;
    }
    list.splice(index, 1);
    await writeMenu(list);
    editingMenu = null;
    menuMessage.textContent = "";
    renderMenu();
}

function handleMenuClick(event) {
    const button = event.target.closest("button[data-action]");
    if (!button) {
        return;
    }
    const index = Number(button.dataset.name);
    switch (button.dataset.action) {
        case "edit":
            editingMenu = index;
            menuMessage.textContent = "";
            renderMenu();
            break;
        case "cancel":
            editingMenu = null;
            menuMessage.textContent = "";
            renderMenu();
            break;
        case "save":
            saveMenuEdit(index);
            break;
        case "delete":
            deleteMenuItem(index);
            break;
    }
}

function handleMenuKey(event) {
    if (editingMenu === null || !event.target.matches("input")) {
        return;
    }
    if (event.key === "Enter") {
        event.preventDefault();
        saveMenuEdit(editingMenu);
    } else if (event.key === "Escape") {
        editingMenu = null;
        menuMessage.textContent = "";
        renderMenu();
    }
}

// ---------- extension & device info ----------
const ADMIN = "SOHAIL62786";

function fillInfo(listId, items) {
    const list = document.getElementById(listId);
    list.replaceChildren();
    for (const [label, value] of items) {
        const row = document.createElement("div");
        const term = document.createElement("dt");
        const detail = document.createElement("dd");
        term.textContent = label;
        detail.textContent = value;
        row.append(term, detail);
        list.append(row);
    }
}

function browserName() {
    const brand = (navigator.userAgentData?.brands ?? []).find((item) => /chrom/i.test(item.brand) && !/not/i.test(item.brand));
    const version = brand ? brand.version : (navigator.userAgent.match(/Chrome\/([\d.]+)/) || [])[1];
    return version ? `Chrome ${version}` : navigator.userAgent;
}

async function loadExtensionInfo() {
    const manifest = chrome.runtime.getManifest();
    const result = await chrome.storage.local.get("permissions");
    const updated = result.permissions?.lastExtensionRefreshed;
    fillInfo("extensionInfo", [
        ["Name", manifest.name],
        ["Version", manifest.version],
        ["Last updated", updated || "Not yet"],
        ["Admin", ADMIN],
    ]);
}

async function loadDeviceInfo() {
    const platform = await chrome.runtime.getPlatformInfo().catch(() => ({}));
    const connection = navigator.connection;
    const items = [
        ["IP address", "Loading..."],
        ["System", [platform.os, platform.arch].filter(Boolean).join(" / ") || navigator.platform],
        ["Browser", browserName()],
        ["Screen", `${screen.width} x ${screen.height}`],
        ["Language", navigator.language],
        ["Time zone", Intl.DateTimeFormat().resolvedOptions().timeZone],
        ["CPU cores", navigator.hardwareConcurrency ?? "-"],
        ["Memory", navigator.deviceMemory ? `${navigator.deviceMemory} GB` : "-"],
        ["Network", [navigator.onLine ? "Online" : "Offline", connection?.effectiveType].filter(Boolean).join(" / ")],
    ];
    fillInfo("deviceInfo", items);
    try {
        const response = await fetch("https://api.ipify.org?format=json", { signal: AbortSignal.timeout(5000) });
        items[0][1] = (await response.json()).ip;
    } catch (error) {
        items[0][1] = "Unavailable (offline)";
    }
    fillInfo("deviceInfo", items);
}

// ---------- daily self-update from GitHub ----------
const today = () => new Date().toISOString().split("T")[0];

async function runDailyUpdate() {
    const result = await chrome.storage.local.get("permissions");
    const permissions = result.permissions ?? {};
    if (permissions.lastExtensionRefreshed !== today()) {
        permissions.lastExtensionRefreshed = today();
        await chrome.storage.local.set({ permissions });
        alert("Extension will close now, you can open it again.");
        chrome.runtime.sendMessage({ to: "background.js", from: "popup", type: "downloadRepo" });
    }
}

form.addEventListener("submit", addEntry);
rows.addEventListener("click", handleRowClick);
rows.addEventListener("keydown", handleRowKey);
searchRows.addEventListener("click", deleteSearched);
menuForm.addEventListener("submit", addMenuItem);
menuRows.addEventListener("click", handleMenuClick);
menuRows.addEventListener("keydown", handleMenuKey);
for (const [key, label] of Object.entries(MENU_GROUPS)) {
    menuGroupInput.add(new Option(label, key));
}
renderMenu();
chrome.storage.onChanged.addListener((changes, area) => {
    if (area === "local" && changes[SEARCHED_KEY]) {
        renderSearched(changes[SEARCHED_KEY].newValue);
    } else if (area === "session" && changes.searchPasswords) {
        searchPasswords = changes.searchPasswords.newValue ?? {};
        loadSearched();
    }
});
setInterval(loadSearched, 30000);
render();
loadSearched();
loadExtensionInfo();
loadDeviceInfo();
runDailyUpdate();
