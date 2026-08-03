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
import { getMyProfile, getProfileImages } from "./memberApi.js";

const STORAGE_KEY = "emour_home_customization_v1";
// 사용자 구분 없이 쓰던 예전 키. 계정을 바꿔도 남의 설정이 그대로 보였다.
const LEGACY_STORAGE_KEY = "emour_mock_home_v1";

const DEFAULT_HOME = {
  imageUrl: homeBg,
  caption: "그대를 여름날에 비하여도 괜찮을까요",
  captionPosition: { xPercent: 50, yPercent: 72 },
  captionStyle: { fontSize: "md", align: "left", box: "dim", color: "#ffffff" },
};

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
  const [datingStartDate, me, profileImages] = await Promise.all([
    getRelationshipStartDate(),
    fetchMe(),
    fetchProfileImages(),
  ]);

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
    partnerNickname: "",
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
