import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  CalendarDays,
  Calendar1,
  CalendarFold,
  CalendarRange,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CloudOff,
  Infinity as InfinityIcon,
} from "lucide-react";
import DashboardTopBar from "../../components/dashboard/DashboardTopBar/DashboardTopBar";
import DashboardSkeleton from "../../components/dashboard/DashboardSkeleton/DashboardSkeleton";
import DashboardStats from "../../components/dashboard/DashboardStats/DashboardStats";
import EmotionCalendarStrip from "../../components/dashboard/EmotionCalendarStrip/EmotionCalendarStrip";
import MoodFormModal from "../../components/dashboard/MoodFormModal/MoodFormModal";
import TodaySchedule from "../../components/dashboard/TodaySchedule/TodaySchedule";
import EmotionReport from "../../components/dashboard/EmotionReport/EmotionReport";
import RecentPhotos from "../../components/dashboard/RecentPhotos/RecentPhotos";
import BookmarkPreview from "../../components/dashboard/BookmarkPreview/BookmarkPreview";
import EmptyState from "../../components/common/EmptyState/EmptyState";
import HelpHint from "../../components/common/HelpHint/HelpHint";
import { fetchDashboard, fetchDashboardPeriod } from "../../api/dashboardApi";
import MoodTrendChart from "../../components/dashboard/MoodTrendChart/MoodTrendChart";
import { fetchMoodRecordsForMonth, fetchMoodSlots, saveMyMood } from "../../api/moodApi";
import {
  MOOD_REPORT_PERIODS,
  buildMoodDistribution,
  buildMoodReportTrend,
  buildPeriodDateKeys,
} from "../../utils/moodReport";
import { DEFAULT_MOOD_WINDOW } from "../../utils/moodSlotGrid";
import { getMoodNotificationSetting } from "../../api/notificationSettingApi";
import { formatSlotTime } from "../../utils/moodSlotFormat";
import { addDays, formatDateKey, getWeekStart, parseDateKey } from "../../utils/moodEmotion";
import { useToast } from "../../hooks/useToast";
import { useLiveSync } from "../../hooks/useLiveSync";
import styles from "./DashboardPage.module.css";

/*
 * 기간 계산은 기분 리포트와 대화 기록이 똑같이 쓴다.
 * 두 리포트는 재료(무드트래커 / 채팅 감정)만 다르고 '일간·주간·월간'이라는
 * 시간의 뜻은 같아야 한다. 한쪽만 주가 일요일에 시작하거나 하면 같은 날을
 * 두 그래프가 다른 칸에 넣는다.
 *
 * 하루의 경계는 사용자의 로컬 자정이다. formatDateKey/getWeekStart 가 전부
 * 로컬 기준이고 서버에도 'YYYY-MM-DD' 문자열로 나간다. (국내 서비스라 KST)
 */
const PERIOD_NOTE = "하루는 한국 시간 0시부터 24시까지를 기준으로 모아요.";

/* 기분 흐름의 X축은 기간마다 단위가 달라서, 설명도 그 단위를 따라간다. */
const MOOD_TREND_HINT = {
  DAY: "하루 중 어느 시간에 마음이 오르내렸는지 이어봤어요",
  WEEK: "요일마다 마음이 어떻게 달라졌는지 이어봤어요",
  MONTH: "한 달 동안 마음이 어떤 결로 흘러왔는지 이어봤어요",
  YEAR: "한 해 동안 마음이 어떤 결로 흘러왔는지 이어봤어요",
  ALL: "함께 기록한 모든 날의 마음 흐름을 이어봤어요",
};

function PeriodMenu({ value, onChange, label }) {
  const selectedLabel = MOOD_REPORT_PERIODS.find(([period]) => period === value)?.[1];
  const periodIcons = {
    DAY: Calendar1,
    WEEK: CalendarRange,
    MONTH: CalendarDays,
    YEAR: CalendarFold,
    ALL: InfinityIcon,
  };
  const SelectedIcon = periodIcons[value] ?? CalendarDays;
  return (
    <details className={styles.periodMenu}>
      <summary aria-label={label}>
        <span className={styles.periodMenuTriggerIcon}>
          <SelectedIcon size={16} aria-hidden="true" />
        </span>
        <span className={styles.periodMenuLabel}>{selectedLabel}</span>
        <ChevronDown className={styles.periodMenuChevron} size={15} aria-hidden="true" />
      </summary>
      <div className={styles.periodMenuList}>
        {MOOD_REPORT_PERIODS.map(([period, periodLabel]) => {
          const ItemIcon = periodIcons[period];
          return (
            <button
              key={period}
              type="button"
              className={value === period ? styles.periodMenuActive : ""}
              onClick={(event) => {
                onChange(period);
                event.currentTarget.closest("details")?.removeAttribute("open");
              }}
            >
              <span className={styles.periodMenuItemIcon}>
                <ItemIcon size={15} aria-hidden="true" />
              </span>
              <span className={styles.periodMenuItemLabel}>{periodLabel}</span>
              <span className={styles.periodMenuCheck}>
                {value === period && <Check size={14} aria-hidden="true" />}
              </span>
            </button>
          );
        })}
      </div>
    </details>
  );
}

function formatPeriodLabel(period, date) {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;

  if (period === "MONTH") return `${year}년 ${month}월`;
  if (period === "YEAR") return `${year}년`;
  if (period === "ALL") return "전체";

  if (period === "WEEK") {
    const start = getWeekStart(date);
    const end = addDays(start, 6);
    const endLabel =
      start.getMonth() === end.getMonth()
        ? `${end.getDate()}일`
        : `${end.getMonth() + 1}월 ${end.getDate()}일`;
    return `${start.getMonth() + 1}월 ${start.getDate()}일 ~ ${endLabel}`;
  }

  return `${year}년 ${month}월 ${date.getDate()}일`;
}

/** 다음 기간으로 넘어갈 수 있는지. 아직 오지 않은 기간은 볼 것이 없다. */
function isCurrentPeriod(period, date) {
  const now = new Date();

  if (period === "MONTH") {
    return (
      date.getFullYear() > now.getFullYear() ||
      (date.getFullYear() === now.getFullYear() &&
        date.getMonth() >= now.getMonth())
    );
  }
  if (period === "YEAR") return date.getFullYear() >= now.getFullYear();
  if (period === "ALL") return true;

  if (period === "WEEK") {
    return getWeekStart(date) >= getWeekStart(now);
  }

  return formatDateKey(date) >= formatDateKey(now);
}

function shiftPeriod(period, date, direction) {
  const next = new Date(date);

  if (period === "MONTH") next.setMonth(next.getMonth() + direction, 1);
  else if (period === "YEAR") next.setFullYear(next.getFullYear() + direction, 0, 1);
  else if (period === "WEEK") next.setDate(next.getDate() + direction * 7);
  else next.setDate(next.getDate() + direction);

  return next;
}

export default function DashboardPage() {
  const { showToast } = useToast();
  const scrollAreaRef = useRef(null);
  const [showTopScrollHint, setShowTopScrollHint] = useState(false);

  const updateScrollHints = useCallback(() => {
    const element = scrollAreaRef.current;
    if (!element) return;

    const next = element.scrollTop > 2;
    setShowTopScrollHint((current) => (current === next ? current : next));
  }, []);

  useEffect(() => {
    const element = scrollAreaRef.current;
    if (!element) return undefined;

    const frameId = requestAnimationFrame(updateScrollHints);
    const resizeObserver = new ResizeObserver(updateScrollHints);
    const mutationObserver = new MutationObserver(updateScrollHints);
    resizeObserver.observe(element);
    mutationObserver.observe(element, { childList: true, subtree: true });

    return () => {
      cancelAnimationFrame(frameId);
      resizeObserver.disconnect();
      mutationObserver.disconnect();
    };
  }, [updateScrollHints]);

  // { room, daysTogether, dashboard, todaySchedules, recentPhotos } — dashboardApi.fetchDashboard 참고
  const [dashboardData, setDashboardData] = useState(null);
  const [dashboardError, setDashboardError] = useState(false);
  /*
   * 리포트가 둘이고, 기간도 따로 논다.
   *   moodPeriod  — 기분 리포트. 무드트래커 기록을 프론트에서 잘라 쓴다.
   *   reportPeriod — 대화 기록. 서버 집계(GET /dashboards/*)를 기간째로 받아온다.
   * 하나로 묶으면 한쪽을 보려고 옮긴 기간이 다른 쪽까지 끌고 가서,
   * 지난주 기분을 보려다 대화 기록도 함께 지난주로 넘어간다.
   */
  const [moodPeriod, setMoodPeriod] = useState("DAY");
  const [moodDate, setMoodDate] = useState(() => new Date());

  const [reportPeriod, setReportPeriod] = useState("DAY");
  const [reportDate, setReportDate] = useState(() => new Date());
  const [periodDashboard, setPeriodDashboard] = useState(null);
  const [periodLoading, setPeriodLoading] = useState(false);

  // 감정 캘린더 상태
  const [weekStart, setWeekStart] = useState(() => getWeekStart(new Date()));
  const [moodRecords, setMoodRecords] = useState({}); // moodDate('YYYY-MM-DD') -> { myMood, partnerMood }
  /*
   * 스트립에서 펼쳐진 날짜.
   * 오늘로 시작한다. null 로 두면 날짜 원을 한 번 눌러야 시간대 목록이 나와서,
   * 대시보드를 열었을 때 기분을 기록할 버튼이 아예 안 보인다.
   */
  const [selectedMoodDate, setSelectedMoodDate] = useState(() =>
    formatDateKey(new Date())
  );
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

  useEffect(() => {
    loadMonth(weekStart);
    loadMonth(addDays(weekStart, 6));
  }, [weekStart, loadMonth]);

  /*
   * 기분 리포트가 보고 있는 기간의 달.
   * 주간은 달을 걸칠 수 있어 시작일과 종료일의 달을 함께 받는다.
   * (fetchMoodRecordsForMonth 는 매번 전체를 받아 걸러내므로 중복 호출이 손해는 아니다)
   */
  useEffect(() => {
    if (moodPeriod === "ALL" || moodPeriod === "YEAR") {
      fetchMoodSlots()
        .then(setMoodRecords)
        .catch(() => showToast("감정 기록을 불러오지 못했어요.", { tone: "error" }));
      return;
    }

    loadMonth(moodDate);
    if (moodPeriod === "WEEK") {
      const start = getWeekStart(moodDate);
      loadMonth(start);
      loadMonth(addDays(start, 6));
    }
  }, [moodDate, moodPeriod, loadMonth, showToast]);

  const refreshDashboard = useCallback(async () => {
    await Promise.allSettled([
      loadDashboard(),
      loadPeriodDashboard(),
      loadMonth(weekStart),
      loadMonth(addDays(weekStart, 6)),
    ]);
  }, [loadDashboard, loadMonth, loadPeriodDashboard, weekStart]);

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
        monthNumber: d.getMonth() + 1,
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

  const stripWeekEnd = addDays(weekStart, 6);
  const stripMonthLabel =
    weekStart.getFullYear() !== stripWeekEnd.getFullYear()
      ? `${weekStart.getFullYear()}년 ${weekStart.getMonth() + 1}월 / ${stripWeekEnd.getFullYear()}년 ${stripWeekEnd.getMonth() + 1}월`
      : weekStart.getMonth() !== stripWeekEnd.getMonth()
        ? `${weekStart.getMonth() + 1}/${stripWeekEnd.getMonth() + 1}월`
        : `${weekStart.getMonth() + 1}월`;

  const moveReportDate = (direction) => {
    setReportDate((current) => shiftPeriod(reportPeriod, current, direction));
  };

  const changeReportPeriod = (period) => {
    setPeriodDashboard(null);
    setReportPeriod(period);
    setReportDate(new Date());
  };

  const moveMoodDate = (direction) => {
    setMoodDate((current) => shiftPeriod(moodPeriod, current, direction));
  };

  const changeMoodPeriod = (period) => {
    setMoodPeriod(period);
    setMoodDate(new Date());
  };

  /* ── 기분 리포트 (무드트래커) ─────────────────────────────────────
     서버를 다시 부르지 않는다. moodRecords 에 이미 방 전체 기록이 들어와 있어서
     기간에 해당하는 날짜만 골라 세면 된다. (moodApi.fetchMoodSlots 가 전부 받아온다) */
  const moodDateKeys = useMemo(
    () => moodPeriod === "ALL"
      ? Object.keys(moodRecords).sort()
      : buildPeriodDateKeys(moodPeriod, moodDate),
    [moodPeriod, moodDate, moodRecords],
  );

  const myMoodShare = useMemo(
    () => buildMoodDistribution(moodRecords, moodDateKeys, "mySlots"),
    [moodRecords, moodDateKeys],
  );

  const partnerMoodShare = useMemo(
    () => buildMoodDistribution(moodRecords, moodDateKeys, "partnerSlots"),
    [moodRecords, moodDateKeys],
  );

  const moodTrend = useMemo(
    () => buildMoodReportTrend(moodRecords, moodDateKeys, moodPeriod),
    [moodRecords, moodDateKeys, moodPeriod],
  );

  /* ── 대화 기록 (채팅 감정) ──────────────────────────────────────── */
  const visiblePeriodDashboard =
    periodDashboard?.period === reportPeriod
      ? periodDashboard
      : null;

  const reportPeriodName = {
    DAY: "일간",
    WEEK: "주간",
    MONTH: "월간",
    YEAR: "연간",
    ALL: "전체",
  }[reportPeriod];

  const isTodayReport =
    reportPeriod === "DAY" &&
    formatDateKey(reportDate) === formatDateKey(new Date());

  // 오늘 일간은 채팅 원본 폴백이 반영된 실시간 값을 우선하고,
  // 과거 일간·월간·연간은 선택한 기간의 서버 집계를 그대로 표시한다.
  const conversationDashboard = isTodayReport
    ? {
        ...visiblePeriodDashboard,
        ...dashboardData?.dashboard,
      }
    : visiblePeriodDashboard;

  const handlePrevWeek = () => {
    setSelectedMoodDate(null);
    setWeekStart((w) => addDays(w, -7));
  };

  const handleNextWeek = () => {
    setSelectedMoodDate(null);
    setWeekStart((w) => addDays(w, 7));
  };

  const handleSelectDate = (moodDate) => {
    setSelectedMoodDate((cur) => (cur === moodDate ? null : moodDate));
  };

  const handleGoToToday = () => {
    const today = new Date();
    setWeekStart(getWeekStart(today));
    setSelectedMoodDate(formatDateKey(today));
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
      // 저장한 날짜가 속한 달을 다시 불러온다.
      loadMonth(moodFormModal.dateKey ? parseDateKey(moodFormModal.dateKey) : weekStart);
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

      <div className={styles.scrollFrame}>
        {showTopScrollHint && <div className={styles.scrollHintTop} aria-hidden="true" />}

        {/* data-scroll-container: 모달이 열리면 global.css 가 이 영역의 스크롤을 잠근다 */}
        <div
          ref={scrollAreaRef}
          className={styles.scrollArea}
          data-scroll-container
          onScroll={updateScrollHints}
        >
        {/* 기분 상세는 이 분홍 카드 안에 함께 들어간다 (별도 카드로 분리하지 않는다) */}
        <EmotionCalendarStrip
          monthLabel={stripMonthLabel}
          weekDays={weekDays}
          onPrevWeek={handlePrevWeek}
          onNextWeek={handleNextWeek}
          onToday={handleGoToToday}
          isCurrentWeek={getWeekStart(new Date()).getTime() === weekStart.getTime()}
          selectedMoodDate={selectedMoodDate}
          onSelectDate={handleSelectDate}
          detailMood={detailMood}
          moodWindow={moodWindow}
          detailNowMinutes={detailNowMinutes}
          onEditSlot={openMoodForm}
        />

        {/*
          오늘의 일정은 "오늘"에 매인 값이라 일·월·연 전환과 아무 상관이 없다.
          기간에 따라 사라지지 않는 독립 섹션으로 둔다.
        */}
        <TodaySchedule schedules={dashboardData.todaySchedules} />

        {/*
          기분 리포트 — 무드트래커(GET /moods)가 재료다.
          '감정 리포트'였을 때는 채팅 감정 분석을 쓰면서도 바로 위 무드트래커와
          같은 말(감정)을 써서, 두 사람이 직접 고른 기분과 AI 가 읽어낸 대화 감정이
          한 이름으로 섞였다. 이제 이름과 재료를 맞춘다.
            기분 = 두 사람이 시간대마다 고른 5단계  -> 이 섹션
            감정 = 대화 내용을 분석한 15종         -> 아래 '대화 기록' 섹션

          도넛은 나/상대를 갈라 그린다. 각자 자기 기분을 고른 기록이라 합치면
          "둘 다 보통이었다"는 없는 이야기가 만들어진다. (utils/moodReport 주석 참고)
        */}
        <section className="surface-plain" aria-labelledby="dashboard-mood-report-title">
          <header className="section-head section-head-inline">
            <h2 id="dashboard-mood-report-title" className="section-title">
              무드트래커 리포트
            </h2>

            {/*
              집계 기준은 제목 옆 물음표에 숨긴다.
              한 번 알면 되는 규칙이라 늘 펼쳐 두면 그래프보다 각주가 길어진다.
            */}
            <HelpHint label="무드트래커 리포트 집계 기준">{PERIOD_NOTE}</HelpHint>
          </header>

          <div className={styles.reportPanel}>
            <PeriodMenu
              value={moodPeriod}
              onChange={changeMoodPeriod}
              label="무드트래커 리포트 기간 선택"
            />

            <div className={styles.periodNavigator}>
              {moodPeriod === "ALL" ? <span aria-hidden="true" /> : (
                <button type="button" onClick={() => moveMoodDate(-1)} aria-label="이전 기간">
                  <ChevronLeft size={18} />
                </button>
              )}
              <strong>{formatPeriodLabel(moodPeriod, moodDate)}</strong>
              {moodPeriod === "ALL" ? <span aria-hidden="true" /> : (
                <button
                  type="button"
                  onClick={() => moveMoodDate(1)}
                  disabled={isCurrentPeriod(moodPeriod, moodDate)}
                  aria-label="다음 기간"
                >
                  <ChevronRight size={18} />
                </button>
              )}
            </div>

            {/*
              한 상자 안에 그래프가 여럿이다. 같은 기간의 같은 기분을 보는데
              담고 있는 정보가 다르므로 제목이 그 차이를 말해야 한다.
                비율 — 어떤 기분이 얼마만큼이었나 (합이 100%)
                흐름 — 그 기분이 언제였나 (시간 축)
              '기분 분포 / 기분 변화' 처럼 뭉뚱그리면 둘 다 같은 말로 읽힌다.
            */}
            <div className={styles.reportBlock}>
              <p className="panel-title">
                기록된 기분 비율
                <span>두 사람이 각각 어떤 기분을 얼마나 남겼는지 모아봤어요</span>
              </p>

              <div className={styles.sideBlock}>
                <p className={styles.sideLabel}>나</p>
                <EmotionReport
                  segments={myMoodShare}
                  emptyText="이 기간에 남긴 기분이 아직 없어요."
                />
              </div>

              <div className={styles.sideBlock}>
                <p className={styles.sideLabel}>상대방</p>
                <EmotionReport
                  segments={partnerMoodShare}
                  emptyText="상대방이 남긴 기분이 아직 없어요."
                />
              </div>
            </div>

            <div className={styles.reportBlock}>
              <p className="panel-title">
                기록된 기분 흐름
                <span>{MOOD_TREND_HINT[moodPeriod]}</span>
              </p>

              <MoodTrendChart
                bare
                series={moodTrend.series}
                axis={moodTrend.axis}
                emptyText={"기분을 기록하면\n두 사람의 흐름이 나란히 그려져요."}
                onPointSelect={(point) => {
                  setMoodPeriod(point.targetPeriod);
                  setMoodDate(parseDateKey(point.targetDate));
                }}
              />
            </div>
          </div>
        </section>

        {/*
          대화 기록 리포트 — 채팅(GET /dashboards/*)이 재료다.
          이쪽 도넛은 두 사람을 합산한다. 대화는 둘이 함께 만든 한 덩어리라,
          갈라 놓으면 오간 흐름이 보이지 않는다.

          시간 축 그래프는 위 무드트래커 리포트가 맡는다. 두 섹션이 나란히
          꺾은선을 하나씩 갖고 있으면 어느 쪽 '흐름'인지 매번 되짚어야 한다.
        */}
        <DashboardStats
          dashboard={conversationDashboard}
          title="대화 기록 리포트"
          emotionLabel={`${reportPeriodName} 채팅 감정 분포 비율`}
          periodControl={
            <div className={styles.chatPeriod} aria-busy={periodLoading}>
              <PeriodMenu
                value={reportPeriod}
                onChange={changeReportPeriod}
                label="대화 기록 리포트 기간 선택"
              />

              <div className={styles.periodNavigator}>
                {reportPeriod === "ALL" ? <span aria-hidden="true" /> : (
                  <button type="button" onClick={() => moveReportDate(-1)} aria-label="이전 기간">
                    <ChevronLeft size={18} />
                  </button>
                )}
                <strong>{formatPeriodLabel(reportPeriod, reportDate)}</strong>
                {reportPeriod === "ALL" ? <span aria-hidden="true" /> : (
                  <button
                    type="button"
                    onClick={() => moveReportDate(1)}
                    disabled={isCurrentPeriod(reportPeriod, reportDate)}
                    aria-label="다음 기간"
                  >
                    <ChevronRight size={18} />
                  </button>
                )}
              </div>
            </div>
          }
        />

        <BookmarkPreview />

          <RecentPhotos photos={dashboardData.recentPhotos} />
        </div>
      </div>
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
