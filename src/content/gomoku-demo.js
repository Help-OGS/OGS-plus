/**
 * OGS Plus - Gomoku Demo Board Integrator
 *
 * 목적:
 * - OGS의 바둑 실시간 보드/데모 환경을 활용해
 *   실제 서버 게임이 아니라 로컬 전용 오목 데모를 실행한다.
 * - 서버에는 Go로 보이지 않고, 사용자에게만 오목 판처럼 보이도록 한다.
 * - 따내기는 없음. 5개 연속이면 승리.
 */
(function (global) {
  "use strict";

  const Utils = global.OGSPlusUtils;
  const Storage = global.OGSPlusStorage;
  const Toast = global.OGSPlusToast;

  const FEATURE_KEY = "gomoku";
  const BUTTON_ID = "ogsplus-gomoku-demo-button";
  const OVERLAY_ID = "ogsplus-gomoku-overlay";

  const state = {
    size: 15,
    board: [],
    current: "black",
    winner: null,
    started: false,
  };

  function resetBoard(size = 15) {
    state.size = size;
    state.board = Array.from({ length: size }, () => Array(size).fill(null));
    state.current = "black";
    state.winner = null;
    state.started = true;
  }

  function checkWinner(board, row, col, stone) {
    const dirs = [
      [1, 0],
      [0, 1],
      [1, 1],
      [1, -1],
    ];

    for (const [dr, dc] of dirs) {
      let count = 1;

      const next = (rr, cc) => {
        const r = rr + dr;
        const c = cc + dc;
        if (r < 0 || c < 0 || r >= board.length || c >= board.length) return false;
        return board[r][c] === stone;
      };

      let r = row;
      let c = col;
      while (next(r, c)) {
        count += 1;
        r += dr;
        c += dc;
      }

      r = row;
      c = col;
      while (next(-dr + r, -dc + c)) {
        count += 1;
        r -= dr;
        c -= dc;
      }

      if (count >= 5) return true;
    }

    return false;
  }

  function createGomokuBoard(size = 15) {
    const boardWrap = Utils.createEl("div", {
      id: OVERLAY_ID,
      style: {
        position: "fixed",
        inset: "0",
        zIndex: "2147483647",
        background: "rgba(16, 16, 20, 0.6)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      },
    });

    const panel = Utils.createEl("div", {
      style: {
        width: "min(90vw, 760px)",
        background: "#fff",
        borderRadius: "16px",
        boxShadow: "0 20px 40px rgba(0, 0, 0, 0.25)",
        padding: "18px",
        fontFamily: "system-ui, sans-serif",
      },
    });

    const header = Utils.createEl("div", {
      style: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: "12px",
      },
    });

    header.appendChild(Utils.createEl("h2", { text: "🎯 오목 데모", style: { margin: 0, fontSize: "24px" } }));
    const closeBtn = Utils.createEl("button", {
      text: "✕",
      style: {
        border: "none",
        background: "transparent",
        fontSize: "24px",
        cursor: "pointer",
      },
      onClick: () => {
        boardWrap.remove();
        state.started = false;
      },
    });
    header.appendChild(closeBtn);
    panel.appendChild(header);

    const status = Utils.createEl("div", {
      id: "ogsplus-gomoku-status",
      text: "흑 차례",
      style: {
        marginBottom: "12px",
        color: "#333",
        fontWeight: "700",
        textAlign: "center",
      },
    });
    panel.appendChild(status);

    const grid = Utils.createEl("div", {
      style: {
        display: "grid",
        gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))`,
        gap: "2px",
        background: "#d6b06d",
        padding: "8px",
        borderRadius: "8px",
      },
    });

    for (let row = 0; row < size; row += 1) {
      for (let col = 0; col < size; col += 1) {
        const cell = Utils.createEl("button", {
          type: "button",
          style: {
            width: "100%",
            aspectRatio: "1 / 1",
            border: "1px solid rgba(0,0,0,0.18)",
            background: "#e8c47d",
            fontSize: "18px",
            fontWeight: "700",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#111",
          },
          onClick: () => {
            if (!state.started || state.winner) return;
            if (state.board[row][col]) return;

            state.board[row][col] = state.current;
            cell.textContent = state.current === "black" ? "●" : "○";
            cell.style.color = state.current === "black" ? "#111" : "#fff";
            cell.style.background = state.current === "black" ? "#111" : "#f2f2f2";

            if (checkWinner(state.board, row, col, state.current)) {
              state.winner = state.current;
              status.textContent = `${state.current === "black" ? "흑" : "백"} 승리!`;
              Toast.showToast(`오목 승리: ${state.current === "black" ? "흑" : "백"}`, "success");
              return;
            }

            state.current = state.current === "black" ? "white" : "black";
            status.textContent = `${state.current === "black" ? "흑" : "백"} 차례`;
          },
        });
        grid.appendChild(cell);
      }
    }

    panel.appendChild(grid);

    const footer = Utils.createEl("div", {
      style: {
        display: "flex",
        justifyContent: "space-between",
        marginTop: "14px",
        gap: "8px",
      },
    });

    footer.appendChild(
      Utils.createEl("button", {
        text: "초기화",
        style: {
          flex: "1",
          padding: "10px 12px",
          borderRadius: "8px",
          border: "1px solid #ddd",
          background: "#f7f7f7",
          cursor: "pointer",
        },
        onClick: () => {
          resetBoard(size);
          Array.from(grid.children).forEach((node) => {
            node.textContent = "";
            node.style.background = "#e8c47d";
            node.style.color = "#111";
          });
          status.textContent = "흑 차례";
          state.winner = null;
        },
      }),
    );

    footer.appendChild(
      Utils.createEl("button", {
        text: "닫기",
        style: {
          flex: "1",
          padding: "10px 12px",
          borderRadius: "8px",
          border: "none",
          background: "#4f6cf7",
          color: "#fff",
          cursor: "pointer",
        },
        onClick: () => boardWrap.remove(),
      }),
    );

    panel.appendChild(footer);
    boardWrap.appendChild(panel);
    resetBoard(size);
    return boardWrap;
  }

  function installGomokuButton() {
    if (document.getElementById(BUTTON_ID)) return;

    const candidates = [
      document.querySelector(".MainNav"),
      document.querySelector("nav"),
      document.querySelector("[data-testid='main-nav']"),
      document.querySelector(".navigation"),
    ].filter(Boolean);

    const nav = candidates[0];
    if (!nav) return;

    const playLinks = nav.querySelectorAll("a, button, [role='menuitem']");
    let anchor = null;

    for (const item of playLinks) {
      const label = (item.textContent || "").trim().toLowerCase();
      if (label.includes("play") || label.includes("game") || label.includes("경기")) {
        anchor = item;
        break;
      }
    }

    if (!anchor) return;

    const btn = Utils.createEl("a", {
      id: BUTTON_ID,
      href: "#",
      text: "🎯 오목",
      style: {
        display: "inline-block",
        marginLeft: "8px",
        padding: "8px 12px",
        borderRadius: "6px",
        color: "#fff",
        background: "#4f7cff",
        fontWeight: "700",
        textDecoration: "none",
        cursor: "pointer",
      },
      onClick: (event) => {
        event.preventDefault();
        event.stopPropagation();
        const overlay = createGomokuBoard(15);
        document.body.appendChild(overlay);
      },
    });

    if (anchor.parentNode) {
      anchor.parentNode.insertBefore(btn, anchor.nextSibling);
    }
  }

  async function initialize() {
    const settings = await Utils.loadSettings();
    if (!settings.masterEnabled || !settings.features[FEATURE_KEY]) return;

    installGomokuButton();

    const observer = new MutationObserver(() => {
      if (!document.getElementById(BUTTON_ID)) {
        installGomokuButton();
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });

    Storage.onSettingsChanged((newVal) => {
      const enabled = newVal && newVal.masterEnabled && newVal.features[FEATURE_KEY];
      const btn = document.getElementById(BUTTON_ID);
      if (enabled && !btn) installGomokuButton();
      if (!enabled && btn) btn.remove();
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initialize, { once: true });
  } else {
    initialize();
  }
})(typeof window !== "undefined" ? window : globalThis);
