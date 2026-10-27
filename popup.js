"use strict";

const today = () => new Date().toISOString().split("T")[0];
const dayMonthYear = (isoDate) => (isoDate ? isoDate.split("-").reverse().join("-") : "-");

// ---------- storage ----------
const storage = {
    async get(key) {
        const result = await chrome.storage.local.get(key);
        return result[key] ?? {};
    },
    set(key, value) {
        return chrome.storage.local.set({ [key]: value });
    },
};

function messageToBackground(type, text) {
    chrome.runtime.sendMessage({ to: "background.js", from: "popup", type, text });
}

// ---------- home ----------
async function loadExtensionDetails() {
    const manifest = chrome.runtime.getManifest();
    const permissions = await storage.get("permissions");
    document.getElementById("detail-name").innerText = manifest.name;
    document.getElementById("detail-version").innerText = manifest.version;
    document.getElementById("detail-updated").innerText = dayMonthYear(permissions.lastExtensionRefreshed);
    document.getElementById("detail-backup").innerText = dayMonthYear(permissions.lastDataBackup);
}

async function backup() {
    const data = await chrome.storage.local.get(null);
    const url = URL.createObjectURL(new Blob([JSON.stringify(data)], { type: "application/json" }));
    chrome.downloads.download({ url, filename: `backup ${today()}.json` });
    const permissions = await storage.get("permissions");
    permissions.lastDataBackup = today();
    await storage.set("permissions", permissions);
}

async function restoreBackup() {
    const file = document.getElementById("backupFile").files[0];
    if (!file) {
        alert("Please select a file.");
        return;
    }
    try {
        const data = JSON.parse(await file.text());
        await chrome.storage.local.set(data);
        alert("Backup restored successfully!");
        messageToBackground("downloadRepo");
    } catch (error) {
        console.error("Restore failed:", error);
        alert("Invalid backup file. Please upload a valid JSON file.");
    }
}

// ---------- permissions ----------
const priorityBox = document.getElementById("priorityBox");
const priorityRadios = document.getElementById("priorityRadios");

for (let value = 1; value <= 10; value++) {
    const label = document.createElement("label");
    label.append(String(value));
    const radio = document.createElement("input");
    radio.type = "radio";
    radio.name = "messagePriority";
    radio.value = value;
    label.append(radio);
    priorityRadios.append(label);
}

function showPriority(messengerOn, priority) {
    priorityBox.hidden = !messengerOn;
    const radio = priorityRadios.querySelector(`input[value="${priority}"]`);
    if (radio) {
        radio.checked = true;
    }
}

async function loadPermissions() {
    const permissions = await storage.get("permissions");
    document.querySelectorAll(".toggle-checkbox").forEach((toggle) => {
        if (toggle.id in permissions) {
            toggle.checked = Boolean(permissions[toggle.id]);
        }
    });
    showPriority(document.getElementById("messenger").checked, permissions.messagePriority);
}

async function savePermission(event) {
    const input = event.target;
    const permissions = await storage.get("permissions");
    if (input.classList.contains("toggle-checkbox")) {
        permissions[input.id] = input.checked;
        if (input.id === "messenger") {
            showPriority(input.checked, permissions.messagePriority);
        }
    } else if (input.name === "messagePriority") {
        permissions.messagePriority = Number(input.value);
    } else {
        return;
    }
    await storage.set("permissions", permissions);
}

// ---------- pages ----------
const PAGES = {
    home: loadExtensionDetails,
    permissions: loadPermissions,
};
const tabs = document.getElementById("tabs");

function showPage(id) {
    tabs.querySelectorAll(".tab").forEach((tab) => {
        const active = tab.dataset.page === id;
        tab.classList.toggle("active", active);
        tab.setAttribute("aria-selected", active);
    });
    document.querySelectorAll(".page").forEach((page) => {
        page.hidden = page.id !== `page-${id}`;
    });
    PAGES[id]();
}

tabs.addEventListener("click", (event) => {
    const tab = event.target.closest(".tab");
    if (tab) {
        showPage(tab.dataset.page);
    }
});

// ---------- daily tasks (self-update from GitHub, auto backup) ----------
async function runDailyTasks() {
    const permissions = await storage.get("permissions");
    if (permissions.lastExtensionRefreshed !== today()) {
        permissions.lastExtensionRefreshed = today();
        await storage.set("permissions", permissions);
        alert("Extension will close now, you can open it again.");
        messageToBackground("downloadRepo");
    }
    if (permissions.lastDataBackup !== today() && permissions.autoBackup === true) {
        await backup();
    }
}

document.getElementById("permissionsForm").addEventListener("change", savePermission);
document.getElementById("backup").addEventListener("click", backup);
document.getElementById("restore").addEventListener("click", restoreBackup);
document.getElementById("reset").addEventListener("click", () => messageToBackground("downloadRepo"));

showPage("home");
runDailyTasks();
