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
import MoodTrendChart from "../components/dashboard/MoodTrendChart";
import { fetchMoodRecordsForMonth, saveMyMood } from "../api/moodApi";
import { MOOD_AXIS, buildMoodTrendSeries } from "../utils/moodTrendSeries";
import { DEFAULT_MOOD_WINDOW } from "../utils/moodSlotGrid";
import { getMoodNotificationSetting } from "../api/notificationSettingApi";
import { formatSlotTime } from "../utils/moodSlotFormat";
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
  // { mode, slot, initialMoodType, initialReason } — slot 이 없으면 지금 시간대에 새로 등록
  const [moodFormModal, setMoodFormModal] = useState(null);

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

  // 오늘의 무드 슬롯 (미리보기 + 꺾은선 그래프가 함께 쓴다)
  const todayMood = useMemo(() => {
    const todayKey = formatDateKey(new Date());
    return (
      moodRecords[todayKey] ?? { mySlots: [], partnerSlots: [], myMood: null, partnerMood: null }
    );
  }, [moodRecords]);

  // 슬롯 경계(시작~종료, 간격). 못 불러오면 기본값으로 그린다.
  const [moodWindow, setMoodWindow] = useState(DEFAULT_MOOD_WINDOW);

  useEffect(() => {
    getMoodNotificationSetting()
      .then((setting) => {
        if (setting?.startTime) setMoodWindow(setting);
      })
      .catch(() => {
        // 설정 조회 실패는 화면을 막지 않는다. 기본 슬롯으로 동작한다.
      });
  }, []);

  // 선택한 날짜의 슬롯
  const detailMood = useMemo(
    () => moodRecords[selectedMoodDate] ?? { mySlots: [], partnerSlots: [] },
    [moodRecords, selectedMoodDate]
  );

  // 오늘을 고른 경우에만 미래 시간대를 잠근다.
  const detailNowMinutes = useMemo(() => {
    if (selectedMoodDate !== formatDateKey(new Date())) return null;
    const now = new Date();
    return now.getHours() * 60 + now.getMinutes();
  }, [selectedMoodDate]);

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

  /**
   * 무드 모달 열기.
   * @param {object|null} slot 슬롯이 있으면 그 시간대를 수정, null 이면 지금 시간대에 새로 등록
   */
  const openMoodForm = ({ slot, minutesOfDay }) => {
    setMoodFormModal({
      mode: slot ? "edit" : "create",
      slot: slot ?? null,
      // 새로 등록할 때 어느 시간대인지 알아야 한다.
      dateKey: selectedMoodDate,
      minutesOfDay: slot?.minutesOfDay ?? minutesOfDay,
      initialMoodType: slot?.moodType ?? null,
      initialReason: slot?.reason ?? "",
    });
  };

  // 스트립/월달력에서 날짜를 고르면 그날의 마지막 기록을 수정 대상으로 삼는다.
  const handleEditMyMood = (moodDate) => {
    // 월간 달력에서는 그날을 선택 상태로 만들고 스트립 상세에서 시간대를 고르게 한다.
    setSelectedMoodDate(moodDate);
    setMonthModalOpen(false);
  };

  const handleMoodFormSubmit = async ({ moodType, reason }) => {
    const { mode, slot } = moodFormModal;
    try {
      // 슬롯이 있으면 그 기록을 수정하고, 없으면 지금 시간대에 새로 등록한다.
      await saveMyMood({
        moodId: slot?.moodId ?? null,
        moodType,
        reason,
        dateKey: moodFormModal.dateKey,
        minutesOfDay: moodFormModal.minutesOfDay,
      });
      setMoodFormModal(null);
      // 저장한 날짜가 속한 달을 다시 불러온다. (주가 달을 걸칠 때 monthCursor 만 보면 누락된다)
      loadMonth(moodFormModal.dateKey ? parseDateKey(moodFormModal.dateKey) : monthCursor);
      showToast(mode === "edit" ? "기분을 수정했어요." : "지금 기분을 기록했어요.", {
        tone: "success",
      });
    } catch {
      // 모달은 닫지 않아서 입력값을 잃지 않고 바로 다시 시도할 수 있다.
      showToast("기분을 저장하지 못했어요. 다시 시도해주세요.", { tone: "error" });
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
      <DashboardTopBar daysTogether={dashboardData.daysTogether} />

      {/* data-scroll-container: 모달이 열리면 global.css 가 이 영역의 스크롤을 잠근다 */}
      <div className={styles.scrollArea} data-scroll-container>
        {/* 기분 상세는 이 분홍 카드 안에 함께 들어간다 (별도 카드로 분리하지 않는다) */}
        <EmotionCalendarStrip
          monthLabel={stripMonthLabel}
          weekDays={weekDays}
          onPrevWeek={handlePrevWeek}
          onNextWeek={handleNextWeek}
          onMonthClick={() => setMonthModalOpen(true)}
          selectedMoodDate={selectedMoodDate}
          onSelectDate={handleSelectDate}
          detailMood={detailMood}
          moodWindow={moodWindow}
          detailNowMinutes={detailNowMinutes}
          onEditSlot={openMoodForm}
        />

        {/*
          시간대별 감정 변화.
          지금은 무드트래커 기반이고, 대화 감정 기반으로 바꾸려면 아래 두 줄만
          buildConversationTrendSeries(dashboardData.dashboard.emotionFlow) / CONVERSATION_AXIS
          로 교체하면 된다. (utils/moodTrendSeries.js 참고)
        */}
        <MoodTrendChart
          series={buildMoodTrendSeries(todayMood.mySlots, todayMood.partnerSlots)}
          axis={MOOD_AXIS}
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
          dateLabel={
            moodFormModal.minutesOfDay != null
              ? formatSlotTime(moodFormModal.minutesOfDay)
              : "지금 시간대"
          }
          initialMoodType={moodFormModal.initialMoodType}
          initialReason={moodFormModal.initialReason}
          onSubmit={handleMoodFormSubmit}
        />
      )}
    </div>
  );
}
