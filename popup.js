"use strict";

// Entries are kept in chrome.storage.local under "fosDetails" as
//   { "NAME": { finOneCode: "646180", addedAt: 1730000000000 }, ... }
// (storage does not keep key order, so rows are sorted by addedAt; older entries come first)
const STORAGE_KEY = "fosDetails";

const rows = document.getElementById("rows");
const emptyNote = document.getElementById("empty");
const form = document.getElementById("addForm");
const finOneInput = document.getElementById("finOneInput");
const nameInput = document.getElementById("nameInput");
const message = document.getElementById("message");

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

async function render() {
    const entries = await readEntries();
    const names = Object.keys(entries).sort((x, y) => (entries[x].addedAt ?? 0) - (entries[y].addedAt ?? 0) || x.localeCompare(y));
    rows.replaceChildren();
    names.forEach((name, index) => {
        const row = document.createElement("tr");
        const cells = [index + 1, entries[name].finOneCode, name];
        for (const value of cells) {
            const cell = document.createElement("td");
            cell.textContent = value ?? "";
            row.append(cell);
        }
        const actionCell = document.createElement("td");
        actionCell.className = "action";
        const remove = document.createElement("button");
        remove.type = "button";
        remove.className = "delete";
        remove.textContent = "✕";
        remove.title = `Remove ${name}`;
        remove.dataset.name = name;
        actionCell.append(remove);
        row.append(actionCell);
        rows.append(row);
    });
    emptyNote.hidden = names.length > 0;
}

async function addEntry(event) {
    event.preventDefault();
    const finOne = finOneInput.value.trim();
    const name = nameInput.value.trim();
    if (!/^\d+$/.test(finOne)) {
        showMessage("Finone must be a number");
        finOneInput.focus();
        return;
    }
    if (!name) {
        showMessage("Enter a name");
        nameInput.focus();
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

async function removeEntry(event) {
    const button = event.target.closest("button.delete");
    if (!button) {
        return;
    }
    const entries = await readEntries();
    delete entries[button.dataset.name];
    await writeEntries(entries);
    showMessage("");
    render();
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
rows.addEventListener("click", removeEntry);
render();
runDailyUpdate();
