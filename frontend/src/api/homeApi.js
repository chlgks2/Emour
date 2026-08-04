// 홈 화면 데이터.
//
// ── 백엔드에서 오는 값 ────────────────────────────────────────────
//   myNickname                              : GET /users/me       (MemberProfileResponse.nickname)
//   myProfileImageUrl / partnerProfileImageUrl
//                                           : GET /users/profile-img (MemberProfileImagesResponse)
//   datingStartDate                         : GET /couples/startDate (couple_room.dating_start_date)
//   daysTogether                            : datingStartDate 로부터 계산하는 프론트 파생값
//
// ── 커플 공용 홈 설정 ─────────────────────────────────────────────
//   imageUrl, caption, captionPosition, captionStyle
//                                           : GET/PUT /home/settings
//   imageFile                               : POST /home/settings/image
//   두 사용자는 같은 room_id의 home_image_setting 한 행을 공유한다.
//
//   ⚠️ 상대방 별명(couple_member.partner_nickname)은 아직 어떤 응답 DTO 에도 실려오지 않는다.
//      (CoupleStatusResponse 는 roomId/status 만, MemberProfileResponse 는 '나'만 반환)
//      백엔드가 노출해주면 fetchPartner() 의 nickname 만 채우면 된다.
import homeBg from "../assets/home-bg.jpg";
import { apiRequest } from "./httpClient.js";
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
import { resolveProtectedImageUrl } from "../utils/protectedImageUrl.js";

const HOME_SETTING_ENDPOINT = "/home/settings";

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
let currentHomeBackgroundUrl = homeBg;

/** 지금 홈 배경으로 쓰이는 사진 주소. 사용자가 바꾼 적 없으면 기본 사진. */
export function getHomeBackgroundUrl() {
  return currentHomeBackgroundUrl;
}

export function subscribeHomeBackground(listener) {
  window.addEventListener(HOME_BACKGROUND_EVENT, listener);
  return () => window.removeEventListener(HOME_BACKGROUND_EVENT, listener);
}

function notifyHomeBackgroundChanged(imageUrl = homeBg) {
  currentHomeBackgroundUrl = imageUrl || homeBg;
  window.dispatchEvent(new CustomEvent(HOME_BACKGROUND_EVENT));
}

export async function fetchHomeScreen() {
  const [datingStartDate, me, profileImages, partner, homeSetting] = await Promise.all([
    getRelationshipStartDate(),
    fetchMe(),
    fetchProfileImages(),
    fetchPartnerNickname(),
    fetchHomeSetting(),
  ]);

  const sharedHome = await mapHomeSetting(homeSetting);
  notifyHomeBackgroundChanged(sharedHome.imageUrl);

  return {
    ...DEFAULT_HOME,
    ...sharedHome,
    datingStartDate,
    daysTogether: calcDaysTogether(datingStartDate),
    myNickname: me?.nickname ?? "",
    myProfileImageUrl:
      profileImages?.myProfileImageUrl ?? me?.profileImageUrl ?? "",
    partnerNickname: partner?.partnerNickname ?? "",
    partnerProfileImageUrl: profileImages?.partnerProfileImageUrl ?? "",
  };
}

async function fetchHomeSetting() {
  const response = await apiRequest(HOME_SETTING_ENDPOINT);
  return response?.data ?? response ?? null;
}

async function resolveHomeImage(imageUrl) {
  return (await resolveProtectedImageUrl(imageUrl)) || homeBg;
}

function toClientTextSize(value) {
  return { SMALL: "sm", MEDIUM: "md", LARGE: "lg" }[value] ?? "md";
}

function toClientBackground(value) {
  return { TRANSLUCENT: "dim", DARK: "solid", NONE: "none" }[value] ?? "dim";
}

async function mapHomeSetting(setting) {
  if (!setting) return DEFAULT_HOME;

  return {
    imageUrl: await resolveHomeImage(setting.imageUrl),
    caption: setting.textContent ?? DEFAULT_HOME.caption,
    captionPosition: {
      xPercent: Number(setting.textPositionX ?? 50),
      yPercent: Number(setting.textPositionY ?? 72),
    },
    captionStyle: {
      fontSize: toClientTextSize(setting.textSize),
      align: (setting.textAlignment ?? "LEFT").toLowerCase(),
      box: toClientBackground(setting.backgroundStyle),
      color: setting.textColor === "BLACK" ? "#1c1c1c" : "#ffffff",
    },
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

export async function saveHomeCustomization({
  imageFile,
  caption,
  captionPosition,
  captionStyle,
}) {
  if (imageFile) {
    await uploadHomeImage(imageFile);
  }

  const response = await apiRequest(HOME_SETTING_ENDPOINT, {
    method: "PUT",
    body: {
      textContent: caption,
      textPositionX: captionPosition.xPercent,
      textPositionY: captionPosition.yPercent,
      textSize: { sm: "SMALL", md: "MEDIUM", lg: "LARGE" }[captionStyle.fontSize] ?? "MEDIUM",
      textAlignment: (captionStyle.align ?? "left").toUpperCase(),
      backgroundStyle: { dim: "TRANSLUCENT", solid: "DARK", none: "NONE" }[captionStyle.box] ?? "TRANSLUCENT",
      textColor: captionStyle.color === "#1c1c1c" ? "BLACK" : "WHITE",
    },
  });

  const saved = await mapHomeSetting(response?.data ?? response);
  notifyHomeBackgroundChanged(saved.imageUrl);
  return saved;
}

export async function uploadHomeImage(file) {
  const formData = new FormData();
  formData.append("file", file);

  const response = await apiRequest(`${HOME_SETTING_ENDPOINT}/image`, {
    method: "POST",
    body: formData,
  });

  return response?.data ?? response ?? null;
}
