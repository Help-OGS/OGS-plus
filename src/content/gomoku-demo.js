/**
 * OGS Plus - Gomoku Demo Board with AI
 * Local-only Gomoku game overlay with simple AI opponent
 */
(function (global) {
  "use strict";

  const Utils = global.OGSPlusUtils;
  const Storage = global.OGSPlusStorage;
  const Toast = global.OGSPlusToast;

  const FEATURE_KEY = "gomoku";
  const BUTTON_ID = "ogsplus-gomoku-demo-button";
  const MODAL_ID = "ogsplus-gomoku-demo-modal";

  function createModal() {
    const modal = Utils.createEl("div", {
      id: MODAL_ID,
      style: {
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.6)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: "2147483647",
      },
    });

    const panel = Utils.createEl("div", {
      style: {
        width: "min(92vw, 760px)",
        background: "#ffffff",
        borderRadius: "14px",
        boxShadow: "0 18px 40px rgba(0,0,0,0.28)",
        padding: "20px",
        fontFamily: "system-ui, sans-serif",
      },
    });

    const header = Utils.createEl("div", {
      style: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: "14px",
      },
    });

    header.appendChild(Utils.createEl("h2", {
      text: "🎯 오목 vs AI",
      style: { margin: 0, fontSize: "24px" },
    }));

    header.appendChild(Utils.createEl("button", {
      text: "✕",
      style: {
        border: "none",
        background: "transparent",
        fontSize: "24px",
        cursor: "pointer",
      },
      onClick: () => modal.remove(),
    }));

    panel.appendChild(header);

    const status = Utils.createEl("div", {
      id: "ogsplus-gomoku-status",
      text: "흑 차례 (당신)",
      style: {
        marginBottom: "12px",
        fontWeight: "700",
        textAlign: "center",
        color: "#222",
      },
    });
    panel.appendChild(status);

    const boardSize = 15;
    const board = Array.from({ length: boardSize }, () => Array(boardSize).fill(null));
    let current = "black";
    let winner = null;
    let thinking = false;

    function checkWin(r, c, stone) {
      const dirs = [[1,0],[0,1],[1,1],[1,-1]];
      for (const [dr, dc] of dirs) {
        let count = 1;
        let rr = r + dr;
        let cc = c + dc;
        while (rr >= 0 && cc >= 0 && rr < boardSize && cc < boardSize && board[rr][cc] === stone) {
          count += 1;
          rr += dr;
          cc += dc;
        }
        rr = r - dr;
        cc = c - dc;
        while (rr >= 0 && cc >= 0 && rr < boardSize && cc < boardSize && board[rr][cc] === stone) {
          count += 1;
          rr -= dr;
          cc -= dc;
        }
        if (count >= 5) return true;
      }
      return false;
    }

    function countStones(r, c, stone, dr, dc) {
      let count = 0;
      let rr = r + dr;
      let cc = c + dc;
      while (rr >= 0 && cc >= 0 && rr < boardSize && cc < boardSize && board[rr][cc] === stone) {
        count += 1;
        rr += dr;
        cc += dc;
      }
      rr = r - dr;
      cc = c - dc;
      while (rr >= 0 && cc >= 0 && rr < boardSize && cc < boardSize && board[rr][cc] === stone) {
        count += 1;
        rr -= dr;
        cc -= dc;
      }
      return count;
    }

    function scoreMove(r, c) {
      let score = 0;
      
      // 중앙이 가까울수록 높은 점수
      const centerDist = Math.abs(r - 7.5) + Math.abs(c - 7.5);
      score += (15 - centerDist) * 10;

      // 우리 돌과 인접하면 높은 점수
      for (const [dr, dc] of [[1,0],[0,1],[1,1],[1,-1],[-1,0],[0,-1],[-1,-1],[-1,1]]) {
        const nr = r + dr;
        const nc = c + dc;
        if (nr >= 0 && nc >= 0 && nr < boardSize && nc < boardSize && board[nr][nc] === "white") {
          score += 50;
        }
      }

      // 우리 돌(백) 라인 길이
      const dirs = [[1,0],[0,1],[1,1],[1,-1]];
      for (const [dr, dc] of dirs) {
        const count = countStones(r, c, "white", dr, dc);
        if (count >= 4) score += 10000; // 5목 완성
        else if (count === 3) score += 5000;
        else if (count === 2) score += 1000;
        else if (count === 1) score += 100;
      }

      // 상대 돌(흑) 차단
      for (const [dr, dc] of dirs) {
        const count = countStones(r, c, "black", dr, dc);
        if (count >= 4) score += 8000; // 상대 5목 방어
        else if (count === 3) score += 4000;
        else if (count === 2) score += 500;
      }

      return score;
    }

    function getAIMove() {
      const moves = [];
      let maxScore = -Infinity;

      for (let r = 0; r < boardSize; r += 1) {
        for (let c = 0; c < boardSize; c += 1) {
          if (board[r][c]) continue;
          
          const score = scoreMove(r, c);
          if (score > maxScore) {
            maxScore = score;
            moves.length = 0;
            moves.push([r, c, score]);
          } else if (score === maxScore) {
            moves.push([r, c, score]);
          }
        }
      }

      if (moves.length === 0) return null;
      return moves[Math.floor(Math.random() * Math.min(3, moves.length))];
    }

    const grid = Utils.createEl("div", {
      style: {
        display: "grid",
        gridTemplateColumns: `repeat(${boardSize}, minmax(0, 1fr))`,
        gap: "2px",
        background: "#d0a866",
        padding: "8px",
        borderRadius: "8px",
      },
    });

    const cells = [];
    for (let row = 0; row < boardSize; row += 1) {
      for (let col = 0; col < boardSize; col += 1) {
        const cell = Utils.createEl("button", {
          type: "button",
          style: {
            width: "100%",
            aspectRatio: "1 / 1",
            border: "1px solid rgba(0,0,0,0.18)",
            background: "#e7c57a",
            color: "#111",
            fontWeight: "700",
            fontSize: "16px",
            cursor: "pointer",
          },
          onClick: () => {
            if (winner || board[row][col] || thinking || current !== "black") return;
            
            board[row][col] = "black";
            cell.textContent = "●";
            cell.style.background = "#111";
            cell.style.color = "#fff";

            if (checkWin(row, col, "black")) {
              winner = "black";
              status.textContent = "당신이 승리했습니다!";
              Toast.showToast("오목 승리: 흑", "success");
              return;
            }

            current = "white";
            status.textContent = "AI 생각 중...";
            thinking = true;

            setTimeout(() => {
              const move = getAIMove();
              if (!move) {
                status.textContent = "무승부!";
                return;
              }

              const [ar, ac] = move;
              board[ar][ac] = "white";
              const aiCell = cells[ar * boardSize + ac];
              aiCell.textContent = "○";
              aiCell.style.background = "#f5f5f5";
              aiCell.style.color = "#111";

              if (checkWin(ar, ac, "white")) {
                winner = "white";
                status.textContent = "AI가 승리했습니다!";
                Toast.showToast("오목 패배: 백", "error");
                thinking = false;
                return;
              }

              current = "black";
              status.textContent = "흑 차례 (당신)";
              thinking = false;
            }, 400);
          },
        });

        grid.appendChild(cell);
        cells.push(cell);
      }
    }

    panel.appendChild(grid);

    const footer = Utils.createEl("div", {
      style: {
        display: "flex",
        gap: "10px",
        marginTop: "14px",
      },
    });

    footer.appendChild(Utils.createEl("button", {
      text: "초기화",
      style: {
        flex: "1",
        padding: "10px 12px",
        borderRadius: "8px",
        border: "1px solid #ddd",
        background: "#f6f6f6",
        cursor: "pointer",
      },
      onClick: () => {
        for (let i = 0; i < boardSize * boardSize; i += 1) {
          const cell = cells[i];
          cell.textContent = "";
          cell.style.background = "#e7c57a";
          cell.style.color = "#111";
        }
        for (let r = 0; r < boardSize; r += 1) {
          for (let c = 0; c < boardSize; c += 1) {
            board[r][c] = null;
          }
        }
        current = "black";
        winner = null;
        thinking = false;
        status.textContent = "흑 차례 (당신)";
      },
    }));

    footer.appendChild(Utils.createEl("button", {
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
      onClick: () => modal.remove(),
    }));

    panel.appendChild(footer);
    modal.appendChild(panel);
    return modal;
  }

  function injectMenuButton() {
    if (document.getElementById(BUTTON_ID)) return;

    const nav = document.querySelector(".MainNav") || document.querySelector("nav") || document.querySelector("[data-testid='main-nav']") || document.querySelector(".navigation");
    if (!nav) return;

    const items = nav.querySelectorAll("a, button, [role='menuitem']");
    let anchor = null;

    for (const item of items) {
      const text = (item.textContent || "").trim().toLowerCase();
      if (text.includes("play") || text.includes("game") || text.includes("경기")) {
        anchor = item;
        break;
      }
    }

    if (!anchor) return;

    const button = Utils.createEl("a", {
      id: BUTTON_ID,
      href: "#",
      text: "🎯 오목",
      style: {
        display: "inline-block",
        marginLeft: "8px",
        padding: "8px 12px",
        borderRadius: "6px",
        background: "#4f7cff",
        color: "#fff",
        fontWeight: "700",
        textDecoration: "none",
        cursor: "pointer",
      },
      onClick: (event) => {
        event.preventDefault();
        event.stopPropagation();
        document.body.appendChild(createModal());
      },
    });

    if (anchor.parentNode) {
      anchor.parentNode.insertBefore(button, anchor.nextSibling);
    }
  }

  async function initialize() {
    const settings = await Utils.loadSettings();
    if (!settings.masterEnabled || !settings.features[FEATURE_KEY]) return;

    injectMenuButton();

    const observer = new MutationObserver(() => {
      if (!document.getElementById(BUTTON_ID)) injectMenuButton();
    });
    observer.observe(document.body, { childList: true, subtree: true });

    Storage.onSettingsChanged((newVal) => {
      const enabled = newVal && newVal.masterEnabled && newVal.features[FEATURE_KEY];
      const btn = document.getElementById(BUTTON_ID);
      if (enabled && !btn) injectMenuButton();
      if (!enabled && btn) btn.remove();
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initialize, { once: true });
  } else {
    initialize();
  }
})(typeof window !== "undefined" ? window : globalThis);
