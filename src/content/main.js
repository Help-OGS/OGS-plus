/**
* OGS Plus - content script entry point (orchestrator)
 * Load settings to cache, and detect changes to storage to refresh the cache.
 * Each feature script always reads the latest state via Utils.getCachedSettings().
 */
(function (global) {
  "use strict";
  const Utils = global.OGSPlusUtils;
  const Storage = global.OGSPlusStorage;

  Utils.loadSettings().then(() => {
    console.log("[OGS Plus] settings loaded");
  });

  Storage.onSettingsChanged((newVal) => {
    // utils.js의 cachedSettings를 직접 갱신
    Utils.loadSettings();
    if (newVal && !newVal.masterEnabled) {
      const preview = document.getElementById("ogsplus-css-preview-style");
      if (preview) preview.remove();
    }
  });
})(typeof window !== "undefined" ? window : globalThis);
