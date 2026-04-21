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
  ...Array.from({ length: 22 }, (_, i) => ({
    src: `/pages/${i + 1}.jpg`,
    alt: `Trang ${i + 1}`,
  })),
  { src: "/pages/cover_end.png", alt: "Bìa sau", type: "cover" },
];

const DEFAULT_STORY_TEXTS = [
  "Bìa trước: Tấm Khiên Giữa Dòng Thị Trường.",
  "Xóm chợ nhỏ nằm nép mình giữa những con hẻm quen thuộc, mỗi sớm mai lại rộn ràng tiếng cười nói.",
  "Ánh nắng vàng nhẹ rơi xuống những sạp hàng, phản chiếu lên những bó rau xanh mướt và miếng thịt tươi rói.",
  "Người mua, kẻ bán tấp nập, trao nhau không chỉ hàng hóa mà còn cả những nụ cười chân chất.",
  "Bà Tâm, người phụ nữ đã ngoài sáu mươi, lưng hơi còng theo năm tháng, dắt tay bé Na len lỏi giữa dòng người.",
  "Dừng lại trước sạp của cô Lan, bà Tâm mỉm cười hiền hậu xin mua nửa ký thịt với bó rau muống.",
  "Cô Lan thoăn thoắt tay dao, vừa gói hàng vừa cười tươi, nói rằng thị trường phải cạnh tranh thì mới bán được.",
  "Nhờ vậy mà ai cũng có cái ăn cái mặc, và cuộc sống cứ thế trôi đi bình yên qua từng ngày.",
  "Buổi tối, trong căn nhà nhỏ, mâm cơm đơn sơ với bát canh rau và đĩa thịt cũng đủ làm bé Na cười tít mắt.",
  "Đó là những ngày mà bàn tay vô hình của thị trường vận hành êm ái, mang lại sự đủ đầy cho mọi người.",
  "Nhưng rồi một đêm, ánh sáng xanh từ chiếc tivi hắt lên khuôn mặt cô Lan đang đếm tiền.",
  "Tin tức dồn dập báo rằng dịch bệnh bùng phát, phong tỏa toàn thành phố, khiến bàn tay cô khựng lại.",
  "Sáng hôm sau, xóm chợ không còn bình yên, người người chen lấn giành giật từng bao gạo và hộp mì.",
  "Tiếng la hét, tiếng gọi nhau vang lên hỗn loạn khi nỗi sợ hãi lan khắp khu chợ nhỏ.",
  "Cô Lan hoảng loạn vì hàng không về được, xe kẹt hết rồi, nguồn cung bắt đầu đứt gãy nghiêm trọng.",
  "Trong cơn xoáy của nỗi sợ, cô cầm bút đỏ gạch giá cũ rồi viết lên mức giá mới cao gấp nhiều lần.",
  "Không chỉ riêng cô, cả thị trường như mất kiểm soát khi cung không đủ cầu và giá cả bị đẩy lên quá cao.",
  "Ở một góc chợ, bà Tâm run run cầm nắm tiền lẻ nhàu nát, nhìn bảng giá rồi nhìn xuống bé Na, đôi mắt đỏ hoe.",
  "Bà lặng lẽ kéo tay cháu quay đi, bởi những con người yếu thế như bà bị đẩy đến tận cùng khó khăn.",
  "Nhưng rồi giữa lúc tưởng chừng tuyệt vọng, tiếng động cơ vang lên và một chiếc xe tải quân đội tiến vào.",
  "Anh Hải, cán bộ phường, bước xuống cùng băng rôn đỏ rực và trấn an bà con rằng sẽ không ai bị bỏ lại phía sau.",
  "Bà Tâm ôm chặt bao gạo vừa nhận, nước mắt rơi không ngừng, vì đó không chỉ là lương thực mà còn là hy vọng.",
  "Những chính sách hỗ trợ tiếp tục lan tỏa, cô Lan được giảm thuế, bé Na được khám bệnh miễn phí và xóm chợ dần hồi sinh.",
  "Bìa sau: Giông bão qua đi, người ta hiểu rằng kinh tế thị trường mang lại động lực phát triển, nhưng sự điều tiết của Nhà nước mới là tấm khiên bảo vệ con người trong lúc khó khăn nhất.",
];

const DEFAULT_AUDIO_FILES = [
  "/audio/page0.mp3",
  ...Array.from({ length: 22 }, (_, i) => `/audio/page${i + 1}.mp3`),
  "/audio/page23.mp3",
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
  const isStoppingRef = useRef(false);

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

  const stopAudio = () => {
    const audio = activeAudioRef?.current;
    if (!audio) return;
    audio.pause();
    audio.currentTime = 0;
    setIsPlaying?.(false);
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

  const waitForAudioEnded = (audio) =>
    new Promise((resolve) => {
      if (!audio) {
        resolve();
        return;
      }

      const handleEnded = () => {
        cleanup();
        resolve();
      };

      const handleError = () => {
        cleanup();
        resolve();
      };

      const cleanup = () => {
        audio.removeEventListener("ended", handleEnded);
        audio.removeEventListener("error", handleError);
      };

      audio.addEventListener("ended", handleEnded, { once: true });
      audio.addEventListener("error", handleError, { once: true });
    });

  const playSingleAudio = async (pageIndex) => {
    const audio = activeAudioRef?.current;
    const audioFile = audioFiles?.[pageIndex] || `/audio/page${pageIndex}.mp3`;

    if (!audio || !audioFile) return false;

    try {
      audio.pause();
      audio.currentTime = 0;
      audio.src = audioFile;
      audio.load();

      await waitForAudioMetadata(audio);
      await audio.play();
      setIsPlaying?.(true);
      await waitForAudioEnded(audio);
      return true;
    } catch (err) {
      console.warn("Audio play failed", err);
      setIsPlaying?.(false);
      return false;
    }
  };

  const getSpreadPages = (pageIndex) => {
    if (pageIndex <= 0) return [0];
    if (pageIndex >= pages.length - 1) return [pages.length - 1];

    const leftPage = pageIndex % 2 === 0 ? pageIndex - 1 : pageIndex;
    const rightPage = leftPage + 1;

    const result = [leftPage];
    if (rightPage < pages.length - 1) {
      result.push(rightPage);
    }
    return result;
  };

  const playAudioForSpread = async (pageIndex) => {
    const spreadPages = getSpreadPages(pageIndex);

    for (const p of spreadPages) {
      if (isStoppingRef.current) break;
      await playSingleAudio(p);
    }

    setIsPlaying?.(false);
  };

  const handleFlip = (e) => {
    const nextPage = e.data;
    setCurrentPage(nextPage);
  };

  const startAutoPlay = async () => {
    if (isAutoPlay) return;

    setIsAudioAutoPlay?.(true);
    setIsAutoPlay(true);
    isStoppingRef.current = false;

    let pageIndex = currentPage;

    while (!isStoppingRef.current) {
      await playAudioForSpread(pageIndex);

      if (isStoppingRef.current) break;
      if (pageIndex >= pages.length - 1) break;

      const nextPage =
        pageIndex <= 0
          ? 1
          : pageIndex >= pages.length - 2
          ? pages.length - 1
          : pageIndex + 2;

      await new Promise((resolve) => {
        autoPlayTimeoutRef.current = setTimeout(resolve, 250);
      });

      if (isStoppingRef.current) break;

      flipBookRef.current?.pageFlip()?.flip(nextPage);
      pageIndex = nextPage;

      await new Promise((resolve) => {
        autoPlayTimeoutRef.current = setTimeout(resolve, 1050);
      });
    }

    setIsAudioAutoPlay?.(false);
    setIsAutoPlay(false);
    isStoppingRef.current = false;
    clearAutoPlayTimer();
    setIsPlaying?.(false);
  };

  const stopAutoPlay = () => {
    isStoppingRef.current = true;
    setIsAudioAutoPlay?.(false);
    setIsAutoPlay(false);
    clearAutoPlayTimer();
    stopAudio();
  };

  const playCurrentSpreadManually = async () => {
    clearAutoPlayTimer();
    isStoppingRef.current = false;
    await playAudioForSpread(currentPage);
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

  const goPrev = () => flipBookRef.current?.pageFlip()?.flipPrev();
  const goNext = () => flipBookRef.current?.pageFlip()?.flipNext();
  const goStart = () => flipBookRef.current?.pageFlip()?.flip(0);

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
      clearAutoPlayTimer();
      stopAudio();
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
    getCurrentStoryText: () => storyTexts[currentPage] || "",
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
          background: linear-gradient(to right, 
            rgba(0,0,0,0.4) 0%, 
            rgba(255,255,255,0.1) 50%, 
            rgba(0,0,0,0.4) 100%);
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
      `}</style>

      {!externalAudioRef && <audio ref={internalAudioRef} preload="auto" />}

      <div className="flipbook-header">
        <h1 className="flipbook-title">Tấm Khiên Giữa Dòng Thị Trường</h1>
        <p style={{ opacity: 0.7 }}>
          Sử dụng nút cuộn hoặc click để lật trang
          <span className="page-indicator">
            Trang {currentPage + 1} / {pages.length}
          </span>
        </p>
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
        <button className="ui-btn" onClick={playCurrentSpreadManually}>
          Phát Audio
        </button>
        <button
          className={`ui-btn ${isAutoPlay ? "active" : ""}`}
          onClick={() => {
            if (isAutoPlay) stopAutoPlay();
            else startAutoPlay();
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
        <div>{storyTexts[currentPage] || ""}</div>
      </div>
    </div>
  );
});

export default FlipBook;