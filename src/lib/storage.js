(function (global) {
  "use strict";

  const STORAGE_KEY = "ogsplus_settings_v1";

  const DEFAULT_SETTINGS = {
    // Overall on/off master switch
    masterEnabled: true,

    // Language
    language: "en",

    features: {
      voiceCommentary: false,
      imagePreview: true,
      customCss: false,
      aboutHeadingShortcut: true,
      betaNavLink: true,
      profileWinRate: true,
      sgfOgsUpload: true,
      botRankRequest: true,
      notifications: true,
    },

    // Voice-over Settings
    voice: {
      lang: "ko-KR",
      hotkey: "ctrl+alt",
      autoSendOnEnter: true,
      interimDisplay: true,
    },

    // Custom CSS
    customCssCode: "",
    customCssApproved: false,

    // Notification Silent Mode
    quietMode: {
      enabled: false,
      muteDm: true,
      muteForum: false,
      muteAnnouncement: false,
    },

    // Notification History
    lastSeen: {
      announcement: 0,
      forum: 0,
      dm: 0,
    },
  };

  function deepMerge(base, override) {
    if (typeof base !== "object" || base === null) {
      return override === undefined ? base : override;
    }

    const result = Array.isArray(base) ? base.slice() : { ...base };

    if (
      override &&
      typeof override === "object" &&
      !Array.isArray(override)
    ) {
      for (const key of Object.keys(override)) {
        if (
          typeof base[key] === "object" &&
          base[key] !== null &&
          !Array.isArray(base[key]) &&
          typeof override[key] === "object" &&
          override[key] !== null
        ) {
          result[key] = deepMerge(base[key], override[key]);
        } else if (override[key] !== undefined) {
          result[key] = override[key];
        }
      }
    }

    return result;
  }

  async function getSettings() {
    const B = global.OGSPlusBrowser;
    const data = await B.storage.local.get(STORAGE_KEY);
    const stored =
      data && data[STORAGE_KEY]
        ? data[STORAGE_KEY]
        : {};

    return deepMerge(DEFAULT_SETTINGS, stored);
  }

  async function setSettings(patch) {
    const current = await getSettings();
    const merged = deepMerge(current, patch);

    const B = global.OGSPlusBrowser;
    await B.storage.local.set({
      [STORAGE_KEY]: merged,
    });

    return merged;
  }

  async function setFeature(featureKey, value) {
    return setSettings({
      features: {
        [featureKey]: value,
      },
    });
  }

  function onSettingsChanged(callback) {
    const B = global.OGSPlusBrowser;

    const listener = (changes, areaName) => {
      if (areaName !== "local") return;

      if (changes[STORAGE_KEY]) {
        callback(
          changes[STORAGE_KEY].newValue,
          changes[STORAGE_KEY].oldValue
        );
      }
    };

    B.storage.onChanged.addListener(listener);

    return () =>
      B.storage.onChanged.removeListener(listener);
  }

  global.OGSPlusStorage = {
    STORAGE_KEY,
    DEFAULT_SETTINGS,
    getSettings,
    setSettings,
    setFeature,
    onSettingsChanged,
    deepMerge,
  };
})(typeof window !== "undefined" ? window : globalThis);
