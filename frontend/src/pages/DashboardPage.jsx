import { useCallback, useEffect, useMemo, useState } from "react";
import { CloudOff } from "lucide-react";
import DashboardTopBar from "../components/dashboard/DashboardTopBar";
import DashboardSkeleton from "../components/dashboard/DashboardSkeleton";
import DashboardStats from "../components/dashboard/DashboardStats";
import EmotionCalendarStrip from "../components/dashboard/EmotionCalendarStrip";
import MonthCalendarModal from "../components/dashboard/MonthCalendarModal";
import MoodFormModal from "../components/dashboard/MoodFormModal";
import TodaySchedule from "../components/dashboard/TodaySchedule";
import EmotionReport from "../components/dashboard/EmotionReport";
import RecentPhotos from "../components/dashboard/RecentPhotos";
import BookmarkPreview from "../components/dashboard/BookmarkPreview";
import EmptyState from "../components/common/EmptyState";
import { fetchDashboard } from "../api/dashboardApi";
import { fetchMoodRecordsForMonth, saveMyMood, deleteMyMood } from "../api/moodApi";
import { addDays, formatDateKey, getWeekStart, parseDateKey } from "../utils/moodEmotion";
import { useToast } from "../hooks/useToast";
import styles from "./DashboardPage.module.css";

export default function DashboardPage() {
  const { showToast } = useToast();

  // { room, daysTogether, dashboard, todaySchedules, recentPhotos } — dashboardApi.fetchDashboard 참고
  const [dashboardData, setDashboardData] = useState(null);
  const [dashboardError, setDashboardError] = useState(false);

  // 감정 캘린더 상태
  const [weekStart, setWeekStart] = useState(() => getWeekStart(new Date()));
  const [monthCursor, setMonthCursor] = useState(() => new Date());
  const [moodRecords, setMoodRecords] = useState({}); // moodDate('YYYY-MM-DD') -> { myMood, partnerMood }
  const [selectedMoodDate, setSelectedMoodDate] = useState(null); // 스트립에서 펼쳐진 날짜
  const [monthModalOpen, setMonthModalOpen] = useState(false);
  const [moodFormModal, setMoodFormModal] = useState(null); // { mode, moodDate, initialMoodType, initialReason }

  const loadDashboard = useCallback(async () => {
    try {
      const data = await fetchDashboard();
      setDashboardData(data);
      setDashboardError(false);
    } catch {
      setDashboardError(true);
    }
  }, []);

  // effect 안에서 곧바로 setState 하지 않도록 await 를 한 번 끼워 호출한다.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      await Promise.resolve();
      if (!cancelled) loadDashboard();
    })();
    return () => {
      cancelled = true;
    };
  }, [loadDashboard]);

  const loadMonth = useCallback((cursor) => {
    fetchMoodRecordsForMonth(cursor.getFullYear(), cursor.getMonth())
      .then((records) => {
        setMoodRecords((prev) => ({ ...prev, ...records }));
      })
      .catch(() => {
        // 감정 기록만 실패한 경우 화면 전체를 막지 않고 알림만 띄운다.
        showToast("감정 기록을 불러오지 못했어요.", { tone: "error" });
      });
  }, [showToast]);

  // 현재 보이는 월 + 주가 걸쳐있는 달의 데이터를 함께 로드
  useEffect(() => {
    loadMonth(monthCursor);
  }, [monthCursor, loadMonth]);

  useEffect(() => {
    loadMonth(weekStart);
    loadMonth(addDays(weekStart, 6));
  }, [weekStart, loadMonth]);

  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = addDays(weekStart, i);
      const moodDate = formatDateKey(d);
      const record = moodRecords[moodDate];
      return {
        dayOfMonth: d.getDate(),
        moodDate,
        myMood: record?.myMood ?? null,
        partnerMood: record?.partnerMood ?? null,
      };
    });
  }, [weekStart, moodRecords]);

  // 주의 대표 월(주 시작일 기준)을 라벨로 사용
  const stripMonthLabel = `${weekStart.getMonth() + 1}월`;

  const handlePrevWeek = () => {
    setSelectedMoodDate(null);
    setWeekStart((w) => {
      const next = addDays(w, -7);
      setMonthCursor(next);
      return next;
    });
  };

  const handleNextWeek = () => {
    setSelectedMoodDate(null);
    setWeekStart((w) => {
      const next = addDays(w, 7);
      setMonthCursor(next);
      return next;
    });
  };

  const handleSelectDate = (moodDate) => {
    setSelectedMoodDate((cur) => (cur === moodDate ? null : moodDate));
  };

  const openMoodFormFor = (moodDate) => {
    const existingMyMood = moodRecords[moodDate]?.myMood ?? null;
    setMoodFormModal({
      mode: existingMyMood ? "edit" : "create",
      moodDate,
      initialMoodType: existingMyMood?.moodType ?? null,
      initialReason: existingMyMood?.reason ?? "",
    });
  };

  const handleRegisterClick = () => {
    openMoodFormFor(formatDateKey(new Date()));
  };

  const handleEditMyMood = (moodDate) => {
    openMoodFormFor(moodDate);
  };

  const handleMoodFormSubmit = async ({ moodType, reason }) => {
    const { moodDate, mode } = moodFormModal;
    try {
      const { record } = await saveMyMood(moodDate, { moodType, reason });
      setMoodRecords((prev) => ({ ...prev, [moodDate]: record }));
      setMoodFormModal(null);
      showToast(mode === "edit" ? "감정을 수정했어요." : "오늘의 감정을 기록했어요.", {
        tone: "success",
      });
    } catch {
      // 모달은 닫지 않아서 입력값을 잃지 않고 바로 다시 시도할 수 있다.
      showToast("감정을 저장하지 못했어요. 다시 시도해주세요.", { tone: "error" });
    }
  };

  const handleMoodFormDelete = async () => {
    const { moodDate } = moodFormModal;
    try {
      const { record } = await deleteMyMood(moodDate);
      setMoodRecords((prev) => ({ ...prev, [moodDate]: record }));
      setMoodFormModal(null);
      showToast("감정 기록을 삭제했어요.");
    } catch {
      showToast("삭제하지 못했어요. 다시 시도해주세요.", { tone: "error" });
    }
  };

  if (dashboardError) {
    return (
      <div className={`app-shell ${styles.centered}`}>
        <EmptyState
          tone="error"
          icon={<CloudOff size={22} />}
          title="대시보드를 불러오지 못했어요"
          description="네트워크 상태를 확인한 뒤 다시 시도해주세요."
          actionLabel="다시 시도"
          onAction={loadDashboard}
        />
      </div>
    );
  }

  if (!dashboardData) {
    return (
      <div className="app-shell">
        <DashboardSkeleton />
      </div>
    );
  }

  return (
    <div className="app-shell">
      <DashboardTopBar daysTogether={dashboardData.daysTogether} onMenuClick={() => {}} />

      {/* data-scroll-container: 모달이 열리면 global.css 가 이 영역의 스크롤을 잠근다 */}
      <div className={styles.scrollArea} data-scroll-container>
        <EmotionCalendarStrip
          monthLabel={stripMonthLabel}
          weekDays={weekDays}
          onPrevWeek={handlePrevWeek}
          onNextWeek={handleNextWeek}
          onMonthClick={() => setMonthModalOpen(true)}
          onRegisterClick={handleRegisterClick}
          selectedMoodDate={selectedMoodDate}
          onSelectDate={handleSelectDate}
          onEditMyMood={handleEditMyMood}
        />

        <div className={styles.gridRow}>
          <TodaySchedule schedules={dashboardData.todaySchedules} />
          <EmotionReport emotionSummary={dashboardData.dashboard.emotionSummary} />
        </div>

        <DashboardStats dashboard={dashboardData.dashboard} />

        <BookmarkPreview />

        <RecentPhotos photos={dashboardData.recentPhotos} />
      </div>


      <MonthCalendarModal
        open={monthModalOpen}
        onClose={() => setMonthModalOpen(false)}
        cursorDate={monthCursor}
        onChangeMonth={(next) => setMonthCursor(next)}
        moodRecords={moodRecords}
        onEditMyMood={handleEditMyMood}
      />

      {moodFormModal && (
        <MoodFormModal
          open
          onClose={() => setMoodFormModal(null)}
          mode={moodFormModal.mode}
          dateLabel={formatMoodDateLabel(moodFormModal.moodDate)}
          initialMoodType={moodFormModal.initialMoodType}
          initialReason={moodFormModal.initialReason}
          onSubmit={handleMoodFormSubmit}
          onDelete={moodFormModal.mode === "edit" ? handleMoodFormDelete : undefined}
        />
      )}
    </div>
  );
}

// 'YYYY-MM-DD' -> "7월 30일" (UTC 파싱으로 하루 밀리지 않도록 parseDateKey 사용)
function formatMoodDateLabel(moodDate) {
  const d = parseDateKey(moodDate);
  return `${d.getMonth() + 1}월 ${d.getDate()}일`;
}
