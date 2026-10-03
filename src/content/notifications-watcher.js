/**
* OGS Plus - Unified notifications (announcements / forum replies / DMs) + silent mode
 * Periodically update the notification indicator (.NotificationIndicator) and chat system on the OGS page
 * Observe and add chrome.notifications to the background service worker when a new item appears
 * Request. If Quiet Mode is on, it only ignores DM notifications.
 */
(function (global) {
  "use strict";

  const Utils = global.OGSPlusUtils;
  const POLL_MS = 20000;

  function sendNotification(kind, title, message) {
    const settings = Utils.getCachedSettings();
    if (!settings.masterEnabled || !settings.features.notifications) return;
    if (settings.quietMode.enabled) {
      if (kind === "dm" && settings.quietMode.muteDm) return;
      if (kind === "forum" && settings.quietMode.muteForum) return;
      if (kind === "announcement" && settings.quietMode.muteAnnouncement) return;
    }
    try {
      chrome.runtime.sendMessage({
        type: "OGSPLUS_NOTIFY",
        kind,
        title,
        message,
      });
    } catch (e) {
      /* extension context might be invalidated on reload; ignore */
    }
  }

  let lastAnnouncementCount = null;
  let lastDmUnread = null;

  function pollAnnouncements() {
    // Notice: .Detects whether a new item appears in the Announcements component/notification list using a badge
    const badge = document.querySelector(".NotificationIndicator .badge, .NotificationIndicator .count");
    if (badge) {
      const n = parseInt(badge.textContent || "0", 10) || 0;
      if (lastAnnouncementCount !== null && n > lastAnnouncementCount) {
        sendNotification(
          "announcement",
          Utils.t("notif.newAnnouncement"),
          `${n} unread`,
        );
      }
      lastAnnouncementCount = n;
    }
  }

  function pollDm() {
    // ChatIndicator / private chat unread badge
    const dmBadge = document.querySelector(".ChatIndicator .badge, .ChatIndicator .count, .PrivateChat .unread-count");
    if (dmBadge) {
      const n = parseInt(dmBadge.textContent || "0", 10) || 0;
      if (lastDmUnread !== null && n > lastDmUnread) {
        sendNotification("dm", Utils.t("notif.newDm"), `${n} unread`);
      }
      lastDmUnread = n;
    }
  }

  function poll() {
    try {
      pollAnnouncements();
      pollDm();
    } catch (e) {
      console.error("[OGS Plus] notification poll failed", e);
    }
  }

  setInterval(poll, POLL_MS);
  setTimeout(poll, 3000);
})(typeof window !== "undefined" ? window : globalThis);
