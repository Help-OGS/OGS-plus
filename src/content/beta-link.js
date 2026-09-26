/**
 * OGS Plus - Added a 'Beta' shortcut link to the top navigation bar
 * Click to go to the same path on beta.online-go.com .
 */
(function (global) {
  "use strict";

  const Utils = global.OGSPlusUtils;
  const LINK_ID = "ogsplus-beta-link";

  function buildBetaUrl() {
    const { pathname, search, hash } = window.location;
    return `https://beta.online-go.com${pathname}${search}${hash}`;
  }

  function injectLink(navRight) {
    if (document.getElementById(LINK_ID)) return;
    const settings = Utils.getCachedSettings();
    if (!settings.masterEnabled || !settings.features.betaNavLink) return;

    const link = Utils.createEl("a", {
      id: LINK_ID,
      class: "ogsplus-beta-link",
      href: buildBetaUrl(),
      target: "_blank",
      rel: "noopener noreferrer",
      title: "Open this page on the OGS Beta site",
      text: `⚡ ${Utils.t("common.beta")}`,
    });

    // href를 매번 최신 경로로 갱신 (SPA 라우팅 대응)
    link.addEventListener("mouseenter", () => {
      link.setAttribute("href", buildBetaUrl());
    });

    navRight.prepend(link);
  }

  function tryInject() {
    const navRight = document.querySelector("header.NavBar section.right");
    if (navRight) {
      injectLink(navRight);
    }
  }

  function removeLink() {
    const el = document.getElementById(LINK_ID);
    if (el) el.remove();
  }

  Utils.watchElements("header.NavBar section.right", (navRight) => {
    injectLink(navRight);
  });

  // 설정 변경(끄기)에 즉시 반응
  if (global.OGSPlusStorage) {
    global.OGSPlusStorage.onSettingsChanged((newVal) => {
      if (!newVal.masterEnabled || !newVal.features.betaNavLink) {
        removeLink();
      } else {
        tryInject();
      }
    });
  }
})(typeof window !== "undefined" ? window : globalThis);
