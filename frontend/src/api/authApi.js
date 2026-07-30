import { mockUserDB, mockSession, MOCK_ROOM_ID } from "./mock/db";
import { USER_STATUS } from "../constants/enums";

// 네트워크 지연을 흉내내기 위한 헬퍼 (UI 로딩 상태 테스트용)
const delay = (ms = 500) => new Promise((resolve) => setTimeout(resolve, ms));

export const ACCESS_TOKEN_KEY = "emour_access_token";

/**
 * 이메일 중복 확인
 * 백엔드 연동 시: GET /auth/check-email?email=xxx
 */
export async function checkEmailDuplicate(email) {
  await delay(400);
  const exists = Boolean(mockUserDB.findByEmail(email));
  return { available: !exists };
}

/**
 * 회원가입
 * 백엔드 연동 시: POST /auth/signup  { email, password, nickname }
 * 응답: user 테이블 컬럼 기준 (userId, email, nickname, ...)
 */
export async function signUp({ email, password, nickname }) {
  await delay(600);
  if (mockUserDB.findByEmail(email)) {
    throw new Error("이미 가입된 이메일이에요.");
  }
  const user = {
    userId: mockUserDB.nextUserId(),
    email,
    password, // 서버에서는 password_hash 로 저장
    nickname,
    birth: null,
    profileImageUrl: null,
    statusMessage: null,
    status: USER_STATUS.ACTIVE,
    isEmailVerified: false,
    roomId: null, // 커플 연결 전
    partnerNickname: null,
  };
  mockUserDB.create(user);
  return { userId: user.userId, email: user.email, nickname: user.nickname };
}

/**
 * 로그인
 * 백엔드 연동 시: POST /auth/login  { email, password }
 * 응답: { accessToken, user: { userId, email, nickname, profileImageUrl, statusMessage, roomId } }
 */
export async function login({ email, password }) {
  await delay(600);
  const user = mockUserDB.findByEmail(email);
  if (!user || user.password !== password) {
    throw new Error("이메일 또는 비밀번호가 올바르지 않아요.");
  }
  mockSession.set(user);
  localStorage.setItem(ACCESS_TOKEN_KEY, "mock-token"); // 추후 서버 발급 accessToken 으로 교체
  return mockSession.get();
}

/**
 * 소셜 로그인 (카카오/네이버/구글)
 * 백엔드 연동 시: 각 OAuth2 인가 URL로 redirect
 * @param {'KAKAO'|'NAVER'|'GOOGLE'} provider - social_login.provider 값
 */
export async function loginWithSocial(provider) {
  await delay(500);
  // 데모 계정으로 즉시 로그인 처리
  const demoUser = mockUserDB.findByEmail("demo@emour.app");
  mockSession.set({ ...demoUser, roomId: demoUser.roomId ?? MOCK_ROOM_ID });
  localStorage.setItem(ACCESS_TOKEN_KEY, `mock-token-${provider.toLowerCase()}`);
  return mockSession.get();
}

export function logout() {
  mockSession.clear();
  localStorage.removeItem(ACCESS_TOKEN_KEY);
}

export function getCurrentUser() {
  return mockSession.get();
}

export function isAuthenticated() {
  return Boolean(localStorage.getItem(ACCESS_TOKEN_KEY));
}
