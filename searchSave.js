// Search page: remember every mobile number that is searched and list them
// on the right side of the page with the time they were searched.
// Saved in chrome.storage.local under "searchedNumbers" as
//   { "9876543210": { firstSearchedAt, lastSearchedAt, count }, ... }
(function () {
    const STORAGE_KEY = "searchedNumbers";
    const SEARCH_PAGE = "/searchmain";
    const NUMBER_INPUT = 'input.mobile-input[data-id="mobileNumber"]';
    const PANEL_ID = "contentJS-searchedNumbers";

    const onSearchPage = () => location.pathname.toLowerCase().includes(SEARCH_PAGE);

    // ---------- saving ----------
    function readNumber(button) {
        const root = button.getRootNode ? button.getRootNode() : document;
        const input = root.querySelector(NUMBER_INPUT) || document.querySelector(NUMBER_INPUT);
        const number = input ? String(input.value).trim() : "";
        return /^\d{10}$/.test(number) ? number : null;
    }

    function saveNumber(number) {
        const now = new Date().toISOString();
        chrome.storage.local.get(STORAGE_KEY, (result) => {
            if (chrome.runtime.lastError) {
                return;
            }
            const saved = result[STORAGE_KEY] || {};
            const entry = saved[number];
            saved[number] = entry
                ? { ...entry, lastSearchedAt: now, count: entry.count + 1 }
                : { firstSearchedAt: now, lastSearchedAt: now, count: 1 };
            chrome.storage.local.set({ [STORAGE_KEY]: saved });
        });
    }

    document.addEventListener("click", (event) => {
        if (!onSearchPage()) {
            return;
        }
        const button = event.composedPath().find((el) => el.matches && el.matches("button.proceedBtn"));
        if (!button) {
            return;
        }
        const number = readNumber(button);
        if (number) {
            saveNumber(number);
        }
    }, true);

    // ---------- panel on the right side of the page ----------
    const PANEL_CSS = `
        :host { all: initial; }
        :host-context(html.contentJS-notFullScreen) { display: none !important; }
        .panel {
            position: fixed; top: 120px; right: 10px; width: 230px; max-height: 60vh;
            display: flex; flex-direction: column; box-sizing: border-box;
            background: #ffffff; border: 1px solid #085C97; border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
            font-family: Rubik, Arial, sans-serif; font-size: 13px; color: #222; z-index: 1000;
        }
        .title { padding: 8px 10px; background: #085C97; color: #fff; font-weight: 600; border-radius: 7px 7px 0 0; }
        ul { list-style: none; margin: 0; padding: 0; overflow-y: auto; }
        li { display: flex; justify-content: space-between; align-items: baseline; gap: 8px;
             padding: 6px 10px; border-bottom: 1px solid #e5e5e5; }
        li:last-child { border-bottom: none; }
        .number { font-weight: 600; letter-spacing: 0.3px; }
        .count { margin-left: 4px; padding: 0 5px; border-radius: 8px; background: #e6f1f9; color: #085C97; font-size: 11px; }
        .time { color: #666; font-size: 11px; text-align: right; white-space: nowrap; }
        .empty { padding: 10px; color: #666; }
    `;

    let host = null;
    let list = null;
    let title = null;

    function formatTime(iso) {
        const date = new Date(iso);
        if (Number.isNaN(date.getTime())) {
            return "";
        }
        return date.toLocaleString("en-GB", {
            day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", hour12: false,
        });
    }

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
        if (!host) {
            return;
        }
        const entries = Object.entries(saved || {})
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
            const left = document.createElement("span");
            const num = document.createElement("span");
            num.className = "number";
            num.textContent = number;
            left.append(num);
            if (entry.count > 1) {
                const count = document.createElement("span");
                count.className = "count";
                count.textContent = `x${entry.count}`;
                left.append(count);
            }
            const time = document.createElement("span");
            time.className = "time";
            time.textContent = formatTime(entry.lastSearchedAt);
            time.title = `First searched: ${formatTime(entry.firstSearchedAt)}`;
            item.append(left, time);
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
            clearInterval(timer);
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
    const timer = setInterval(syncPanel, 1000);
    syncPanel();
})();
