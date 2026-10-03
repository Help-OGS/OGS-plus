/**
* OGS Plus - Common Utilities 
* DOM helpers, configuration access, translation helpers, etc., shared across all content scripts.
 */
(function (global) {
  "use strict";

  const Storage = global.OGSPlusStorage;
  const I18n = global.OGSPlusI18n;

  let cachedSettings = null;

  async function loadSettings() {
    cachedSettings = await Storage.getSettings();
    return cachedSettings;
  }

  function getCachedSettings() {
    return cachedSettings || Storage.DEFAULT_SETTINGS;
  }

  function t(key) {
    const lang = getCachedSettings().language || "en";
    return I18n.translate(key, lang);
  }

// Execute a callback when a specific selector appears (or immediately if it already exists). 
// Supports SPA routing.
  function onElementReady(selector, callback, root = document) {
    const existing = root.querySelector(selector);

    if (existing) {
      callback(existing);
      return () => {};
    }

    const observer = new MutationObserver(() => {
      const el = root.querySelector(selector);

      if (el) {
        callback(el);
      }
    });

    observer.observe(root === document ? document.body : root, {
      childList: true,
      subtree: true,
    });

    return () => observer.disconnect();
  }

  // Continuously monitor the selector.
  function watchElements(selector, callback, root = document) {
    const seen = new WeakSet();

    const scan = () => {
      root.querySelectorAll(selector).forEach((el) => {
        if (!seen.has(el)) {
          seen.add(el);

          try {
            callback(el);
          } catch (e) {
            console.error("[OGS Plus]", e);
          }
        }
      });
    };

    scan();

    const observer = new MutationObserver(() => scan());

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    return () => observer.disconnect();
  }

  function createEl(tag, attrs = {}, children = []) {
    const el = document.createElement(tag);

    for (const [k, v] of Object.entries(attrs)) {
      if (k === "class") {
        el.className = v;
      } else if (k === "style" && typeof v === "object") {
        Object.assign(el.style, v);
      } else if (k.startsWith("on") && typeof v === "function") {
        el.addEventListener(k.slice(2).toLowerCase(), v);
      } else if (k === "html") {
        el.innerHTML = v;
      } else if (k === "text") {
        el.textContent = v;
      } else {
        el.setAttribute(k, v);
      }
    }

    for (const child of [].concat(children)) {
      if (child == null) continue;

      el.appendChild(
        typeof child === "string"
          ? document.createTextNode(child)
          : child,
      );
    }

    return el;
  }

  function debounce(fn, wait) {
    let timer = null;

    return (...args) => {
      clearTimeout(timer);

      timer = setTimeout(() => {
        fn(...args);
      }, wait);
    };
  }

  // Current User Information
  function getCurrentUserId() {
    try {
      const raw = localStorage.getItem("ogs.data");

      if (raw) {
        const parsed = JSON.parse(raw);

        if (parsed && parsed.user && parsed.user.id) {
          return parsed.user.id;
        }
      }
    } catch (e) {
      /* ignore */
    }

    // fallback: Extracted from the profile icon link
    const profileLink = document.querySelector(
      'a[href^="/user/view/"]',
    );

    if (profileLink) {
      const m = profileLink
        .getAttribute("href")
        .match(/\/user\/view\/(\d+)/);

      if (m) {
        return Number(m[1]);
      }
    }

    return null;
  }

  function getCookie(name) {
    const match = document.cookie.match(
      new RegExp("(^| )" + name + "=([^;]+)"),
    );

    return match
      ? decodeURIComponent(match[2])
      : "";
  }

  /**
   * Standard OGS API Request
   */
  function apiFetch(path, opts = {}) {
    const url = path.startsWith("http")
      ? path
      : `${window.location.origin}/api/v1/${path}`;

    const method = (opts.method || "GET").toUpperCase();

    const csrfSafe = /^(GET|HEAD|OPTIONS|TRACE)$/.test(
      method,
    );

    const headers = {
      Accept: "application/json",
      ...(opts.headers || {}),
    };

    if (!csrfSafe) {
      headers["X-CSRFToken"] = getCookie("csrftoken");

      if (
        opts.body &&
        !(opts.body instanceof FormData) &&
        !headers["Content-Type"]
      ) {
        headers["Content-Type"] = "application/json";
      }
    }

    return fetch(url, {
      credentials: "include",
      headers,
      ...opts,
    }).then(async (res) => {
      if (!res.ok) {
        const text = await res.text();

        throw new Error(
          `HTTP ${res.status}${text ? `: ${text.slice(0, 500)}` : ""}`,
        );
      }

      const ct =
        res.headers.get("content-type") || "";

      return ct.includes("application/json")
        ? res.json()
        : res.text();
    });
  }

  /**
 * Raw API Request 
 * 
 * Used when receiving a non-JSON response, such as SGF. 
 * Specifically used for `/games/{id}/sgf`.
   */
  async function apiFetchRaw(path, opts = {}) {
    const url = path.startsWith("http")
      ? path
      : `${window.location.origin}/api/v1/${path}`;

    const method = (opts.method || "GET").toUpperCase();

    const csrfSafe = /^(GET|HEAD|OPTIONS|TRACE)$/.test(
      method,
    );

    const headers = {
      ...(opts.headers || {}),
    };

    if (!csrfSafe) {
      headers["X-CSRFToken"] = getCookie("csrftoken");

  // Do not manually set the Content-Type for FormData. 
  // The browser must automatically set the multipart boundary.
      if (
        opts.body &&
        !(opts.body instanceof FormData) &&
        !headers["Content-Type"]
      ) {
        headers["Content-Type"] = "application/json";
      }
    }

    const res = await fetch(url, {
      credentials: "include",
      ...opts,
      headers,
    });

    const text = await res.text();

    if (!res.ok) {
      throw new Error(
        `HTTP ${res.status}${text ? `: ${text.slice(0, 1000)}` : ""}`,
      );
    }

    return {
      status: res.status,
      headers: res.headers,
      text,
    };
  }

  global.OGSPlusUtils = {
    loadSettings,
    getCachedSettings,
    t,
    onElementReady,
    watchElements,
    createEl,
    debounce,
    getCurrentUserId,
    apiFetch,
    apiFetchRaw,
  };
})(
  typeof window !== "undefined"
    ? window
    : globalThis,
);
