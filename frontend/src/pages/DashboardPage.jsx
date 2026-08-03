import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, CloudOff } from "lucide-react";
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
import { fetchDashboard, fetchDashboardPeriod } from "../api/dashboardApi";
import MoodTrendChart from "../components/dashboard/MoodTrendChart";
import { fetchMoodRecordsForMonth, saveMyMood } from "../api/moodApi";
import {
  CONVERSATION_AXIS,
  buildConversationTrendSeries,
} from "../utils/moodTrendSeries";
import { DEFAULT_MOOD_WINDOW } from "../utils/moodSlotGrid";
import { getMoodNotificationSetting } from "../api/notificationSettingApi";
import { formatSlotTime } from "../utils/moodSlotFormat";
import { addDays, formatDateKey, getWeekStart, parseDateKey } from "../utils/moodEmotion";
import { useToast } from "../hooks/useToast";
import { useLiveSync } from "../hooks/useLiveSync";
import styles from "./DashboardPage.module.css";

export default function DashboardPage() {
  const { showToast } = useToast();

  // { room, daysTogether, dashboard, todaySchedules, recentPhotos } — dashboardApi.fetchDashboard 참고
  const [dashboardData, setDashboardData] = useState(null);
  const [dashboardError, setDashboardError] = useState(false);
  const [reportPeriod, setReportPeriod] = useState("DAY");
  const [reportDate, setReportDate] = useState(() => new Date());
  const [periodDashboard, setPeriodDashboard] = useState(null);
  const [periodLoading, setPeriodLoading] = useState(false);

  // 감정 캘린더 상태
  const [weekStart, setWeekStart] = useState(() => getWeekStart(new Date()));
  const [monthCursor, setMonthCursor] = useState(() => new Date());
  const [moodRecords, setMoodRecords] = useState({}); // moodDate('YYYY-MM-DD') -> { myMood, partnerMood }
  /*
   * 스트립에서 펼쳐진 날짜.
   * 오늘로 시작한다. null 로 두면 날짜 원을 한 번 눌러야 시간대 목록이 나와서,
   * 대시보드를 열었을 때 기분을 기록할 버튼이 아예 안 보인다.
   */
  const [selectedMoodDate, setSelectedMoodDate] = useState(() =>
    formatDateKey(new Date())
  );
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

  const loadPeriodDashboard = useCallback(async () => {
    try {
      setPeriodLoading(true);
      const data = await fetchDashboardPeriod({
        period: reportPeriod,
        date: reportDate,
      });
      setPeriodDashboard(data);
    } catch {
      showToast("기간별 대시보드를 불러오지 못했어요.", { tone: "error" });
    } finally {
      setPeriodLoading(false);
    }
  }, [reportDate, reportPeriod, showToast]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await Promise.resolve();
      if (!cancelled) {
        loadPeriodDashboard();
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [loadPeriodDashboard]);

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
    return fetchMoodRecordsForMonth(cursor.getFullYear(), cursor.getMonth())
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

  const refreshDashboard = useCallback(async () => {
    await Promise.allSettled([
      loadDashboard(),
      loadPeriodDashboard(),
      loadMonth(monthCursor),
      loadMonth(weekStart),
      loadMonth(addDays(weekStart, 6)),
    ]);
  }, [loadDashboard, loadMonth, loadPeriodDashboard, monthCursor, weekStart]);

  // 상대방이 다른 브라우저에서 무드를 등록해도 주기적으로 GET /moods를
  // 다시 호출해 내 화면에 반영한다.
  useLiveSync(refreshDashboard, {
    intervalMs: 3000,
  });

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

  const periodLabel = useMemo(() => {
    const year = reportDate.getFullYear();
    const month = reportDate.getMonth() + 1;
    const day = reportDate.getDate();

    if (reportPeriod === "YEAR") return `${year}년`;
    if (reportPeriod === "MONTH") return `${year}년 ${month}월`;
    return `${year}년 ${month}월 ${day}일`;
  }, [reportDate, reportPeriod]);

  const isCurrentPeriod = useMemo(() => {
    const now = new Date();
    if (reportPeriod === "YEAR") {
      return reportDate.getFullYear() >= now.getFullYear();
    }
    if (reportPeriod === "MONTH") {
      return (
        reportDate.getFullYear() === now.getFullYear() &&
        reportDate.getMonth() >= now.getMonth()
      );
    }
    return formatDateKey(reportDate) >= formatDateKey(now);
  }, [reportDate, reportPeriod]);

  const moveReportDate = (direction) => {
    setReportDate((current) => {
      const next = new Date(current);
      if (reportPeriod === "YEAR") {
        next.setFullYear(next.getFullYear() + direction);
      } else if (reportPeriod === "MONTH") {
        next.setMonth(next.getMonth() + direction, 1);
      } else {
        next.setDate(next.getDate() + direction);
      }
      return next;
    });
  };

  const changeReportPeriod = (period) => {
    setPeriodDashboard(null);
    setReportPeriod(period);
    setReportDate(new Date());
  };

  // (제목은 '감정 리포트' 로 고정한다. 어느 기간인지는 아래 탭과 날짜가 이미 보여준다)
  // (오늘의 일정은 기간과 무관한 독립 섹션이라 더 이상 조건을 두지 않는다)
  const visiblePeriodDashboard =
    periodDashboard?.period === reportPeriod
      ? periodDashboard
      : null;

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
   * @param {object|null} slot 슬롯이 있으면 그 기록을 수정, null 이면 새로 등록
   */
  const openMoodForm = ({ slot, minutesOfDay }) => {
    setMoodFormModal({
      mode: slot ? "edit" : "create",
      slot: slot ?? null,
      dateKey: selectedMoodDate,
      // 모달 제목에 "몇 시 기분인지" 적기 위한 값. 저장 시각은 서버가 정한다.
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
      // (시각은 서버가 정한다. minutesOfDay 는 모달 제목에만 쓴다)
      await saveMyMood({
        moodId: slot?.moodId ?? null,
        moodType,
        reason,
        dateKey: moodFormModal.dateKey,
      });
      setMoodFormModal(null);
      // 저장한 날짜가 속한 달을 다시 불러온다. (주가 달을 걸칠 때 monthCursor 만 보면 누락된다)
      loadMonth(moodFormModal.dateKey ? parseDateKey(moodFormModal.dateKey) : monthCursor);
      showToast(mode === "edit" ? "기분을 수정했어요." : "지금 기분을 기록했어요.", {
        tone: "success",
      });
    } catch (error) {
      // 모달은 닫지 않아서 입력값을 잃지 않고 바로 다시 시도할 수 있다.
      // 서버가 알려준 이유가 있으면 그대로 보여준다. (지난 날짜, 검증 실패 등)
      showToast(error.message || "기분을 저장하지 못했어요. 다시 시도해주세요.", {
        tone: "error",
      });
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

        {/* 선택한 기간에 분석된 대화 감정을 2시간대별로 합산한다. */}
        <MoodTrendChart
          series={buildConversationTrendSeries(
            visiblePeriodDashboard?.emotionFlow ?? [],
          )}
          axis={CONVERSATION_AXIS}
        />

        {/*
          오늘의 일정은 "오늘"에 매인 값이라 일·월·연 전환과 아무 상관이 없다.
          기간에 따라 사라지지 않는 독립 섹션으로 둔다.
        */}
        <TodaySchedule schedules={dashboardData.todaySchedules} />

        {/*
          감정 리포트. 제목은 다른 섹션들처럼 상자 밖에 두고,
          기간 선택과 리포트만 색 면 안에 넣는다.
        */}
        <section
          className="surface-plain"
          aria-labelledby="dashboard-report-title"
          aria-busy={periodLoading}
        >
          <header className="section-head">
            <h2 id="dashboard-report-title" className="section-title">
              감정 리포트
            </h2>
          </header>

          <div className={styles.reportPanel}>
            <div className={styles.periodTabs}>
              {[
                ["DAY", "일간"],
                ["MONTH", "월간"],
                ["YEAR", "연간"],
              ].map(([period, label]) => (
                <button
                  key={period}
                  type="button"
                  className={reportPeriod === period ? styles.periodTabActive : ""}
                  aria-pressed={reportPeriod === period}
                  onClick={() => changeReportPeriod(period)}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className={styles.periodNavigator}>
              <button type="button" onClick={() => moveReportDate(-1)} aria-label="이전 기간">
                <ChevronLeft size={18} />
              </button>
              <strong>{periodLabel}</strong>
              <button
                type="button"
                onClick={() => moveReportDate(1)}
                disabled={isCurrentPeriod}
                aria-label="다음 기간"
              >
                <ChevronRight size={18} />
              </button>
            </div>

            <EmotionReport
              emotionSummary={visiblePeriodDashboard?.emotionSummary ?? []}
            />
          </div>
        </section>

        {/*
          대화 기록은 항상 오늘 기준이다.
          위 감정 리포트의 기간 전환은 리포트에만 적용된다.
          (예전에는 같은 기간을 따라가서, 리포트를 연간으로 보면 대화 기록까지
           연간으로 바뀌고 사진·공감 개수가 사라졌다)
        */}
        <DashboardStats
          dashboard={dashboardData.dashboard}
          title="일간 대화 기록"
        />

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
