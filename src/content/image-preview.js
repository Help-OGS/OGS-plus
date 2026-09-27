/** * OGS Plus - 채팅/DM 이미지 링크 미리보기 * * 대국 채팅 / 채널 채팅 / DM에서 이미지 URL을 감지하여 * 안전한 inline <img> 미리보기를 추가한다. * * 개선 사항: * - textContent + <a href> 모두 검사 * - URL 뒤의 ), ], }, ., !, ? 등의 문장부호 제거 * - query string / hash가 붙은 이미지 지원 * - 확장자가 없는 이미지 URL도 <img> 로딩으로 판별 * - SPA / 동적 채팅 추가 대응 * - 같은 채팅에 중복 미리보기 방지 * - 이미지 로딩 실패 시 원본 링크를 보존 */ (function (global) { "use strict"; const Utils = global.OGSPlusUtils; if (!Utils) { console.warn("[OGS Plus] OGSPlusUtils not found."); return; } /* * OGS 채팅 DOM * * 현재 OGS에서 사용되는: * .chat-line * .ChatLine * * 두 가지를 모두 지원한다. */ const CHAT_LINE_SELECTOR = ".chat-line, .ChatLine"; /* * 일반적인 이미지 확장자. * * query string / hash가 뒤에 붙어도 허용한다. * * 예: * image.png * image.png?width=800 * image.png#abc */ const IMAGE_EXT_RE = /\.(?:png|jpe?g|gif|webp|bmp|svg|avif|ico)(?:[?#][^\s<>"']*)?$/i; /* * 흔히 사용하는 이미지 호스트. * * 확장자가 없는 URL을 지원하기 위한 목록이다. */ const IMAGE_HOST_RE = /^(?:https?:\/\/)(?:i\.)?(?:imgur\.com|ibb\.co|prnt\.sc|gyazo\.com)\//i; /* * URL 추출. * * 기존 코드보다 조금 더 넓게 잡는다. */ const URL_RE = /https?:\/\/[^\s<>"']+/gi; /* * 이미 처리한 채팅 line. */ const processedLines = new WeakSet(); /* * 이미 추가한 URL. * * 한 메시지에 같은 URL이 여러 번 등장하는 경우 중복 방지. */ function normalizeUrl(url) { if (!url) return null; let value = String(url).trim(); /* * Markdown / 문장 끝에 붙는 괄호나 구두점 제거. * * 예: * https://example.com/a.png) * https://example.com/a.png]. */ value = value.replace(/[),.!?;:'"`]+$/g, ""); return value; } /* * URL이 이미지일 가능성이 있는지 빠르게 검사. */ function looksLikeImageUrl(url) { if (!url) return false; try { const parsed = new URL(url); if (parsed.protocol !== "http:" && parsed.protocol !== "https:") { return false; } /* * 확장자로 판단 */ if (IMAGE_EXT_RE.test(url)) { return true; } /* * 이미지 호스트로 판단 */ if (IMAGE_HOST_RE.test(url)) { return true; } return false; } catch (_) { return false; } } /* * <a href="">와 일반 textContent 양쪽에서 URL을 찾는다. * * 이 부분이 기존 코드와 가장 큰 차이점이다. */ function extractCandidateUrls(bodyEl) { if (!bodyEl) return []; const urls = new Set(); /* * --------------------------------------------------------- * 1. 실제 <a href=""> 검사 * --------------------------------------------------------- * * OGS가 채팅 URL을 anchor element로 렌더링하는 경우 * textContent만 검사하면 URL 처리 방식에 따라 놓칠 수 있다. */ bodyEl.querySelectorAll("a[href]").forEach((anchor) => { const href = anchor.href; if (!href) return; const normalized = normalizeUrl(href); if (!normalized) return; /* * 확장자/호스트가 명확한 URL은 바로 추가. */ if (looksLikeImageUrl(normalized)) { urls.add(normalized); /**
 * OGS Plus - 채팅/DM 이미지 링크 미리보기
 *
 * 대국 채팅 / 채널 채팅 / DM에서 이미지 URL을 감지하여
 * 안전한 inline <img> 미리보기를 추가한다.
 *
 * 개선 사항:
 * - textContent + <a href> 모두 검사
 * - URL 뒤의 ), ], }, ., !, ? 등의 문장부호 제거
 * - query string / hash가 붙은 이미지 지원
 * - 확장자가 없는 이미지 URL도 <img> 로딩으로 판별
 * - SPA / 동적 채팅 추가 대응
 * - 같은 채팅에 중복 미리보기 방지
 * - 이미지 로딩 실패 시 원본 링크를 보존
 */

(function (global) {
    "use strict";

    const Utils = global.OGSPlusUtils;

    if (!Utils) {
        console.warn("[OGS Plus] OGSPlusUtils not found.");
        return;
    }

    /*
     * OGS 채팅 DOM
     *
     * 현재 OGS에서 사용되는:
     *   .chat-line
     *   .ChatLine
     *
     * 두 가지를 모두 지원한다.
     */
    const CHAT_LINE_SELECTOR = ".chat-line, .ChatLine";

    /*
     * 일반적인 이미지 확장자.
     *
     * query string / hash가 뒤에 붙어도 허용한다.
     *
     * 예:
     *   image.png
     *   image.png?width=800
     *   image.png#abc
     */
    const IMAGE_EXT_RE =
        /\.(?:png|jpe?g|gif|webp|bmp|svg|avif|ico)(?:[?#][^\s<>"']*)?$/i;

    /*
     * 흔히 사용하는 이미지 호스트.
     *
     * 확장자가 없는 URL을 지원하기 위한 목록이다.
     */
    const IMAGE_HOST_RE =
        /^(?:https?:\/\/)(?:i\.)?(?:imgur\.com|ibb\.co|prnt\.sc|gyazo\.com)\//i;

    /*
     * URL 추출.
     *
     * 기존 코드보다 조금 더 넓게 잡는다.
     */
    const URL_RE = /https?:\/\/[^\s<>"']+/gi;

    /*
     * 이미 처리한 채팅 line.
     */
    const processedLines = new WeakSet();

    /*
     * 이미 추가한 URL.
     *
     * 한 메시지에 같은 URL이 여러 번 등장하는 경우 중복 방지.
     */
    function normalizeUrl(url) {
        if (!url) return null;

        let value = String(url).trim();

        /*
         * Markdown / 문장 끝에 붙는 괄호나 구두점 제거.
         *
         * 예:
         * https://example.com/a.png)
         * https://example.com/a.png].
         */
        value = value.replace(/[),.!?;:'"`]+$/g, "");

        return value;
    }

    /*
     * URL이 이미지일 가능성이 있는지 빠르게 검사.
     */
    function looksLikeImageUrl(url) {
        if (!url) return false;

        try {
            const parsed = new URL(url);

            if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
                return false;
            }

            /*
             * 확장자로 판단
             */
            if (IMAGE_EXT_RE.test(url)) {
                return true;
            }

            /*
             * 이미지 호스트로 판단
             */
            if (IMAGE_HOST_RE.test(url)) {
                return true;
            }

            return false;
        } catch (_) {
            return false;
        }
    }

    /*
     * <a href="">와 일반 textContent 양쪽에서 URL을 찾는다.
     *
     * 이 부분이 기존 코드와 가장 큰 차이점이다.
     */
    function extractCandidateUrls(bodyEl) {
        if (!bodyEl) return [];

        const urls = new Set();

        /*
         * ---------------------------------------------------------
         * 1. 실제 <a href=""> 검사
         * ---------------------------------------------------------
         *
         * OGS가 채팅 URL을 anchor element로 렌더링하는 경우
         * textContent만 검사하면 URL 처리 방식에 따라 놓칠 수 있다.
         */
        bodyEl.querySelectorAll("a[href]").forEach((anchor) => {
            const href = anchor.href;

            if (!href) return;

            const normalized = normalizeUrl(href);

            if (!normalized) return;

            /*
             * 확장자/호스트가 명확한 URL은 바로 추가.
             */
            if (looksLikeImageUrl(normalized)) {
                urls.add(normalized);
            }
        });

        /*
         * ---------------------------------------------------------
         * 2. textContent 검사
         * ---------------------------------------------------------
         */
        const text = bodyEl.textContent || "";

        let match;

        while ((match = URL_RE.exec(text)) !== null) {
            const normalized = normalizeUrl(match[0]);

            if (!normalized) continue;

            if (looksLikeImageUrl(normalized)) {
                urls.add(normalized);
            }
        }

        return Array.from(urls);
    }

    /*
     * 기존 미리보기가 이미 존재하는지 검사한다.
     */
    function hasPreview(line, url) {
        const previews = line.querySelectorAll(
            ".ogsplus-img-preview"
        );

        for (const img of previews) {
            if (img.dataset.ogsplusUrl === url) {
                return true;
            }

            if (img.src === url) {
                return true;
            }
        }

        return false;
    }

    /*
     * Lightbox
     */
    function openLightbox(src) {
        if (!src) return;

        const overlay = Utils.createEl(
            "div",
            {
                class: "ogsplus-img-lightbox",

                onClick: () => {
                    overlay.remove();
                },
            },
            [
                Utils.createEl("img", {
                    src,
                    referrerpolicy: "no-referrer",
                }),
            ]
        );

        document.body.appendChild(overlay);
    }

    /*
     * 이미지 미리보기 생성
     */
    function buildPreview(url) {
        const wrap = Utils.createEl(
            "div",
            {
                class: "ogsplus-img-preview-wrap",
            }
        );

        const img = Utils.createEl(
            "img",
            {
                class: "ogsplus-img-preview",

                src: url,

                loading: "lazy",

                referrerpolicy: "no-referrer",

                alt: "Image preview",

                onClick: (event) => {
                    event.preventDefault();
                    event.stopPropagation();

                    openLightbox(url);
                },
            }
        );

        /*
         * 중복 방지용 URL 저장.
         */
        img.dataset.ogsplusUrl = url;

        /*
         * 로딩 성공.
         *
         * 혹시 CSS에서 display:none 등이 걸린 경우
         * 정상 표시되도록 한다.
         */
        img.addEventListener("load", () => {
            img.classList.add("ogsplus-img-loaded");
            wrap.classList.add("ogsplus-img-preview-loaded");
        });

        /*
         * 이미지 로딩 실패.
         *
         * 기존 코드는 wrap 전체를 삭제했는데,
         * 그러면 문제 원인을 확인하기가 어렵고 원본 링크와
         * 충돌할 수 있다.
         *
         * 따라서 미리보기만 숨기고 원본 채팅 링크는 유지한다.
         */
        img.addEventListener("error", () => {
            wrap.classList.add("ogsplus-img-preview-error");

            /*
             * 이미지가 로딩되지 않는 경우
             * 미리보기 UI 자체는 제거한다.
             */
            setTimeout(() => {
                if (wrap.isConnected) {
                    wrap.remove();
                }
            }, 0);
        });

        const badge = Utils.createEl(
            "div",
            {
                class: "ogsplus-img-preview-badge",

                text: "🖼 OGS Plus preview",
            }
        );

        wrap.appendChild(img);
        wrap.appendChild(badge);

        return wrap;
    }

    /*
     * 채팅 한 줄 처리
     */
    function processLine(line) {
        if (!line) return;

        const settings = Utils.getCachedSettings();

        /*
         * 설정이 아직 준비되지 않은 경우에는
         * processedLines에 넣지 않는다.
         *
         * 기존 코드처럼 여기서 return 후 영구적으로
         * 처리되지 않는 문제를 방지한다.
         */
        if (
            !settings ||
            !settings.masterEnabled ||
            !settings.features ||
            !settings.features.imagePreview
        ) {
            return;
        }

        const bodyEl =
            line.querySelector(".body") ||
            line;

        if (!bodyEl) return;

        /*
         * 기존 코드:
         *
         * const text = bodyEl.textContent || "";
         * extractImageUrls(text);
         *
         * 변경:
         * DOM 자체를 전달하여 <a href>까지 검사한다.
         */
        const urls = extractCandidateUrls(bodyEl);

        if (urls.length === 0) {
            /*
             * URL이 없는 line은 처리 완료로 표시한다.
             */
            processedLines.add(line);
            return;
        }

        /*
         * 이미 처리된 line이어도 새로운 URL이 추가될 수 있으므로
         * 여기서는 단순히 return하지 않는다.
         */
        processedLines.add(line);

        /*
         * 최대 3개.
         */
        urls.slice(0, 3).forEach((url) => {
            if (!url) return;

            /*
             * 같은 URL의 미리보기가 이미 있다면 추가하지 않는다.
             */
            if (hasPreview(line, url)) {
                return;
            }

            const preview = buildPreview(url);

            line.appendChild(preview);
        });
    }

    /*
     * 전체 채팅 검색
     */
    function scan() {
        document
            .querySelectorAll(CHAT_LINE_SELECTOR)
            .forEach(processLine);
    }

    /*
     * debounce.
     */
    const debouncedScan = Utils.debounce(scan, 150);

    /*
     * OGS는 SPA이므로 채팅이 동적으로 생성된다.
     *
     * body 전체의 childList/subtree 변경을 감시한다.
     */
    const observer = new MutationObserver((mutations) => {
        let shouldScan = false;

        for (const mutation of mutations) {
            if (mutation.type !== "childList") continue;

            /*
             * 실제 DOM 추가가 있는 경우에만 scan.
             */
            if (
                mutation.addedNodes &&
                mutation.addedNodes.length > 0
            ) {
                shouldScan = true;
                break;
            }
        }

        if (shouldScan) {
            debouncedScan();
        }
    });

    /*
     * document.body가 아직 만들어지지 않은 경우 대비.
     */
    function startObserver() {
        if (!document.body) {
            setTimeout(startObserver, 100);
            return;
        }

        observer.observe(document.body, {
            childList: true,
            subtree: true,
        });

        /*
         * 최초 scan.
         */
        scan();
    }

    startObserver();

    /*
     * SPA 페이지 이동 대응.
     *
     * OGS는 React 기반 SPA이므로 URL이 바뀌어도
     * document 자체가 새로 만들어지지 않는다.
     */
    let lastUrl = location.href;

    setInterval(() => {
        if (location.href !== lastUrl) {
            lastUrl = location.href;

            /*
             * 페이지 전환 후 DOM 생성 시간을 조금 기다린다.
             */
            setTimeout(scan, 300);
            setTimeout(scan, 1000);
        }
    }, 500);

})(typeof window !== "undefined" ? window : globalThis); }); /* * --------------------------------------------------------- * 2. textContent 검사 * --------------------------------------------------------- */ const text = bodyEl.textContent || ""; let match; while ((match = URL_RE.exec(text)) !== null) { const normalized = normalizeUrl(match[0]); if (!normalized) continue; if (looksLikeImageUrl(normalized)) { urls.add(normalized); } } return Array.from(urls); } /* * 기존 미리보기가 이미 존재하는지 검사한다. */ function hasPreview(line, url) { const previews = line.querySelectorAll( ".ogsplus-img-preview" ); for (const img of previews) { if (img.dataset.ogsplusUrl === url) { return true; } if (img.src === url) { return true; } } return false; } /* * Lightbox */ function openLightbox(src) { if (!src) return; const overlay = Utils.createEl( "div", { class: "ogsplus-img-lightbox", onClick: () => { overlay.remove(); }, }, [ Utils.createEl("img", { src, referrerpolicy: "no-referrer", }), ] ); document.body.appendChild(overlay); } /* * 이미지 미리보기 생성 */ function buildPreview(url) { const wrap = Utils.createEl( "div", { class: "ogsplus-img-preview-wrap", } ); const img = Utils.createEl( "img", { class: "ogsplus-img-preview", src: url, loading: "lazy", referrerpolicy: "no-referrer", alt: "Image preview", onClick: (event) => { event.preventDefault(); event.stopPropagation(); openLightbox(url); }, } ); /* * 중복 방지용 URL 저장. */ img.dataset.ogsplusUrl = url; /* * 로딩 성공. * * 혹시 CSS에서 display:none 등이 걸린 경우 * 정상 표시되도록 한다. */ img.addEventListener("load", () => { img.classList.add("ogsplus-img-loaded"); wrap.classList.add("ogsplus-img-preview-loaded"); }); /* * 이미지 로딩 실패. * * 기존 코드는 wrap 전체를 삭제했는데, * 그러면 문제 원인을 확인하기가 어렵고 원본 링크와 * 충돌할 수 있다. * * 따라서 미리보기만 숨기고 원본 채팅 링크는 유지한다. */ img.addEventListener("error", () => { wrap.classList.add("ogsplus-img-preview-error"); /* * 이미지가 로딩되지 않는 경우 * 미리보기 UI 자체는 제거한다. */ setTimeout(() => { if (wrap.isConnected) { wrap.remove(); } }, 0); }); const badge = Utils.createEl( "div", { class: "ogsplus-img-preview-badge", text: "🖼 OGS Plus preview", } ); wrap.appendChild(img); wrap.appendChild(badge); return wrap; } /* * 채팅 한 줄 처리 */ function processLine(line) { if (!line) return; const settings = Utils.getCachedSettings(); /* * 설정이 아직 준비되지 않은 경우에는 * processedLines에 넣지 않는다. * * 기존 코드처럼 여기서 return 후 영구적으로 * 처리되지 않는 문제를 방지한다. */ if ( !settings || !settings.masterEnabled || !settings.features || !settings.features.imagePreview ) { return; } const bodyEl = line.querySelector(".body") || line; if (!bodyEl) return; /* * 기존 코드: * * const text = bodyEl.textContent || ""; * extractImageUrls(text); * * 변경: * DOM 자체를 전달하여 <a href>까지 검사한다. */ const urls = extractCandidateUrls(bodyEl); if (urls.length === 0) { /* * URL이 없는 line은 처리 완료로 표시한다. */ processedLines.add(line); return; } /* * 이미 처리된 line이어도 새로운 URL이 추가될 수 있으므로 * 여기서는 단순히 return하지 않는다. */ processedLines.add(line); /* * 최대 3개. */ urls.slice(0, 3).forEach((url) => { if (!url) return; /* * 같은 URL의 미리보기가 이미 있다면 추가하지 않는다. */ if (hasPreview(line, url)) { return; } const preview = buildPreview(url); line.appendChild(preview); }); } /* * 전체 채팅 검색 */ function scan() { document .querySelectorAll(CHAT_LINE_SELECTOR) .forEach(processLine); } /* * debounce. */ const debouncedScan = Utils.debounce(scan, 150); /* * OGS는 SPA이므로 채팅이 동적으로 생성된다. * * body 전체의 childList/subtree 변경을 감시한다. */ const observer = new MutationObserver((mutations) => { let shouldScan = false; for (const mutation of mutations) { if (mutation.type !== "childList") continue; /* * 실제 DOM 추가가 있는 경우에만 scan. */ if ( mutation.addedNodes && mutation.addedNodes.length > 0 ) { shouldScan = true; break; } } if (shouldScan) { debouncedScan(); } }); /* * document.body가 아직 만들어지지 않은 경우 대비. */ function startObserver() { if (!document.body) { setTimeout(startObserver, 100); return; } observer.observe(document.body, { childList: true, subtree: true, }); /* * 최초 scan. */ scan(); } startObserver(); /* * SPA 페이지 이동 대응. * * OGS는 React 기반 SPA이므로 URL이 바뀌어도 * document 자체가 새로 만들어지지 않는다. */ let lastUrl = location.href; setInterval(() => { if (location.href !== lastUrl) { lastUrl = location.href; /* * 페이지 전환 후 DOM 생성 시간을 조금 기다린다. */ setTimeout(scan, 300); setTimeout(scan, 1000); } }, 500); })(typeof window !== "undefined" ? window : globalThis); 
