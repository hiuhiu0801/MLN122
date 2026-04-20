import React, {
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import HTMLFlipBook from "react-pageflip";

const PAGE_RATIO = 1.5;
const AUDIO_END_OFFSETS_MS = [
  0, // cover_start
  0,    // page1
  4200, // page2
  0,    // page3
  4750, // page4
  0,    // page5
  4050, // page6
  0,    // page7
  3700, // page8
  0,    // page9
  4000, // page10
  0,    // page11
  4100, // page12
  0,    // cover_end = page13.mp3
];

const DEFAULT_PAGES = [
  { src: "/pages/cover_start.png", alt: "Bìa truyện", type: "cover" },
  { src: "/pages/1.png", alt: "Trang 1" },
  { src: "/pages/2.png", alt: "Trang 2" },
  { src: "/pages/3.png", alt: "Trang 3" },
  { src: "/pages/4.png", alt: "Trang 4" },
  { src: "/pages/5.png", alt: "Trang 5" },
  { src: "/pages/6.png", alt: "Trang 6" },
  { src: "/pages/7.png", alt: "Trang 7" },
  { src: "/pages/8.png", alt: "Trang 8" },
  { src: "/pages/9.png", alt: "Trang 9" },
  { src: "/pages/10.png", alt: "Trang 10" },
  { src: "/pages/11.png", alt: "Trang 11" },
  { src: "/pages/12.png", alt: "Trang 12" },
  { src: "/pages/cover_end.png", alt: "Bìa sau", type: "cover" },
];

const DEFAULT_STORY_TEXTS = [
  "Flipbook mở đầu cho hành trình khám phá ba quy luật cơ bản của phép biện chứng duy vật qua câu chuyện trực quan và dễ ghi nhớ.",
  "Minh và Lan cùng bắt đầu một dự án học tập, từ đó mở ra những khác biệt trong cách tiếp cận tri thức và hành động.",
  "Sự đối lập giữa hai cách làm dần xuất hiện, tạo nên động lực phát triển và thay đổi trong nhận thức.",
  "Mỗi lựa chọn nhỏ tích lũy theo thời gian đều chuẩn bị cho một bước chuyển lớn hơn về chất.",
  "Những biểu hiện bề ngoài có thể gây ấn tượng ban đầu, nhưng chiều sâu nội dung mới quyết định giá trị bền vững.",
  "Quá trình va chạm giữa các mặt khác nhau làm nảy sinh thay đổi, đúng tinh thần quy luật mâu thuẫn.",
  "Sự kiên trì tích lũy từng yếu tố nhỏ cho thấy quy luật lượng – chất đang âm thầm vận động.",
  "Mỗi điều chỉnh sau va vấp không phải mất mát đơn thuần, mà là một lần vượt bỏ để tiến lên trình độ mới.",
  "Đến giai đoạn then chốt, sự khác biệt tích lũy đủ nhiều sẽ chuyển thành kết quả rõ rệt.",
  "Khả năng chỉ thành hiện thực khi được nuôi dưỡng bằng hành động và phương pháp đúng đắn.",
  "Thành công hay thất bại đều gắn với nguyên nhân sâu xa, không chỉ do ngẫu nhiên trước mắt.",
  "Sự trưởng thành đến từ việc biết dung hòa, kế thừa và vượt lên, thay vì phủ định sạch trơn.",
  "Câu chuyện khép lại bằng một bước phát triển mới, nơi cái mới hình thành trên cơ sở chọn lọc từ cái cũ.",
  "Flipbook kết thúc, nhưng ba quy luật cơ bản vẫn tiếp tục hiện diện trong học tập, tư duy và đời sống hằng ngày.",
];

const DEFAULT_AUDIO_FILES = [
  "/audio/page0.mp3",
  "/audio/page1.mp3",
  "/audio/page2.mp3",
  "/audio/page3.mp3",
  "/audio/page4.mp3",
  "/audio/page5.mp3",
  "/audio/page6.mp3",
  "/audio/page7.mp3",
  "/audio/page8.mp3",
  "/audio/page9.mp3",
  "/audio/page10.mp3",
  "/audio/page11.mp3",
  "/audio/page12.mp3",
  "/audio/page13.mp3",
];

const FlipBook = React.forwardRef((props = {}, ref) => {
  const {
    audioRef: externalAudioRef,
    audioFiles: externalAudioFiles,
    setIsPlaying,
    setIsAudioAutoPlay,
  } = props;

  const flipBookRef = useRef(null);
  const containerRef = useRef(null);
  const internalAudioRef = useRef(null);
  const autoPlayTimeoutRef = useRef(null);

  const [isAutoPlay, setIsAutoPlay] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [bookSize, setBookSize] = useState({ width: 380, height: 570 });

  const pages = useMemo(() => DEFAULT_PAGES, []);
  const storyTexts = useMemo(() => DEFAULT_STORY_TEXTS, []);
  const audioFiles = useMemo(() => {
    if (Array.isArray(externalAudioFiles) && externalAudioFiles.length > 0) {
      return externalAudioFiles;
    }
    return DEFAULT_AUDIO_FILES;
  }, [externalAudioFiles]);

  const activeAudioRef = externalAudioRef?.current
    ? externalAudioRef
    : internalAudioRef;

  const clearAutoPlayTimer = () => {
    if (autoPlayTimeoutRef.current) {
      clearTimeout(autoPlayTimeoutRef.current);
      autoPlayTimeoutRef.current = null;
    }
  };

  const stopAudio = () => {
    const audio = activeAudioRef?.current;
    if (!audio) return;
    audio.pause();
    audio.currentTime = 0;
    setIsPlaying?.(false);
  };

const getFlipDelayFromAudio = (audio, pageIndex) => {
  if (!audio || !Number.isFinite(audio.duration) || audio.duration <= 0) {
    return 2500;
  }

  const endOffset = AUDIO_END_OFFSETS_MS[pageIndex] ?? 0;
  const delay = Math.floor(audio.duration * 1000) - endOffset;

  return Math.max(delay, 100);
};

  const waitForAudioMetadata = (audio) =>
    new Promise((resolve) => {
      if (!audio) {
        resolve();
        return;
      }

      if (Number.isFinite(audio.duration) && audio.duration > 0) {
        resolve();
        return;
      }

      const handleLoaded = () => {
        cleanup();
        resolve();
      };

      const handleError = () => {
        cleanup();
        resolve();
      };

      const cleanup = () => {
        audio.removeEventListener("loadedmetadata", handleLoaded);
        audio.removeEventListener("canplaythrough", handleLoaded);
        audio.removeEventListener("error", handleError);
      };

      audio.addEventListener("loadedmetadata", handleLoaded, { once: true });
      audio.addEventListener("canplaythrough", handleLoaded, { once: true });
      audio.addEventListener("error", handleError, { once: true });
    });

const scheduleNextFlip = (delayMs, pageIndex) => {
  clearAutoPlayTimer();

  if (pageIndex >= pages.length - 1) return;

  autoPlayTimeoutRef.current = setTimeout(() => {
    flipBookRef.current?.pageFlip()?.flipNext();
  }, delayMs);
};

  const playAudioForPage = async (pageIndex) => {
    const audio = activeAudioRef?.current;
    const file = audioFiles?.[pageIndex];

    if (!audio || !file) {
      setIsPlaying?.(false);
      return { ok: false, delayMs: 2500 };
    }

    try {
      audio.pause();
      audio.currentTime = 0;
      audio.src = file;
      audio.load();

      await waitForAudioMetadata(audio);
      const delayMs = getFlipDelayFromAudio(audio, pageIndex);

      await audio.play();
      setIsPlaying?.(true);

      return { ok: true, delayMs };
    } catch (error) {
      console.warn("Audio play blocked or failed:", error);
      setIsPlaying?.(false);
      return { ok: false, delayMs: 2500 };
    }
  };

  const goPrev = () => flipBookRef.current?.pageFlip()?.flipPrev();
  const goNext = () => flipBookRef.current?.pageFlip()?.flipNext();
  const goStart = () => flipBookRef.current?.pageFlip()?.flip(0);

  const toggleFullscreen = async () => {
    if (!containerRef.current) return;

    try {
      if (!document.fullscreenElement) {
        await containerRef.current.requestFullscreen?.();
      } else {
        await document.exitFullscreen?.();
      }
    } catch (error) {
      console.warn("Fullscreen failed:", error);
    }
  };

const startAutoPlay = async () => {
  setIsAudioAutoPlay?.(true);
  setIsAutoPlay(true);

  const pageIndex = currentPage;
  const result = await playAudioForPage(pageIndex);

  if (pageIndex < pages.length - 1) {
    scheduleNextFlip(result.delayMs, pageIndex);
  } else {
    clearAutoPlayTimer();
    autoPlayTimeoutRef.current = setTimeout(() => {
      stopAutoPlay();
    }, Math.max(result?.delayMs ?? 0, 100));
  }
};

  const stopAutoPlay = () => {
    setIsAudioAutoPlay?.(false);
    setIsAutoPlay(false);
    clearAutoPlayTimer();
    stopAudio();
  };

  useImperativeHandle(ref, () => ({
    pageFlip: () => ({
      flipNext: () => flipBookRef.current?.pageFlip()?.flipNext(),
      flipPrev: () => flipBookRef.current?.pageFlip()?.flipPrev(),
      flip: (page) => flipBookRef.current?.pageFlip()?.flip(page),
    }),
    toggleAutoPlay: async () => {
      if (isAutoPlay) {
        stopAutoPlay();
      } else {
        await startAutoPlay();
      }
    },
    startAutoPlay,
    stopAutoPlay,
    toggleFullscreen,
    getCurrentPage: () => currentPage,
    getTotalPages: () => pages.length,
    getCurrentStoryText: () => storyTexts[currentPage] || "",
  }));

  useEffect(() => {
    const updateSize = () => {
      const viewportWidth = window.innerWidth;
      const containerWidth = containerRef.current?.clientWidth || viewportWidth;

      const availableWidth = isFullscreen
        ? Math.min(viewportWidth - 120, 1100)
        : Math.min(containerWidth - 32, 980);

      const pageWidth = Math.max(
        160,
        Math.min(availableWidth / 2, isFullscreen ? 420 : 380)
      );
      const pageHeight = Math.round(pageWidth * PAGE_RATIO);

      setBookSize({ width: pageWidth, height: pageHeight });
    };

    updateSize();
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, [isFullscreen]);

  useEffect(() => {
    const handleFullscreenChange = () =>
      setIsFullscreen(Boolean(document.fullscreenElement));

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () =>
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  useEffect(() => {
    return () => {
      clearAutoPlayTimer();
      stopAudio();
    };
  }, []);

const handleFlip = async (e) => {
  const nextPage = e?.data ?? 0;
  setCurrentPage(nextPage);

  if (!isAutoPlay) return;

  const result = await playAudioForPage(nextPage);

  if (nextPage >= pages.length - 1) {
    clearAutoPlayTimer();
    autoPlayTimeoutRef.current = setTimeout(() => {
      stopAutoPlay();
    }, Math.max(result?.delayMs ?? 0, 100));
    return;
  }

  scheduleNextFlip(result.delayMs, nextPage);
};

  const handleManualPlayCurrent = async () => {
    await playAudioForPage(currentPage);
  };

  return (
    <div
      ref={containerRef}
      className={`flipbook-shell ${isFullscreen ? "fullscreen-active" : ""}`}
    >
      {!externalAudioRef && <audio ref={internalAudioRef} preload="auto" />}

      <style>{`
        .flipbook-shell {
          width: 100%;
          max-width: 1180px;
          margin: 0 auto;
          padding: 28px;
          border-radius: 32px;
          border: 1px solid rgba(37, 99, 235, 0.08);
          background:
            linear-gradient(180deg, rgba(255,255,255,0.96), rgba(248,250,252,0.94));
          box-shadow:
            0 24px 80px rgba(15, 23, 42, 0.08),
            inset 0 1px 0 rgba(255,255,255,0.7);
          backdrop-filter: blur(10px);
        }

        .dark .flipbook-shell {
          background:
            linear-gradient(180deg, rgba(24,24,27,0.96), rgba(9,9,11,0.96));
          border-color: rgba(59, 130, 246, 0.16);
          box-shadow:
            0 24px 80px rgba(0, 0, 0, 0.35),
            inset 0 1px 0 rgba(255,255,255,0.04);
        }

        .flipbook-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 20px;
          margin-bottom: 24px;
        }

        .flipbook-kicker {
          margin: 0 0 10px;
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          color: #2563eb;
        }

        .flipbook-title {
          margin: 0 0 10px;
          font-size: clamp(28px, 3.4vw, 48px);
          line-height: 1.04;
          font-weight: 700;
          font-style: italic;
          font-family: Georgia, "Times New Roman", serif;
          color: #18181b;
        }

        .dark .flipbook-title {
          color: #fafafa;
        }

        .flipbook-description {
          margin: 0;
          max-width: 760px;
          font-size: 18px;
          line-height: 1.75;
          color: #52525b;
        }

        .dark .flipbook-description {
          color: #a1a1aa;
        }

        .flipbook-meta {
          display: flex;
          flex-direction: column;
          gap: 12px;
          align-items: flex-end;
          flex-shrink: 0;
        }

        .flipbook-page-chip {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 40px;
          padding: 0 16px;
          border-radius: 999px;
          font-size: 14px;
          font-weight: 600;
          color: #1d4ed8;
          background: rgba(37, 99, 235, 0.08);
          border: 1px solid rgba(37, 99, 235, 0.14);
        }

        .flipbook-stage {
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 640px;
          margin: 0 auto 26px;
          padding: 28px 14px;
          border-radius: 32px;
          background:
            radial-gradient(circle at top, rgba(59, 130, 246, 0.08), transparent 42%),
            linear-gradient(180deg, rgba(226, 232, 240, 0.45), rgba(241, 245, 249, 0.85));
          border: 1px solid rgba(37, 99, 235, 0.08);
          overflow: hidden;
        }

        .dark .flipbook-stage {
          background:
            radial-gradient(circle at top, rgba(59, 130, 246, 0.12), transparent 42%),
            linear-gradient(180deg, rgba(39, 39, 42, 0.75), rgba(24, 24, 27, 0.96));
          border-color: rgba(59, 130, 246, 0.14);
        }

        .dialectic-book {
          margin: 0 auto;
        }

        .page {
          background: transparent;
        }

        .page-inner {
          width: 100%;
          height: 100%;
          background: #ffffff;
          border-radius: 18px;
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 10px 40px rgba(15, 23, 42, 0.08);
          padding: 0;
        }

        .dark .page-inner {
          background: #18181b;
        }

        .page-cover .page-inner {
          background:
            linear-gradient(180deg, rgba(254, 249, 195, 0.98), rgba(253, 230, 138, 0.98));
        }

        .page-image {
          width: 100%;
          height: 100%;
          display: block;
          object-fit: contain;
          object-position: center;
          background: #fff;
        }

        .page-image-page3 {
          object-fit: cover;
          object-position: center top;
          transform: scale(1.02);
        }

        .flipbook-toolbar {
          display: flex;
          flex-wrap: wrap;
          justify-content: center;
          gap: 12px;
          margin-bottom: 24px;
        }

        .flipbook-btn {
          appearance: none;
          border: none;
          cursor: pointer;
          min-height: 46px;
          padding: 0 18px;
          border-radius: 999px;
          font-size: 15px;
          font-weight: 700;
          transition:
            transform 0.18s ease,
            box-shadow 0.18s ease,
            background 0.18s ease,
            color 0.18s ease,
            border-color 0.18s ease;
        }

        .flipbook-btn:hover {
          transform: translateY(-1px);
        }

        .flipbook-btn:active {
          transform: translateY(0);
        }

        .flipbook-btn-primary {
          color: #fff;
          background: linear-gradient(135deg, #2563eb, #1d4ed8);
          box-shadow: 0 10px 24px rgba(37, 99, 235, 0.28);
        }

        .flipbook-btn-primary:hover {
          box-shadow: 0 14px 30px rgba(37, 99, 235, 0.34);
        }

        .flipbook-btn-secondary {
          color: #1f2937;
          background: rgba(255,255,255,0.88);
          border: 1px solid rgba(37, 99, 235, 0.14);
          box-shadow: 0 8px 20px rgba(15, 23, 42, 0.06);
        }

        .dark .flipbook-btn-secondary {
          color: #fafafa;
          background: rgba(39,39,42,0.92);
          border-color: rgba(59, 130, 246, 0.18);
        }

        .flipbook-btn-accent {
          color: #fff;
          background: linear-gradient(135deg, #fb923c, #f97316);
          box-shadow: 0 10px 24px rgba(249, 115, 22, 0.28);
        }

        .flipbook-btn-ghost {
          color: #1d4ed8;
          background: rgba(37, 99, 235, 0.08);
          border: 1px solid rgba(37, 99, 235, 0.14);
        }

        .dark .flipbook-btn-ghost {
          color: #93c5fd;
          background: rgba(37, 99, 235, 0.12);
        }

        .flipbook-story-card {
          padding: 20px 22px;
          border-radius: 24px;
          border: 1px solid rgba(37, 99, 235, 0.08);
          background:
            linear-gradient(180deg, rgba(255,255,255,0.9), rgba(248,250,252,0.94));
        }

        .dark .flipbook-story-card {
          background:
            linear-gradient(180deg, rgba(24,24,27,0.9), rgba(9,9,11,0.95));
          border-color: rgba(59, 130, 246, 0.14);
        }

        .flipbook-story-label {
          margin: 0 0 8px;
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: #2563eb;
        }

        .flipbook-story-text {
          margin: 0;
          font-size: 17px;
          line-height: 1.8;
          color: #3f3f46;
        }

        .dark .flipbook-story-text {
          color: #d4d4d8;
        }

        .fullscreen-active {
          max-width: none;
          width: 100%;
          min-height: 100vh;
          border-radius: 0;
          padding: 24px;
        }

        @media (max-width: 900px) {
          .flipbook-header {
            flex-direction: column;
            align-items: stretch;
          }

          .flipbook-meta {
            align-items: flex-start;
          }

          .flipbook-stage {
            min-height: 520px;
            padding: 18px 8px;
          }
        }

        @media (max-width: 640px) {
          .flipbook-shell {
            padding: 18px;
            border-radius: 24px;
          }

          .flipbook-title {
            font-size: 30px;
          }

          .flipbook-description {
            font-size: 16px;
          }

          .flipbook-stage {
            min-height: 420px;
            border-radius: 24px;
          }

          .flipbook-btn {
            width: 100%;
          }

          .flipbook-toolbar {
            flex-direction: column;
          }
        }
      `}</style>

      <div className="flipbook-header">
        <div>
          <p className="flipbook-kicker">Truyện tranh tương tác</p>
          <h3 className="flipbook-title">
            Ba quy luật cơ bản qua câu chuyện Minh và Lan
          </h3>
          <p className="flipbook-description">
            Lật trang để theo dõi diễn biến câu chuyện và cảm nhận các quy luật
            vận động, chuyển hóa và phát triển qua hình ảnh minh họa.
          </p>
        </div>

        <div className="flipbook-meta">
          <span className="flipbook-page-chip">
            Trang {currentPage + 1} / {pages.length}
          </span>
          <button
            type="button"
            className="flipbook-btn flipbook-btn-secondary"
            onClick={goStart}
          >
            Về đầu truyện
          </button>
        </div>
      </div>

      <div className="flipbook-stage">
        <HTMLFlipBook
          width={bookSize.width}
          height={bookSize.height}
          size="fixed"
          minWidth={160}
          maxWidth={420}
          minHeight={240}
          maxHeight={630}
          drawShadow
          usePortrait
          autoSize={false}
          mobileScrollSupport
          maxShadowOpacity={0.35}
          showCover
          showPageCorners
          flippingTime={900}
          className="dialectic-book"
          ref={flipBookRef}
          onFlip={handleFlip}
          startPage={0}
        >
          {pages.map((page, index) => (
            <div
              key={`${page.src}-${index}`}
              className={`page ${page.type === "cover" ? "page-cover" : ""}`}
            >
              <div className="page-inner">
                <img
                  src={page.src}
                  alt={page.alt}
                  className={`page-image ${page.className || ""}`}
                  loading="lazy"
                />
              </div>
            </div>
          ))}
        </HTMLFlipBook>
      </div>

      <div className="flipbook-toolbar">
        <button
          type="button"
          className="flipbook-btn flipbook-btn-secondary"
          onClick={goPrev}
        >
          ← Trang trước
        </button>

        <button
          type="button"
          className="flipbook-btn flipbook-btn-ghost"
          onClick={handleManualPlayCurrent}
        >
          Phát audio trang này
        </button>

        <button
          type="button"
          className={`flipbook-btn ${
            isAutoPlay ? "flipbook-btn-accent" : "flipbook-btn-primary"
          }`}
          onClick={() => {
            if (isAutoPlay) {
              stopAutoPlay();
            } else {
              startAutoPlay();
            }
          }}
        >
          {isAutoPlay ? "Dừng tự động" : "Tự động lật + audio"}
        </button>

        <button
          type="button"
          className="flipbook-btn flipbook-btn-primary"
          onClick={goNext}
        >
          Trang sau →
        </button>

        <button
          type="button"
          className="flipbook-btn flipbook-btn-ghost"
          onClick={toggleFullscreen}
        >
          {isFullscreen ? "Thoát toàn màn hình" : "Toàn màn hình"}
        </button>
      </div>

      <div className="flipbook-story-card">
        <p className="flipbook-story-label">Gợi ý nội dung trang</p>
        <p className="flipbook-story-text">{storyTexts[currentPage] || ""}</p>
      </div>
    </div>
  );
});

export default FlipBook;