import React, {
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import HTMLFlipBook from "react-pageflip";

const PAGE_RATIO = 0.5625;

const DEFAULT_PAGES = [
  { src: "/pages/cover_start.png", alt: "Bìa truyện", type: "cover" },
  ...Array.from({ length: 24 }, (_, i) => ({
    src: `/pages/${i + 1}.png`,
    alt: `Trang ${i + 1}`,
  })),
  { src: "/pages/cover_end.png", alt: "Bìa sau", type: "cover" },
];

const DEFAULT_STORY_TEXTS = [
  "Tấm Khiên Giữa Dòng Thị Trường. Chào mừng các bạn đến với câu chuyện về một xóm chợ nhỏ trong những ngày đại dịch COVID-19. Qua biến cố này, chúng ta sẽ cùng tìm hiểu về bản chất của kinh tế thị trường định hướng xã hội chủ nghĩa tại Việt Nam – một nền kinh tế năng động nhưng luôn lấy con người làm trung tâm, đảm bảo không một ai bị bỏ lại phía sau.",
  "Buổi sáng ở xóm chợ nhỏ bắt đầu trong ánh nắng vàng dịu nhẹ. Những gian hàng dần mở cửa, tiếng người gọi nhau í ới, tiếng mặc cả rôm rả vang lên khắp nơi. Rau xanh, thịt cá được bày biện gọn gàng, tạo nên một khung cảnh quen thuộc và đầy sức sống. Nơi đây không chỉ là chỗ mua bán, mà còn là nhịp sống thường ngày của người dân.",
  "Ở một góc chợ, cô Lan – người bán thịt quen thuộc – đang nhanh tay chuẩn bị tinh hàng cho khách. Dù công việc bận rộn, cô vẫn luôn nở nụ cười thân thiện, trò chuyện vui vẻ với mọi người. Sự chăm chỉ và nhiệt tình của cô đã trở thành một phần không thể thiếu của khu chợ nhỏ này.",
  "Giữa dòng người tấp nập, bà Tâm dắt tay bé Na đi chợ, bà chọn từng bó rau, cân nhắc từng món đồ còn bé Na thì tò mò nhìn ngắm xung quanh. Hình ảnh 2 bà cháu giản dị nhưng ấm áp ấy khiến khung cảnh chợ thêm gần gũi và yêu thương",
  "Những giao dịch diễn ra liên tục, người bán kẻ mua trao đổi nhanh chóng. Đồng tiền được trao tay, hàng hóa được chuyển đi, tất cả tạo nên một vòng quay nhịp nhàng của cuộc sống. Đây chính là hình ảnh rõ nét của một thị trường vận hành ổn định và tự nhiên.",
  "Khi ngày dần tắt, mọi người trở về nhà. Trong căn bếp nhỏ, bữa cơm gia đình được dọn ra đơn giản nhưng đầy đủ. Tiếng cười nói vang lên bên mâm cơm, thể hiện một cuộc sống tuy không dư dả nhưng đủ đầy và hạnh phúc.",
  "Một ngày, một cuộc gọi đã thay đổi tất cả. Từ giây phút đó, một hành trình mới chính thức bắt đầu.Một buổi tối, tin tức về dịch bệnh bất ngờ xuất hiện trên màn hình TV. Những con số và thông báo khẩn khiến người xem không khỏi lo lắng. Không khí trong căn nhà trở nên trầm lắng, báo hiệu một biến cố đang đến gần.",
  "Ngay sau đó, người dân đổ xô đến chợ để mua hàng tích trữ. Không còn sự trật tự như trước, thay vào đó là cảnh chen lấn, vội vã. Ai cũng cố gắng mua thật nhiều trong nỗi lo sợ thiếu thốn.",
  "Cô Lan đứng giữa khung cảnh hỗn loạn, tay vẫn làm việc nhưng ánh mắt đầy lo âu. Việc buôn bán không còn đơn thuần như trước, mà trở thành áp lực khi mọi thứ đều biến động.",
  "Trên bảng giá: BÁN LẺ... 20,000đ, 55,000đ, 35,000đ, 110,000đ. Tăng giá",
  "Bà Tâm cầm những đồng tiền ít ỏi trong tay, nhìn vào các mặt hàng mà không biết nên chọn gì. Giá cả tăng cao khiến bà không thể mua đủ những thứ cần thiết.",
  "Cuối cùng, hai bà cháu đành lặng lẽ rời khỏi chợ. Bóng lưng họ kéo dài trên con đường vắng, mang theo sự buồn bã và nỗi lo về những ngày sắp tới.",
  "Giữa lúc khó khăn nhất, những chiếc xe quân đội chở đầy hàng hóa tiến vào khu dân cư. Sự xuất hiện ấy mang theo hy vọng và sự hỗ trợ kịp thời cho người dân.",
  "Các cán bộ dùng loa thông báo những chính sách hỗ trợ từ Nhà nước. Giọng nói vang lên rõ ràng, giúp người dân hiểu rằng họ không hề đơn độc trong lúc khó khăn.",
  "Những bao gạo, nhu yếu phẩm được trao tận tay từng người dân. Khoảnh khắc ấy không chỉ là sự giúp đỡ về vật chất mà còn là sự sẻ chia đầy nhân văn.",
  " Bà Tâm ôm chặt túi gạo trong tay, nước mắt lăn dài trên má. Đó là giọt nước mắt của sự biết ơn và nhẹ nhõm khi được giúp đỡ đúng lúc.",
  "Cô Lan nhận được thông tin về các chính sách hỗ trợ, gương mặt dần giãn ra sau những ngày lo lắng. Việc buôn bán có cơ hội ổn định trở lại.",
  "Giá cả trên bảng được điều chỉnh xuống mức hợp lý hơn. Không khí chợ dần trở nên ổn định, người dân bớt đi phần nào áp lực.",
  "Tại trạm y tế, các bác sĩ tận tình chăm sóc bệnh nhân. Những đứa trẻ và và người già được quan tâm chu đáo, tạo cảm giác an ân cho cả cộng đồng.",
  " Những tấm thẻ bảo hiểm được trao đến tay người dân. Đây không chỉ là hỗ trợ trước mắt mà còn là sự đảm bảo dài cho sức khỏe của họ.",
  "Sau những ngày khó khăn, xóm chợ dần hoạt động trở lại. Tiếng cười nói, mua bán nhộn nhịp lại vang lên như trước.",
  "Bé Na nhận được viên kẹo từ người bán hàng, nụ cười hồn nhiên nở trên môi. Đó là dấu hiệu của sự bình yên đã quay trở lại.",
  "Người dân trong chợ cùng nhau trò chuyện, chia sẻ niềm vui. Sự gắn kết cộng đồng trở nên mạnh mẽ hơn sau biến cố.",
  "Từ trên cao nhìn xuống, xóm chợ nhỏ nằm giữa thành phố hiện đại, đón ánh bình minh mới. Một chặng đường khó khăn đã qua, mở ra tương lai tươi sáng hơn cho tất cả mọi người."
];

const DEFAULT_AUDIO_FILES = [
  "/audio/page0.mp3",
  ...Array.from({ length: 24 }, (_, i) => `/audio/page${i + 1}.mp3`),
  "/audio/page25.mp3",
];

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

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
  const isStoppingRef = useRef(false);
  const playbackSessionRef = useRef(0);
  const pendingAutoFlipRef = useRef(false);
  const restartFromPageRef = useRef(null);

  const [isAutoPlay, setIsAutoPlay] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [bookSize, setBookSize] = useState({ width: 500, height: 281 });

  const pages = useMemo(() => DEFAULT_PAGES, []);
  const storyTexts = useMemo(() => DEFAULT_STORY_TEXTS, []);
  const audioFiles = useMemo(() => {
    if (Array.isArray(externalAudioFiles) && externalAudioFiles.length > 0) {
      return externalAudioFiles;
    }
    return DEFAULT_AUDIO_FILES;
  }, [externalAudioFiles]);

  const activeAudioRef =
    externalAudioRef?.current ? externalAudioRef : internalAudioRef;

  const clearAutoPlayTimer = () => {
    if (autoPlayTimeoutRef.current) {
      clearTimeout(autoPlayTimeoutRef.current);
      autoPlayTimeoutRef.current = null;
    }
  };

  const isSessionActive = (sessionId) =>
    playbackSessionRef.current === sessionId && !isStoppingRef.current;

  const stopAudio = () => {
    const audio = activeAudioRef?.current;
    if (!audio) return;

    audio.pause();
    audio.currentTime = 0;
    audio.removeAttribute("src");
    audio.load();
    setIsPlaying?.(false);
  };

  const cancelCurrentPlayback = () => {
    playbackSessionRef.current += 1;
    clearAutoPlayTimer();
    stopAudio();
  };

  const createPlaybackSession = () => {
    playbackSessionRef.current += 1;
    return playbackSessionRef.current;
  };

  const waitForAudioMetadata = (audio, sessionId) =>
    new Promise((resolve) => {
      if (!audio) {
        resolve(false);
        return;
      }

      if (Number.isFinite(audio.duration) && audio.duration > 0) {
        resolve(true);
        return;
      }

      let settled = false;

      const cleanup = () => {
        audio.removeEventListener("loadedmetadata", handleLoaded);
        audio.removeEventListener("canplaythrough", handleLoaded);
        audio.removeEventListener("error", handleError);
        clearInterval(intervalId);
      };

      const finish = (value) => {
        if (settled) return;
        settled = true;
        cleanup();
        resolve(value);
      };

      const handleLoaded = () => finish(true);
      const handleError = () => finish(false);

      const intervalId = setInterval(() => {
        if (!isSessionActive(sessionId)) finish(false);
      }, 100);

      audio.addEventListener("loadedmetadata", handleLoaded, { once: true });
      audio.addEventListener("canplaythrough", handleLoaded, { once: true });
      audio.addEventListener("error", handleError, { once: true });
    });

  const waitForAudioEnded = (audio, sessionId) =>
    new Promise((resolve) => {
      if (!audio) {
        resolve("cancelled");
        return;
      }

      let settled = false;

      const cleanup = () => {
        audio.removeEventListener("ended", handleEnded);
        audio.removeEventListener("error", handleError);
        clearInterval(intervalId);
      };

      const finish = (value) => {
        if (settled) return;
        settled = true;
        cleanup();
        resolve(value);
      };

      const handleEnded = () => finish("ended");
      const handleError = () => finish("error");

      const intervalId = setInterval(() => {
        if (!isSessionActive(sessionId)) finish("cancelled");
      }, 100);

      audio.addEventListener("ended", handleEnded, { once: true });
      audio.addEventListener("error", handleError, { once: true });
    });

  const getVisibleSpreadPages = (pageIndex) => {
    const lastPage = pages.length - 1;

    if (pageIndex <= 0) return [0];
    if (pageIndex >= lastPage) return [lastPage];

    const rightPage = Math.min(pageIndex + 1, lastPage);
    return [pageIndex, rightPage];
  };

  const getPageIndicatorText = (pageIndex) => {
    const visiblePages = getVisibleSpreadPages(pageIndex).map((p) => p + 1);
    return visiblePages.length === 1
      ? `Trang ${visiblePages[0]} / ${pages.length}`
      : `Trang ${visiblePages.join(", ")} / ${pages.length}`;
  };

  const getStoryTextForCurrentView = () => {
    const visiblePages = getVisibleSpreadPages(currentPage);
    return visiblePages
      .map((pageIndex) => storyTexts[pageIndex])
      .filter(Boolean)
      .join(" ");
  };

  const playSingleAudio = async (pageIndex, sessionId) => {
    const audio = activeAudioRef?.current;
    const audioFile = audioFiles?.[pageIndex] || `/audio/page${pageIndex}.mp3`;

    if (!audio || !audioFile || !isSessionActive(sessionId)) return false;

    try {
      audio.pause();
      audio.currentTime = 0;
      audio.src = audioFile;
      audio.load();

      const hasMetadata = await waitForAudioMetadata(audio, sessionId);
      if (!hasMetadata || !isSessionActive(sessionId)) return false;

      await audio.play();
      if (!isSessionActive(sessionId)) return false;

      setIsPlaying?.(true);

      const result = await waitForAudioEnded(audio, sessionId);
      return result === "ended";
    } catch (error) {
      console.warn("Audio play failed:", error);
      setIsPlaying?.(false);
      return false;
    }
  };

  const playAudioForSpread = async (pageIndex, sessionId) => {
    const spreadPages = getVisibleSpreadPages(pageIndex);

    for (const p of spreadPages) {
      if (!isSessionActive(sessionId)) return false;

      const played = await playSingleAudio(p, sessionId);
      if (!played) return false;
    }

    if (isSessionActive(sessionId)) {
      setIsPlaying?.(false);
    }

    return true;
  };

  const playSpreadOnce = async (pageIndex) => {
    cancelCurrentPlayback();
    isStoppingRef.current = false;

    const sessionId = createPlaybackSession();
    await playAudioForSpread(pageIndex, sessionId);

    if (isSessionActive(sessionId)) {
      setIsPlaying?.(false);
    }
  };

  const getNextPageForAutoPlay = (pageIndex) => {
    const lastPage = pages.length - 1;
    if (pageIndex <= 0) return 1;
    if (pageIndex >= lastPage) return lastPage;
    return Math.min(pageIndex + 2, lastPage);
  };

  const handleFlip = (e) => {
    const nextPage = e.data;
    const audio = activeAudioRef?.current;
    const wasPlaying = Boolean(audio && !audio.paused);
    const wasInternalAutoFlip = pendingAutoFlipRef.current;

    pendingAutoFlipRef.current = false;
    setCurrentPage(nextPage);

    if (wasInternalAutoFlip) return;
    if (!wasPlaying) return;

    restartFromPageRef.current = nextPage;
    cancelCurrentPlayback();

    if (!isAutoPlay) {
      void playSpreadOnce(nextPage);
    }
  };

  const startAutoPlay = async () => {
    if (isAutoPlay) return;

    setIsAudioAutoPlay?.(true);
    setIsAutoPlay(true);
    isStoppingRef.current = false;
    restartFromPageRef.current = null;

    let pageIndex = currentPage;

    while (!isStoppingRef.current) {
      const sessionId = createPlaybackSession();
      await playAudioForSpread(pageIndex, sessionId);

      if (isStoppingRef.current) break;

      if (restartFromPageRef.current !== null) {
        pageIndex = restartFromPageRef.current;
        restartFromPageRef.current = null;
        continue;
      }

      if (pageIndex >= pages.length - 1) break;

      const nextPage = getNextPageForAutoPlay(pageIndex);

      await wait(200);
      if (isStoppingRef.current) break;

      pendingAutoFlipRef.current = true;
      flipBookRef.current?.pageFlip()?.flip(nextPage);
      pageIndex = nextPage;

      await wait(1050);
      if (isStoppingRef.current) break;
    }

    setIsAudioAutoPlay?.(false);
    setIsAutoPlay(false);
    isStoppingRef.current = false;
    restartFromPageRef.current = null;
    clearAutoPlayTimer();
    setIsPlaying?.(false);
  };

  const stopAutoPlay = () => {
    isStoppingRef.current = true;
    restartFromPageRef.current = null;
    setIsAudioAutoPlay?.(false);
    setIsAutoPlay(false);
    cancelCurrentPlayback();
  };

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

  const goPrev = () => {
    cancelCurrentPlayback();
    flipBookRef.current?.pageFlip()?.flipPrev();
  };

  const goNext = () => {
    cancelCurrentPlayback();
    flipBookRef.current?.pageFlip()?.flipNext();
  };

  const goStart = () => {
    cancelCurrentPlayback();
    flipBookRef.current?.pageFlip()?.flip(0);
  };

  useEffect(() => {
    const updateSize = () => {
      const parentWidth = containerRef.current?.clientWidth || window.innerWidth;
      const stageWidth = Math.min(parentWidth - 80, 1100);

      let pageWidth = stageWidth / 2;
      let pageHeight = pageWidth * PAGE_RATIO;

      const maxHeight = window.innerHeight * 0.6;
      if (pageHeight > maxHeight) {
        pageHeight = maxHeight;
        pageWidth = pageHeight / PAGE_RATIO;
      }

      setBookSize({
        width: Math.floor(pageWidth),
        height: Math.floor(pageHeight),
      });
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
      cancelCurrentPlayback();
    };
  }, []);

  useImperativeHandle(ref, () => ({
    pageFlip: () => ({
      flipNext: () => flipBookRef.current?.pageFlip()?.flipNext(),
      flipPrev: () => flipBookRef.current?.pageFlip()?.flipPrev(),
      flip: (page) => flipBookRef.current?.pageFlip()?.flip(page),
    }),
    startAutoPlay,
    stopAutoPlay,
    toggleFullscreen,
    getCurrentPage: () => currentPage,
    getTotalPages: () => pages.length,
    getCurrentStoryText: () => getStoryTextForCurrentView(),
  }));

  return (
    <div
      ref={containerRef}
      className={`flipbook-container ${isFullscreen ? "fullscreen" : ""}`}
    >
      <style>{`
        .flipbook-container {
          width: 100%;
          max-width: 1200px;
          margin: 0 auto;
          padding: 40px 20px;
          background: #121212;
          border-radius: 24px;
          box-shadow: 0 20px 50px rgba(0,0,0,0.5);
          color: white;
        }

        .flipbook-header {
          text-align: center;
          margin-bottom: 30px;
        }

        .flipbook-title {
          font-family: 'Playfair Display', serif;
          font-size: 2.5rem;
          margin-bottom: 10px;
          background: linear-gradient(to right, #fff, #aaa);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .flipbook-stage {
          display: flex;
          justify-content: center;
          align-items: center;
          perspective: 3000px;
          padding: 20px 0;
          min-height: 400px;
        }

        .dialectic-book {
          position: relative;
          box-shadow: 0 30px 100px rgba(0,0,0,0.8);
        }

        .dialectic-book::after {
          content: "";
          position: absolute;
          left: 50%;
          top: 0;
          width: 10px;
          height: 100%;
          background: linear-gradient(
            to right,
            rgba(0,0,0,0.4) 0%,
            rgba(255,255,255,0.1) 50%,
            rgba(0,0,0,0.4) 100%
          );
          transform: translateX(-50%);
          z-index: 100;
          pointer-events: none;
        }

        .page {
          background: #fff;
          overflow: hidden;
        }

        .page-inner {
          width: 100%;
          height: 100%;
          position: relative;
        }

        .page-inner::before {
          content: "";
          position: absolute;
          top: 0;
          width: 60px;
          height: 100%;
          z-index: 10;
          pointer-events: none;
        }

        .page-left .page-inner::before {
          right: 0;
          background: linear-gradient(to left, rgba(0,0,0,0.4) 0%, transparent 100%);
        }

        .page-right .page-inner::before {
          left: 0;
          background: linear-gradient(to right, rgba(0,0,0,0.4) 0%, transparent 100%);
        }

        .page-image {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }

        .flipbook-footer {
          display: flex;
          justify-content: center;
          gap: 15px;
          margin-top: 30px;
          flex-wrap: wrap;
        }

        .ui-btn {
          padding: 10px 20px;
          border-radius: 50px;
          border: 1px solid rgba(255,255,255,0.1);
          background: rgba(255,255,255,0.05);
          color: white;
          cursor: pointer;
          transition: all 0.3s;
          font-weight: 500;
          backdrop-filter: blur(5px);
        }

        .ui-btn:hover {
          background: #2563eb;
          transform: translateY(-2px);
          box-shadow: 0 10px 20px rgba(37, 99, 235, 0.3);
        }

        .ui-btn.active {
          background: #2563eb;
          border-color: #3b82f6;
        }

        .page-indicator {
          background: rgba(37, 99, 235, 0.2);
          color: #60a5fa;
          padding: 5px 15px;
          border-radius: 20px;
          font-size: 0.9rem;
          margin-left: 20px;
          display: inline-block;
        }

        .story-card {
          margin-top: 24px;
          padding: 18px 20px;
          border-radius: 18px;
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.08);
          color: rgba(255,255,255,0.9);
          line-height: 1.7;
        }

        .story-card-label {
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: 0.12em;
          color: #60a5fa;
          margin-bottom: 8px;
          font-weight: 700;
        }

        @media (max-width: 768px) {
          .flipbook-container {
            padding: 24px 12px;
            border-radius: 18px;
          }

          .flipbook-title {
            font-size: 1.8rem;
          }

          .flipbook-stage {
            min-height: 260px;
            padding: 12px 0;
          }

          .page-indicator {
            margin-left: 0;
            margin-top: 10px;
          }

          .flipbook-footer {
            gap: 10px;
          }

          .ui-btn {
            width: calc(50% - 8px);
            min-width: 140px;
          }
        }
      `}</style>

      {!externalAudioRef && <audio ref={internalAudioRef} preload="auto" />}

      <div className="flipbook-header">
        <h1 className="flipbook-title">Tấm Khiên Giữa Dòng Thị Trường</h1>
        <p style={{ opacity: 0.7 }}>
          Sử dụng nút cuộn hoặc click để lật trang
        </p>
        <span className="page-indicator">{getPageIndicatorText(currentPage)}</span>
      </div>

      <div className="flipbook-stage">
        <HTMLFlipBook
          width={bookSize.width}
          height={bookSize.height}
          size="fixed"
          minWidth={200}
          maxWidth={800}
          minHeight={150}
          maxHeight={600}
          usePortrait={false}
          startPage={0}
          drawShadow={true}
          flippingTime={1000}
          onFlip={handleFlip}
          className="dialectic-book"
          ref={flipBookRef}
          showCover={true}
          maxShadowOpacity={0.5}
        >
          {pages.map((page, index) => (
            <div
              key={index}
              className={`page ${index % 2 === 0 ? "page-right" : "page-left"}`}
            >
              <div className="page-inner">
                <img src={page.src} alt={page.alt} className="page-image" />
              </div>
            </div>
          ))}
        </HTMLFlipBook>
      </div>

      <div className="flipbook-footer">
        <button className="ui-btn" onClick={goPrev}>
          ← Trang trước
        </button>
        <button className="ui-btn" onClick={() => void playSpreadOnce(currentPage)}>
          Phát Audio
        </button>
        <button
          className={`ui-btn ${isAutoPlay ? "active" : ""}`}
          onClick={() => {
            if (isAutoPlay) {
              stopAutoPlay();
            } else {
              void startAutoPlay();
            }
          }}
        >
          {isAutoPlay ? "Dừng tự động" : "Tự động lật + Audio"}
        </button>
        <button className="ui-btn" onClick={goNext}>
          Trang sau →
        </button>
        <button className="ui-btn" onClick={goStart}>
          Về trang đầu
        </button>
        <button className="ui-btn" onClick={toggleFullscreen}>
          {isFullscreen ? "Thoát toàn màn hình" : "Toàn màn hình"}
        </button>
      </div>

      <div className="story-card">
        <div className="story-card-label">Nội dung từng trang</div>
        <div>{getStoryTextForCurrentView()}</div>
      </div>
    </div>
  );
});

export default FlipBook;
