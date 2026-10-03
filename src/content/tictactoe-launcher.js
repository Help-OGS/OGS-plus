/**
* dad code
 * OGS Plus - Tic-Tac-Toe 게임 런처
 * 
 * 구현 전략:
 * 1. "Play" 네비게이션 아래에 "🎮 Tic-Tac-Toe" 항목 추가
 * 2. 게임은 친선전(casual) + 비공개(private)로 서버에서 바둑으로 등록
 * 3. 확장 사용자에게만 UI 상에서 "택"으로 표시
 * 4. OGS API를 통한 안전한 CSRF 토큰 기반 통신
 */
(function (global) {
  "use strict";

  const Utils = global.OGSPlusUtils;
  const Storage = global.OGSPlusStorage;
  const Toast = global.OGSPlusToast;

  const FEATURE_KEY = "tictactoe";
  const LAUNCHER_ID = "ogsplus-ttt-launcher";
  const MODAL_ID = "ogsplus-ttt-modal";

  /**
   * 택 게임 설정 모달 생성
   */
  function createTicTacToeModal() {
    const modal = Utils.createEl("div", {
      id: MODAL_ID,
      class: "ogsplus-modal-backdrop",
      style: {
        position: "fixed",
        top: "0",
        left: "0",
        width: "100%",
        height: "100%",
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: "10000",
      },
    });

    const container = Utils.createEl("div", {
      class: "ogsplus-ttt-modal",
      style: {
        backgroundColor: "white",
        borderRadius: "8px",
        padding: "24px",
        maxWidth: "500px",
        width: "90%",
        boxShadow: "0 4px 20px rgba(0, 0, 0, 0.3)",
        fontFamily: "system-ui, sans-serif",
      },
    });

    // 헤더
    const header = Utils.createEl("div", {
      style: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: "20px",
        borderBottom: "1px solid #e0e0e0",
        paddingBottom: "12px",
      },
    });
    header.appendChild(Utils.createEl("h2", { text: "🎮 Tic-Tac-Toe 게임", style: { margin: "0" } }));
    const closeBtn = Utils.createEl("button", {
      text: "✕",
      style: {
        border: "none",
        background: "none",
        fontSize: "20px",
        cursor: "pointer",
        color: "#666",
      },
      onClick: () => modal.remove(),
    });
    header.appendChild(closeBtn);
    container.appendChild(header);

    // 본문
    const body = Utils.createEl("div", { style: { marginBottom: "20px" } });

    // 설명
    body.appendChild(
      Utils.createEl("p", {
        text: "친선전 비공개 게임으로 택을 플레이합니다. 시스템에는 바둑 경기로 등록되지만, 확장 사용자에게만 택으로 표시됩니다.",
        style: { fontSize: "14px", color: "#555", marginBottom: "12px", lineHeight: "1.5" },
      })
    );

    // 게임 모드 선택
    const modeGroup = createFormGroup("게임 모드", [
      { value: "random", label: "🎲 랜덤 매칭" },
      { value: "bot", label: "🤖 AI 봇 대전" },
    ]);
    const modeSelect = modeGroup.querySelector("select");
    body.appendChild(modeGroup);

    // 색상 선택
    const colorGroup = createFormGroup("색상", [
      { value: "random", label: "⚫⚪ 랜덤" },
      { value: "black", label: "⚫ 흑(선공)" },
      { value: "white", label: "⚪ 백(후공)" },
    ]);
    const colorSelect = colorGroup.querySelector("select");
    body.appendChild(colorGroup);

    // AI 난이도 (봇 모드일 때만 보임)
    const diffGroup = createFormGroup("AI 난이도", [
      { value: "1", label: "🟢 쉬움" },
      { value: "3", label: "🟡 중간" },
      { value: "6", label: "🔴 어려움" },
    ]);
    const diffSelect = diffGroup.querySelector("select");
    body.appendChild(diffGroup);

    // 모드 변경 시 난이도 표시/숨김
    modeSelect.addEventListener("change", (e) => {
      diffGroup.style.display = e.target.value === "bot" ? "block" : "none";
    });
    diffGroup.style.display = "none";

    container.appendChild(body);

    // 버튼
    const footer = Utils.createEl("div", {
      style: {
        display: "flex",
        gap: "12px",
        justifyContent: "flex-end",
        borderTop: "1px solid #e0e0e0",
        paddingTop: "20px",
      },
    });

    const cancelBtn = Utils.createEl("button", {
      text: "취소",
      style: {
        padding: "8px 16px",
        border: "1px solid #ccc",
        borderRadius: "4px",
        backgroundColor: "#f5f5f5",
        cursor: "pointer",
        fontSize: "14px",
      },
      onClick: () => modal.remove(),
    });
    footer.appendChild(cancelBtn);

    const startBtn = Utils.createEl("button", {
      text: "게임 시작",
      style: {
        padding: "8px 16px",
        border: "none",
        borderRadius: "4px",
        backgroundColor: "#4CAF50",
        color: "white",
        cursor: "pointer",
        fontSize: "14px",
        fontWeight: "bold",
      },
      onClick: async () => {
        startBtn.disabled = true;
        modal.remove();
        await launchTicTacToeGame(modeSelect.value, colorSelect.value, diffSelect.value);
      },
    });
    footer.appendChild(startBtn);
    container.appendChild(footer);

    modal.appendChild(container);
    return modal;
  }

  /**
   * 폼 그룹 헬퍼
   */
  function createFormGroup(label, options) {
    const group = Utils.createEl("div", { style: { marginBottom: "16px" } });

    group.appendChild(
      Utils.createEl("label", {
        text: label + ":",
        style: {
          display: "block",
          marginBottom: "6px",
          fontSize: "14px",
          fontWeight: "500",
          color: "#333",
        },
      })
    );

    const select = Utils.createEl(
      "select",
      {
        style: {
          width: "100%",
          padding: "8px",
          borderRadius: "4px",
          border: "1px solid #ccc",
          fontSize: "14px",
          boxSizing: "border-box",
        },
      },
      options.map((opt) => Utils.createEl("option", { value: opt.value, text: opt.label }))
    );

    group.appendChild(select);
    return group;
  }

  /**
   * OGS API를 통해 택 게임 생성 및 시작
   * 서버는 이를 바둑 경기로 인식하지만, 클라이언트는 택으로 표시
   */
  async function launchTicTacToeGame(mode, colorPref, difficulty) {
    try {
      Toast.showToast("택 게임을 준비 중입니다...", "info");

      // 게임 설정 구성
      const gamePayload = {
        // 바둑판 크기 (택의 일반적인 크기: 3x3, 5x5)
        width: Math.random() > 0.5 ? 3 : 5,
        height: Math.random() > 0.5 ? 3 : 5,

        // 기본 바둑 규칙 (시스템에서는 바둑으로 인식)
        rules: "chinese",
        handicap: 0,
        komi: 0.5,

        // 시간 제한 (빠른 게임)
        time_control: {
          system: "byoyomi",
          main_time: 300, // 5분
          period_time: 30,
          periods: 5,
        },

        // 친선전 + 비공개
        ladder: false,
        ranked: false,
        private: true,

        // 택 메타데이터
        metadata: {
          game_type: "tictactoe",
          ttt_color_preference: colorPref,
          ttt_difficulty: difficulty,
          extension: "OGS-Plus",
        },
      };

      let gameData;

      if (mode === "random") {
        // 랜덤 매칭: 자동 매칭 큐에 추가
        gameData = await createRandomMatchGame(gamePayload);
      } else if (mode === "bot") {
        // AI 봇 대전
        gameData = await createBotGame(gamePayload, difficulty);
      }

      if (!gameData || !gameData.id) {
        throw new Error("게임 생성에 실패했습니다.");
      }

      // 게임 페이지로 이동
      window.location.href = `/game/${gameData.id}`;
      Toast.showToast(`택 게임 #${gameData.id}를 시작합니다!`, "success");
    } catch (error) {
      console.error("[OGS Plus] Tic-Tac-Toe 오류:", error);
      Toast.showToast(`오류: ${error.message || "게임 생성 실패"}`, "error");
    }
  }

  /**
   * 랜덤 매칭 게임 생성
   */
  async function createRandomMatchGame(payload) {
    try {
      // OGS API: POST /api/v1/games
      const response = await Utils.apiFetch("games", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      return response;
    } catch (error) {
      console.error("[OGS Plus] 랜덤 매칭 실패:", error);
      throw new Error("랜덤 매칭 게임을 생성할 수 없습니다.");
    }
  }

  /**
   * AI 봇 대전 게임 생성
   * OGS의 알려진 봇과 매칭
   */
  async function createBotGame(payload, difficulty) {
    try {
      // OGS의 AI 봇 매핑 (난이도 → 봇 ID)
      // 실제 OGS 봇 ID는 환경에 따라 다름
      const botMap = {
        "1": 294, // GnuGo 9x9
        "3": 5, // Leela Zero (중급)
        "6": 6, // Leela Zero (강급)
      };

      const botUserId = botMap[difficulty] || botMap["3"];

      // 대전 상대 설정
      payload.opponent_id = botUserId;

      const response = await Utils.apiFetch("games", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      return response;
    } catch (error) {
      console.error("[OGS Plus] AI 봇 게임 생성 실패:", error);
      throw new Error("AI 봇 게임을 생성할 수 없습니다.");
    }
  }

  /**
   * OGS 네비게이션에 택 런처 추가
   * OGS의 실제 DOM 구조에 맞춰 삽입
   */
  function injectTicTacToeLauncher() {
    // 이미 삽입됨
    if (document.getElementById(LAUNCHER_ID)) {
      return;
    }

    // OGS 네비게이션 찾기 (다양한 선택자 시도)
    let navContainer = document.querySelector(".MainNav") ||
      document.querySelector("[data-testid='main-nav']") ||
      document.querySelector("nav") ||
      document.querySelector(".navigation");

    if (!navContainer) {
      return; // 네비게이션을 찾을 수 없음
    }

    // "Play" 메뉴 아이템 찾기
    const playMenuItems = navContainer.querySelectorAll("a, button, [role='menuitem']");
    let playItem = null;

    for (const item of playMenuItems) {
      const text = item.textContent.toLowerCase();
      if (text.includes("play") || text.includes("경기")) {
        playItem = item;
        break;
      }
    }

    if (!playItem) {
      return; // Play 메뉴를 찾을 수 없음
    }

    // 택 런처 메뉴 아이템 생성
    const tttLauncher = Utils.createEl("a", {
      id: LAUNCHER_ID,
      href: "#",
      class: "ogsplus-ttt-nav-item",
      text: "🎮 Tic-Tac-Toe",
      style: {
        display: "inline-block",
        marginLeft: "8px",
        padding: "8px 12px",
        borderRadius: "4px",
        backgroundColor: "#FF6B6B",
        color: "white",
        textDecoration: "none",
        fontSize: "14px",
        cursor: "pointer",
        transition: "background-color 0.2s",
      },
      onClick: (e) => {
        e.preventDefault();
        e.stopPropagation();
        const modal = createTicTacToeModal();
        document.body.appendChild(modal);
      },
    });

    // 호버 효과
    tttLauncher.addEventListener("mouseover", () => {
      tttLauncher.style.backgroundColor = "#FF5252";
    });
    tttLauncher.addEventListener("mouseout", () => {
      tttLauncher.style.backgroundColor = "#FF6B6B";
    });

    // Play 메뉴 다음에 삽입
    if (playItem.parentNode) {
      playItem.parentNode.insertBefore(tttLauncher, playItem.nextSibling);
    }
  }

  /**
   * 초기화
   */
  async function initialize() {
    const settings = await Utils.loadSettings();

    if (!settings.masterEnabled || !settings.features[FEATURE_KEY]) {
      return; // 택 기능 비활성화
    }

    // 페이지 로드 후 주입
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", () => {
        setTimeout(injectTicTacToeLauncher, 500);
      });
    } else {
      injectTicTacToeLauncher();
    }

    // SPA 라우팅 대응: 주기적으로 확인
    setInterval(() => {
      if (!document.getElementById(LAUNCHER_ID)) {
        injectTicTacToeLauncher();
      }
    }, 2000);

    // 설정 변경 감지
    Storage.onSettingsChanged((newVal) => {
      const enabled = newVal && newVal.masterEnabled && newVal.features[FEATURE_KEY];
      const launcher = document.getElementById(LAUNCHER_ID);

      if (enabled && !launcher) {
        injectTicTacToeLauncher();
      } else if (!enabled && launcher) {
        launcher.remove();
      }
    });
  }

  initialize();
})(typeof window !== "undefined" ? window : globalThis);
