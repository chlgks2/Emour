import {
  CalendarHeart,
  ChevronDown,
  Pencil,
} from "lucide-react";
import styles from "./HomePage.module.css";

// 커플 공용 홈 화면. 사진/문구/문구 위치/문구 스타일은 mypage에서가 아니라
// 이 화면의 '수정' 버튼(HomeEditPage)에서 설정하고, 두 사용자 모두 같은 값을 봅니다.
// - myProfileImageUrl / partnerProfileImageUrl : user.profile_image_url
// - daysTogether : couple_room.dating_start_date 로부터 계산한 파생값
// - imageUrl / caption / captionPosition / captionStyle / relationshipName
//   : ⚠️ ERD에 대응 컬럼이 아직 없음 (api/homeApi.js 상단 주석 참고)
export default function HomePage({
  home,
  onEdit,
  onEditStartDate,
  onViewDashboard,
}) {
  // 로딩 중에 아무것도 렌더하지 않으면 검은 화면만 보이므로 최소한의 자리를 잡아둔다.
  if (!home) {
    return (
      <div className={styles.home} aria-busy="true">
        <div className={styles.overlayGradient} />
        <p className={styles.loadingText}>홈 화면을 불러오는 중...</p>
      </div>
    );
  }

  const {
    daysTogether,
    datingStartDate,
    myProfileImageUrl,
    partnerProfileImageUrl,
    imageUrl,
    caption,
    captionPosition,
    captionStyle,
    relationshipName = "우리",
  } = home;

  const position = captionPosition ?? { xPercent: 50, yPercent: 72 };
  const style = captionStyle ?? { fontSize: "md", align: "left", box: "dim", color: "#ffffff" };

  const boxInlineStyle = {
    left: `${position.xPercent}%`,
    top: `${position.yPercent}%`,
    textAlign: style.align,
    color: style.color,
  };

  const fontSizeClass =
    style.fontSize === "lg" ? styles.captionLg : style.fontSize === "sm" ? styles.captionSm : styles.captionMd;

  const boxToneClass =
    style.box === "solid" ? styles.captionBoxSolid : style.box === "none" ? styles.captionBoxNone : styles.captionBoxDim;

  return (
    <div className={styles.home}>
      {imageUrl && <img src={imageUrl} alt="" className={styles.bgPhoto} />}
      <div className={styles.overlayGradient} />

      <button type="button" className={styles.editBtn} onClick={onEdit}>
        수정
      </button>

      <div className={styles.headerInfo}>
        {datingStartDate ? (
          <div className={styles.daysRow}>
            <p className={styles.days}>
              {relationshipName},{" "}
              <span>{daysTogether}</span> Days
            </p>

            <button
              type="button"
              className={styles.dateEditButton}
              aria-label="처음 만난 날 수정"
              onClick={onEditStartDate}
            >
              <Pencil size={13} />
            </button>
          </div>
        ) : (
          <button
            type="button"
            className={styles.registerDateButton}
            onClick={onEditStartDate}
          >
            <CalendarHeart size={17} />
            <span>처음 만난 날 등록하기</span>
          </button>
        )}

        <div className={styles.profiles}>
          <span className={styles.profileCircle}>
            {myProfileImageUrl && <img src={myProfileImageUrl} alt="나" />}
          </span>
          <span className={styles.heart}>♥</span>
          <span className={styles.profileCircle}>
            {partnerProfileImageUrl && <img src={partnerProfileImageUrl} alt="상대방" />}
          </span>
        </div>
      </div>

      {caption && (
        <div
          className={`${styles.captionBox} ${fontSizeClass} ${boxToneClass}`}
          style={boxInlineStyle}
        >
          <span className={styles.quoteMark}>&ldquo;</span>
          <p className={styles.captionText}>{caption}</p>
        </div>
      )}

      <button type="button" className={styles.viewDashboardBtn} onClick={onViewDashboard}>
        <span>대시보드 확인하기</span>
        <ChevronDown size={18} />
      </button>
    </div>
  );
}
