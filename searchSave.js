// Search page: remember every mobile number that is searched.
// Saved in chrome.storage.local under "searchedNumbers" as
//   { "9876543210": { firstSearchedAt, lastSearchedAt, count }, ... }
(function () {
    const STORAGE_KEY = "searchedNumbers";
    const SEARCH_PAGE = "/searchmain";
    const NUMBER_INPUT = 'input.mobile-input[data-id="mobileNumber"]';

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
        if (!location.pathname.toLowerCase().includes(SEARCH_PAGE)) {
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
})();
