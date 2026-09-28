/**
 * OGS Plus - SGF Library uploader
 *
 * OGS 대국을 SGF로 받아 현재 Library collection에 업로드
 */

(function (global) {
  "use strict";

  const Utils = global.OGSPlusUtils;
  const Toast = global.OGSPlusToast;

  const BUTTON_ID = "ogsplus-sgf-upload-btn";

  function getRouteParams() {
    const m = window.location.pathname.match(
      /\/library\/(\d+)\/(\d+)/
    );

    if (!m) {
      return null;
    }

    return {
      playerId: Number(m[1]),
      collectionId: Number(m[2]),
    };
  }

  function getCookie(name) {
    const cookies = document.cookie.split(";");

    for (const cookie of cookies) {
      const [key, ...value] = cookie.trim().split("=");

      if (key === name) {
        return decodeURIComponent(value.join("="));
      }
    }

    return "";
  }

  /**
   * OGS API에 직접 요청한다.
   *
   * Utils.apiFetch를 사용하지 않는 이유:
   * SGF upload는 multipart/form-data이고
   * CSRF/session 처리를 확실하게 하기 위해
   * 여기서 직접 관리한다.
   */
  async function ogsFetch(path, options = {}) {
    const url = path.startsWith("http")
      ? path
      : `${window.location.origin}/api/v1/${path}`;

    const method = (
      options.method || "GET"
    ).toUpperCase();

    const headers = {
      Accept: "application/json, text/plain, */*",
      ...(options.headers || {}),
    };

    if (
      !["GET", "HEAD", "OPTIONS", "TRACE"].includes(
        method
      )
    ) {
      const csrfToken = getCookie("csrftoken");

      if (csrfToken) {
        headers["X-CSRFToken"] = csrfToken;
      }

      headers["X-Requested-With"] = "XMLHttpRequest";
    }

    /*
     * 중요:
     * FormData일 때 Content-Type을 직접 넣지 않는다.
     *
     * 브라우저가
     *
     * multipart/form-data; boundary=----...
     *
     * 를 자동으로 넣어야 한다.
     */
    if (options.body instanceof FormData) {
      delete headers["Content-Type"];
    }

    console.log(
      "[OGS Plus] API request:",
      method,
      url
    );

    const response = await fetch(url, {
      ...options,
      credentials: "include",
      headers,
    });

    const contentType =
      response.headers.get("content-type") || "";

    const text = await response.text();

    console.log(
      "[OGS Plus] API response:",
      response.status,
      contentType,
      text.slice(0, 1000)
    );

    if (!response.ok) {
      throw new Error(
        `HTTP ${response.status}: ${
          text || response.statusText
        }`
      );
    }

    return {
      status: response.status,
      contentType,
      text,
    };
  }

  /**
   * SGF 다운로드
   */
  async function getGameSgf(gameId) {
    const response = await ogsFetch(
      `games/${gameId}/sgf`,
      {
        method: "GET",
        headers: {
          Accept:
            "application/x-go-sgf, text/plain, */*",
        },
      }
    );

    let sgf = response.text;

    /*
     * BOM 제거
     */
    sgf = sgf.replace(/^\uFEFF/, "").trim();

    /*
     * 혹시 JSON 문자열로 온 경우 처리
     */
    if (
      sgf.startsWith('"') &&
      sgf.endsWith('"')
    ) {
      try {
        const parsed = JSON.parse(sgf);

        if (typeof parsed === "string") {
          sgf = parsed.trim();
        }
      } catch (e) {
        // 그냥 원본 사용
      }
    }

    if (!sgf) {
      throw new Error(
        "OGS에서 SGF 데이터가 비어 있습니다."
      );
    }

    /*
     * 정상적인 SGF는 게임 트리 "("로 시작한다.
     */
    if (!sgf.startsWith("(")) {
      console.error(
        "[OGS Plus] SGF가 아님:",
        sgf
      );

      throw new Error(
        "OGS가 SGF 대신 다른 데이터를 반환했습니다."
      );
    }

    return sgf;
  }

  /**
   * SGF를 File 객체로 변환
   */
  function makeFile(sgf, gameId) {
    const blob = new Blob(
      [sgf],
      {
        type: "application/x-go-sgf",
      }
    );

    return new File(
      [blob],
      `game-${gameId}.sgf`,
      {
        type: "application/x-go-sgf",
        lastModified: Date.now(),
      }
    );
  }

  /**
   * SGF 업로드
   */
  async function uploadSgf(
    file,
    collectionId
  ) {
    const formData = new FormData();

    /*
     * OGS가 요구하는 정확한 field 이름
     */
    formData.append(
      "file",
      file,
      file.name
    );

    /*
     * 디버깅용
     */
    console.log(
      "[OGS Plus] FormData:",
      {
        filename: file.name,
        size: file.size,
        type: file.type,
        collectionId,
      }
    );

    return ogsFetch(
      `me/games/sgf/${collectionId}`,
      {
        method: "POST",
        body: formData,
      }
    );
  }

  /**
   * 게임 검색
   */
  async function searchGames(
    query,
    mode
  ) {
    const currentUserId =
      Utils.getCurrentUserId();

    query = query.trim();

    /*
     * 게임 ID 직접 입력
     */
    if (/^\d+$/.test(query)) {
      try {
        const response =
          await Utils.apiFetch(
            `games/${query}`
          );

        return [response];
      } catch (e) {
        console.error(
          "[OGS Plus] game lookup failed",
          e
        );

        return [];
      }
    }

    /*
     * 내 대국
     */
    if (
      mode === "mine" &&
      currentUserId
    ) {
      try {
        const data =
          await Utils.apiFetch(
            `players/${currentUserId}/game_history/?page_size=15`
          );

        const games =
          data.results || [];

        if (!query) {
          return games;
        }

        const q =
          query.toLowerCase();

        return games.filter((game) => {
          const black =
            game.players?.black?.username ||
            "";

          const white =
            game.players?.white?.username ||
            "";

          return (
            black
              .toLowerCase()
              .includes(q) ||
            white
              .toLowerCase()
              .includes(q)
          );
        });
      } catch (e) {
        console.error(
          "[OGS Plus] game history failed",
          e
        );

        return [];
      }
    }

    /*
     * 다른 플레이어
     */
    if (
      mode === "other" &&
      query
    ) {
      try {
        const players =
          await Utils.apiFetch(
            `players/?username__istartswith=${encodeURIComponent(
              query
            )}`
          );

        const player =
          (players.results || [])[0];

        if (!player) {
          return [];
        }

        const games =
          await Utils.apiFetch(
            `players/${player.id}/game_history/?page_size=15`
          );

        return games.results || [];
      } catch (e) {
        console.error(
          "[OGS Plus] player game history failed",
          e
        );

        return [];
      }
    }

    return [];
  }

  function gameLabel(game) {
    const black =
      game.players?.black?.username ||
      game.black?.username ||
      "?";

    const white =
      game.players?.white?.username ||
      game.white?.username ||
      "?";

    return `#${game.id} — ${black} vs ${white}`;
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
        }
      );

    const searchInput =
      Utils.createEl(
        "input",
        {
          type: "text",
          placeholder:
            Utils.t(
              "sgf.searchPlaceholder"
            ),
        }
      );

    const modal =
      Utils.createEl(
        "div",
        {
          class:
            "ogsplus-modal-backdrop",
        }
      );

    const modalBox =
      Utils.createEl(
        "div",
        {
          class:
            "ogsplus-modal",
        }
      );

    const tabs =
      Utils.createEl(
        "div",
        {
          class:
            "ogsplus-tabs",
        }
      );

    const tabMine =
      Utils.createEl(
        "div",
        {
          class:
            "ogsplus-tab active",
          text:
            Utils.t(
              "sgf.pickMine"
            ),
        }
      );

    const tabOther =
      Utils.createEl(
        "div",
        {
          class:
            "ogsplus-tab",
          text:
            Utils.t(
              "sgf.pickOther"
            ),
        }
      );

    tabs.appendChild(tabMine);
    tabs.appendChild(tabOther);

    async function search() {
      resultsList.innerHTML =
        "";

      selectedGame = null;

      const games =
        await searchGames(
          searchInput.value,
          mode
        );

      if (!games.length) {
        resultsList.appendChild(
          Utils.createEl(
            "div",
            {
              class:
                "ogsplus-game-list-item",
              text:
                "대국을 찾을 수 없습니다.",
            }
          )
        );

        return;
      }

      for (const game of games) {
        const item =
          Utils.createEl(
            "div",
            {
              class:
                "ogsplus-game-list-item",
              text:
                gameLabel(game),
            }
          );

        item.addEventListener(
          "click",
          () => {
            resultsList
              .querySelectorAll(
                ".ogsplus-game-list-item"
              )
              .forEach((el) =>
                el.classList.remove(
                  "selected"
                )
              );

            item.classList.add(
              "selected"
            );

            selectedGame =
              game;
          }
        );

        resultsList.appendChild(
          item
        );
      }
    }

    tabMine.addEventListener(
      "click",
      () => {
        mode = "mine";

        tabMine.classList.add(
          "active"
        );

        tabOther.classList.remove(
          "active"
        );

        search();
      }
    );

    tabOther.addEventListener(
      "click",
      () => {
        mode = "other";

        tabOther.classList.add(
          "active"
        );

        tabMine.classList.remove(
          "active"
        );

        search();
      }
    );

    searchInput.addEventListener(
      "input",
      Utils.debounce(
        search,
        400
      )
    );

    const uploadButton =
      Utils.createEl(
        "button",
        {
          class:
            "ogsplus-btn primary",
          text:
            Utils.t(
              "sgf.upload"
            ),
        }
      );

    const cancelButton =
      Utils.createEl(
        "button",
        {
          class:
            "ogsplus-btn",
          text: "취소",
        }
      );

    cancelButton.addEventListener(
      "click",
      () => modal.remove()
    );

    uploadButton.addEventListener(
      "click",
      async () => {
        if (!selectedGame) {
          Toast.showToast(
            "대국을 선택하세요.",
            "error"
          );

          return;
        }

        uploadButton.disabled =
          true;

        uploadButton.textContent =
          "업로드 중...";

        try {
          console.log(
            "[OGS Plus] ========================="
          );

          console.log(
            "[OGS Plus] Upload start"
          );

          console.log(
            "[OGS Plus] Game:",
            selectedGame.id
          );

          console.log(
            "[OGS Plus] Collection:",
            collectionId
          );

          console.log(
            "[OGS Plus] csrftoken exists:",
            Boolean(
              getCookie(
                "csrftoken"
              )
            )
          );

          /*
           * 1. SGF 가져오기
           */
          const sgf =
            await getGameSgf(
              selectedGame.id
            );

          console.log(
            "[OGS Plus] SGF length:",
            sgf.length
          );

          /*
           * 2. File 생성
           */
          const file =
            makeFile(
              sgf,
              selectedGame.id
            );

          /*
           * 3. 업로드
           */
          const response =
            await uploadSgf(
              file,
              collectionId
            );

          console.log(
            "[OGS Plus] Upload successful:",
            response
          );

          Toast.showToast(
            "SGF 업로드 성공!",
            "success"
          );

          modal.remove();

          setTimeout(
            () =>
              window.location.reload(),
            800
          );
        } catch (error) {
          console.error(
            "[OGS Plus] ========================="
          );

          console.error(
            "[OGS Plus] SGF upload ERROR:",
            error
          );

          console.error(
            "[OGS Plus] ========================="
          );

          Toast.showToast(
            `업로드 실패: ${
              error.message ||
              error
            }`,
            "error"
          );
        } finally {
          uploadButton.disabled =
            false;

          uploadButton.textContent =
            Utils.t(
              "sgf.upload"
            );
        }
      }
    );

    modal.addEventListener(
      "click",
      (event) => {
        if (
          event.target === modal
        ) {
          modal.remove();
        }
      }
    );

    modalBox.appendChild(
      Utils.createEl(
        "h3",
        {
          text:
            `🎮 ${Utils.t(
              "sgf.uploadButton"
            )}`,
        }
      )
    );

    modalBox.appendChild(
      tabs
    );

    modalBox.appendChild(
      searchInput
    );

    modalBox.appendChild(
      resultsList
    );

    const actions =
      Utils.createEl(
        "div",
        {
          class:
            "ogsplus-modal-actions",
        }
      );

    actions.appendChild(
      cancelButton
    );

    actions.appendChild(
      uploadButton
    );

    modalBox.appendChild(
      actions
    );

    modal.appendChild(
      modalBox
    );

    document.body.appendChild(
      modal
    );

    search();

    return modal;
  }

  function injectButton(
    container,
    collectionId
  ) {
    if (
      document.getElementById(
        BUTTON_ID
      )
    ) {
      return;
    }

    const button =
      Utils.createEl(
        "button",
        {
          id: BUTTON_ID,
          class:
            "ogsplus-sgf-btn",
          text:
            `🎮 ${Utils.t(
              "sgf.uploadButton"
            )}`,
        }
      );

    button.addEventListener(
      "click",
      () =>
        buildModal(
          collectionId
        )
    );

    container.prepend(
      button
    );
  }

  function tryInject() {
    const settings =
      Utils.getCachedSettings();

    if (
      !settings.masterEnabled ||
      !settings.features?.sgfOgsUpload
    ) {
      return;
    }

    const params =
      getRouteParams();

    if (!params) {
      return;
    }

    const container =
      document.querySelector(
        ".LibraryPlayer .controls-right"
      );

    if (container) {
      injectButton(
        container,
        params.collectionId
      );
    }
  }

  Utils.watchElements(
    ".LibraryPlayer .controls-right",
    tryInject
  );

  const originalPushState =
    history.pushState;

  history.pushState =
    function (...args) {
      originalPushState.apply(
        this,
        args
      );

      setTimeout(
        tryInject,
        300
      );
    };

  window.addEventListener(
    "popstate",
    () => {
      setTimeout(
        tryInject,
        300
      );
    }
  );

  tryInject();
})(
  typeof window !== "undefined"
    ? window
    : globalThis
);
