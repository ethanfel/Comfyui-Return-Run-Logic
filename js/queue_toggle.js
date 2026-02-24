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
        padding: "4px 8px",
        borderRadius: "4px",
        fontSize: "12px",
        fontWeight: "600",
        fontFamily: "system-ui, -apple-system, sans-serif",
        lineHeight: "1",
        transition: "background 0.15s ease, color 0.15s ease",
        whiteSpace: "nowrap",
        userSelect: "none",
        height: "30px",
        marginLeft: "4px",
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

function applyButtonState(btn, mode) {
    const isInstant = mode === "instant";

    if (isInstant) {
        btn.textContent = "Instant: ON";
        btn.title = "Click to switch to Run (normal queue)";
        Object.assign(btn.style, {
            background: "#e67e22",
            color: "#fff",
        });
    } else {
        btn.textContent = "Instant: OFF";
        btn.title = "Click to switch to Run (Instant)";
        Object.assign(btn.style, {
            background: "#3a3a3a",
            color: "#aaa",
        });
    }
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
