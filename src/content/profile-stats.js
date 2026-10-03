/**
 * OGS Plus - Profile Page Win Rate Widget
 * On the `/user/view/:id` page, iterate through the `players/{id}/game_history/` API in pagination order
 * (Except for annulled cases) Aggregate all wins/losses and insert a donut-shaped win rate card above the About card.
 */
(function (global) {
  "use strict";

  const Utils = global.OGSPlusUtils;
  const WIDGET_CLASS = "ogsplus-winrate-card";
  const MAX_PAGES = 40; // Safety features: Protects tens of thousands of users, aggregating data only up to 40 pages (= about 2,000 countries)

  function getUserIdFromUrl() {
    const m = window.location.pathname.match(/\/user\/view\/(\d+)/);
    return m ? Number(m[1]) : null;
  }

  async function fetchAllGameHistory(userId, onProgress) {
    let wins = 0;
    let losses = 0;
    let total = 0;
    let page = 1;
    const pageSize = 100;

    while (page <= MAX_PAGES) {
      const data = await Utils.apiFetch(
        `players/${userId}/game_history/?page=${page}&page_size=${pageSize}`,
      );
      const results = data.results || [];
      for (const r of results) {
        if (r.annulled) continue;
        const blackWon = !r.black_lost && r.white_lost;
        const whiteWon = !r.white_lost && r.black_lost;
        const playedBlack = r.players?.black?.id === userId;
        const playedWhite = r.players?.white?.id === userId;
        if (!playedBlack && !playedWhite) continue;
        total++;
        const won = playedBlack ? blackWon : whiteWon;
        if (won) wins++;
        else losses++;
      }
      if (onProgress) onProgress(total);
      const totalCount = data.count || 0;
      if (page * pageSize >= totalCount || results.length === 0) break;
      page++;
    }
    return { wins, losses, total };
  }

  function buildRingSvg(pct) {
    const r = 26;
    const c = 2 * Math.PI * r;
    const offset = c * (1 - pct / 100);
    const color = pct >= 50 ? "#15803d" : "#b91c1c";
    const svgNs = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(svgNs, "svg");
    svg.setAttribute("viewBox", "0 0 64 64");

    const bg = document.createElementNS(svgNs, "circle");
    bg.setAttribute("cx", "32");
    bg.setAttribute("cy", "32");
    bg.setAttribute("r", String(r));
    bg.setAttribute("fill", "none");
    bg.setAttribute("stroke", "rgba(120,120,120,0.25)");
    bg.setAttribute("stroke-width", "6");
    svg.appendChild(bg);

    const fg = document.createElementNS(svgNs, "circle");
    fg.setAttribute("cx", "32");
    fg.setAttribute("cy", "32");
    fg.setAttribute("r", String(r));
    fg.setAttribute("fill", "none");
    fg.setAttribute("stroke", color);
    fg.setAttribute("stroke-width", "6");
    fg.setAttribute("stroke-dasharray", String(c));
    fg.setAttribute("stroke-dashoffset", String(offset));
    fg.setAttribute("stroke-linecap", "round");
    svg.appendChild(fg);

    return svg;
  }

  function buildWidget(stats) {
    const pct = stats.total > 0 ? Math.round((stats.wins / stats.total) * 1000) / 10 : 0;

    const ring = Utils.createEl("div", { class: "ogsplus-winrate-ring" }, [
      buildRingSvg(pct),
      Utils.createEl("div", { class: "ogsplus-winrate-pct", text: `${pct}%` }),
    ]);

    const statsBox = Utils.createEl("div", { class: "ogsplus-winrate-stats" }, [
      Utils.createEl("div", { class: "ogsplus-wr-label", text: `📊 ${Utils.t("profile.winRate")} (OGS Plus)` }),
      Utils.createEl("div", { class: "win", text: `${Utils.t("profile.wins")}: ${stats.wins}` }),
      Utils.createEl("div", { class: "loss", text: `${Utils.t("profile.losses")}: ${stats.losses}` }),
      Utils.createEl("div", { text: `${Utils.t("profile.totalGames")}: ${stats.total}` }),
    ]);

    return Utils.createEl("div", { class: WIDGET_CLASS }, [ring, statsBox]);
  }

  function buildLoadingWidget() {
    return Utils.createEl("div", { class: WIDGET_CLASS }, [
      Utils.createEl("div", { text: `⏳ ${Utils.t("profile.winRate")} (OGS Plus) ...` }),
    ]);
  }

  async function injectWidget() {
    const settings = Utils.getCachedSettings();
    if (!settings.masterEnabled || !settings.features.profileWinRate) return;

    const userId = getUserIdFromUrl();
    if (!userId) return;

    const container = document.querySelector(".User.container .profile-card");
    if (!container) return;
    if (container.querySelector(`.${WIDGET_CLASS}`)) return; // already injected

    const loadingWidget = buildLoadingWidget();
    container.insertAdjacentElement("afterend", loadingWidget);

    try {
      const stats = await fetchAllGameHistory(userId, (total) => {
        const label = loadingWidget.querySelector("div");
        if (label) {
          label.textContent = `⏳ ${Utils.t("profile.winRate")} (OGS Plus) ... (${total})`;
        }
      });
      const widget = buildWidget(stats);
      loadingWidget.replaceWith(widget);
    } catch (e) {
      console.error("[OGS Plus] profile stats failed", e);
      loadingWidget.remove();
    }
  }

  let currentPath = "";
  function checkAndInject() {
    if (window.location.pathname !== currentPath) {
      currentPath = window.location.pathname;
    }
    if (/\/user\/view\/\d+/.test(window.location.pathname)) {
      injectWidget();
    }
  }

  Utils.watchElements(".User.container .profile-card", () => {
    checkAndInject();
  });

  // SPA 라우트 변경 감지
  const origPushState = history.pushState;
  history.pushState = function (...args) {
    origPushState.apply(this, args);
    setTimeout(checkAndInject, 300);
  };
  window.addEventListener("popstate", () => setTimeout(checkAndInject, 300));

  checkAndInject();
})(typeof window !== "undefined" ? window : globalThis);
