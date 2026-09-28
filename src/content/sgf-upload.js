/**
 * OGS Plus - SGF 라이브러리 페이지에 'OGS Game' 업로드 버튼 추가
 *
 * 경로: /library/:player_id/:collection_id
 *
 * 기능:
 *   1. OGS 대국 검색
 *   2. 선택한 대국의 SGF 원문 다운로드
 *   3. SGF 파일 생성
 *   4. OGS SGF Library에 업로드
 */
(function (global) {
  "use strict";

  const Utils = global.OGSPlusUtils;
  const Toast = global.OGSPlusToast;

  const BUTTON_ID = "ogsplus-sgf-upload-btn";

  function getRouteParams() {
    const m = window.location.pathname.match(
      /\/library\/(\d+)\/(\d+)/,
    );

    if (!m) return null;

    return {
      playerId: Number(m[1]),
      collectionId: Number(m[2]),
    };
  }

  async function searchGames(query, mode) {
    const currentUserId =
      Utils.getCurrentUserId();

    query = query.trim();

    // 게임 ID로 직접 조회
    if (/^\d+$/.test(query)) {
      try {
        const game = await Utils.apiFetch(
          `games/${query}`,
        );

        return [game];
      } catch (e) {
        console.error(
          "[OGS Plus] Game lookup failed:",
          e,
        );

        return [];
      }
    }

    // 내 대국
    if (mode === "mine" && currentUserId) {
      try {
        const data = await Utils.apiFetch(
          `players/${currentUserId}/game_history/?page_size=15`,
        );

        return (data.results || []).filter((g) => {
          const b =
            g.players?.black?.username || "";

          const w =
            g.players?.white?.username || "";

          const q = query.toLowerCase();

          return (
            !q ||
            b.toLowerCase().includes(q) ||
            w.toLowerCase().includes(q)
          );
        });
      } catch (e) {
        console.error(
          "[OGS Plus] Game history lookup failed:",
          e,
        );

        return [];
      }
    }

    // 다른 사람의 대국
    if (mode === "other" && query) {
      try {
        const found = await Utils.apiFetch(
          `players/?username__istartswith=${encodeURIComponent(
            query,
          )}`,
        );

        const player =
          (found.results || [])[0];

        if (!player) {
          return [];
        }

        const data = await Utils.apiFetch(
          `players/${player.id}/game_history/?page_size=15`,
        );

        return data.results || [];
      } catch (e) {
        console.error(
          "[OGS Plus] Other player lookup failed:",
          e,
        );

        return [];
      }
    }

    return [];
  }

  function gameLabel(g) {
    const b =
      g.players?.black?.username ||
      g.black?.username ||
      "?";

    const w =
      g.players?.white?.username ||
      g.white?.username ||
      "?";

    return `#${g.id} — ${b} vs ${w}`;
  }

  /**
   * OGS에서 SGF 원문을 가져온다.
   */
  async function downloadGameSgf(gameId) {
    console.log(
      "[OGS Plus] Downloading SGF:",
      gameId,
    );

    const response =
      await Utils.apiFetchRaw(
        `games/${gameId}/sgf`,
        {
          method: "GET",
          headers: {
            Accept:
              "application/x-go-sgf, text/plain, */*",
          },
        },
      );

    const sgfString = response.text;

    console.log(
      "[OGS Plus] SGF response:",
      sgfString.slice(0, 300),
    );

    if (
      !sgfString ||
      !sgfString.trim()
    ) {
      throw new Error(
        "OGS에서 SGF 데이터가 비어 있습니다.",
      );
    }

    const trimmed =
      sgfString.trim();

    /*
     * 정상적인 SGF는 보통 "(;"로 시작한다.
     *
     * 혹시 BOM이 붙은 경우도 처리한다.
     */
    const cleanSgf =
      trimmed.replace(/^\uFEFF/, "");

    if (!cleanSgf.startsWith("(")) {
      console.error(
        "[OGS Plus] Invalid SGF response:",
        sgfString,
      );

      throw new Error(
        "OGS가 올바른 SGF 파일을 반환하지 않았습니다.",
      );
    }

    return cleanSgf;
  }

  /**
   * SGF 파일 생성
   */
  function createSgfFile(
    sgfString,
    gameId,
  ) {
    const blob = new Blob(
      [sgfString],
      {
        type: "application/x-go-sgf;charset=UTF-8",
      },
    );

    return new File(
      [blob],
      `game-${gameId}.sgf`,
      {
        type: "application/x-go-sgf",
        lastModified: Date.now(),
      },
    );
  }

  /**
   * SGF Library 업로드
   */
  async function uploadSgfFile(
    file,
    collectionId,
  ) {
    const formData =
      new FormData();

    /*
     * 중요:
     * Content-Type은 직접 지정하지 않는다.
     *
     * 브라우저가
     * multipart/form-data; boundary=...
     * 를 자동으로 만들어야 한다.
     */
    formData.append(
      "file",
      file,
      file.name,
    );

    console.log(
      "[OGS Plus] Uploading SGF:",
      {
        name: file.name,
        size: file.size,
        type: file.type,
        collectionId,
      },
    );

    const response =
      await Utils.apiFetchRaw(
        `me/games/sgf/${collectionId}`,
        {
          method: "POST",
          body: formData,
          headers: {
            Accept:
              "application/json, text/plain, */*",
          },
        },
      );

    console.log(
      "[OGS Plus] Upload response:",
      response.status,
      response.text,
    );

    return response;
  }

  function buildModal(collectionId) {
    let mode = "mine";
    let selectedGame = null;

    const resultsList =
      Utils.createEl(
        "div",
        {
          class:
            "ogsplus-game-list",
        },
      );

    const searchInput =
      Utils.createEl(
        "input",
        {
          type: "text",
          placeholder:
            Utils.t(
              "sgf.searchPlaceholder",
            ),
        },
      );

    async function runSearch() {
      resultsList.innerHTML = "";

      const games =
        await searchGames(
          searchInput.value,
          mode,
        );

      selectedGame = null;

      if (!games.length) {
        resultsList.appendChild(
          Utils.createEl(
            "div",
            {
              class:
                "ogsplus-game-list-item",
              style: {
                opacity: "0.6",
                cursor: "default",
              },
              text: "대국을 찾을 수 없습니다.",
            },
          ),
        );

        return;
      }

      games.forEach((g) => {
        const item =
          Utils.createEl(
            "div",
            {
              class:
                "ogsplus-game-list-item",

              onClick: () => {
                resultsList
                  .querySelectorAll(
                    ".ogsplus-game-list-item",
                  )
                  .forEach((el) =>
                    el.classList.remove(
                      "selected",
                    ),
                  );

                item.classList.add(
                  "selected",
                );

                selectedGame = g;

                console.log(
                  "[OGS Plus] Selected game:",
                  g,
                );
              },
            },
            [
              Utils.createEl(
                "span",
                {
                  text:
                    gameLabel(g),
                },
              ),
            ],
          );

        resultsList.appendChild(
          item,
        );
      });
    }

    const tabMine =
      Utils.createEl(
        "div",
        {
          class:
            "ogsplus-tab active",

          text:
            Utils.t(
              "sgf.pickMine",
            ),

          onClick: () => {
            mode = "mine";

            tabMine.classList.add(
              "active",
            );

            tabOther.classList.remove(
              "active",
            );

            runSearch();
          },
        },
      );

    const tabOther =
      Utils.createEl(
        "div",
        {
          class:
            "ogsplus-tab",

          text:
            Utils.t(
              "sgf.pickOther",
            ),

          onClick: () => {
            mode = "other";

            tabOther.classList.add(
              "active",
            );

            tabMine.classList.remove(
              "active",
            );

            runSearch();
          },
        },
      );

    searchInput.addEventListener(
      "input",
      Utils.debounce(
        runSearch,
        400,
      ),
    );

    const uploadBtn =
      Utils.createEl(
        "button",
        {
          class:
            "ogsplus-btn primary",

          text:
            Utils.t(
              "sgf.upload",
            ),

          onClick:
            async () => {
              if (!selectedGame) {
                Toast.showToast(
                  "대국을 먼저 선택하세요.",
                  "error",
                );

                return;
              }

              uploadBtn.disabled =
                true;

              uploadBtn.textContent =
                "업로드 중...";

              try {
                console.log(
                  "[OGS Plus] SGF upload started",
                  {
                    gameId:
                      selectedGame.id,

                    collectionId,
                  },
                );

                /*
                 * 1.
                 * OGS에서 SGF 원문 가져오기
                 */
                const sgfString =
                  await downloadGameSgf(
                    selectedGame.id,
                  );

                /*
                 * 2.
                 * SGF 파일 생성
                 */
                const file =
                  createSgfFile(
                    sgfString,
                    selectedGame.id,
                  );

                /*
                 * 3.
                 * OGS Library에 업로드
                 */
                const response =
                  await uploadSgfFile(
                    file,
                    collectionId,
                  );

                console.log(
                  "[OGS Plus] SGF upload successful:",
                  response,
                );

                Toast.showToast(
                  "SGF 업로드 완료",
                  "success",
                );

                closeModal();

                /*
                 * Library 목록 새로고침
                 */
                setTimeout(
                  () =>
                    window.location.reload(),
                  600,
                );
              } catch (e) {
                console.error(
                  "[OGS Plus] SGF upload failed:",
                  e,
                );

                Toast.showToast(
                  `업로드 실패: ${
                    e?.message || e
                  }`,
                  "error",
                );
              } finally {
                uploadBtn.disabled =
                  false;

                uploadBtn.textContent =
                  Utils.t(
                    "sgf.upload",
                  );
              }
            },
        },
      );

    const cancelBtn =
      Utils.createEl(
        "button",
        {
          class:
            "ogsplus-btn",

          text: "✕",

          onClick: () =>
            closeModal(),
        },
      );

    const backdrop =
      Utils.createEl(
        "div",
        {
          class:
            "ogsplus-modal-backdrop",

          onClick: (e) => {
            if (
              e.target ===
              backdrop
            ) {
              closeModal();
            }
          },
        },
        [
          Utils.createEl(
            "div",
            {
              class:
                "ogsplus-modal",
            },
            [
              Utils.createEl(
                "h3",
                {
                  text: `🎮 ${Utils.t(
                    "sgf.uploadButton",
                  )}`,
                },
              ),

              Utils.createEl(
                "div",
                {
                  class:
                    "ogsplus-tabs",
                },
                [
                  tabMine,
                  tabOther,
                ],
              ),

              searchInput,

              resultsList,

              Utils.createEl(
                "div",
                {
                  class:
                    "ogsplus-modal-actions",
                },
                [
                  cancelBtn,
                  uploadBtn,
                ],
              ),
            ],
          ),
        ],
      );

    function closeModal() {
      if (
        backdrop &&
        backdrop.parentNode
      ) {
        backdrop.remove();
      }
    }

    document.body.appendChild(
      backdrop,
    );

    runSearch();

    return backdrop;
  }

  function injectButton(
    container,
    collectionId,
  ) {
    if (
      document.getElementById(
        BUTTON_ID,
      )
    ) {
      return;
    }

    const btn =
      Utils.createEl(
        "button",
        {
          id: BUTTON_ID,

          class:
            "ogsplus-sgf-btn",

          text: `🎮 ${Utils.t(
            "sgf.uploadButton",
          )}`,

          onClick: () =>
            buildModal(
              collectionId,
            ),
        },
      );

    container.prepend(btn);
  }

  function tryInject() {
    const settings =
      Utils.getCachedSettings();

    if (
      !settings.masterEnabled ||
      !settings.features
        .sgfOgsUpload
    ) {
      return;
    }

    const params =
      getRouteParams();

    if (!params) {
      return;
    }

    const controlsRight =
      document.querySelector(
        ".LibraryPlayer .controls-right",
      );

    if (controlsRight) {
      injectButton(
        controlsRight,
        params.collectionId,
      );
    }
  }

  Utils.watchElements(
    ".LibraryPlayer .controls-right",
    () => tryInject(),
  );

  /*
   * OGS SPA 라우팅 대응
   */
  const origPushState =
    history.pushState;

  history.pushState =
    function (...args) {
      origPushState.apply(
        this,
        args,
      );

      setTimeout(
        tryInject,
        300,
      );
    };

  window.addEventListener(
    "popstate",
    () =>
      setTimeout(
        tryInject,
        300,
      ),
  );

  tryInject();
})(
  typeof window !== "undefined"
    ? window
    : globalThis,
);
