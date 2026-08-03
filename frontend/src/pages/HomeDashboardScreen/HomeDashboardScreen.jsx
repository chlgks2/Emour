import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ChevronUp } from "lucide-react";
import HomePage from "../../components/home/HomePage/HomePage";
import HomeEditPage from "../../components/home/HomeEditPage/HomeEditPage";
import RelationshipStartDateModal from "../../components/home/RelationshipStartDateModal/RelationshipStartDateModal";
import DashboardPage from "../DashboardPage/DashboardPage";
import {
  fetchHomeScreen,
  saveHomeCustomization,
  saveRelationshipStartDate,
} from "../../api/homeApi";
import { HOME_SECTION } from "../../constants/navigation";
import { useToast } from "../../hooks/useToast";
import { useLiveSync } from "../../hooks/useLiveSync";
import styles from "./HomeDashboardScreen.module.css";

export default function HomeDashboardScreen() {
  const { showToast } = useToast();
  const location = useLocation();
  const navigate = useNavigate();
  const [home, setHome] = useState(null);
  const [editOpen, setEditOpen] = useState(false);
  const [
    relationshipDateOpen,
    setRelationshipDateOpen,
  ] = useState(false);
  const [
    relationshipDateSaving,
    setRelationshipDateSaving,
  ] = useState(false);

  const containerRef = useRef(null);
  const homeSectionRef = useRef(null);
  const dashboardSectionRef = useRef(null);

  /**
   * 스냅 컨테이너 "하나만" 스크롤한다.
   *
   * section.scrollIntoView() 를 쓰면 브라우저가 스크롤 가능한 조상을 전부 함께 굴리기
   * 때문에, 앱 뷰포트(.app-viewport) 처럼 overflow: hidden 인 바깥 요소까지 밀려 올라간다.
   * 컨테이너의 scrollTop 을 직접 지정하면 그런 전파가 일어나지 않는다.
   */
  const scrollToSection = useCallback((sectionRef, behavior) => {
    const container = containerRef.current;
    const section = sectionRef.current;
    if (!container || !section) return;

    container.scrollTo({ top: section.offsetTop, behavior });
  }, []);

  /*
   * 대시보드 맨 위에 홈 화면이 1px 비치는 문제.
   *
   * 앱 뷰포트가 transform: scale() 로 확대돼 있어서 892px 짜리 섹션 경계가
   * 기기 픽셀의 정수 자리에 떨어지지 않는다. scrollTop 을 892 로 정확히
   * 맞춰도 892 x 배율이 899.6 같은 값이면 그 줄은 반투명하게 섞여서
   * 이전 섹션(홈)이 비친다. 그래서 scrollTop 반올림만으로는 없어지지 않았다.
   *
   * 대시보드 섹션 위쪽에 자기 배경색 2px 을 덧대서 덮는다.
   * 항상 덧대면 반대로 홈 화면 아래쪽에 대시보드가 비치므로,
   * 경계 근처(2px 이내)에 있을 때만 켠다. 그 사이는 스크롤이 움직이는
   * 중이라 눈에 띄지 않는다.
   */
  const [isSeamCovered, setIsSeamCovered] = useState(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return undefined;

    const supportsScrollEnd = "onscrollend" in container;

    // 보정 때문에 생긴 스크롤 이벤트로 다시 보정하지 않도록 잠근다.
    let isCorrecting = false;
    let settleTimer = null;

    /* 스크롤이 멈춘 뒤 위치를 섹션 경계(컨테이너 높이의 배수)로 반올림한다. */
    const snapScrollToSection = () => {
      const sectionHeight = container.clientHeight;

      if (isCorrecting || !sectionHeight) {
        isCorrecting = false;
        return;
      }

      const snapped =
        Math.round(container.scrollTop / sectionHeight) * sectionHeight;

      /*
       * 0.5px 이 아니라 아주 작은 값으로 본다.
       * 0.4px 만 어긋나도 그 줄이 반투명하게 섞여 이전 섹션이 비친다.
       */
      if (Math.abs(container.scrollTop - snapped) < 0.02) return;

      isCorrecting = true;
      container.scrollTop = snapped;
    };

    const updateSeamCover = () => {
      const sectionHeight = container.clientHeight;
      if (!sectionHeight) return;

      const isNearDashboardTop =
        Math.abs(container.scrollTop - sectionHeight) < 2;

      setIsSeamCovered((previous) =>
        previous === isNearDashboardTop ? previous : isNearDashboardTop,
      );
    };

    const handleScroll = () => {
      updateSeamCover();

      // scrollend 는 스냅까지 끝난 뒤에 한 번 온다. 없는 브라우저는 타이머로 대신한다.
      if (supportsScrollEnd) return;

      window.clearTimeout(settleTimer);
      settleTimer = window.setTimeout(snapScrollToSection, 140);
    };

    container.addEventListener("scroll", handleScroll, { passive: true });

    if (supportsScrollEnd) {
      container.addEventListener("scrollend", snapScrollToSection);
    }

    // 대시보드에서 시작하는 경우(딥링크)에는 스크롤 이벤트가 없을 수 있다.
    updateSeamCover();

    return () => {
      window.clearTimeout(settleTimer);
      container.removeEventListener("scroll", handleScroll);

      if (supportsScrollEnd) {
        container.removeEventListener("scrollend", snapScrollToSection);
      }
    };
  }, []);

  // 다른 화면이 navigate state 로 시작 섹션을 지정했는지 (constants/navigation.js 참고)
  const requestedSection = location.state?.section ?? null;

  const loadHome = useCallback(async () => {
    try {
      const data = await fetchHomeScreen();
      setHome(data);
    } catch {
      showToast("홈 화면 설정을 불러오지 못했어요.", { tone: "error" });
    }
  }, [showToast]);

  useEffect(() => {
    Promise.resolve().then(loadHome);
  }, [loadHome]);

  useLiveSync(loadHome);

  /**
   * 지정된 섹션에서 시작해야 하면 애니메이션 없이 바로 그 자리로 옮긴다.
   * 섹션 높이가 100dvh 로 고정이라 데이터 로딩과 무관하게 위치가 정해진다.
   * useEffect 로 하면 홈 섹션이 한 프레임 보였다가 튀므로 페인트 전(useLayoutEffect)에 처리한다.
   */
  useLayoutEffect(() => {
    if (requestedSection !== HOME_SECTION.DASHBOARD) return;
    scrollToSection(dashboardSectionRef, "instant");
    // 한 번 쓰고 비운다. 남겨두면 이 화면 안에서 홈으로 올라간 뒤 리렌더될 때
    // 다시 대시보드로 끌려 내려간다.
    navigate(location.pathname, { replace: true, state: null });
  }, [requestedSection, location.pathname, navigate, scrollToSection]);

  const goToDashboard = () => {
    scrollToSection(dashboardSectionRef, "smooth");
  };

  const goToHome = () => {
    scrollToSection(homeSectionRef, "smooth");
  };

  /**
   * @returns {Promise<boolean>} 저장 성공 여부 (HomeEditPage 가 이 값으로 모달을 닫을지 결정)
   */
  const handleSave = async (customization) => {
    try {
      const updated = await saveHomeCustomization(customization);
      setHome((prev) => ({ ...prev, ...updated }));
      setEditOpen(false);
      showToast("홈 화면을 저장했어요.", { tone: "success" });
      return true;
    } catch {
      // 실패 시 편집 화면을 닫지 않아 작업 내용을 잃지 않는다.
      showToast("저장하지 못했어요. 다시 시도해주세요.", { tone: "error" });
      return false;
    }
  };

  const handleRelationshipDateSave =
    async (startDate) => {
      try {
        setRelationshipDateSaving(true);

        const updated =
          await saveRelationshipStartDate(
            startDate,
          );

        setHome((previous) => ({
          ...previous,
          ...updated,
        }));
        setRelationshipDateOpen(false);
        showToast(
          "처음 만난 날을 저장했어요.",
          { tone: "success" },
        );
      } catch {
        showToast(
          "처음 만난 날을 저장하지 못했어요.",
          { tone: "error" },
        );
      } finally {
        setRelationshipDateSaving(false);
      }
    };

  return (
    // data-scroll-container: 모달이 열리면 global.css 가 이 컨테이너의 스크롤을 잠근다
    <div ref={containerRef} className={styles.snapContainer} data-scroll-container>
      <section ref={homeSectionRef} className={styles.snapSection} aria-label="홈">
        <HomePage
          home={home}
          onEdit={() => setEditOpen(true)}
          onEditStartDate={() =>
            setRelationshipDateOpen(true)
          }
          onViewDashboard={goToDashboard}
        />
      </section>

      <section
        ref={dashboardSectionRef}
        className={`${styles.snapSection} ${isSeamCovered ? styles.seamCovered : ""}`}
        aria-label="대시보드"
      >
        <button
          type="button"
          className={styles.backToHomeBtn}
          onClick={goToHome}
          aria-label="홈 화면으로"
        >
          <ChevronUp size={16} />
        </button>
        <DashboardPage />
      </section>

      {editOpen && home && (
        <HomeEditPage initial={home} onCancel={() => setEditOpen(false)} onSave={handleSave} />
      )}

      {relationshipDateOpen && home && (
        <RelationshipStartDateModal
          key={
            home.datingStartDate ||
            "relationship-start-empty"
          }
          initialDate={
            home.datingStartDate ?? ""
          }
          isSaving={
            relationshipDateSaving
          }
          onClose={() =>
            setRelationshipDateOpen(false)
          }
          onSave={
            handleRelationshipDateSave
          }
        />
      )}
    </div>
  );
}
