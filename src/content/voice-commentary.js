/**
* OGS Plus - Voice-to-Chat Input for Commentators 
* 
* Usage: After making a move on the demo board (at the /demo/ or /review/ path), 
* hold down Ctrl + Alt and speak into the microphone; the recognized speech 
* will appear in the chat input box in the language selected in the settings. 
* The actual message submission (recording) occurs only when the user 
* manually presses Enter (it is not sent automatically).
 */
(function (global) {
  "use strict";

  const Utils = global.OGSPlusUtils;
  const Toast = global.OGSPlusToast;

  const CHAT_INPUT_SELECTOR = 'textarea.chat-input, textarea#chat-input';

  let recognition = null;
  let isListening = false;
  let ctrlDown = false;
  let altDown = false;
  let baseValueBeforeListening = "";
  let indicatorEl = null;

  function isDemoOrReviewPage() {
    return /\/(demo|review)\//.test(window.location.pathname);
  }

  function getActiveChatInput() {
    // If the focused textarea is a chat input, use it; otherwise, use the first chat-input on the screen.
    const active = document.activeElement;
    if (active && active.matches && active.matches(CHAT_INPUT_SELECTOR)) {
      return active;
    }
    return document.querySelector(CHAT_INPUT_SELECTOR);
  }

  function ensureIndicator() {
    if (!indicatorEl) {
      indicatorEl = Utils.createEl("div", { class: "ogsplus-voice-indicator" }, [
        Utils.createEl("span", { class: "dot" }),
        Utils.createEl("span", { class: "ogsplus-voice-label", text: Utils.t("voice.listening") }),
      ]);
      document.body.appendChild(indicatorEl);
    }
    return indicatorEl;
  }

  function showIndicator() {
    ensureIndicator().classList.add("active");
  }
  function hideIndicator() {
    if (indicatorEl) indicatorEl.classList.remove("active");
  }

  function setNativeValue(el, value) {
    const setter = Object.getOwnPropertyDescriptor(
      window.HTMLTextAreaElement.prototype,
      "value",
    ).set;
    setter.call(el, value);
    el.dispatchEvent(new Event("input", { bubbles: true }));
  }

  function getSpeechRecognitionCtor() {
    return window.SpeechRecognition || window.webkitSpeechRecognition || null;
  }

  function startListening() {
    const settings = Utils.getCachedSettings();
    if (!settings.masterEnabled || !settings.features.voiceCommentary) return;
    if (!isDemoOrReviewPage()) return;
    if (isListening) return;

    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) {
      Toast.showToast("Web Speech API not supported in this browser", "error");
      return;
    }

    const chatInput = getActiveChatInput();
    if (!chatInput) return;

    baseValueBeforeListening = chatInput.value || "";

    recognition = new Ctor();
    recognition.lang = settings.voice.lang || "ko-KR";
    recognition.continuous = true;
    recognition.interimResults = !!settings.voice.interimDisplay;

    recognition.onresult = (event) => {
      let finalText = "";
      let interimText = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalText += transcript;
        } else {
          interimText += transcript;
        }
      }
      const combinedBase = baseValueBeforeListening
        ? `${baseValueBeforeListening} `
        : "";
      const displayText = combinedBase + finalText + interimText;
      const activeInput = getActiveChatInput() || chatInput;
      setNativeValue(activeInput, displayText);
      if (finalText) {
        baseValueBeforeListening = combinedBase + finalText;
      }
    };

    recognition.onerror = (event) => {
      if (event.error === "not-allowed" || event.error === "service-not-allowed") {
        Toast.showToast(Utils.t("voice.micDenied"), "error", 4000);
      }
      stopListening();
    };

    recognition.onend = () => {
      if (isListening) {
        // Attempt to restart if the browser automatically terminates the session (while holding down the key).
        try {
          recognition.start();
        } catch (e) {
          /* ignore */
        }
      }
    };

    try {
      recognition.start();
      isListening = true;
      showIndicator();
    } catch (e) {
      console.error("[OGS Plus] speech recognition start failed", e);
    }
  }

  function stopListening() {
    if (!isListening) return;
    isListening = false;
    hideIndicator();
    if (recognition) {
      try {
        recognition.onend = null;
        recognition.stop();
      } catch (e) {
        /* ignore */
      }
      recognition = null;
    }
  }

  function handleKeyDown(ev) {
    if (ev.key === "Control") ctrlDown = true;
    if (ev.key === "Alt") altDown = true;
    if (ctrlDown && altDown) {
      startListening();
    }
  }

  function handleKeyUp(ev) {
    if (ev.key === "Control") ctrlDown = false;
    if (ev.key === "Alt") altDown = false;
    if (!ctrlDown || !altDown) {
      stopListening();
    }
  }

  function handleBlurWindow() {
    ctrlDown = false;
    altDown = false;
    stopListening();
  }

  document.addEventListener("keydown", handleKeyDown, true);
  document.addEventListener("keyup", handleKeyUp, true);
  window.addEventListener("blur", handleBlurWindow);
})(typeof window !== "undefined" ? window : globalThis);
