/**
 * OGS Plus - Tic-Tac-Toe 게임 런처
 * "경기하기" 버튼 아래에 "택" 항목을 추가하고, 택 모드로 게임을 생성
 * 
 * 구현 원리:
 * - OGS의 바둑 경기를 친선전/비공개로 생성
 * - 시스템에서는 정상적인 바둑 경기로 인식
 * - 확장 사용자에게만 UI를 택으로 표시
 * - 랜덤 매칭, 기본 바둑판 크기는 랜덤
 */
(function (global) {
  "use strict";

  const Utils = global.OGSPlusUtils;
  const Storage = global.OGSPlusStorage;
  const Toast = global.OGSPlusToast;

  const TICTACTOE_ID = "ogsplus-tictactoe-launcher";
  const TICTACTOE_MENU_ID = "ogsplus-tictactoe-menu";

  /**
   * 택 게임 설정 모달 UI 생성
   */
  function createTicTacToeModal() {
    const modal = Utils.createEl("div", {
      class: "ogsplus-modal ogsplus-tictactoe-modal",
      id: "ogsplus-tictactoe-modal",
    });

    const overlay = Utils.createEl("div", { class: "ogsplus-modal-overlay" });
    overlay.addEventListener("click", () => modal.remove());

    const content = Utils.createEl("div", { class: "ogsplus-modal-content" });

    const header = Utils.createEl("div", { class: "ogsplus-modal-header" }, [
      Utils.createEl("h2", { text: "🎮 Tic-Tac-Toe 게임" }),
      Utils.createEl("button", {
        class: "ogsplus-modal-close",
        text: "✕",
        onClick: () => modal.remove(),
      }),
    ]);
    content.appendChild(header);

    const body = Utils.createEl("div", { class: "ogsplus-modal-body" });

    // 설명
    body.appendChild(
      Utils.createEl("p", {
        class: "ogsplus-modal-desc",
        text: "택(Tic-Tac-Toe) 게임을 OGS에서 플레이합니다.",
      })
    );

    body.appendChild(
      Utils.createEl("p", {
        class: "ogsplus-modal-info",
        text: "⚠️ 친선전(Casual) • 비공개(Private) • 랜덤 매칭 • 확장 사용자에게만 택으로 표시",
      })
    );

    // 게임 유형 선택
    const modeLabel = Utils.createEl("label", { text: "게임 유형:" });
    const modeSelect = Utils.createEl(
      "select",
      { class: "ogsplus-select" },
      [
        Utils.createEl("option", { value: "random", text: "🎲 랜덤 매칭" }),
        Utils.createEl("option", { value: "bot", text: "🤖 AI 봇과 대전" }),
      ]
    );
    body.appendChild(Utils.createEl("div", { class: "ogsplus-form-group" }, [modeLabel, modeSelect]));

    // 색상 선택 (Random Match일 경우)
    const colorLabel = Utils.createEl("label", { text: "색상:" });
    const colorSelect = Utils.createEl(
      "select",
      { class: "ogsplus-select" },
      [
        Utils.createEl("option", { value: "random", text: "⚫⚪ 랜덤" }),
        Utils.createEl("option", { value: "black", text: "⚫ 흑(선공)" }),
        Utils.createEl("option", { value: "white", text: "⚪ 백(후공)" }),
      ]
    );
    body.appendChild(Utils.createEl("div", { class: "ogsplus-form-group" }, [colorLabel, colorSelect]));

    // 게임 설정 (난이도 등)
    const diffLabel = Utils.createEl("label", { text: "AI 난이도:" });
    const diffSelect = Utils.createEl(
      "select",
      { class: "ogsplus-select" },
      [
        Utils.createEl("option", { value: "easy", text: "쉬움" }),
        Utils.createEl("option", { value: "normal", text: "보통" }),
        Utils.createEl("option", { value: "hard", text: "어려움" }),
      ]
    );
    body.appendChild(Utils.createEl("div", { class: "ogsplus-form-group" }, [diffLabel, diffSelect]));

    content.appendChild(body);

    const footer = Utils.createEl("div", { class: "ogsplus-modal-footer" });
    footer.appendChild(
      Utils.createEl("button", {
        class: "ogsplus-btn",
        text: "취소",
        onClick: () => modal.remove(),
      })
    );
    footer.appendChild(
      Utils.createEl("button", {
        class: "ogsplus-btn primary",
        text: "게임 시작",
        onClick: async () => {
          const mode = modeSelect.value;
          const color = colorSelect.value;
          const difficulty = diffSelect.value;
          
          modal.remove();
          await launchTicTacToeGame(mode, color, difficulty);
        },
      })
    );
    content.appendChild(footer);

    modal.appendChild(overlay);
    modal.appendChild(content);

    return modal;
  }

  /**
   * OGS API를 통해 택 게임 시작
   * 친선전(casual), 비공개(private)로 설정
   */
  async function launchTicTacToeGame(mode, color, difficulty) {
    try {
      Toast.showToast("택 게임을 시작 중입니다...", "info");

      // OGS API 호출: 게임 생성
      const gamePayload = {
        // 택 게임 특수 표식
        rules: "chinese", // 기본 바둑 규칙 (시스템에서는 바둑으로 인식)
        handicap: 0,
        komi: 0.5,
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
        // 택 게임 메타데이터 (커스텀 필드)
        metadata: {
          game_type: "tictactoe",
          ttt_difficulty: difficulty,
          ttt_color_preference: color,
          extension: "OGS-Plus",
        },
      };

      // 바둑판 크기를 랜덤으로 설정 (3x3, 5x5 중 선택)
      const boardSizes = [3, 5];
      const randomSize = boardSizes[Math.floor(Math.random() * boardSizes.length)];
      gamePayload.width = randomSize;
      gamePayload.height = randomSize;

      // 모드에 따라 API 호출
      let response;
      if (mode === "random") {
        // 랜덤 매칭
        response = await fetch("/api/v1/games", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(gamePayload),
        });
      } else if (mode === "bot") {
        // AI 봇과의 대전
        // 봇 선택 (difficulty에 따라)
        const botUserId = await selectAIBot(difficulty);
        gamePayload.opponent_id = botUserId;

        response = await fetch("/api/v1/games", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(gamePayload),
        });
      }

      if (!response.ok) {
        throw new Error(`게임 생성 실패: ${response.statusText}`);
      }

      const gameData = await response.json();
      const gameId = gameData.id;

      // 게임 페이지로 이동
      window.location.href = `/game/${gameId}`;

      Toast.showToast("택 게임이 생성되었습니다!", "success");
    } catch (error) {
      console.error("[OGS Plus] Tic-Tac-Toe 게임 생성 오류:", error);
      Toast.showToast(`오류: ${error.message}`, "error");
    }
  }

  /**
   * 난이도에 따라 적절한 봇 선택
   */
  async function selectAIBot(difficulty) {
    try {
      // OGS의 알려진 봇 사용자 ID
      // 실제 구현에서는 API를 통해 봇 목록을 조회해야 함
      const bots = {
        easy: 1, // 예: 약한 봇
        normal: 2, // 중간 난이도 봇
        hard: 3, // 강한 봇
      };

      return bots[difficulty] || bots.normal;
    } catch (error) {
      console.error("[OGS Plus] 봇 선택 오류:", error);
      return 2; // 기본값: 중간 난이도
    }
  }

  /**
   * "경기하기" 섹션에 택 메뉴 추가
   */
  function injectTicTacToeMenu() {
    // "경기하기" 버튼 또는 메뉴를 찾기
    // OGS의 네비게이션 구조에 따라 선택자 조정 필요
    const playSection = document.querySelector("nav") || document.querySelector(".NavigationBar");
    
    if (!playSection || document.getElementById(TICTACTOE_ID)) {
      return; // 이미 주입됨 또는 해당 요소 없음
    }

    // "경기하기" 메뉴 아이템 찾기
    const gameMenuItems = playSection.querySelectorAll("a, button, [role='menuitem']");
    let playGameItem = null;

    for (const item of gameMenuItems) {
      if (
        item.textContent.includes("경기") ||
        item.textContent.includes("Play") ||
        item.textContent.includes("Game")
      ) {
        playGameItem = item;
        break;
      }
    }

    if (!playGameItem) {
      return; // "경기하기" 메뉴를 찾을 수 없음
    }

    // 택 메뉴 아이템 생성
    const tictactoeItem = Utils.createEl("a", {
      id: TICTACTOE_ID,
      class: "ogsplus-tictactoe-menu-item",
      href: "#",
      text: "🎮 택",
      onClick: (e) => {
        e.preventDefault();
        const modal = createTicTacToeModal();
        document.body.appendChild(modal);
      },
    });

    // "경기하기" 메뉴 다음에 택 메뉴 삽입
    if (playGameItem.parentNode) {
      playGameItem.parentNode.insertBefore(tictactoeItem, playGameItem.nextSibling);
    }
  }

  /**
   * 페이지 준비 완료 후 메뉴 주입
   */
  function initialize() {
    Storage.getSettings().then((settings) => {
      if (!settings.masterEnabled || !settings.features.tictactoe) {
        return; // 택 기능 비활성화됨
      }

      // 네비게이션 로드 대기
      Utils.watchElements("nav, .NavigationBar", () => {
        setTimeout(injectTicTacToeMenu, 300);
      });

      // 정기적으로 메뉴 확인 (SPA 라우팅 대응)
      setInterval(() => {
        if (!document.getElementById(TICTACTOE_ID)) {
          injectTicTacToeMenu();
        }
      }, 2000);
    });
  }

  // 초기화
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initialize);
  } else {
    initialize();
  }
})(typeof window !== "undefined" ? window : globalThis);
