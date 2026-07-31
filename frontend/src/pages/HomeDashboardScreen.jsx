import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ChevronUp } from "lucide-react";
import HomePage from "../components/home/HomePage";
import HomeEditPage from "../components/home/HomeEditPage";
import DashboardPage from "./DashboardPage";
import { fetchHomeScreen, saveHomeCustomization } from "../api/homeApi";
import { HOME_SECTION } from "../constants/navigation";
import { useToast } from "../hooks/useToast";
import styles from "./HomeDashboardScreen.module.css";

export default function HomeDashboardScreen() {
  const { showToast } = useToast();
  const location = useLocation();
  const navigate = useNavigate();
  const [home, setHome] = useState(null);
  const [editOpen, setEditOpen] = useState(false);

  const homeSectionRef = useRef(null);
  const dashboardSectionRef = useRef(null);

  // 다른 화면이 navigate state 로 시작 섹션을 지정했는지 (constants/navigation.js 참고)
  const requestedSection = location.state?.section ?? null;

  useEffect(() => {
    let cancelled = false;
    fetchHomeScreen()
      .then((data) => {
        if (!cancelled) setHome(data);
      })
      .catch(() => {
        if (!cancelled) showToast("홈 화면 설정을 불러오지 못했어요.", { tone: "error" });
      });
    return () => {
      cancelled = true;
    };
  }, [showToast]);

  /**
   * 지정된 섹션에서 시작해야 하면 애니메이션 없이 바로 그 자리로 옮긴다.
   * 섹션 높이가 100dvh 로 고정이라 데이터 로딩과 무관하게 위치가 정해진다.
   * useEffect 로 하면 홈 섹션이 한 프레임 보였다가 튀므로 페인트 전(useLayoutEffect)에 처리한다.
   */
  useLayoutEffect(() => {
    if (requestedSection !== HOME_SECTION.DASHBOARD) return;
    dashboardSectionRef.current?.scrollIntoView({ behavior: "instant", block: "start" });
    // 한 번 쓰고 비운다. 남겨두면 이 화면 안에서 홈으로 올라간 뒤 리렌더될 때
    // 다시 대시보드로 끌려 내려간다.
    navigate(location.pathname, { replace: true, state: null });
  }, [requestedSection, location.pathname, navigate]);

  const goToDashboard = () => {
    dashboardSectionRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const goToHome = () => {
    homeSectionRef.current?.scrollIntoView({ behavior: "smooth" });
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

  return (
    // data-scroll-container: 모달이 열리면 global.css 가 이 컨테이너의 스크롤을 잠근다
    <div className={styles.snapContainer} data-scroll-container>
      <section ref={homeSectionRef} className={styles.snapSection} aria-label="홈">
        <HomePage home={home} onEdit={() => setEditOpen(true)} onViewDashboard={goToDashboard} />
      </section>

      <section ref={dashboardSectionRef} className={styles.snapSection} aria-label="대시보드">
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
    </div>
  );
}
