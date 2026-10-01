/**
 * OGS Plus - 설정 저장소 (chrome.storage.local 래퍼)
 * 확장 프로그램 전체에서 공유하는 단일 설정 스키마를 정의하고,
 * 기본값 병합 / 읽기 / 쓰기 / 변경 감지(구독) 기능을 제공합니다.
 */
(function (global) {
  "use strict";

  const STORAGE_KEY = "ogsplus_settings_v1";

  const DEFAULT_SETTINGS = {
    // 전체 on/off 마스터 스위치
    masterEnabled: true,

    // 언어 (Plus Settings UI 자체 언어. OGS 사이트 언어와는 별개)
    language: "en", // en, ko, ja, zh, es, fr, de, ru, pt

    // 기능별 on/off
    features: {
      voiceCommentary: false, // 해설 음성 인식 -> 채팅 자동입력
      imagePreview: true, // 채팅/DM 이미지 링크 미리보기
      customCss: false, // 커스텀 스타일시트 자동 적용
      aboutHeadingShortcut: true, // About Alt+H+1~5 헤딩 단축키
      betaNavLink: true, // 상단바 Beta 링크
      profileWinRate: true, // 프로필 승률 통계 위젯
      sgfOgsUpload: true, // SGF 페이지 OGS 대국 업로드 버튼
      botRankRequest: true, // AI 대국 봇 랭크전 신청 헬퍼
      notifications: true, // 통합 알림 (공지/포럼/DM)
    },

    // 음성 해설 설정
    voice: {
      lang: "ko-KR", // Web Speech API 인식 언어
      hotkey: "ctrl+alt", // 트리거 단축키 표시용 (고정 조합)
      autoSendOnEnter: true, // 엔터를 눌러야 기록 (요청사항 그대로 고정 true)
      interimDisplay: true, // 인식 중 텍스트를 입력창에 실시간 표시할지
    },

    // 커스텀 CSS
    customCssCode: "",
    customCssApproved: false, // about에 실제로 적용(수락)되었는지

    // 알림 조용 모드
    quietMode: {
      enabled: false,
      muteDm: true,
      muteForum: false,
      muteAnnouncement: false,
    },

    // 알림 기록 (최근 항목, 배지 카운트 등은 background에서 별도 관리)
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
    if (override && typeof override === "object" && !Array.isArray(override)) {
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
    const stored = data && data[STORAGE_KEY] ? data[STORAGE_KEY] : {};
    return deepMerge(DEFAULT_SETTINGS, stored);
  }

  async function setSettings(patch) {
    const current = await getSettings();
    const merged = deepMerge(current, patch);
    const B = global.OGSPlusBrowser;
    await B.storage.local.set({ [STORAGE_KEY]: merged });
    return merged;
  }

  async function setFeature(featureKey, value) {
    return setSettings({ features: { [featureKey]: value } });
  }

  function onSettingsChanged(callback) {
    const B = global.OGSPlusBrowser;
    const listener = (changes, areaName) => {
      if (areaName !== "local") return;
      if (changes[STORAGE_KEY]) {
        callback(changes[STORAGE_KEY].newValue, changes[STORAGE_KEY].oldValue);
      }
    };
    B.storage.onChanged.addListener(listener);
    return () => B.storage.onChanged.removeListener(listener);
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
