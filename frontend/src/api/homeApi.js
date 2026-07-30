// 커플 공용 홈 화면 커스터마이징 API.
// 커플 단위로 저장되므로, 한쪽이 수정하면 상대방도 동일한 설정을 보게 됩니다.
//
// ⚠️⚠️ 백엔드 확인 필요 (중요)
// 이 화면이 쓰는 값 중 아래 항목들은 최종 ERD에 대응 테이블/컬럼이 없습니다.
//   - imageUrl(홈 배경 사진), caption(문구), captionPosition(문구 위치), captionStyle(문구 스타일),
//     relationshipName(호칭)
// couple_room / album_photo 어디에도 저장할 곳이 없으므로,
//   (a) couple_room 에 컬럼 추가  또는  (b) home_customization 같은 신규 테이블
// 중 하나를 백엔드와 확정해야 실제 저장이 가능합니다. 확정되면 아래 필드명을 컬럼명에 맞추면 됩니다.
//
// ERD에 이미 있는 값 매핑
//   - myProfileImageUrl / partnerProfileImageUrl : user.profile_image_url
//   - datingStartDate                           : couple_room.dating_start_date
//   - daysTogether                              : datingStartDate 로부터 계산하는 프론트 파생값
//
// 다른 api/*.js 와 마찬가지로 지금은 localStorage 목업입니다. 백엔드가 준비되면
// 각 함수 안의 TODO 위치만 실제 호출로 바꾸면 됩니다.
import homeBg from "../assets/home-bg.jpg";
import { calcDaysTogether } from "./dashboardApi";
import { mockCoupleRoom } from "./mock/db";

const STORAGE_KEY = "emour_mock_home_v1";

const delay = (ms = 300) => new Promise((resolve) => setTimeout(resolve, ms));

const DEFAULT_HOME = {
  relationshipName: "우리",
  myProfileImageUrl: "",
  partnerProfileImageUrl: "",
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

/** TODO: 백엔드 연동 시 -> GET /api/home */
export async function fetchHomeScreen() {
  await delay(200);
  return {
    ...DEFAULT_HOME,
    ...readSaved(),
    roomId: mockCoupleRoom.roomId,
    datingStartDate: mockCoupleRoom.datingStartDate,
    daysTogether: calcDaysTogether(mockCoupleRoom.datingStartDate),
  };
}

/** TODO: 백엔드 연동 시 -> PUT /api/home */
export async function saveHomeCustomization({
  imageFile,
  imageUrl,
  caption,
  captionPosition,
  captionStyle,
  relationshipName,
}) {
  const uploadedImageUrl = imageFile ? await uploadHomeImage(imageFile) : imageUrl;
  await delay(400);

  const saved = {
    imageUrl: uploadedImageUrl,
    caption,
    captionPosition,
    captionStyle,
    relationshipName,
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
