// Search page: remember every mobile number that is searched and list them
// on the right side of the page ("5 mins ago"). Click a number to search it
// again, click the cross to delete it.
// Saved in chrome.storage.local under "searchedNumbers" as
//   { "9876543210": { firstSearchedAt, lastSearchedAt, count }, ... }
(function () {
    const STORAGE_KEY = "searchedNumbers";
    const SEARCH_PAGE = "/searchmain";
    const NUMBER_INPUT = 'input.mobile-input[data-id="mobileNumber"]';
    const SEARCH_BUTTON = "button.proceedBtn";
    const PANEL_ID = "contentJS-searchedNumbers";
    const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

    const onSearchPage = () => location.pathname.toLowerCase().includes(SEARCH_PAGE);

    // ---------- saving ----------
    function readNumber(button) {
        const root = button.getRootNode ? button.getRootNode() : document;
        const input = root.querySelector(NUMBER_INPUT) || document.querySelector(NUMBER_INPUT);
        const number = input ? String(input.value).trim() : "";
        return /^\d{10}$/.test(number) ? number : null;
    }

    function updateSaved(change) {
        chrome.storage.local.get(STORAGE_KEY, (result) => {
            if (chrome.runtime.lastError) {
                return;
            }
            const saved = result[STORAGE_KEY] || {};
            change(saved);
            chrome.storage.local.set({ [STORAGE_KEY]: saved });
        });
    }

    function saveNumber(number) {
        const now = new Date().toISOString();
        updateSaved((saved) => {
            const entry = saved[number];
            saved[number] = entry
                ? { ...entry, lastSearchedAt: now, count: entry.count + 1 }
                : { firstSearchedAt: now, lastSearchedAt: now, count: 1 };
        });
    }

    function deleteNumber(number) {
        updateSaved((saved) => {
            delete saved[number];
        });
    }

    document.addEventListener("click", (event) => {
        if (!onSearchPage()) {
            return;
        }
        const button = event.composedPath().find((el) => el.matches && el.matches(SEARCH_BUTTON));
        if (!button) {
            return;
        }
        const number = readNumber(button);
        if (number) {
            saveNumber(number);
        }
    }, true);

    // ---------- searching a saved number again ----------
    async function findNumberInput() {
        let input = document.querySelector(NUMBER_INPUT);
        if (input) {
            return input;
        }
        // the page is in Card Number mode: switch back to Mobile Number
        const modeButton = Array.from(document.querySelectorAll("button.button-active, button.button-inactive"))
            .find((button) => /mobile number/i.test(button.textContent));
        if (!modeButton) {
            return null;
        }
        modeButton.click();
        for (let tries = 0; tries < 20 && !input; tries++) {
            await sleep(100);
            input = document.querySelector(NUMBER_INPUT);
        }
        return input;
    }

    async function searchNumber(number) {
        const input = await findNumberInput();
        if (!input) {
            return;
        }
        // set the value the way a user typing would, so the page's own code notices it
        Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set.call(input, number);
        input.dispatchEvent(new Event("input", { bubbles: true, composed: true }));
        input.dispatchEvent(new Event("change", { bubbles: true, composed: true }));
        await sleep(100);
        const searchButton = document.querySelector(SEARCH_BUTTON);
        if (searchButton) {
            searchButton.click();
        }
    }

    // ---------- panel on the right side of the page ----------
    const PANEL_CSS = `
        :host { all: initial; }
        :host-context(html.contentJS-notFullScreen) { display: none !important; }
        .panel {
            position: fixed; top: 120px; right: 10px; width: 25vw; min-width: 260px; max-height: 60vh;
            display: flex; flex-direction: column; box-sizing: border-box;
            background: #ffffff; border: 1px solid #085C97; border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
            font-family: Rubik, Arial, sans-serif; font-size: 14px; color: #222; z-index: 1000;
        }
        .title { padding: 8px 12px; background: #085C97; color: #fff; font-weight: 600; border-radius: 7px 7px 0 0; }
        ul { list-style: none; margin: 0; padding: 0; overflow-y: auto; }
        li { display: flex; align-items: center; gap: 8px; padding: 6px 12px; border-bottom: 1px solid #e5e5e5; }
        li:last-child { border-bottom: none; }
        .number {
            flex: none; padding: 0; border: none; background: none; cursor: pointer;
            font: inherit; font-weight: 600; letter-spacing: 0.3px; color: #085C97;
        }
        .number:hover { text-decoration: underline; }
        .count { padding: 0 5px; border-radius: 8px; background: #e6f1f9; color: #085C97; font-size: 11px; }
        .time { margin-left: auto; color: #666; font-size: 12px; white-space: nowrap; }
        .delete {
            flex: none; display: flex; align-items: center; justify-content: center;
            width: 22px; height: 22px; padding: 0; border: none; border-radius: 50%;
            background: none; color: #999; cursor: pointer;
        }
        .delete:hover { background: #fde8e8; color: #c62828; }
        .delete svg { width: 12px; height: 12px; }
        .empty { padding: 10px 12px; color: #666; }
    `;
    const CROSS_ICON = '<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" fill="none"/></svg>';

    let host = null;
    let list = null;
    let title = null;
    let current = {};

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
        if (hours < 24) {
            return plural(hours, "hour");
        }
        return plural(Math.floor(hours / 24), "day");
    }

    const fullTime = (iso) => new Date(iso).toLocaleString("en-GB", {
        day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false,
    });

    function mountPanel() {
        host = document.createElement("div");
        host.id = PANEL_ID;
        const root = host.attachShadow({ mode: "open" });
        const style = document.createElement("style");
        style.textContent = PANEL_CSS;
        const panel = document.createElement("div");
        panel.className = "panel";
        title = document.createElement("div");
        title.className = "title";
        list = document.createElement("ul");
        list.addEventListener("click", (event) => {
            const target = event.target.closest("button");
            if (!target) {
                return;
            }
            if (target.classList.contains("number")) {
                searchNumber(target.dataset.number);
            } else if (target.classList.contains("delete")) {
                deleteNumber(target.dataset.number);
            }
        });
        panel.append(title, list);
        root.append(style, panel);
        document.body.append(host);
    }

    function unmountPanel() {
        if (host) {
            host.remove();
            host = list = title = null;
        }
    }

    function render(saved) {
        current = saved || {};
        if (!host) {
            return;
        }
        const entries = Object.entries(current)
            .sort((a, b) => String(b[1].lastSearchedAt).localeCompare(String(a[1].lastSearchedAt)));
        title.textContent = `Searched numbers (${entries.length})`;
        list.replaceChildren();
        if (entries.length === 0) {
            const empty = document.createElement("li");
            empty.className = "empty";
            empty.textContent = "No numbers searched yet";
            list.append(empty);
            return;
        }
        for (const [number, entry] of entries) {
            const item = document.createElement("li");

            const numberButton = document.createElement("button");
            numberButton.className = "number";
            numberButton.type = "button";
            numberButton.dataset.number = number;
            numberButton.textContent = number;
            numberButton.title = "Search this number";
            item.append(numberButton);

            if (entry.count > 1) {
                const count = document.createElement("span");
                count.className = "count";
                count.textContent = `x${entry.count}`;
                item.append(count);
            }

            const time = document.createElement("span");
            time.className = "time";
            time.textContent = timeAgo(entry.lastSearchedAt);
            time.title = `Last searched: ${fullTime(entry.lastSearchedAt)}\nFirst searched: ${fullTime(entry.firstSearchedAt)}`;
            item.append(time);

            const deleteButton = document.createElement("button");
            deleteButton.className = "delete";
            deleteButton.type = "button";
            deleteButton.dataset.number = number;
            deleteButton.title = "Delete";
            deleteButton.setAttribute("aria-label", `Delete ${number}`);
            deleteButton.innerHTML = CROSS_ICON;
            item.append(deleteButton);

            list.append(item);
        }
    }

    function refresh() {
        chrome.storage.local.get(STORAGE_KEY, (result) => {
            if (!chrome.runtime.lastError) {
                render(result[STORAGE_KEY]);
            }
        });
    }

    // the site is a single-page app: show the panel only while the search page is open
    function syncPanel() {
        if (!chrome.runtime.id) {
            clearInterval(panelTimer);
            clearInterval(agoTimer);
            unmountPanel();
            return;
        }
        if (onSearchPage() && document.body) {
            if (!host || !host.isConnected) {
                mountPanel();
                refresh();
            }
        } else {
            unmountPanel();
        }
    }

    chrome.storage.onChanged.addListener((changes, area) => {
        if (area === "local" && changes[STORAGE_KEY]) {
            render(changes[STORAGE_KEY].newValue);
        }
    });
    const panelTimer = setInterval(syncPanel, 1000);
    // keep "5 mins ago" fresh
    const agoTimer = setInterval(() => render(current), 20000);
    syncPanel();
})();
