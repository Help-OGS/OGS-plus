/**
 * OGS Plus - 초경량 브라우저 API 헬퍼
 * Chrome extension 환경에서 chrome.* 네임스페이스를 그대로 사용하되,
 * Promise 기반 storage 래퍼를 제공해 코드 전반에서 async/await로 쓸 수 있게 한다.
 * (별도 webextension-polyfill 라이브러리를 빌드/번들링하지 않고, 수동 install 방식에 맞춰 자체 구현)
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
