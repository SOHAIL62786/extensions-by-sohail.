// Search page: remember every mobile number that is searched and list them
// on the right side of the page ("5 mins ago"). Click a number to search it
// again, click the cross to delete it.
// Saved in chrome.storage.local under "searchedNumbers" as
//   { "9876543210": { firstSearchedAt, lastSearchedAt, count }, ... }
//
// Account aggregator password = last 4 digits of the searched number + year of birth ("32102002").
// The year of birth is read from the customer page that opens after the search. It is kept only for the
// browser session (chrome.storage.session, gone when the browser closes), never in long-term storage:
//   "lastSearchedNumber": "9876543210"
//   "searchPasswords": { "9876543210": { last4, year, password }, ... }
// The customer name (shown at the top of the customer pages) is kept in long-term storage, in the same list:
//   "searchedNumbers": { "9876543210": { ..., name: "NTBCUSTOMER" }, ... }
(function () {
    const STORAGE_KEY = "searchedNumbers";
    const SEARCH_PAGE = "/searchmain";
    const NUMBER_INPUT = 'input.mobile-input[data-id="mobileNumber"]';
    const SEARCH_BUTTON = "button.proceedBtn";
    const PANEL_ID = "contentJS-searchedNumbers";
    const LAST_KEY = "lastSearchedNumber";
    const PASSWORD_KEY = "searchPasswords";
    const NAME_SAVED_KEY = "nameSavedForLastSearch";
    const NAME_ELEMENT = "p.customerName";
    const DOB_INPUT = 'input[data-id="dob"]';
    const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

    // chrome.storage.session; the background script opens it to content scripts. Never throws.
    async function sessionGet(key) {
        try {
            return (await chrome.storage.session.get(key))[key];
        } catch (error) {
            return undefined;
        }
    }
    async function sessionSet(values) {
        try {
            await chrome.storage.session.set(values);
        } catch (error) {
            // session storage not available yet: the password is simply not saved
        }
    }

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

    async function startPassword(number) {
        // a new search of this number: its password is built again from the customer page that opens next
        const passwords = (await sessionGet(PASSWORD_KEY)) || {};
        delete passwords[number];
        // the name is read again from the customer page that opens after this search
        await sessionSet({ [LAST_KEY]: number, [PASSWORD_KEY]: passwords, [NAME_SAVED_KEY]: false });
    }

    async function removePassword(number) {
        const passwords = (await sessionGet(PASSWORD_KEY)) || {};
        delete passwords[number];
        await sessionSet({ [PASSWORD_KEY]: passwords });
    }

    // customer name shown in the header of the customer pages ("NTBCUSTOMER")
    function readCustomerName() {
        const element = document.querySelector(NAME_ELEMENT);
        const name = element ? element.textContent.replace(/\s+/g, " ").trim() : "";
        return name || null;
    }

    async function updateName() {
        const name = readCustomerName();
        if (!name) {
            return;
        }
        const number = await sessionGet(LAST_KEY);
        if (!number) {
            return;
        }
        if (await sessionGet(NAME_SAVED_KEY)) {
            return;
        }
        await sessionSet({ [NAME_SAVED_KEY]: true });
        updateSaved((saved) => {
            if (saved[number]) {
                saved[number].name = name;
            }
        });
    }

    // year of birth shown on the customer page ("2002-07-15" from the date field, or "15/07/2002")
    function readBirthYear() {
        const input = document.querySelector(DOB_INPUT);
        const match = input && String(input.value).match(/(?:^|\D)((?:19|20)\d{2})(?:\D|$)/);
        return match ? match[1] : null;
    }

    async function updatePassword() {
        const year = readBirthYear();
        if (!year) {
            return;
        }
        const number = await sessionGet(LAST_KEY);
        if (!number) {
            return;
        }
        const passwords = (await sessionGet(PASSWORD_KEY)) || {};
        if (passwords[number]) {
            return;
        }
        const last4 = number.slice(-4);
        passwords[number] = { last4, year, password: last4 + year };
        await sessionSet({ [PASSWORD_KEY]: passwords });
    }

    function saveNumber(number) {
        startPassword(number);
        const now = new Date().toISOString();
        updateSaved((saved) => {
            const entry = saved[number];
            saved[number] = entry
                ? { ...entry, lastSearchedAt: now, count: entry.count + 1 }
                : { firstSearchedAt: now, lastSearchedAt: now, count: 1 };
        });
    }

    function deleteNumber(number) {
        removePassword(number);
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
            position: fixed; top: 120px; right: 10px; width: 25vw; min-width: 260px; max-height: 85vh;
            display: flex; flex-direction: column; box-sizing: border-box;
            background: #ffffff; border: 1px solid var(--lwc-brandNavigationBarBackgroundColor, #1E2443); border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
            font-family: Rubik, Arial, sans-serif; font-size: 14px; color: #222; z-index: 1000;
        }
        .title { padding: 8px 12px; background: var(--lwc-brandNavigationBarBackgroundColor, #1E2443); color: #fff; font-weight: 600; border-radius: 7px 7px 0 0; }
        ul { list-style: none; margin: 0; padding: 0; overflow-y: auto; }
        li { display: flex; align-items: center; gap: 8px; padding: 6px 12px; border-bottom: 1px solid #e5e5e5; }
        li:last-child { border-bottom: none; }
        .number {
            flex: none; padding: 0; border: none; background: none; cursor: pointer;
            font: inherit; font-weight: 600; letter-spacing: 0.3px; color: #085C97;
        }
        .number:hover { text-decoration: underline; }
        .password {
            flex: none; padding: 0 6px; border: 1px dashed #085C97; border-radius: 8px; background: #fff;
            color: #085C97; font: inherit; font-size: 11px; letter-spacing: 0.5px; cursor: pointer;
        }
        .password:hover { background: #e6f1f9; }
        .name {
            flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
            color: #333; font-size: 12px;
        }
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
    let passwords = {};

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

    async function copyPassword(button) {
        try {
            await navigator.clipboard.writeText(button.dataset.password);
            const text = button.textContent;
            button.textContent = "copied";
            setTimeout(() => { button.textContent = text; }, 1200);
        } catch (error) {
            // clipboard blocked on this page: the password stays visible to type
        }
    }

    // the dark bar of the page header (the menu with Home, Search, Opportunity ...): the panel title is put
    // on the same line with the same height, so both look like one bar
    function findHeaderBar() {
        if (!title) {
            return null;
        }
        const colour = getComputedStyle(title).backgroundColor;
        const candidates = document.querySelectorAll(".cHeaderWrapper *, .cHeader *");
        // several nested elements can carry the colour: the tallest one is the whole bar
        let best = null;
        for (const element of candidates) {
            const rect = element.getBoundingClientRect();
            if (rect.width > window.innerWidth * 0.5 && rect.height >= 30 && rect.height <= 120 && rect.top < 150
                && getComputedStyle(element).backgroundColor === colour && (!best || rect.height > best.rect.height)) {
                best = { rect, style: getComputedStyle(element) };
            }
        }
        return best;
    }

    function alignWithHeader() {
        const bar = findHeaderBar();
        if (!bar || !title) {
            return;
        }
        const panel = title.parentElement;
        panel.style.top = `${bar.rect.top - 1}px`; // minus the 1px panel border
        title.style.boxSizing = "border-box";
        title.style.minHeight = `${bar.rect.height}px`;
        title.style.display = "flex";
        title.style.alignItems = "center";
        title.style.fontFamily = bar.style.fontFamily;
        title.style.fontSize = bar.style.fontSize;
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
        list.addEventListener("click", (event) => {
            const target = event.target.closest("button");
            if (!target) {
                return;
            }
            if (target.classList.contains("password")) {
                copyPassword(target);
            } else if (target.classList.contains("number")) {
                searchNumber(target.dataset.number);
            } else if (target.classList.contains("delete")) {
                deleteNumber(target.dataset.number);
            }
        });
        panel.append(title, list);
        root.append(style, panel);
        document.body.append(host);
        alignWithHeader();
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
        alignWithHeader();
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

            if (entry.name) {
                const name = document.createElement("span");
                name.className = "name";
                name.textContent = entry.name;
                name.title = entry.name;
                item.append(name);
            }

            if (entry.count > 1) {
                const count = document.createElement("span");
                count.className = "count";
                count.textContent = `x${entry.count}`;
                item.append(count);
            }

            const saved = passwords[number];
            if (saved) {
                const password = document.createElement("button");
                password.className = "password";
                password.type = "button";
                password.dataset.password = saved.password;
                password.textContent = saved.password;
                password.title = `Account aggregator password (last 4 digits ${saved.last4} + birth year ${saved.year}). Click to copy`;
                item.append(password);
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
        chrome.storage.local.get(STORAGE_KEY, async (result) => {
            if (!chrome.runtime.lastError) {
                passwords = (await sessionGet(PASSWORD_KEY)) || {};
                render(result[STORAGE_KEY]);
            }
        });
    }

    // the site is a single-page app: show the panel only while the search page is open
    function syncPanel() {
        if (!chrome.runtime.id) {
            clearInterval(panelTimer);
            clearInterval(agoTimer);
            clearInterval(dobTimer);
            hideGhost();
            unmountPanel();
            return;
        }
        if (onSearchPage() && document.body) {
            if (!host || !host.isConnected) {
                mountPanel();
                refresh();
            } else {
                alignWithHeader(); // the page header may be drawn after the panel
            }
        } else {
            unmountPanel();
        }
    }

    // ---------- suggestion while typing a number ----------
    // A faded copy of the rest of a saved number is drawn over the input. Tab or the right arrow accepts it.
    const GHOST_ID = "contentJS-numberGhost";
    let ghost = null;
    let suggestion = "";

    function suggestFor(typed) {
        if (!/^\d{1,9}$/.test(typed)) {
            return "";
        }
        const match = Object.entries(current)
            .filter(([number]) => number.startsWith(typed) && number !== typed)
            .sort((a, b) => String(b[1].lastSearchedAt).localeCompare(String(a[1].lastSearchedAt)))[0];
        return match ? match[0] : "";
    }

    function hideGhost() {
        suggestion = "";
        if (ghost) {
            ghost.remove();
            ghost = null;
        }
    }

    function updateGhost(input) {
        if (!onSearchPage() || !input || !input.isConnected || document.activeElement !== input && !input.matches(":focus-within")) {
            hideGhost();
            return;
        }
        suggestion = suggestFor(String(input.value).trim());
        if (!suggestion) {
            hideGhost();
            return;
        }
        const rect = input.getBoundingClientRect();
        const style = getComputedStyle(input);
        if (!ghost) {
            ghost = document.createElement("div");
            ghost.id = GHOST_ID;
            ghost.setAttribute("aria-hidden", "true");
            document.body.append(ghost);
        }
        const typed = String(input.value).trim();
        const border = parseFloat(style.borderTopWidth) + parseFloat(style.borderBottomWidth);
        // same box, font and text alignment as the input, so the typed part (hidden) sits exactly under the real text
        Object.assign(ghost.style, {
            position: "fixed", pointerEvents: "none", zIndex: "2147483000", whiteSpace: "pre", overflow: "hidden",
            display: "block", boxSizing: "border-box", margin: "0",
            left: `${rect.left}px`, top: `${rect.top}px`, width: `${rect.width}px`, height: `${rect.height}px`,
            lineHeight: `${rect.height - border}px`,
            paddingLeft: `${parseFloat(style.paddingLeft) + parseFloat(style.borderLeftWidth)}px`,
            paddingRight: `${parseFloat(style.paddingRight) + parseFloat(style.borderRightWidth)}px`,
            textAlign: style.textAlign, font: style.font, letterSpacing: style.letterSpacing, color: style.color,
        });
        ghost.style.lineHeight = `${rect.height - border}px`;
        ghost.replaceChildren();
        const hidden = document.createElement("span");
        hidden.textContent = typed;
        Object.assign(hidden.style, { visibility: "hidden", position: "relative", display: "inline-block" });
        // the rest of the number is drawn right after the typed digits
        const faded = document.createElement("span");
        faded.textContent = suggestion.slice(typed.length);
        Object.assign(faded.style, { visibility: "visible", position: "absolute", left: "100%", top: "0", opacity: "0.35" });
        hidden.append(faded);
        ghost.append(hidden);
    }

    function numberInputOf(event) {
        return event.composedPath().find((el) => el.matches && el.matches(NUMBER_INPUT));
    }

    function acceptSuggestion(input) {
        Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set.call(input, suggestion);
        input.dispatchEvent(new Event("input", { bubbles: true, composed: true }));
        input.dispatchEvent(new Event("change", { bubbles: true, composed: true }));
        hideGhost();
    }

    document.addEventListener("input", (event) => {
        const input = numberInputOf(event);
        if (input) {
            updateGhost(input);
        }
    }, true);
    document.addEventListener("focusin", (event) => {
        const input = numberInputOf(event);
        if (input) {
            updateGhost(input);
        }
    }, true);
    document.addEventListener("focusout", (event) => {
        if (numberInputOf(event)) {
            hideGhost();
        }
    }, true);
    document.addEventListener("keydown", (event) => {
        const input = numberInputOf(event);
        if (!input || !suggestion) {
            return;
        }
        const atEnd = input.selectionStart === input.value.length && input.selectionEnd === input.value.length;
        if ((event.key === "Tab" && !event.shiftKey) || (event.key === "ArrowRight" && atEnd)) {
            event.preventDefault();
            event.stopPropagation();
            acceptSuggestion(input);
        } else if (event.key === "Escape" || event.key === "Enter") {
            hideGhost();
        }
    }, true);
    window.addEventListener("resize", hideGhost);
    window.addEventListener("scroll", hideGhost, true);

    chrome.storage.onChanged.addListener((changes, area) => {
        if (area === "local" && changes[STORAGE_KEY]) {
            render(changes[STORAGE_KEY].newValue);
        } else if (area === "session" && changes[PASSWORD_KEY]) {
            passwords = changes[PASSWORD_KEY].newValue || {};
            render(current);
        }
    });
    const panelTimer = setInterval(syncPanel, 1000);
    // keep "5 mins ago" fresh
    const agoTimer = setInterval(() => render(current), 20000);
    window.addEventListener("resize", alignWithHeader);
    // the customer page fills in the date of birth a moment after it opens
    const dobTimer = setInterval(() => {
        updatePassword();
        updateName();
    }, 1500);
    syncPanel();
})();
