/**
 * 추후 Spring 백엔드 연동 시 사용할 HTTP 클라이언트.
 * 지금은 프론트 단독 개발 단계라 실제로 호출되지 않지만,
 * 나중에 api/*.js 안의 mock 함수들을 아래 client를 사용하는 실제 axios 호출로
 * 바꿔치기하기만 하면 되도록 미리 준비해둔다.
 *
 * 필드명 규칙: DB는 snake_case(user_id), Spring(Jackson) 기본 직렬화 결과 JSON은
 * camelCase(userId)라고 가정하고 프론트 전역에서 camelCase 를 사용한다.
 * 만약 백엔드가 snake_case 로 내려주기로 하면, 여기 인터셉터에서 한 번만 변환하는 것을 권장.
 *
 * 사용 예시 (백엔드 연동 시):
 *   import client from "./client";
 *   export const login = (payload) => client.post("/auth/login", payload).then(r => r.data);
 */
// import axios from "axios"; // 연동 시 `npm install axios` 후 주석 해제
// import { ACCESS_TOKEN_KEY } from "./authApi";

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080/api";

// const client = axios.create({
//   baseURL: BASE_URL,
//   withCredentials: true,
// });
//
// client.interceptors.request.use((config) => {
//   const accessToken = localStorage.getItem(ACCESS_TOKEN_KEY);
//   if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`;
//   return config;
// });
//
// export default client;

export default BASE_URL;
