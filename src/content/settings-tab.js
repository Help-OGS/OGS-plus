/**
 * OGS Plus - Injects the "Plus Settings" tab into the OGS settings page.
 * Path: /settings/plus
 */
(function (global) {
  "use strict";

  const Utils = global.OGSPlusUtils;
  const Storage = global.OGSPlusStorage;
  const Toast = global.OGSPlusToast;
  const CustomCss = () => global.OGSPlusCustomCss;

  const GROUP_ID = "ogsplus-settings-group";
  const PAGE_ID = "ogsplus-settings-page";
  const HOST_STYLE_ID = "ogsplus-settings-host-style";
  const HOST_CLASS = "ogsplus-showing-settings";

  function switchable(labelKey, checked, onChange) {
    const id = "ogsplus-sw-" + Math.random().toString(36).slice(2);
    const input = Utils.createEl("input", {
      type: "checkbox",
      id,
      onChange: (e) => onChange(e.target.checked),
    });

    input.checked = checked;

    const label = Utils.createEl(
      "label",
      { class: "ogsplus-switch", for: id },
      [input, Utils.createEl("span", { class: "ogsplus-slider" })],
    );

    return Utils.createEl("div", { class: "ogsplus-row" }, [
      label,
      Utils.createEl("span", {
        class: "ogsplus-inline-label",
        text: Utils.t(labelKey),
      }),
    ]);
  }

  function sectionBox(titleKey, descKey, enabled, bodyChildren) {
    const section = Utils.createEl("div", {
      class: "ogsplus-section" + (enabled ? "" : " ogsplus-disabled"),
    });

    section.appendChild(
      Utils.createEl("div", { class: "ogsplus-section-header" }, [
        Utils.createEl("h3", { text: Utils.t(titleKey) }),
      ]),
    );

    section.appendChild(
      Utils.createEl("div", {
        class: "ogsplus-section-desc",
        text: Utils.t(descKey),
      }),
    );

    const body = Utils.createEl(
      "div",
      { class: "ogsplus-section-body" },
      bodyChildren,
    );

    section.appendChild(body);
    return section;
  }

  async function buildPage() {
    const settings = await Storage.getSettings();
    const page = Utils.createEl("div", {
      class: "ogsplus-settings-page",
      id: PAGE_ID,
    });

    page.appendChild(
      Utils.createEl("h2", { class: "ogsplus-title" }, [
        `🧩 ${Utils.t("settings.tabTitle")}`,
      ]),
    );

    page.appendChild(
      Utils.createEl("div", {
        class: "ogsplus-tagline",
        text: Utils.t("app.tagline"),
      }),
    );

    const masterInput = Utils.createEl("input", {
      type: "checkbox",
      onChange: async (e) => {
        await Storage.setSettings({
          masterEnabled: e.target.checked,
        });

        Toast.showToast(Utils.t("settings.saved"), "success");
        refreshDisabledStates();
      },
    });

    masterInput.checked = settings.masterEnabled;

    const masterLabel = Utils.createEl(
      "label",
      { class: "ogsplus-switch" },
      [masterInput, Utils.createEl("span", { class: "ogsplus-slider" })],
    );

    page.appendChild(
      Utils.createEl("div", { class: "ogsplus-master-toggle-row" }, [
        Utils.createEl("span", {
          class: "ogsplus-master-label",
          text: `⚡ ${Utils.t("settings.masterToggle")}`,
        }),
        masterLabel,
      ]),
    );

    const I18n = global.OGSPlusI18n;

    const langSelect = Utils.createEl(
      "select",
      {
        onChange: async (e) => {
          await Storage.setSettings({ language: e.target.value });
          Toast.showToast("Saved", "success");
          renderPage();
        },
      },
      I18n.LANGS.map((code) =>
        Utils.createEl("option", {
          value: code,
          text: I18n.LANG_NAMES[code],
        }),
      ),
    );

    langSelect.value = settings.language;

    page.appendChild(
      Utils.createEl("div", { class: "ogsplus-lang-row" }, [
        Utils.createEl("span", {
          text: `🌐 ${Utils.t("settings.language")}:`,
        }),
        langSelect,
      ]),
    );

    const sections = [];

    const voiceLangSelect = Utils.createEl(
      "select",
      {
        onChange: (e) =>
          Storage.setSettings({ voice: { lang: e.target.value } }),
      },
      [
        ["ko-KR", "한국어"],
        ["en-US", "English (US)"],
        ["ja-JP", "日本語"],
        ["zh-CN", "中文(简体)"],
        ["es-ES", "Español"],
        ["fr-FR", "Français"],
        ["de-DE", "Deutsch"],
        ["ru-RU", "Русский"],
        ["pt-PT", "Português"],
      ].map(([value, label]) =>
        Utils.createEl("option", { value, text: label }),
      ),
    );

    voiceLangSelect.value = settings.voice.lang;

    const voiceSection = sectionBox(
      "settings.section.voice",
      "settings.voice.desc",
      settings.features.voiceCommentary,
      [
        switchable(
          "settings.voice.enable",
          settings.features.voiceCommentary,
          async (value) => {
            await Storage.setFeature("voiceCommentary", value);
            refreshDisabledStates();
          },
        ),
        Utils.createEl("div", { class: "ogsplus-row" }, [
          Utils.createEl("span", {
            class: "ogsplus-inline-label",
            text: Utils.t("settings.voice.recogLang"),
          }),
          voiceLangSelect,
        ]),
      ],
    );

    voiceSection.dataset.feature = "voiceCommentary";
    sections.push(voiceSection);

    const imgSection = sectionBox(
      "settings.section.imagePreview",
      "settings.imagePreview.desc",
      settings.features.imagePreview,
      [
        switchable(
          "settings.imagePreview.enable",
          settings.features.imagePreview,
          async (value) => {
            await Storage.setFeature("imagePreview", value);
            refreshDisabledStates();
          },
        ),
      ],
    );

    imgSection.dataset.feature = "imagePreview";
    sections.push(imgSection);

    const cssTextarea = Utils.createEl("textarea", {
      class: "ogsplus-textarea",
      placeholder: "/* your CSS here */",
    });

    cssTextarea.value = settings.customCssCode || "";

    const cssStatus = Utils.createEl("div", {
      class:
        "ogsplus-css-status" +
        (settings.customCssApproved ? " approved" : ""),
      text: settings.customCssApproved
        ? `✅ ${Utils.t("settings.customCss.approved")}`
        : "",
    });

    const previewBtn = Utils.createEl("button", {
      class: "ogsplus-btn",
      text: Utils.t("settings.customCss.previewBtn"),
      onClick: () => {
        CustomCss().applyPreview(cssTextarea.value);
        Toast.showToast("Preview applied to this page", "info");
      },
    });

    const approveBtn = Utils.createEl("button", {
      class: "ogsplus-btn primary",
      text: Utils.t("settings.customCss.approveBtn"),
      onClick: async () => {
        approveBtn.disabled = true;

        try {
          await CustomCss().publishToAbout(cssTextarea.value);

          await Storage.setSettings({
            customCssCode: cssTextarea.value,
            customCssApproved: true,
          });

          cssStatus.textContent =
            `✅ ${Utils.t("settings.customCss.approved")}`;

          cssStatus.classList.add("approved");
          Toast.showToast(Utils.t("settings.saved"), "success");
        } catch (error) {
          Toast.showToast(String(error.message || error), "error");
        } finally {
          approveBtn.disabled = false;
        }
      },
    });

    const cssSection = sectionBox(
      "settings.section.customCss",
      "settings.customCss.desc",
      settings.features.customCss,
      [
        switchable(
          "settings.customCss.enable",
          settings.features.customCss,
          async (value) => {
            await Storage.setFeature("customCss", value);
            refreshDisabledStates();
          },
        ),
        cssTextarea,
        Utils.createEl("div", { class: "ogsplus-btn-row" }, [
          previewBtn,
          approveBtn,
        ]),
        cssStatus,
      ],
    );

    cssSection.dataset.feature = "customCss";
    sections.push(cssSection);

    const headingSection = sectionBox(
      "settings.section.aboutHeading",
      "settings.aboutHeading.desc",
      settings.features.aboutHeadingShortcut,
      [
        switchable(
          "settings.aboutHeading.enable",
          settings.features.aboutHeadingShortcut,
          async (value) => {
            await Storage.setFeature("aboutHeadingShortcut", value);
            refreshDisabledStates();
          },
        ),
      ],
    );

    headingSection.dataset.feature = "aboutHeadingShortcut";
    sections.push(headingSection);

    const betaSection = sectionBox(
      "settings.section.nav",
      "settings.nav.betaLink.desc",
      settings.features.betaNavLink,
      [
        switchable(
          "settings.nav.betaLink.enable",
          settings.features.betaNavLink,
          async (value) => {
            await Storage.setFeature("betaNavLink", value);
            refreshDisabledStates();
          },
        ),
      ],
    );

    betaSection.dataset.feature = "betaNavLink";
    sections.push(betaSection);

    const profileSection = sectionBox(
      "settings.section.profile",
      "settings.profile.desc",
      settings.features.profileWinRate,
      [
        switchable(
          "settings.profile.enable",
          settings.features.profileWinRate,
          async (value) => {
            await Storage.setFeature("profileWinRate", value);
            refreshDisabledStates();
          },
        ),
      ],
    );

    profileSection.dataset.feature = "profileWinRate";
    sections.push(profileSection);

    const sgfSection = sectionBox(
      "settings.section.sgf",
      "settings.sgf.desc",
      settings.features.sgfOgsUpload,
      [
        switchable(
          "settings.sgf.enable",
          settings.features.sgfOgsUpload,
          async (value) => {
            await Storage.setFeature("sgfOgsUpload", value);
            refreshDisabledStates();
          },
        ),
      ],
    );

    sgfSection.dataset.feature = "sgfOgsUpload";
    sections.push(sgfSection);

    const botSection = sectionBox(
      "settings.section.bot",
      "settings.bot.desc",
      settings.features.botRankRequest,
      [
        switchable(
          "settings.bot.enable",
          settings.features.botRankRequest,
          async (value) => {
            await Storage.setFeature("botRankRequest", value);
            refreshDisabledStates();
          },
        ),
      ],
    );

    botSection.dataset.feature = "botRankRequest";
    sections.push(botSection);

    const quietSwitch = switchable(
      "settings.notifications.quietMode",
      settings.quietMode.enabled,
      async (value) => {
        await Storage.setSettings({
          quietMode: { enabled: value },
        });
      },
    );

    const notifSection = sectionBox(
      "settings.section.notifications",
      "settings.notifications.desc",
      settings.features.notifications,
      [
        switchable(
          "settings.notifications.enable",
          settings.features.notifications,
          async (value) => {
            await Storage.setFeature("notifications", value);
            refreshDisabledStates();
          },
        ),
        quietSwitch,
      ],
    );

    notifSection.dataset.feature = "notifications";
    sections.push(notifSection);

    sections.forEach((section) => page.appendChild(section));

    page.appendChild(
      Utils.createEl("div", {
        class: "ogsplus-footer-note",
        text: `🎛 ${Utils.t("settings.footer.allToggle")}`,
      }),
    );

    function refreshDisabledStates() {
      Storage.getSettings().then((currentSettings) => {
        sections.forEach((section) => {
          const feature = section.dataset.feature;
          const enabled =
            currentSettings.masterEnabled &&
            currentSettings.features[feature];

          section.classList.toggle("ogsplus-disabled", !enabled);
        });
      });
    }

    return page;
  }

  function ensureHostStyles() {
    if (document.getElementById(HOST_STYLE_ID)) return;

    const style = Utils.createEl("style", {
      id: HOST_STYLE_ID,
      text:
        "#SelectedSettingsContainer.ogsplus-showing-settings > :not(#ogsplus-settings-page) { display: none !important; }",
    });

    document.head.appendChild(style);
  }

  function cleanupPlusPage() {
    const page = document.getElementById(PAGE_ID);

    if (page) {
      page.remove();
    }

    const container = document.getElementById("SelectedSettingsContainer");

    if (container) {
      container.classList.remove(HOST_CLASS);
    }
  }

  function isPlusSettingsPath() {
    return window.location.pathname === "/settings/plus";
  }

  function isPlusSettingsActive() {
    const group = document.getElementById(GROUP_ID);

    return (
      isPlusSettingsPath() &&
      !!group &&
      group.classList.contains("selected")
    );
  }

  async function renderPage() {
    if (!isPlusSettingsActive()) {
      cleanupPlusPage();
      return;
    }

    const container = document.getElementById("SelectedSettingsContainer");

    if (!container) return;

    ensureHostStyles();

    const page = await buildPage();

    if (!isPlusSettingsActive()) {
      cleanupPlusPage();
      return;
    }

    container.classList.add(HOST_CLASS);

    const existing = document.getElementById(PAGE_ID);

    if (existing) {
      existing.replaceWith(page);
    } else {
      container.appendChild(page);
    }
  }

  function injectGroupTab() {
    const selector = document.getElementById("SettingsGroupSelector");

    if (!selector || document.getElementById(GROUP_ID)) return;

    const group = Utils.createEl(
      "div",
      {
        id: GROUP_ID,
        class:
          "SettingsGroup ogsplus-group" +
          (isPlusSettingsPath() ? " selected" : ""),
        onClick: () => {
          history.pushState({}, "", "/settings/plus");

          document
            .querySelectorAll("#SettingsGroupSelector .SettingsGroup")
            .forEach((item) => item.classList.remove("selected"));

          group.classList.add("selected");

          setTimeout(() => {
            if (isPlusSettingsActive()) {
              renderPage();
            }
          }, 50);
        },
      },
      [
        Utils.createEl("i", { class: "fa fa-magic ogsplus-icon" }),
        `${Utils.t("settings.tabTitle")}`,
        Utils.createEl("span", { class: "spacer" }),
      ],
    );

    selector.appendChild(group);

    if (isPlusSettingsActive()) {
      setTimeout(renderPage, 50);
    }
  }

  function tick() {
    if (!window.location.pathname.startsWith("/settings")) {
      cleanupPlusPage();
      return;
    }

    injectGroupTab();

    if (isPlusSettingsActive()) {
      if (!document.getElementById(PAGE_ID)) {
        renderPage();
      }
    } else {
      cleanupPlusPage();
    }
  }

  Utils.watchElements("#SettingsGroupSelector", () => tick());

  const origPushState = history.pushState;

  history.pushState = function (...args) {
    origPushState.apply(this, args);
    setTimeout(tick, 200);
  };

  window.addEventListener("popstate", () => {
    setTimeout(tick, 200);
  });

  setInterval(tick, 1500);
})(typeof window !== "undefined" ? window : globalThis);
