/**
 * OGS Plus - 채팅/DM 이미지 링크 미리보기
 *
 * 대국 채팅 / 채널 채팅 / DM에서 이미지 URL을 감지하여
 * 안전한 inline <img> 미리보기를 추가한다.
 */

(function (global) {
    "use strict";

    const Utils = global.OGSPlusUtils;

    if (!Utils) {
        console.warn(
            "[OGS Plus] OGSPlusUtils not found."
        );
        return;
    }

    /*
     * OGS 채팅 DOM
     */
    const CHAT_LINE_SELECTOR =
        ".chat-line, .ChatLine";

    /*
     * 이미지 확장자
     */
    const IMAGE_EXT_RE =
        /\.(?:png|jpe?g|gif|webp|bmp|svg|avif|ico)(?:[?#][^\s<>"']*)?$/i;

    /*
     * 이미지 호스트
     */
    const IMAGE_HOST_RE =
        /^(?:https?:\/\/)(?:i\.)?(?:imgur\.com|ibb\.co|prnt\.sc|gyazo\.com)\//i;

    /*
     * URL 추출
     */
    const URL_RE =
        /https?:\/\/[^\s<>"']+/gi;

    /*
     * 이미 처리한 line
     */
    const processedLines =
        new WeakSet();

    /*
     * URL 정리
     */
    function normalizeUrl(url) {
        if (!url) {
            return null;
        }

        let value =
            String(url).trim();

        /*
         * 문장 끝에 붙은 구두점 제거
         */
        value = value.replace(
            /[),.!?;:'"`]+$/g,
            ""
        );

        return value;
    }

    /*
     * 이미지 URL인지 확인
     */
    function looksLikeImageUrl(url) {
        if (!url) {
            return false;
        }

        try {
            const parsed =
                new URL(url);

            if (
                parsed.protocol !== "http:" &&
                parsed.protocol !== "https:"
            ) {
                return false;
            }

            /*
             * 확장자로 판단
             */
            if (
                IMAGE_EXT_RE.test(url)
            ) {
                return true;
            }

            /*
             * 이미지 호스트로 판단
             */
            if (
                IMAGE_HOST_RE.test(url)
            ) {
                return true;
            }

            return false;
        } catch (_) {
            return false;
        }
    }

    /*
     * 채팅 DOM에서 이미지 URL 추출
     */
    function extractCandidateUrls(
        bodyEl
    ) {
        if (!bodyEl) {
            return [];
        }

        const urls =
            new Set();

        /*
         * 1. <a href=""> 검사
         */
        bodyEl
            .querySelectorAll(
                "a[href]"
            )
            .forEach((anchor) => {
                const href =
                    anchor.href;

                if (!href) {
                    return;
                }

                const normalized =
                    normalizeUrl(href);

                if (!normalized) {
                    return;
                }

                if (
                    looksLikeImageUrl(
                        normalized
                    )
                ) {
                    urls.add(
                        normalized
                    );
                }
            });

        /*
         * 2. textContent 검사
         */
        const text =
            bodyEl.textContent || "";

        /*
         * 전역 RegExp의 lastIndex 초기화
         */
        URL_RE.lastIndex = 0;

        let match;

        while (
            (match =
                URL_RE.exec(text)) !== null
        ) {
            const normalized =
                normalizeUrl(match[0]);

            if (!normalized) {
                continue;
            }

            if (
                looksLikeImageUrl(
                    normalized
                )
            ) {
                urls.add(
                    normalized
                );
            }
        }

        return Array.from(urls);
    }

    /*
     * 기존 미리보기 확인
     */
    function hasPreview(
        line,
        url
    ) {
        const previews =
            line.querySelectorAll(
                ".ogsplus-img-preview"
            );

        for (
            const img of previews
        ) {
            if (
                img.dataset
                    .ogsplusUrl === url
            ) {
                return true;
            }

            if (
                img.src === url
            ) {
                return true;
            }
        }

        return false;
    }

    /*
     * Lightbox
     */
    function openLightbox(src) {
        if (!src) {
            return;
        }

        const overlay =
            Utils.createEl(
                "div",
                {
                    class:
                        "ogsplus-img-lightbox",

                    onClick: () => {
                        overlay.remove();
                    },
                },
                [
                    Utils.createEl(
                        "img",
                        {
                            src,
                            referrerpolicy:
                                "no-referrer",
                        }
                    ),
                ]
            );

        document.body.appendChild(
            overlay
        );
    }

    /*
     * 이미지 미리보기 생성
     */
    function buildPreview(url) {
        const wrap =
            Utils.createEl(
                "div",
                {
                    class:
                        "ogsplus-img-preview-wrap",
                }
            );

        const img =
            Utils.createEl(
                "img",
                {
                    class:
                        "ogsplus-img-preview",

                    src: url,

                    loading: "lazy",

                    referrerpolicy:
                        "no-referrer",

                    alt:
                        "Image preview",

                    onClick:
                        (event) => {
                            event.preventDefault();
                            event.stopPropagation();

                            openLightbox(
                                url
                            );
                        },
                }
            );

        /*
         * 중복 방지용 URL
         */
        img.dataset.ogsplusUrl =
            url;

        /*
         * 이미지 로딩 성공
         */
        img.addEventListener(
            "load",
            () => {
                img.classList.add(
                    "ogsplus-img-loaded"
                );

                wrap.classList.add(
                    "ogsplus-img-preview-loaded"
                );
            }
        );

        /*
         * 이미지 로딩 실패
         */
        img.addEventListener(
            "error",
            () => {
                wrap.classList.add(
                    "ogsplus-img-preview-error"
                );

                setTimeout(() => {
                    if (
                        wrap.isConnected
                    ) {
                        wrap.remove();
                    }
                }, 0);
            }
        );

        const badge =
            Utils.createEl(
                "div",
                {
                    class:
                        "ogsplus-img-preview-badge",

                    text:
                        "🖼 OGS Plus preview",
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
        if (!line) {
            return;
        }

        const settings =
            Utils.getCachedSettings();

        /*
         * 설정 확인
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
            line.querySelector(
                ".body"
            ) || line;

        if (!bodyEl) {
            return;
        }

        /*
         * 이미지 URL 추출
         */
        const urls =
            extractCandidateUrls(
                bodyEl
            );

        if (!urls.length) {
            processedLines.add(
                line
            );

            return;
        }

        processedLines.add(
            line
        );

        /*
         * 한 메시지에서 최대 3개
         */
        urls
            .slice(0, 3)
            .forEach((url) => {
                if (!url) {
                    return;
                }

                if (
                    hasPreview(
                        line,
                        url
                    )
                ) {
                    return;
                }

                const preview =
                    buildPreview(
                        url
                    );

                line.appendChild(
                    preview
                );
            });
    }

    /*
     * 전체 채팅 검색
     */
    function scan() {
        document
            .querySelectorAll(
                CHAT_LINE_SELECTOR
            )
            .forEach(
                processLine
            );
    }

    /*
     * debounce
     */
    const debouncedScan =
        Utils.debounce(
            scan,
            150
        );

    /*
     * 동적 채팅 감시
     */
    const observer =
        new MutationObserver(
            (mutations) => {
                let shouldScan =
                    false;

                for (
                    const mutation of mutations
                ) {
                    if (
                        mutation.type !==
                        "childList"
                    ) {
                        continue;
                    }

                    if (
                        mutation.addedNodes &&
                        mutation.addedNodes
                            .length > 0
                    ) {
                        shouldScan =
                            true;

                        break;
                    }
                }

                if (shouldScan) {
                    debouncedScan();
                }
            }
        );

    /*
     * Observer 시작
     */
    function startObserver() {
        if (!document.body) {
            setTimeout(
                startObserver,
                100
            );

            return;
        }

        observer.observe(
            document.body,
            {
                childList: true,
                subtree: true,
            }
        );

        /*
         * 최초 검색
         */
        scan();
    }

    startObserver();

    /*
     * SPA 라우팅 대응
     */
    let lastUrl =
        location.href;

    setInterval(() => {
        if (
            location.href !==
            lastUrl
        ) {
            lastUrl =
                location.href;

            setTimeout(
                scan,
                300
            );

            setTimeout(
                scan,
                1000
            );
        }
    }, 500);

})(
    typeof window !== "undefined"
        ? window
        : globalThis
);
