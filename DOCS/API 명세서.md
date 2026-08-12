# API 명세서

날짜: 2026/07/22
작성자: 최 한, 하영 기
상태: 검토필요

| 200 OK | 요청 성공 |
| --- | --- |
| 201 Created | 리소스 생성 성공 |
| 204 No Content | 요청 성공, 하지만 응답 본문 없음 |
| 400 Bad Request | 잘못된 요청 |
| 401 Unauthorized | 인증 필요 |
| 403 Forbidden | 접근 금지 |
| 404 Not Found | 리소스를 찾을 수 없음 |
| 500 Internal Server Error | 서버 오류 |

백엔드 구조(참조용)

```smalltalk
src
├─ main
│  ├─ java
│  │  └─ com.ssafy.emour
│  │     ├─ EmourApplication.java
│  │     │
│  │     ├─ global
│  │     │  ├─ config
│  │     │  │  ├─ SecurityConfig.java
│  │     │  │  ├─ WebSocketConfig.java
│  │     │  │  ├─ RedisConfig.java
│  │     │  │  ├─ S3Config.java
│  │     │  │  └─ JpaConfig.java
│  │     │  │
│  │     │  ├─ security
│  │     │  │  ├─ jwt
│  │     │  │  │  ├─ JwtTokenProvider.java
│  │     │  │  │  ├─ JwtAuthenticationFilter.java
│  │     │  │  │  └─ JwtAuthenticationEntryPoint.java
│  │     │  │  └─ oauth
│  │     │  │     ├─ CustomOAuth2UserService.java
│  │     │  │     ├─ OAuth2SuccessHandler.java
│  │     │  │     └─ OAuth2FailureHandler.java
│  │     │  │
│  │     │  ├─ exception
│  │     │  │  ├─ GlobalExceptionHandler.java
│  │     │  │  ├─ ErrorCode.java
│  │     │  │  └─ CustomException.java
│  │     │  │
│  │     │  ├─ response
│  │     │  │  └─ ApiResponse.java
│  │     │  │
│  │     │  └─ util
│  │     │     ├─ SecurityUtil.java
│  │     │     └─ DateTimeUtil.java
│  │     │
│  │     ├─ auth
│  │     │  ├─ controller
│  │     │  │  └─ AuthController.java
│  │     │  ├─ dto
│  │     │  │  ├─ request
│  │     │  │  │  ├─ SignUpRequest.java
│  │     │  │  │  ├─ LoginRequest.java
│  │     │  │  │  └─ TokenReissueRequest.java
│  │     │  │  └─ response
│  │     │  │     ├─ LoginResponse.java
│  │     │  │     └─ TokenResponse.java
│  │     │  ├─ service
│  │     │  │  └─ AuthService.java
│  │     │  └─ mapper
│  │     │     └─ AuthMapper.java
│  │     │
│  │     ├─ member
│  │     │  ├─ controller
│  │     │  ├─ dto
│  │     │  │  ├─ request
│  │     │  │  └─ response
│  │     │  ├─ entity
│  │     │  │  └─ Member.java
│  │     │  ├─ repository
│  │     │  │  └─ MemberRepository.java
│  │     │  ├─ service
│  │     │  │  └─ MemberService.java
│  │     │  └─ mapper
│  │     │     └─ MemberMapper.java
│  │     │
│  │     ├─ couple
│  │     │  ├─ controller
│  │     │  ├─ dto
│  │     │  │  ├─ request
│  │     │  │  └─ response
│  │     │  ├─ entity
│  │     │  ├─ repository
│  │     │  ├─ service
│  │     │  └─ mapper
│  │     │
│  │     ├─ chat
│  │     │  ├─ controller
│  │     │  │  ├─ ChatController.java
│  │     │  │  └─ ChatWebSocketController.java
│  │     │  ├─ dto
│  │     │  │  ├─ request
│  │     │  │  └─ response
│  │     │  ├─ entity
│  │     │  │  ├─ ChatRoom.java
│  │     │  │  ├─ ChatMessage.java
│  │     │  │  └─ MessageBookmark.java
│  │     │  ├─ repository
│  │     │  ├─ service
│  │     │  └─ mapper
│  │     │
│  │     ├─ mood
│  │     │  ├─ controller
│  │     │  ├─ dto
│  │     │  │  ├─ request
│  │     │  │  └─ response
│  │     │  ├─ entity
│  │     │  ├─ repository
│  │     │  ├─ service
│  │     │  └─ mapper
│  │     │
│  │     ├─ analysis
│  │     │  ├─ controller
│  │     │  ├─ dto
│  │     │  │  └─ response
│  │     │  ├─ repository
│  │     │  └─ service
│  │     │
│  │     ├─ calendar
│  │     │  ├─ controller
│  │     │  ├─ dto
│  │     │  │  ├─ request
│  │     │  │  └─ response
│  │     │  ├─ entity
│  │     │  │  ├─ Schedule.java
│  │     │  │  ├─ Anniversary.java
│  │     │  │  └─ Diary.java
│  │     │  ├─ repository
│  │     │  ├─ service
│  │     │  └─ mapper
│  │     │
│  │     ├─ album
│  │     │  ├─ controller
│  │     │  ├─ dto
│  │     │  │  ├─ request
│  │     │  │  └─ response
│  │     │  ├─ entity
│  │     │  ├─ repository
│  │     │  ├─ service
│  │     │  └─ mapper
│  │     │
│  │     └─ ai
│  │        ├─ client
│  │        │  └─ AiServerClient.java
│  │        ├─ dto
│  │        │  ├─ request
│  │        │  └─ response
│  │        └─ service
│  │           └─ AiAnalysisService.java
│  │
│  └─ resources
│     ├─ application.yml
│     ├─ application-local.yml
│     ├─ application-dev.yml
│     ├─ application-prod.yml
│     ├─ static
│     ├─ templates
│     └─ db
│        └─ migration
│
└─ test
   └─ java
      └─ com.ssafy.emour
         ├─ auth
         ├─ member
         ├─ couple
         ├─ chat
         ├─ mood
         ├─ analysis
         ├─ calendar
         ├─ album
         └─ ai
```

## **1. Auth (인증)**

| **Method** | **URL** | **설명** |
| --- | --- | --- |
| POST | `/auth/signup` | 이메일 회원가입 |
| GET | `/auth/email-check` | 이메일 중복 확인 |
| POST | `/auth/login` | 이메일 로그인 |
| POST | `/auth/logout` | 로그아웃 |
| POST | `/auth/refresh` | Access Token 재발급 |
| POST | `/auth/password/email` | 비밀번호 재설정 이메일 발송 |
| POST | `/auth/password/verify` | 인증번호 확인 |
| PATCH | `/auth/password` | 비밀번호 재설정 |
| POST | `/auth/email/send` | 이메일 인증코드 발송 |
| POST | `/auth/email/verify` | 이메일 인증코드 확인 |
| GET | `/auth/social/{provider}` | 소셜 로그인 (카카오/네이버/구글) |

[Auth (인증)](Auth%20(%EC%9D%B8%EC%A6%9D)%203a70300302a880e5b9c5d5e26cc2dd9d.csv)

---

## **2. User (회원 관리)**

| **Method** | **URL** | **설명** |
| --- | --- | --- |
| GET | `/users/me` | 내 프로필 조회 |
| PATCH | `/users/me` | 내 프로필 수정 |
| DELETE | `/users/me` | 회원 탈퇴 |
| PATCH | `/users/me/password` | 비밀번호 변경 |
| GET | `/users/me/notifications` | 알림 설정 조회 |
| PATCH | `/users/me/notifications` | 알림 설정 변경 |

[User (회원 관리)](User%20(%ED%9A%8C%EC%9B%90%20%EA%B4%80%EB%A6%AC)%203a70300302a88006a047c30a24644730.csv)

---

## **3. Couple (커플 연결)**

| **Method** | **URL** | **설명** |
| --- | --- | --- |
| POST | `/couples/invitation` | 커플 초대 코드 생성 |
| POST | `/couples/connect` | 초대 코드 입력 후 커플 연결 |
| GET | `/couples/me` | 현재 커플 정보 조회 |
| DELETE | `/couples` | 커플 연결 해제 |
| POST | `/couples/reconnect` | 기존 커플방 재연결 |

[Couple (커플 연결)](Couple%20(%EC%BB%A4%ED%94%8C%20%EC%97%B0%EA%B2%B0)%203a70300302a880ccb3fceafade8621ac.csv)

---

## **4. Chat (채팅)**

| **Method** | **URL** | **설명** |
| --- | --- | --- |
| GET | `/chats` | 채팅 내역 조회 |
| POST | `/chats` | 메시지 전송 (REST, WebSocket 병행) |
| PATCH | `/chats/{messageId}` | 메시지 수정 (5분 이내) |
| DELETE | `/chats/{messageId}` | 메시지 삭제 |
| POST | `/chats/{messageId}/read` | 메시지 읽음 처리 |
| GET | `/chats/search` | 메시지 검색 |
| POST | `/chats/{messageId}/bookmark` | 메시지 저장 (북마크) |
| DELETE | `/chats/{messageId}/bookmark` | 저장 취소 |
| GET | `/chats/bookmarks` | 저장한 메시지(하이라이트) 모아보기 |

[Chat (채팅)](Chat%20(%EC%B1%84%ED%8C%85)%203a70300302a880ffa999e70808098a6e.csv)

---

## **5. Mood (오늘의 기분)**

| **Method** | **URL** | **설명** |
| --- | --- | --- |
| POST | `/moods` | 기분 등록 |
| PATCH | `/moods/{moodId}` | 기분 수정 |
| GET | `/moods` | 기분 조회 (본인/상대방) |
| GET | `/moods/tracking` | 무드 트래킹 (시간별 감정 변화) |

[Mood (오늘의 기분)](Mood%20(%EC%98%A4%EB%8A%98%EC%9D%98%20%EA%B8%B0%EB%B6%84)%203a70300302a880ceac6fea4473d7ae7a.csv)

---

## **6. Calendar (캘린더)**

### **6-1. 일정 (Schedule)**

| **Method** | **URL** | **설명** |
| --- | --- | --- |
| GET | `/schedules` | 일정 목록 조회 |
| POST | `/schedules` | 일정 등록 |
| PATCH | `/schedules/{scheduleId}` | 일정 수정 |
| DELETE | `/schedules/{scheduleId}` | 일정 삭제 |

[Calendar (캘린더) - 일정](Calendar%20(%EC%BA%98%EB%A6%B0%EB%8D%94)%20-%20%EC%9D%BC%EC%A0%95%203a70300302a880459adce8bea7219828.csv)

### **6-2. 기념일 (Anniversary)**

| **Method** | **URL** | **설명** |
| --- | --- | --- |
| GET | `/anniversaries` | 기념일 목록 조회 |
| POST | `/anniversaries` | 기념일 등록 |
| PATCH | `/anniversaries/{anniversaryId}` | 기념일 수정 |
| DELETE | `/anniversaries/{anniversaryId}` | 기념일 삭제 |

[Calendar (캘린더) - 기념일](Calendar%20(%EC%BA%98%EB%A6%B0%EB%8D%94)%20-%20%EA%B8%B0%EB%85%90%EC%9D%BC%203a70300302a8806985c9dfa58186e8d2.csv)

### **6-3. 한줄 일기 (Diary)**

| **Method** | **URL** | **설명** |
| --- | --- | --- |
| GET | `/diaries` | 한줄 일기 목록 조회 |
| POST | `/diaries` | 한줄 일기 작성 (100자 이내) |
| PATCH | `/diaries/{diaryId}` | 한줄 일기 수정 |
| DELETE | `/diaries/{diaryId}` | 한줄 일기 삭제 |

[Calendar (캘린더) - 한줄 일기](Calendar%20(%EC%BA%98%EB%A6%B0%EB%8D%94)%20-%20%ED%95%9C%EC%A4%84%20%EC%9D%BC%EA%B8%B0%203a70300302a880dea751fc39acf82ae7.csv)

---

## **7. Album (앨범)**

| **Method** | **URL** | **설명** |
| --- | --- | --- |
| GET | `/photos` | 사진 전체 조회 (피드/채팅 구분) |
| POST | `/photos` | 사진 업로드 (메모 포함) |
| DELETE | `/photos/{photoId}` | 사진 삭제 |
| PATCH | `/photos/{photoId}/memo` | 사진 메모 작성/수정 |

[Album (앨범)](Album%20(%EC%95%A8%EB%B2%94)%203a70300302a8807cb19bd47411547121.csv)

---

## **8. Analysis (분석)**

| **Method** | **URL** | **설명** |
| --- | --- | --- |
| GET | `/analysis/emotion-flow` | 감정 흐름 (2시간 단위 긍정/부정) |
| GET | `/analysis/frequent-words` | 자주 사용하는 단어 |
| GET | `/analysis/emotions` | 주요 감정 (일/월/년 %) |
| GET | `/analysis/conversation` | 대화 흐름 (활발한 시간/응답 속도) |
| GET | `/analysis/statistics` | 정량적 기록 (사진 수/반응 수) |

[Analysis (분석)](Analysis%20(%EB%B6%84%EC%84%9D)%203a70300302a8808382d6eafdda116881.csv)

---

## **9. AI (AI 기능)**

| **Method** | **URL** | **설명** |
| --- | --- | --- |
| POST | `/ai/reply-suggestion` | 답장 교정 (문장 단위 추천) |
| POST | `/ai/irony-analysis` | 반어 표현 분석 |
| POST | `/ai/emotion-analysis` | 메시지 감정 분석 |

[AI (AI 기능)](AI%20(AI%20%EA%B8%B0%EB%8A%A5)%203a70300302a88062a897dd39032de08a.csv)

## **📌 참고사항 (팀 공유용)**

- **인증**: 모든 API는 `Authorization: Bearer {accessToken}` 헤더 필요 (단, Auth의 signup/login/refresh 등 제외)
- **공통 응답 형식**: `{ success, message, data }` 형태 권장
- **실시간 채팅**: `POST /chats`는 REST용이며, 실시간은 **WebSocket(STOMP)** `/ws/chat` 별도 사용
- **공통 헤더**

| **이름** | **유형** | **필수/선택** | **설명** |
| --- | --- | --- | --- |
| Content-type | application/json |  |  |
| Accept | application/json |  |  |
| Authorization | Bearer <ACCESS_TOKEN> |  |  |