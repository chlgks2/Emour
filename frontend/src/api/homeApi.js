// 커플 공용 홈 화면 커스터마이징 API.
// 커플 단위로 저장되므로, 한쪽이 수정하면 상대방도 동일한 설정을 보게 됩니다.
//
// ⚠️⚠️ 백엔드 확인 필요 (중요)
// 이 화면이 쓰는 값 중 아래 항목들은 최종 ERD에 대응 테이블/컬럼이 없습니다.
//   - imageUrl(홈 배경 사진), caption(문구), captionPosition(문구 위치), captionStyle(문구 스타일)
// couple_room / album_photo 어디에도 저장할 곳이 없으므로,
//   (a) couple_room 에 컬럼 추가  또는  (b) home_customization 같은 신규 테이블
// 중 하나를 백엔드와 확정해야 실제 저장이 가능합니다. 확정되면 아래 필드명을 컬럼명에 맞추면 됩니다.
//
// 내 프로필(닉네임/사진)은 목업이 아니라 실제 백엔드에서 받아옵니다.
//   - myNickname / myProfileImageUrl : GET /users/me (MemberProfileResponse.nickname / profileImageUrl)
//   - datingStartDate                : couple_room.dating_start_date
//   - daysTogether                   : datingStartDate 로부터 계산하는 프론트 파생값
//
// ⚠️ 상대방 별명(couple_member.partner_nickname)은 아직 어떤 응답 DTO에도 실려오지 않습니다.
//    (CoupleStatusResponse 는 roomId/status 만, MemberProfileResponse 는 '나'만 반환)
//    백엔드가 노출해주면 fetchPartner() 안의 TODO 만 채우면 됩니다.
import homeBg from "../assets/home-bg.jpg";
import { calcDaysTogether } from "./dashboardApi";
import {
  getRelationshipStartDate,
  updateRelationshipStartDate,
} from "./calendarApi.js";
import { getCurrentUser } from "./authApi.js";
import { getMyProfile } from "./memberApi.js";

const STORAGE_KEY = "emour_mock_home_v1";

const delay = (ms = 300) => new Promise((resolve) => setTimeout(resolve, ms));

const DEFAULT_HOME = {
  imageUrl: homeBg,
  caption: "그대를 여름날에 비하여도 괜찮을까요",
  captionPosition: { xPercent: 50, yPercent: 72 },
  captionStyle: { fontSize: "md", align: "left", box: "dim", color: "#ffffff" },
};

function readSaved() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const saved = JSON.parse(raw);
    // blob: URL 은 새로고침하면 무효라서(목업 업로드 한정) 깨진 이미지가 뜨는 걸 막는다.
    if (typeof saved.imageUrl === "string" && saved.imageUrl.startsWith("blob:")) {
      delete saved.imageUrl;
    }
    return saved;
  } catch {
    return null;
  }
}

/** TODO: 홈 커스터마이징(사진/문구)만 백엔드 연동 시 -> GET /api/home */
export async function fetchHomeScreen() {
  const [, datingStartDate, me, partner] =
    await Promise.all([
      delay(200),
      getRelationshipStartDate(),
      fetchMe(),
      fetchPartner(),
    ]);

  // 프로필은 커플 공용 커스터마이징(localStorage)이 아니라 각자의 user 레코드에서 오므로
  // readSaved() 뒤에 둬서 저장된 값이 덮어쓰지 않게 한다.
  return {
    ...DEFAULT_HOME,
    ...readSaved(),
    datingStartDate,
    daysTogether: calcDaysTogether(
      datingStartDate,
    ),
    myNickname: me?.nickname ?? "",
    myProfileImageUrl: me?.profileImageUrl ?? "",
    partnerNickname: partner?.nickname ?? "",
    partnerProfileImageUrl: partner?.profileImageUrl ?? "",
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

/**
 * 상대방 프로필.
 *
 * TODO(백엔드): 상대 별명을 내려주는 응답이 아직 없다. 아래 중 하나가 준비되면 교체한다.
 *   (a) CoupleStatusResponse 에 partnerNickname 추가  -> coupleApi.getMyCoupleRoom() 재사용
 *   (b) GET /couples/partner 같은 전용 엔드포인트 신설
 * 그때까지는 null 을 돌려주고, 화면은 사람 아이콘 플레이스홀더를 보여준다.
 */
async function fetchPartner() {
  return null;
}

export async function saveRelationshipStartDate(
  startDate,
) {
  const datingStartDate =
    await updateRelationshipStartDate(
      startDate,
    );

  return {
    datingStartDate,
    daysTogether: calcDaysTogether(
      datingStartDate,
    ),
  };
}

/** TODO: 백엔드 연동 시 -> PUT /api/home */
export async function saveHomeCustomization({
  imageFile,
  imageUrl,
  caption,
  captionPosition,
  captionStyle,
}) {
  const uploadedImageUrl = imageFile ? await uploadHomeImage(imageFile) : imageUrl;
  await delay(400);

  const saved = {
    imageUrl: uploadedImageUrl,
    caption,
    captionPosition,
    captionStyle,
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...readSaved(), ...saved }));
  return saved;
}

/**
 * TODO: 백엔드 연동 시 -> POST /api/home/image (multipart, 응답 { imageUrl })
 * 목업에서는 브라우저 로컬 blob URL 을 그대로 사용한다.
 * (blob URL 은 새로고침하면 무효가 되므로 목업 한정 동작임을 유의)
 */
export async function uploadHomeImage(file) {
  await delay(300);
  return URL.createObjectURL(file);
}
