/**
 * OGS Plus - Ultra-Lightweight Browser API Helper
 * In the Chrome extension environment, use the chrome.* namespace as is, but,
 * Provides a Promise-based storage wrapper so that async/await can be used throughout the code.
 * (Implemented independently following a manual install approach, without building or bundling a separate webextension-polyfill library)
 */
(function (global) {
  "use strict";

  if (!global.OGSPlusBrowser) {
    const runtime = typeof chrome !== "undefined" ? chrome : undefined;

    const storageLocal = {
      get(keys) {
        return new Promise((resolve, reject) => {
          try {
            runtime.storage.local.get(keys, (result) => {
              if (runtime.runtime.lastError) {
                reject(runtime.runtime.lastError);
              } else {
                resolve(result);
              }
            });
          } catch (e) {
            reject(e);
          }
        });
      },
      set(items) {
        return new Promise((resolve, reject) => {
          try {
            runtime.storage.local.set(items, () => {
              if (runtime.runtime.lastError) {
                reject(runtime.runtime.lastError);
              } else {
                resolve();
              }
            });
          } catch (e) {
            reject(e);
          }
        });
      },
      remove(keys) {
        return new Promise((resolve, reject) => {
          try {
            runtime.storage.local.remove(keys, () => {
              if (runtime.runtime.lastError) {
                reject(runtime.runtime.lastError);
              } else {
                resolve();
              }
            });
          } catch (e) {
            reject(e);
          }
        });
      },
    };

    const onStorageChanged = {
      addListener(cb) {
        runtime.storage.onChanged.addListener(cb);
      },
      removeListener(cb) {
        runtime.storage.onChanged.removeListener(cb);
      },
    };

    global.OGSPlusBrowser = {
      runtime,
      storage: { local: storageLocal, onChanged: onStorageChanged },
    };
  }
})(typeof window !== "undefined" ? window : globalThis);
