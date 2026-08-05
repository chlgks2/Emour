/**
 * 백엔드 ERD(DOCS/Emour_SQL_schema.sql)의 ENUM 값을 프론트에서 한 곳으로 모아둔 파일.
 *
 * 규칙
 * - DB 컬럼은 snake_case, Spring(Jackson) 직렬화 후 JSON은 camelCase 이므로
 *   프론트 상태/변수명은 컬럼명의 camelCase 형태를 그대로 사용한다. (예: mood_date -> moodDate)
 * - ENUM 값은 서버가 내려주는 문자열 그대로(대문자 스네이크) 저장하고,
 *   화면에 보여줄 한글 라벨은 각 도메인 유틸(utils/*.js)에서 매핑한다.
 */

// user.status
export const USER_STATUS = {
  ACTIVE: "ACTIVE",
  INACTIVE: "INACTIVE",
  WITHDRAWN: "WITHDRAWN",
};

// couple_room.status
export const ROOM_STATUS = {
  WAITING: "WAITING",
  ACTIVE: "ACTIVE",
  INACTIVE: "INACTIVE",
};

// couple_member.status
export const MEMBER_STATUS = {
  ACTIVE: "ACTIVE",
  LEFT: "LEFT",
};

// mood.mood_type
export const MOOD_TYPE = {
  VERY_HAPPY: "VERY_HAPPY",
  HAPPY: "HAPPY",
  NEUTRAL: "NEUTRAL",
  SAD: "SAD",
  VERY_SAD: "VERY_SAD",
};

// chat_message.message_type
export const MESSAGE_TYPE = {
  TEXT: "TEXT",
  IMAGE: "IMAGE",
};

// chat_reaction.reaction_type
export const REACTION_TYPE = {
  HEART: "HEART",
  CHECK: "CHECK",
  GREAT: "GREAT",
};

// couple_schedule.schedule_type
export const SCHEDULE_TYPE = {
  ANNIVERSARY: "ANNIVERSARY",
  SCHEDULE: "SCHEDULE",
};

// chat_analysis.analysis_status
export const ANALYSIS_STATUS = {
  PENDING: "PENDING",
  PROCESSING: "PROCESSING",
  COMPLETED: "COMPLETED",
  FAILED: "FAILED",
};

// email_verification.purpose
export const VERIFICATION_PURPOSE = {
  SIGN_UP: "SIGN_UP",
  PASSWORD_RESET: "PASSWORD_RESET",
};

/**
 * social_login.provider (VARCHAR(30))
 *
 * 화면에 붙어 있는 것만 남긴다. 네이버·카카오 로그인은 만들지 않기로 했다.
 * 컬럼 자체는 문자열이라, 나중에 지원하게 되면 여기에 한 줄 더하면 된다.
 */
export const SOCIAL_PROVIDER = {
  GOOGLE: "GOOGLE",
};
