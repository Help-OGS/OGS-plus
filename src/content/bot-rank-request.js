/**
 * OGS Plus - Bot Ranked Match Application Helper
 * If the user profile is bot (is_bot), a message stating "This bot may not automatically accept ranked matches" is displayed
 * Along with the prompt, it automatically finds and clicks the existing 'Challenge' button on the screen
 Add a * shortcut button near the profile card.
 */
(function (global) {
  "use strict";

  const Utils = global.OGSPlusUtils;
  const WIDGET_CLASS = "ogsplus-bot-helper";

  function getUserIdFromUrl() {
    const m = window.location.pathname.match(/\/user\/view\/(\d+)/);
    return m ? Number(m[1]) : null;
  }

  function findChallengeButton() {
    const candidates = Array.from(
      document.querySelectorAll(".profile-card button, .profile-card a, .AvatarCard button, .AvatarCard a"),
    );
    return candidates.find((el) => /challenge/i.test(el.textContent || ""));
  }

  async function tryInject() {
    const settings = Utils.getCachedSettings();
    if (!settings.masterEnabled || !settings.features.botRankRequest) return;

    const userId = getUserIdFromUrl();
    if (!userId) return;

    const container = document.querySelector(".User.container .profile-card");
    if (!container) return;
    if (container.querySelector(`.${WIDGET_CLASS}`)) return;

    let player;
    try {
      player = await Utils.apiFetch(`players/${userId}`);
    } catch (e) {
      return;
    }
    if (!player || !player.is_bot) return;

    const helper = Utils.createEl("div", { class: WIDGET_CLASS }, [
      Utils.createEl("div", { text: `🤖 ${Utils.t("bot.requestRankedHelper")}` }),
      Utils.createEl("button", {
        class: "ogsplus-btn primary",
        text: Utils.t("bot.goToProfile"),
        onClick: () => {
          const btn = findChallengeButton();
          if (btn) {
            btn.scrollIntoView({ behavior: "smooth", block: "center" });
            btn.click();
          } else if (global.OGSPlusToast) {
            global.OGSPlusToast.showToast("Challenge button not found on this page", "error");
          }
        },
      }),
    ]);

    container.appendChild(helper);
  }

  Utils.watchElements(".User.container .profile-card", () => tryInject());

  const origPushState = history.pushState;
  history.pushState = function (...args) {
    origPushState.apply(this, args);
    setTimeout(tryInject, 400);
  };
  window.addEventListener("popstate", () => setTimeout(tryInject, 400));
  tryInject();
})(typeof window !== "undefined" ? window : globalThis);
