/**
 * OGS Plus - Custom stylesheet feature
 * 1) "Beta Preview": Apply to current page immediately as <style> tag for real-time preview
 * 2) "Approve": Automatically insert/replace <style> block in user's profile About text
 *    (Wrapped with marker comments so re-applying updates without duplicates)
 */
(function (global) {
  "use strict";

  const Utils = global.OGSPlusUtils;
  const Toast = global.OGSPlusToast;

  const MARK_START = "<!-- OGSPLUS_CSS_START -->";
  const MARK_END = "<!-- OGSPLUS_CSS_END -->";
  const PREVIEW_STYLE_ID = "ogsplus-css-preview-style";

  function applyPreview(css) {
    let styleTag = document.getElementById(PREVIEW_STYLE_ID);
    if (!styleTag) {
      styleTag = document.createElement("style");
      styleTag.id = PREVIEW_STYLE_ID;
      document.head.appendChild(styleTag);
    }
    styleTag.textContent = css || "";
  }

  function removePreview() {
    const styleTag = document.getElementById(PREVIEW_STYLE_ID);
    if (styleTag) styleTag.remove();
  }

  function buildAboutBlock(css) {
    return `${MARK_START}\n<style>\n${css}\n</style>\n${MARK_END}`;
  }

  function mergeIntoAbout(existingAbout, css) {
    const block = buildAboutBlock(css);
    const startIdx = existingAbout.indexOf(MARK_START);
    const endIdx = existingAbout.indexOf(MARK_END);
    if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
      const before = existingAbout.slice(0, startIdx);
      const after = existingAbout.slice(endIdx + MARK_END.length);
      return `${before}${block}${after}`;
    }
    // If not found, append to end (separate by double newline if about not empty)
    const sep = existingAbout && existingAbout.trim() ? "\n\n" : "";
    return `${existingAbout || ""}${sep}${block}`;
  }

  async function publishToAbout(css) {
    const userId = Utils.getCurrentUserId();
    if (!userId) {
      throw new Error("Could not determine current user id");
    }
    // Get current about content
    const me = await Utils.apiFetch(`players/${userId}`);
    const existingAbout = me.about || "";
    const newAbout = mergeIntoAbout(existingAbout, css);
    await Utils.apiFetch(`players/${userId}`, {
      method: "PUT",
      body: JSON.stringify({ about: newAbout }),
    });
    return newAbout;
  }

  async function removeFromAbout() {
    const userId = Utils.getCurrentUserId();
    if (!userId) throw new Error("Could not determine current user id");
    const me = await Utils.apiFetch(`players/${userId}`);
    const existingAbout = me.about || "";
    const startIdx = existingAbout.indexOf(MARK_START);
    const endIdx = existingAbout.indexOf(MARK_END);
    if (startIdx === -1 || endIdx === -1) return existingAbout;
    const before = existingAbout.slice(0, startIdx);
    const after = existingAbout.slice(endIdx + MARK_END.length);
    const newAbout = (before + after).trim();
    await Utils.apiFetch(`players/${userId}`, {
      method: "PUT",
      body: JSON.stringify({ about: newAbout }),
    });
    return newAbout;
  }

  global.OGSPlusCustomCss = {
    applyPreview,
    removePreview,
    publishToAbout,
    removeFromAbout,
    MARK_START,
    MARK_END,
  };

  // If approved CSS already exists in settings, apply as preview style on page visit
  // (This is an auxiliary feature to show immediately in current browser;
  //  actual display to other users comes from About's stored <style> block)
  Utils.loadSettings().then((settings) => {
    if (
      settings.masterEnabled &&
      settings.features.customCss &&
      settings.customCssApproved &&
      settings.customCssCode
    ) {
      applyPreview(settings.customCssCode);
    }
  });
})(typeof window !== "undefined" ? window : globalThis);
