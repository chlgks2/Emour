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
const HOME_BACKGROUND_PREVIEW_PREFIX = "emour:home-background-preview:";
let currentHomeBackgroundUrl = homeBg;
let cachedHomeImageSource = "";
let cachedHomeImagePromise = null;

/** 지금 홈 배경으로 쓰이는 사진 주소. 사용자가 바꾼 적 없으면 기본 사진. */
export function getHomeBackgroundUrl() {
  return currentHomeBackgroundUrl;
}

export function getCachedHomeBackground(userId) {
  if (!userId) return "";
  try {
    return localStorage.getItem(`${HOME_BACKGROUND_PREVIEW_PREFIX}${userId}`) ?? "";
  } catch {
    return "";
  }
}

/** 새로고침 첫 프레임에 사용할 작은 사용자별 배경 미리보기를 저장한다. */
export async function cacheHomeBackgroundPreview(imageUrl, userId) {
  if (!imageUrl || !userId) return;

  try {
    const preview = await new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = 48;
        canvas.height = 48;
        const context = canvas.getContext("2d");
        if (!context) {
          reject(new Error("canvas context unavailable"));
          return;
        }
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.72));
      };
      image.onerror = reject;
      image.src = imageUrl;
    });

    localStorage.setItem(`${HOME_BACKGROUND_PREVIEW_PREFIX}${userId}`, preview);
  } catch {
    // 미리보기 캐시 실패는 실제 홈 이미지 표시를 막지 않는다.
  }
}

export function subscribeHomeBackground(listener) {
  window.addEventListener(HOME_BACKGROUND_EVENT, listener);
  return () => window.removeEventListener(HOME_BACKGROUND_EVENT, listener);
}

function notifyHomeBackgroundChanged(imageUrl = homeBg) {
  const nextImageUrl = imageUrl || homeBg;
  if (currentHomeBackgroundUrl === nextImageUrl) return;
  currentHomeBackgroundUrl = nextImageUrl;
  window.dispatchEvent(new CustomEvent(HOME_BACKGROUND_EVENT));
}

/** 외곽 배경 상태와 구독 중인 화면을 항상 같은 값으로 갱신한다. */
export function applyHomeBackground(imageUrl) {
  notifyHomeBackgroundChanged(imageUrl);
}

/**
 * 홈 화면을 거치지 않고 새로고침한 경우에도 무대 배경을 서버 설정과 맞춘다.
 * 보호 이미지 주소는 새로고침 전에 만든 blob URL을 재사용할 수 없으므로
 * localStorage 대신 서버 경로를 다시 받아 매번 유효한 URL로 변환한다.
 */
export async function refreshHomeBackground() {
  const sharedHome = await mapHomeSetting(await fetchHomeSetting());
  return sharedHome.imageUrl;
}

export function resetHomeBackground() {
  notifyHomeBackgroundChanged(homeBg);
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
  if (!imageUrl) return homeBg;

  // 같은 보호 이미지를 여러 화면이 동시에 조회해도 blob URL은 한 번만 만든다.
  // 매번 새 object URL을 만들면 브라우저는 다른 이미지로 판단해 외부 배경이 깜빡인다.
  if (cachedHomeImageSource === imageUrl && cachedHomeImagePromise) {
    return cachedHomeImagePromise;
  }

  cachedHomeImageSource = imageUrl;
  cachedHomeImagePromise = resolveProtectedImageUrl(imageUrl)
    .then((resolvedUrl) => resolvedUrl || homeBg)
    .catch(() => homeBg);

  return cachedHomeImagePromise;
}

function rgbToHex(value) {
  const match = String(value ?? "").match(/rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/i);
  if (!match) return "#ffffff";
  return `#${match.slice(1).map((channel) =>
    Math.min(255, Number(channel)).toString(16).padStart(2, "0")
  ).join("")}`;
}

function hexToRgb(value) {
  const normalized = String(value ?? "#ffffff").replace("#", "");
  const safe = /^[0-9a-f]{6}$/i.test(normalized) ? normalized : "ffffff";
  return `rgb(${parseInt(safe.slice(0, 2), 16)}, ${parseInt(safe.slice(2, 4), 16)}, ${parseInt(safe.slice(4, 6), 16)})`;
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
      fontSizePx: Number(setting.textSize) || 24,
      align: (setting.textAlignment ?? "LEFT").toLowerCase(),
      backgroundTransparency: Number(setting.backgroundTransparency ?? 80),
      color: rgbToHex(setting.textColor),
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

  const fontSizePx = Math.min(48, Math.max(10, Number(captionStyle.fontSizePx) || 24));
  const backgroundTransparency = Math.min(
    100,
    Math.max(0, Number(captionStyle.backgroundTransparency) || 0),
  );
  const response = await apiRequest(HOME_SETTING_ENDPOINT, {
    method: "PUT",
    body: {
      textContent: caption,
      textPositionX: captionPosition.xPercent,
      textPositionY: captionPosition.yPercent,
      textSize: fontSizePx,
      textAlignment: (captionStyle.align ?? "left").toUpperCase(),
      backgroundTransparency,
      textColor: hexToRgb(captionStyle.color),
    },
  });

  const saved = await mapHomeSetting(response?.data ?? response);
  notifyHomeBackgroundChanged(saved.imageUrl);
  cacheHomeBackgroundPreview(saved.imageUrl, getCurrentUser()?.userId);
  return saved;
}

export async function uploadHomeImage(file) {
  const formData = new FormData();
  formData.append("file", file);

  const response = await apiRequest(`${HOME_SETTING_ENDPOINT}/image`, {
    method: "POST",
    body: formData,
  });

  // 서버가 같은 파일 경로에 새 이미지를 저장할 수 있으므로 다음 조회는 다시 변환한다.
  cachedHomeImageSource = "";
  cachedHomeImagePromise = null;

  return response?.data ?? response ?? null;
}
