// qrLink.js
// Finds QR codes that are visible on the page, decodes them and shows the link
// they contain as a clickable chip right under the QR. Clicking the chip opens
// the link in a new tab next to the current one.
(() => {
    "use strict";
    if (window.__qrLinkInstalled) { return; }
    window.__qrLinkInstalled = true;

    // "newTab"  -> open the link in a new tab right next to this one
    // "sameTab" -> open the link in this tab (replaces the current page)
    const OPEN_IN = "newTab";

    const MIN_SIZE = 90;          // px, ignore anything smaller (icons, logos)
    const MAX_SIZE = 900;         // px, ignore anything bigger (banners, backgrounds)
    const SCAN_GAP_MS = 700;      // minimum time between two scans
    const POLL_MS = 2000;         // canvases change without DOM mutations, so poll too
    const CAPTURE_GAP_MS = 1100;  // chrome allows ~2 tab screenshots per second
    const CAPTURE_BUDGET = 40;    // max screenshot fallbacks per page load
    const CHIP_CLASS = "qrlink-chip";
    const RETRY_LATER = Symbol("retry");

    let enabled = true;
    let scanning = false;
    let lastScan = 0;
    let lastCapture = 0;
    let captureCount = 0;
    let scheduled = null;
    let positionQueued = false;
    let pollTimer = null;
    let observer = null;

    const records = new WeakMap(); // element -> { sig, url, dismissed }
    const chips = new Map();       // element -> chip node

    const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
    const alive = () => {
        try { return Boolean(chrome.runtime && chrome.runtime.id); } catch (e) { return false; }
    };

    // ---------------------------------------------------------------- styles
    function injectStyle() {
        if (document.getElementById("qrlink-style")) { return; }
        const style = document.createElement("style");
        style.id = "qrlink-style";
        style.textContent = `
            .${CHIP_CLASS}{position:fixed;z-index:2147483000;display:flex;align-items:center;gap:6px;
                max-width:min(420px,calc(100vw - 16px));padding:5px 8px;border-radius:8px;
                background:#0b3d91;color:#fff;font:600 12px/1.3 Arial,sans-serif;
                box-shadow:0 2px 8px rgba(0,0,0,.35)}
            .${CHIP_CLASS} a{color:#fff;text-decoration:underline;overflow:hidden;text-overflow:ellipsis;
                white-space:nowrap;min-width:0}
            .${CHIP_CLASS} button{all:unset;cursor:pointer;padding:0 3px;font-size:11px;opacity:.8}
            .${CHIP_CLASS} button:hover{opacity:1}
        `;
        (document.head || document.documentElement).appendChild(style);
    }

    // ------------------------------------------------------------ candidates
    function collectCandidates() {
        const found = [];
        const visit = (root) => {
            root.querySelectorAll("canvas, img, svg").forEach((el) => found.push(el));
            const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT);
            for (let node = walker.nextNode(); node; node = walker.nextNode()) {
                if (node.shadowRoot) { visit(node.shadowRoot); }
            }
        };
        visit(document);
        return found;
    }

    function geometry(el) {
        const r = el.getBoundingClientRect();
        if (r.width < MIN_SIZE || r.height < MIN_SIZE || r.width > MAX_SIZE || r.height > MAX_SIZE) { return null; }
        const ratio = r.width / r.height;
        if (ratio < 0.85 || ratio > 1.18) { return null; }
        if (r.bottom < 0 || r.right < 0 || r.top > window.innerHeight || r.left > window.innerWidth) { return null; }
        const cs = getComputedStyle(el);
        if (cs.visibility === "hidden" || cs.display === "none" || Number(cs.opacity) === 0) { return null; }
        return r;
    }

    // ------------------------------------------------------------- signature
    function hashString(text) {
        let h = 0;
        for (let i = 0; i < text.length; i++) { h = (h * 31 + text.charCodeAt(i)) | 0; }
        return h;
    }

    // Cheap fingerprint used to notice when a QR was replaced by a different one.
    function signature(el) {
        const tag = el.tagName.toLowerCase();
        if (tag === "svg") {
            const markup = new XMLSerializer().serializeToString(el);
            return `svg:${markup.length}:${hashString(markup)}`;
        }
        if (tag === "img" && (!el.complete || !el.naturalWidth)) { return null; }
        // a fresh canvas every time: once a cross-origin image is drawn on a canvas it stays
        // "tainted" and can never be read again, which would break every later fingerprint
        const thumb = document.createElement("canvas");
        thumb.width = 24;
        thumb.height = 24;
        const thumbCtx = thumb.getContext("2d", { willReadFrequently: true });
        thumbCtx.fillStyle = "#fff";
        thumbCtx.fillRect(0, 0, 24, 24);
        thumbCtx.drawImage(el, 0, 0, 24, 24);
        const px = thumbCtx.getImageData(0, 0, 24, 24).data; // throws when the image is cross-origin
        let h = 0;
        for (let i = 0; i < px.length; i += 4) { h = (h * 31 + px[i] + (px[i + 1] << 1) + (px[i + 2] << 2)) | 0; }
        return `${tag}:${h}`;
    }

    // ---------------------------------------------------------------- decode
    function paper(width, height, margin) {
        const canvas = document.createElement("canvas");
        canvas.width = width + margin * 2;
        canvas.height = height + margin * 2;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        ctx.fillStyle = "#fff"; // transparent QR images would otherwise read as solid black
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        return { canvas, ctx };
    }

    function readCanvas(canvas, ctx) {
        const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(data.data, data.width, data.height);
        return code ? code.data : null;
    }

    function loadImage(src) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            const timer = setTimeout(() => reject(new Error("image timeout")), 2500);
            img.onload = () => { clearTimeout(timer); resolve(img); };
            img.onerror = () => { clearTimeout(timer); reject(new Error("image error")); };
            img.src = src;
        });
    }

    // Decodes straight from the element. Throws when the pixels can't be read.
    async function decodeDirect(el, rect) {
        const tag = el.tagName.toLowerCase();
        let source;
        let width;
        let height;
        if (tag === "canvas") {
            source = el; width = el.width; height = el.height;
        } else if (tag === "img") {
            source = el; width = el.naturalWidth; height = el.naturalHeight;
        } else {
            width = Math.min(MAX_SIZE, Math.max(300, Math.round(rect.width * 2)));
            height = Math.round(width * (rect.height / rect.width));
            const clone = el.cloneNode(true);
            clone.setAttribute("width", width);
            clone.setAttribute("height", height);
            if (!clone.getAttribute("xmlns")) { clone.setAttribute("xmlns", "http://www.w3.org/2000/svg"); }
            const xml = new XMLSerializer().serializeToString(clone);
            source = await loadImage("data:image/svg+xml;charset=utf-8," + encodeURIComponent(xml));
        }
        if (!width || !height) { return null; }
        const scale = Math.min(1, MAX_SIZE / Math.max(width, height));
        const w = Math.round(width * scale);
        const h = Math.round(height * scale);
        const margin = Math.round(Math.max(w, h) * 0.12);
        const { canvas, ctx } = paper(w, h, margin);
        ctx.drawImage(source, margin, margin, w, h);
        return readCanvas(canvas, ctx);
    }

    function captureTab() {
        return new Promise((resolve) => {
            try {
                chrome.runtime.sendMessage({ to: "background.js", from: "content", type: "captureTab" }, (reply) => {
                    if (chrome.runtime.lastError || !reply || !reply.dataUrl) { resolve(null); } else { resolve(reply.dataUrl); }
                });
            } catch (e) { resolve(null); }
        });
    }

    const nextPaint = () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));

    // Fallback for pictures the page won't let us read (cross-origin images etc.):
    // screenshot the tab and cut the QR out of it.
    async function decodeByScreenshot(rect) {
        const full = rect.top >= 0 && rect.left >= 0 && rect.bottom <= window.innerHeight && rect.right <= window.innerWidth;
        if (!full || document.visibilityState !== "visible") { return RETRY_LATER; }
        if (captureCount >= CAPTURE_BUDGET) { return null; }
        const wait = CAPTURE_GAP_MS - (Date.now() - lastCapture);
        if (wait > 0) { await sleep(wait); }
        chips.forEach((chip) => { chip.style.visibility = "hidden"; });
        await nextPaint();
        lastCapture = Date.now();
        captureCount++;
        const dataUrl = await captureTab();
        chips.forEach((chip) => { chip.style.visibility = ""; });
        if (!dataUrl) { return null; }
        const shot = await loadImage(dataUrl);
        const k = shot.naturalWidth / window.innerWidth;
        const pad = Math.round(Math.max(rect.width, rect.height) * 0.08);
        const sx = Math.max(0, Math.round((rect.left - pad) * k));
        const sy = Math.max(0, Math.round((rect.top - pad) * k));
        const sw = Math.min(shot.naturalWidth - sx, Math.round((rect.width + pad * 2) * k));
        const sh = Math.min(shot.naturalHeight - sy, Math.round((rect.height + pad * 2) * k));
        const margin = Math.round(Math.max(sw, sh) * 0.1);
        const { canvas, ctx } = paper(sw, sh, margin);
        ctx.drawImage(shot, sx, sy, sw, sh, margin, margin, sw, sh);
        return readCanvas(canvas, ctx);
    }

    // Only plain web links are shown, anything else (javascript:, data:, upi: ...) is ignored.
    function toWebUrl(text) {
        if (!text) { return null; }
        try {
            const url = new URL(String(text).trim());
            return url.protocol === "http:" || url.protocol === "https:" ? url.href : null;
        } catch (e) { return null; }
    }

    // ------------------------------------------------------------------ chip
    function openLink(url) {
        if (OPEN_IN === "sameTab") { location.href = url; return; }
        const fallback = () => window.open(url, "_blank", "noopener,noreferrer");
        try {
            chrome.runtime.sendMessage({ to: "background.js", from: "content", type: "openTab", text: { url } }, (reply) => {
                if (chrome.runtime.lastError || !reply || !reply.ok) { fallback(); }
            });
        } catch (e) { fallback(); }
    }

    function showChip(el, url) {
        let chip = chips.get(el);
        if (chip && chip.dataset.url === url) { return; }
        if (chip) { chip.remove(); }
        chip = document.createElement("div");
        chip.className = CHIP_CLASS;
        chip.dataset.url = url;

        const link = document.createElement("a");
        link.href = url;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        link.title = url;
        link.textContent = "🔗 " + url.replace(/^https?:\/\//, "");
        link.addEventListener("click", (event) => {
            if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) { return; }
            event.preventDefault();
            event.stopPropagation();
            openLink(url);
        });

        const close = document.createElement("button");
        close.type = "button";
        close.title = "Hide";
        close.textContent = "✕";
        close.addEventListener("click", (event) => {
            event.preventDefault();
            event.stopPropagation();
            const record = records.get(el);
            if (record) { record.dismissed = true; }
            removeChip(el);
        });

        chip.append(link, close);
        (document.body || document.documentElement).appendChild(chip);
        chips.set(el, chip);
        positionChip(el, chip);
    }

    function removeChip(el) {
        const chip = chips.get(el);
        if (chip) { chip.remove(); }
        chips.delete(el);
    }

    function positionChip(el, chip) {
        const r = el.getBoundingClientRect();
        const cw = chip.offsetWidth;
        const ch = chip.offsetHeight;
        let top = r.bottom + 6;
        if (top + ch > window.innerHeight - 4) { top = Math.max(4, r.top - ch - 6); }
        const left = Math.min(Math.max(8, r.left + r.width / 2 - cw / 2), Math.max(8, window.innerWidth - cw - 8));
        chip.style.top = `${Math.round(top)}px`;
        chip.style.left = `${Math.round(left)}px`;
    }

    function positionAll() {
        positionQueued = false;
        chips.forEach((chip, el) => {
            if (!el.isConnected) { removeChip(el); } else { positionChip(el, chip); }
        });
    }

    function queuePosition() {
        if (positionQueued || chips.size === 0) { return; }
        positionQueued = true;
        requestAnimationFrame(positionAll);
    }

    // ------------------------------------------------------------------ scan
    async function inspect(el, rect) {
        let sig;
        try { sig = signature(el); } catch (e) { sig = `unreadable:${el.currentSrc || el.src || el.tagName}`; }
        if (sig === null) { return; } // image still loading
        const previous = records.get(el);
        if (previous && previous.sig === sig) {
            if (previous.url && !previous.dismissed) { showChip(el, previous.url); }
            return;
        }
        const record = { sig, url: null, dismissed: false };
        records.set(el, record);
        let text = null;
        let needScreenshot = false;
        try { text = await decodeDirect(el, rect); } catch (e) { needScreenshot = true; }
        if (!text && needScreenshot) {
            try { text = await decodeByScreenshot(rect); } catch (e) { text = null; }
            if (text === RETRY_LATER) { records.delete(el); return; }
        }
        record.url = toWebUrl(text);
        if (record.url) { showChip(el, record.url); } else { removeChip(el); }
    }

    function shutdown() {
        enabled = false;
        if (observer) { observer.disconnect(); }
        if (pollTimer) { clearInterval(pollTimer); }
        chips.forEach((chip) => chip.remove());
        chips.clear();
    }

    async function scan() {
        if (!alive()) { shutdown(); return; } // extension was reloaded, this copy is orphaned
        if (!enabled || scanning || document.visibilityState !== "visible") { return; }
        scanning = true;
        lastScan = Date.now();
        try {
            const seen = new Set();
            for (const el of collectCandidates()) {
                const rect = geometry(el);
                if (!rect) { continue; }
                seen.add(el);
                await inspect(el, rect);
            }
            chips.forEach((chip, el) => { if (!seen.has(el) || !el.isConnected) { removeChip(el); } });
            positionAll();
        } catch (e) {
            console.log("qrLink scan failed", e);
        } finally {
            scanning = false;
        }
    }

    function requestScan() {
        if (!enabled || scheduled) { return; }
        const wait = Math.max(150, SCAN_GAP_MS - (Date.now() - lastScan));
        scheduled = setTimeout(() => { scheduled = null; scan(); }, wait);
    }

    function setEnabled(value) {
        if (value === enabled) { return; }
        enabled = value;
        if (enabled) { requestScan(); } else { chips.forEach((chip) => chip.remove()); chips.clear(); }
    }

    function readSetting() {
        try {
            chrome.storage.local.get("permissions", (stored) => {
                if (chrome.runtime.lastError) { return; }
                const permissions = stored && stored.permissions;
                setEnabled(!(permissions && permissions.qrLinks === false)); // on unless switched off
            });
        } catch (e) { /* extension reloaded */ }
    }

    function start() {
        injectStyle();
        readSetting();
        try {
            chrome.storage.onChanged.addListener((changes, area) => {
                if (area === "local" && changes.permissions) { readSetting(); }
            });
        } catch (e) { /* extension reloaded */ }
        const ours = (node) => node.nodeType === 1 && (node.classList.contains(CHIP_CLASS) || node.id === "qrlink-style" || Boolean(node.closest && node.closest(`.${CHIP_CLASS}`)));
        observer = new MutationObserver((mutations) => {
            // our own chips moving around must not trigger another scan
            const external = mutations.some((m) => {
                if (m.type === "attributes") { return !ours(m.target); }
                const touched = [...m.addedNodes, ...m.removedNodes];
                return touched.length === 0 ? !ours(m.target) : touched.some((n) => !ours(n));
            });
            if (external) { requestScan(); }
        });
        observer.observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ["src", "style", "class"] });
        window.addEventListener("scroll", queuePosition, { passive: true, capture: true });
        window.addEventListener("resize", () => { queuePosition(); requestScan(); });
        document.addEventListener("visibilitychange", requestScan);
        pollTimer = setInterval(requestScan, POLL_MS);
        requestScan();
    }

    start();
})();
