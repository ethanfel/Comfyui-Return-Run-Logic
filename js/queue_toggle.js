/**
 * Return Queue Logic - Toggle Button Extension
 *
 * Adds a toggle button next to the queue button to quickly switch
 * between "Run" (disabled) and "Run (Instant)" modes without
 * opening the dropdown menu.
 */

import { app } from "../../scripts/app.js";

const EXTENSION_NAME = "ReturnQueueLogic";
const BUTTON_ID = "queue-instant-toggle-btn";
const DEBUG = false;

function debugLog(...args) {
    if (DEBUG) console.log(`[${EXTENSION_NAME}]`, ...args);
}

let cachedStore = null;

function getQueueStore() {
    if (cachedStore) return cachedStore;

    const vueApp = document.getElementById("vue-app")?.__vue_app__;
    if (!vueApp) {
        debugLog("Vue app not found");
        return null;
    }
    const pinia = vueApp.config.globalProperties.$pinia;
    if (!pinia) {
        debugLog("Pinia not found");
        return null;
    }
    const store = pinia._s.get("queueSettingsStore");
    if (!store) {
        debugLog("Queue settings store not found");
        return null;
    }
    cachedStore = store;
    return store;
}

function createToggleButton(store) {
    const btn = document.createElement("button");
    btn.id = BUTTON_ID;

    Object.assign(btn.style, {
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        border: "none",
        cursor: "pointer",
        padding: "0",
        borderRadius: "6px",
        lineHeight: "1",
        transition: "background 0.2s ease, box-shadow 0.2s ease",
        userSelect: "none",
        width: "32px",
        height: "30px",
        marginLeft: "4px",
        outline: "none",
    });

    btn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();

        if (store.mode === "instant") {
            store.mode = "disabled";
        } else {
            store.mode = "instant";
        }
    });

    // Set initial state
    applyButtonState(btn, store.mode);

    return btn;
}

const SVG_NS = "http://www.w3.org/2000/svg";

function createBoltSVG(isInstant) {
    const svg = document.createElementNS(SVG_NS, "svg");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("width", "18");
    svg.setAttribute("height", "18");
    svg.style.display = "block";
    svg.style.transition = "filter 0.2s ease";

    // Lightning bolt path
    const bolt = document.createElementNS(SVG_NS, "path");
    bolt.setAttribute("d", "M13 2L4.5 13.5H11L10 22L19.5 10.5H13L13 2Z");
    bolt.setAttribute("stroke-linejoin", "round");
    bolt.setAttribute("stroke-linecap", "round");

    if (isInstant) {
        bolt.setAttribute("fill", "#fff");
        bolt.setAttribute("stroke", "#fff");
        bolt.setAttribute("stroke-width", "1");
        svg.style.filter = "drop-shadow(0 0 3px rgba(255,180,50,0.6))";
    } else {
        bolt.setAttribute("fill", "none");
        bolt.setAttribute("stroke", "#888");
        bolt.setAttribute("stroke-width", "1.8");
        svg.style.filter = "none";
    }

    svg.appendChild(bolt);

    // Slash line when OFF
    if (!isInstant) {
        const slash = document.createElementNS(SVG_NS, "line");
        slash.setAttribute("x1", "4");
        slash.setAttribute("y1", "4");
        slash.setAttribute("x2", "20");
        slash.setAttribute("y2", "20");
        slash.setAttribute("stroke", "#888");
        slash.setAttribute("stroke-width", "1.8");
        slash.setAttribute("stroke-linecap", "round");
        svg.appendChild(slash);
    }

    return svg;
}

function applyButtonState(btn, mode) {
    const isInstant = mode === "instant";

    // Clear existing SVG
    btn.innerHTML = "";

    if (isInstant) {
        btn.title = "Click to switch to Run (normal queue)";
        Object.assign(btn.style, {
            background: "#e67e22",
            boxShadow: "0 0 8px rgba(230,126,34,0.4)",
        });
    } else {
        btn.title = "Click to switch to Run (Instant)";
        Object.assign(btn.style, {
            background: "#3a3a3a",
            boxShadow: "none",
        });
    }

    btn.appendChild(createBoltSVG(isInstant));
}

let storeUnsubscribe = null;

function injectToggleButton() {
    if (document.getElementById(BUTTON_ID)) {
        debugLog("Button already exists");
        return;
    }

    const store = getQueueStore();
    if (!store) {
        debugLog("Store not available yet, deferring injection");
        return;
    }

    const queueButton = document.querySelector(
        '[data-testid="queue-button"]'
    );
    if (!queueButton) {
        debugLog("Queue button not found");
        return;
    }

    const buttonGroup = queueButton.closest(".queue-button-group");
    const insertTarget = buttonGroup || queueButton.parentElement;
    if (!insertTarget?.parentElement) {
        debugLog("No valid parent to insert into");
        return;
    }

    const btn = createToggleButton(store);
    insertTarget.parentElement.insertBefore(btn, insertTarget.nextSibling);

    // Clean up previous subscription if any (e.g. button was removed and re-injected)
    if (storeUnsubscribe) {
        storeUnsubscribe();
        storeUnsubscribe = null;
    }

    // Subscribe reactively to store changes so the button stays in sync
    // when the user changes mode via the dropdown menu.
    storeUnsubscribe = store.$subscribe((_mutation, state) => {
        const existing = document.getElementById(BUTTON_ID);
        if (existing) {
            applyButtonState(existing, state.mode);
        }
    });

    debugLog("Toggle button injected");
}

function setupObserver() {
    let pending = false;

    const observer = new MutationObserver(() => {
        // Debounce: skip if we already have a pending check
        if (pending) return;
        // Fast check: skip if button already exists
        if (document.getElementById(BUTTON_ID)) return;

        pending = true;
        requestAnimationFrame(() => {
            pending = false;
            if (!document.getElementById(BUTTON_ID)) {
                injectToggleButton();
            }
        });
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true,
    });

    debugLog("MutationObserver set up");

    // Try immediately
    injectToggleButton();

    // Retry after delays as fallback (Vue/Pinia may not be ready yet)
    setTimeout(() => {
        if (!document.getElementById(BUTTON_ID)) injectToggleButton();
    }, 2000);
    setTimeout(() => {
        if (!document.getElementById(BUTTON_ID)) injectToggleButton();
    }, 5000);
}

app.registerExtension({
    name: "Comfy.ReturnQueueLogic",

    async setup() {
        debugLog("Setting up Return Queue Logic extension");
        setupObserver();
        debugLog("Setup complete");
    },
});
