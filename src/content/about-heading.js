/**
OGS Plus - About Headings Shortcut Keys
 In the *About edit (textarea.about-editor), press Alt+H and then press numbers 1 through 5
 * Automatically inserts Markdown headings (# ~ #####) at the cursor position..
 */
(function (global) {
  "use strict";

  const Utils = global.OGSPlusUtils;

  const ABOUT_EDITOR_SELECTOR = "textarea.about-editor";
  let pendingAltH = false;
  let pendingTimer = null;
  let hintEl = null;

  function ensureHint() {
    if (!hintEl) {
      hintEl = document.createElement("div");
      hintEl.className = "ogsplus-heading-hint";
      document.body.appendChild(hintEl);
    }
    return hintEl;
  }

  function showHint(target, text) {
    const hint = ensureHint();
    const rect = target.getBoundingClientRect();
    hint.textContent = text;
    hint.style.left = `${rect.left + 12}px`;
    hint.style.top = `${rect.top - 30 < 0 ? rect.top + 12 : rect.top - 30}px`;
    hint.classList.add("show");
  }

  function hideHint() {
    if (hintEl) hintEl.classList.remove("show");
  }

  function insertHeadingAtCursor(textarea, level) {
    const prefix = "#".repeat(level) + " ";
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const value = textarea.value;

    // 현재 줄의 시작 위치를 찾아서, 줄 맨 앞에 헤딩 마커를 넣는다.
    let lineStart = value.lastIndexOf("\n", start - 1) + 1;

    // 이미 헤딩 마커가 있다면 교체, 없으면 삽입
    const restOfLine = value.slice(lineStart);
    const existingHeadingMatch = restOfLine.match(/^#{1,6}\s+/);
    let newValue, newCursorPos;

    if (existingHeadingMatch) {
      const oldLen = existingHeadingMatch[0].length;
      newValue = value.slice(0, lineStart) + prefix + value.slice(lineStart + oldLen);
      newCursorPos = start - oldLen + prefix.length;
    } else {
      newValue = value.slice(0, lineStart) + prefix + value.slice(lineStart);
      newCursorPos = start + prefix.length;
    }

    // React 컨트롤 인풋 대응: native setter로 값 변경 후 input 이벤트 디스패치
    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
      window.HTMLTextAreaElement.prototype,
      "value",
    ).set;
    nativeInputValueSetter.call(textarea, newValue);
    textarea.dispatchEvent(new Event("input", { bubbles: true }));

    requestAnimationFrame(() => {
      textarea.selectionStart = textarea.selectionEnd = Math.max(0, newCursorPos);
      textarea.focus();
    });
  }

  function handleKeydown(ev) {
    const settings = Utils.getCachedSettings();
    if (!settings.masterEnabled || !settings.features.aboutHeadingShortcut) return;

    const target = ev.target;
    if (!(target instanceof HTMLTextAreaElement)) return;
    if (!target.classList.contains("about-editor")) return;

    if (ev.altKey && (ev.key === "h" || ev.key === "H") && !ev.ctrlKey && !ev.shiftKey) {
      ev.preventDefault();
      pendingAltH = true;
      showHint(target, "Alt+H → 1~5");
      clearTimeout(pendingTimer);
      pendingTimer = setTimeout(() => {
        pendingAltH = false;
        hideHint();
      }, 2500);
      return;
    }

    if (pendingAltH && /^[1-5]$/.test(ev.key)) {
      ev.preventDefault();
      const level = Number(ev.key);
      insertHeadingAtCursor(target, level);
      pendingAltH = false;
      hideHint();
      clearTimeout(pendingTimer);
      if (global.OGSPlusToast) {
        global.OGSPlusToast.showToast(`H${level} ${Utils.t("settings.saved")}`, "success", 1200);
      }
      return;
    }

    if (pendingAltH) {
      // 다른 키 입력 시 대기 취소
      pendingAltH = false;
      hideHint();
      clearTimeout(pendingTimer);
    }
  }

  document.addEventListener("keydown", handleKeydown, true);
})(typeof window !== "undefined" ? window : globalThis);
