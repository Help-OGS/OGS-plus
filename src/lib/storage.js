(function (global) {
  "use strict";

  const STORAGE_KEY = "ogsplus_settings_v1";

  const DEFAULT_SETTINGS = {
    // 전체 on/off 마스터 스위치
    masterEnabled: true,

    // 언어
    language: "en",

    // 기능별 on/off
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

    // 음성 해설 설정
    voice: {
      lang: "ko-KR",
      hotkey: "ctrl+alt",
      autoSendOnEnter: true,
      interimDisplay: true,
    },

    // 커스텀 CSS
    customCssCode: "",
    customCssApproved: false,

    // 알림 조용 모드
    quietMode: {
      enabled: false,
      muteDm: true,
      muteForum: false,
      muteAnnouncement: false,
    },

    // 알림 기록
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
