import {
  CalendarHeart,
  ChevronDown,
  Heart,
  Pencil,
  User,
} from "lucide-react";
import styles from "./HomePage.module.css";

// 커플 공용 홈 화면. 사진/문구/문구 위치/문구 스타일은 mypage에서가 아니라
// 이 화면의 '수정' 버튼(HomeEditPage)에서 설정하고, 두 사용자 모두 같은 값을 봅니다.
// - myProfileImageUrl / partnerProfileImageUrl : user.profile_image_url
// - datingStartDate : couple_room.dating_start_date ('from 260715' 형태로 표시)
// - imageUrl / caption / captionPosition / captionStyle
//   : home_image_setting의 커플 공용 설정
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
    datingStartDate,
    myNickname,
    partnerNickname,
    myProfileImageUrl,
    partnerProfileImageUrl,
    imageUrl,
    caption,
    captionPosition,
    captionStyle,
  } = home;

  const position = captionPosition ?? { xPercent: 50, yPercent: 72 };
  const style = captionStyle ?? { fontSize: "md", align: "left", box: "dim", color: "#ffffff" };

  const boxInlineStyle = {
    left: `${position.xPercent}%`,
    top: `${position.yPercent}%`,
    textAlign: style.align,
    color: style.color,
    fontSize: style.fontSizePx ? `${style.fontSizePx}px` : undefined,
    background: style.backgroundTransparency !== undefined
      ? `rgba(20, 20, 20, ${1 - Number(style.backgroundTransparency) / 100})`
      : undefined,
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
              from <span>{formatFromDate(datingStartDate)}</span>
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
          <ProfileCircle imageUrl={myProfileImageUrl} name={myNickname} fallbackLabel="나" />
          {/* 두 사람을 잇는 표시라 속을 채워야 눈에 걸린다 (선만 있으면 배경 사진에 묻힌다) */}
          <Heart
            className={styles.heart}
            size={20}
            fill="currentColor"
            stroke="none"
            aria-hidden="true"
          />
          <ProfileCircle
            imageUrl={partnerProfileImageUrl}
            name={partnerNickname}
            fallbackLabel="상대방"
          />
        </div>
      </div>

      {caption && (
        <div
          className={`${styles.captionBox} ${fontSizeClass} ${boxToneClass}`}
          style={boxInlineStyle}
        >
          <p
            className={styles.captionText}
            style={{ fontSize: style.fontSizePx ? `${style.fontSizePx}px` : undefined }}
          >
            {caption}
          </p>
        </div>
      )}

      <button type="button" className={styles.viewDashboardBtn} onClick={onViewDashboard}>
        <span>대시보드 확인하기</span>
        <ChevronDown size={18} />
      </button>
    </div>
  );
}

/** 사진이 없을 때는 기본 인물 아이콘을 사용하고, 애칭은 사진 하단에 표시한다. */
function ProfileCircle({ imageUrl, name, fallbackLabel }) {
  const displayName = name?.trim() || fallbackLabel;

  return (
    <span className={styles.profileCircle} aria-label={`${displayName} 프로필`}>
      <span className={styles.profileAvatar}>
        {imageUrl ? (
          <img src={imageUrl} alt={`${displayName} 프로필 사진`} />
        ) : (
          <span className={styles.profileFallback} aria-hidden="true">
            <User size={28} strokeWidth={1.7} />
          </span>
        )}
      </span>
      <span className={styles.profileNickname}>{displayName}</span>
    </span>
  );
}

/** 'YYYY-MM-DD' -> '260715' (문자열 그대로 자르므로 타임존 영향 없음) */
function formatFromDate(datingStartDate) {
  const [year, month, day] = String(datingStartDate).split("-");
  if (!year || !month || !day) return "";
  return `${year.slice(2)}${month}${day}`;
}
