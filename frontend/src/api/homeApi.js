// 홈 화면 데이터.
//
// ── 백엔드에서 오는 값 ────────────────────────────────────────────
//   myNickname                              : GET /users/me       (MemberProfileResponse.nickname)
//   myProfileImageUrl / partnerProfileImageUrl
//                                           : GET /users/profile-img (MemberProfileImagesResponse)
//   datingStartDate                         : GET /couples/startDate (couple_room.dating_start_date)
//   daysTogether                            : datingStartDate 로부터 계산하는 프론트 파생값
//
// ── 아직 백엔드에 없어서 이 브라우저에만 남는 값 ───────────────────
//   imageUrl(홈 배경 사진), caption(문구), captionPosition, captionStyle
//   couple_room / album_photo 어디에도 저장할 곳이 없다.
//     (a) couple_room 에 컬럼 추가  또는  (b) home_customization 신규 테이블
//   중 하나가 정해지면 아래 readSaved/saveHomeCustomization 만 API 호출로 바꾸면 된다.
//
//   ⚠️ 그때까지는 "커플 공용"이 아니라 "이 브라우저 전용"이다.
//      한쪽이 배경을 바꿔도 상대에게는 보이지 않는다.
//      최소한 계정끼리는 섞이지 않도록 저장 키를 사용자별로 나눠 둔다.
//
//   ⚠️ 상대방 별명(couple_member.partner_nickname)은 아직 어떤 응답 DTO 에도 실려오지 않는다.
//      (CoupleStatusResponse 는 roomId/status 만, MemberProfileResponse 는 '나'만 반환)
//      백엔드가 노출해주면 fetchPartner() 의 nickname 만 채우면 된다.
import homeBg from "../assets/home-bg.jpg";
import { calcDaysTogether } from "./dashboardApi";
import {
  getRelationshipStartDate,
  updateRelationshipStartDate,
} from "./calendarApi.js";
import { getCurrentUser } from "./authApi.js";
import {
  getMyProfile,
  getPartnerNickname,
  getProfileImages,
} from "./memberApi.js";

const STORAGE_KEY = "emour_home_customization_v1";
// 사용자 구분 없이 쓰던 예전 키. 계정을 바꿔도 남의 설정이 그대로 보였다.
const LEGACY_STORAGE_KEY = "emour_mock_home_v1";

const DEFAULT_HOME = {
  imageUrl: homeBg,
  caption: "그대를 여름날에 비하여도 괜찮을까요",
  captionPosition: { xPercent: 50, yPercent: 72 },
  captionStyle: { fontSize: "md", align: "left", box: "dim", color: "#ffffff" },
};

/*
 * 홈 배경이 바뀌었음을 앱 바깥(AppViewport 무대)에 알린다.
 *
 * 무대 배경은 홈 배경 사진을 아주 세게 흐린 것이다. 그래서 사용자가 홈 사진을
 * 바꾸면 무대도 같이 바뀌어야 하는데, 두 화면은 부모-자식 관계가 아니라 상태를
 * 그냥 내려줄 수가 없다. 값 자체는 localStorage 에 있으므로 "다시 읽어라"는
 * 신호만 보낸다.
 */
const HOME_BACKGROUND_EVENT = "emour:home-background-changed";

/** 지금 홈 배경으로 쓰이는 사진 주소. 사용자가 바꾼 적 없으면 기본 사진. */
export function getHomeBackgroundUrl() {
  return readSaved()?.imageUrl || homeBg;
}

export function subscribeHomeBackground(listener) {
  window.addEventListener(HOME_BACKGROUND_EVENT, listener);
  return () => window.removeEventListener(HOME_BACKGROUND_EVENT, listener);
}

function notifyHomeBackgroundChanged() {
  window.dispatchEvent(new CustomEvent(HOME_BACKGROUND_EVENT));
}

function currentUserId() {
  return getCurrentUser()?.userId ?? null;
}

/** 사용자별 저장소 키. 로그인 정보가 없으면 저장/조회를 하지 않는다. */
function storageKey(userId = currentUserId()) {
  return userId == null ? null : `${STORAGE_KEY}:${userId}`;
}

function readSaved() {
  const key = storageKey();
  if (!key) return null;

  // 예전 공용 키가 남아 있으면 지운다. (누구 설정인지 알 수 없는 값이다)
  localStorage.removeItem(LEGACY_STORAGE_KEY);

  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;

    const saved = JSON.parse(raw);
    // blob: URL 은 새로고침하면 무효라서 깨진 이미지가 뜨는 걸 막는다.
    if (typeof saved.imageUrl === "string" && saved.imageUrl.startsWith("blob:")) {
      delete saved.imageUrl;
    }
    return saved;
  } catch {
    return null;
  }
}

export async function fetchHomeScreen() {
  const [datingStartDate, me, profileImages, partner] = await Promise.all([
    getRelationshipStartDate(),
    fetchMe(),
    fetchProfileImages(),
    fetchPartnerNickname(),
  ]);

  /*
   * 계정이 바뀌면 저장 키가 바뀌므로 홈 배경도 달라진다.
   * 로그인 직후 이 화면이 열리면서 여기를 지나가므로 이 자리에서 알린다.
   */
  notifyHomeBackgroundChanged();

  // 프로필은 브라우저에 저장된 커스터마이징이 아니라 각자의 user 레코드에서 오므로
  // readSaved() 뒤에 둬서 저장된 값이 덮어쓰지 않게 한다.
  return {
    ...DEFAULT_HOME,
    ...readSaved(),
    datingStartDate,
    daysTogether: calcDaysTogether(datingStartDate),
    myNickname: me?.nickname ?? "",
    myProfileImageUrl:
      profileImages?.myProfileImageUrl ?? me?.profileImageUrl ?? "",
    partnerNickname: partner?.partnerNickname ?? "",
    partnerProfileImageUrl: profileImages?.partnerProfileImageUrl ?? "",
  };
}

/**
 * 내 프로필. GET /users/me 가 실패해도 홈 화면 전체를 막지 않고,
 * 로그인 응답 캐시(LoginResponse.nickname)로 이니셜만이라도 살린다.
 */
async function fetchMe() {
  try {
    return await getMyProfile();
  } catch {
    return getCurrentUser();
  }
}

/** 나 + 상대 프로필 사진. 커플 연결 전이면 partner 쪽은 null 이다. */
async function fetchProfileImages() {
  try {
    return await getProfileImages();
  } catch {
    return null;
  }
}

async function fetchPartnerNickname() {
  try {
    return await getPartnerNickname();
  } catch {
    return null;
  }
}

export async function saveRelationshipStartDate(startDate) {
  const datingStartDate = await updateRelationshipStartDate(startDate);

  return {
    datingStartDate,
    daysTogether: calcDaysTogether(datingStartDate),
  };
}

/** TODO: 백엔드에 홈 커스터마이징 저장소가 생기면 -> PUT /api/home */
export async function saveHomeCustomization({
  imageFile,
  imageUrl,
  caption,
  captionPosition,
  captionStyle,
}) {
  const key = storageKey();
  if (!key) {
    throw new Error("로그인이 필요합니다.");
  }

  const saved = {
    imageUrl: imageFile ? await uploadHomeImage(imageFile) : imageUrl,
    caption,
    captionPosition,
    captionStyle,
  };

  localStorage.setItem(key, JSON.stringify({ ...readSaved(), ...saved }));
  // 새 사진이 무대 배경에도 바로 반영되도록 (새로고침 없이)
  notifyHomeBackgroundChanged();
  return saved;
}

/**
 * TODO: 백엔드에 홈 배경 업로드가 생기면 -> POST /api/home/image (응답 { imageUrl })
 *
 * 그때까지는 파일을 data URL 로 읽어 저장한다.
 * objectURL(blob:)은 새로고침하면 무효가 돼서 배경이 통째로 사라졌다.
 */
export async function uploadHomeImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("사진을 불러오지 못했습니다."));
    reader.readAsDataURL(file);
  });
}
