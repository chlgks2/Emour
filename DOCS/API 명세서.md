# API 명세서

날짜: 2026/07/22
작성자: 최 한, 하영 기, 신승민
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

## 1. 인증 (`/auth`)

| Method | URL | 설명 | 요청값 | 인증 | 성공 응답 |
| --- | --- | --- | --- | --- | --- |
| POST | `/signup` | 회원가입 | body: `SignUpRequest` | 없음 | `SignUpResponse` |
| POST | `/login` | 이메일 로그인 | `email*`, `password*` (query) | 없음 | `LoginResponse` |
| POST | `/login/google` | 구글 소셜 로그인 | body: `GoogleLoginRequest` | 없음 | `LoginResponse` |
| POST | `/refresh` | 토큰 재발급 | body: `TokenReissueRequest` | 없음 | `TokenResponse` |
| POST | `/logout` | 로그아웃 | 없음 | 없음 | 응답 데이터 없음 |
| GET | `/email-check` | 이메일 중복 확인 | `email*` (query) | 없음 | `Map<String, Boolean>` |
| POST | `/email/send` | 회원가입 이메일 인증번호 발송 | body: `EmailSendRequest` | 없음 | 응답 데이터 없음 |
| POST | `/email/verify` | 회원가입 이메일 인증번호 확인 | body: `EmailVerifyRequest` | 없음 | 응답 데이터 없음 |
| POST | `/password/email` | 비밀번호 재설정 인증번호 발송 | body: `EmailSendRequest` | 없음 | 응답 데이터 없음 |
| POST | `/password/verify` | 비밀번호 재설정 인증번호 확인 | body: `EmailVerifyRequest` | 없음 | 응답 데이터 없음 |
| PATCH | `/password` | 비밀번호 재설정 | body: `PasswordResetRequest` | 없음 | 응답 데이터 없음 |

## 2. 회원 (`/users`)

| Method | URL | 설명 | 요청값 | 인증 | 성공 응답 |
| --- | --- | --- | --- | --- | --- |
| GET | `/me` | 내 프로필 조회 | 없음 | JWT | `MemberProfileResponse` |
| PATCH | `/me` | 내 프로필 수정 | body: `ProfileUpdateRequest` | JWT | `MemberProfileResponse` |
| DELETE | `/me` | 회원 탈퇴 | 없음 | JWT | 응답 데이터 없음 |
| PATCH | `/me/password` | 로그인 사용자의 비밀번호 변경 | body: `PasswordChangeRequest` | JWT | 응답 데이터 없음 |
| GET | `/profile-img` | 나와 상대방 프로필 이미지 조회 | 없음 | JWT | `MemberProfileImagesResponse` |
| POST | `/profile-img` | 내 프로필 이미지 업로드 | multipart: 이미지 파일 | JWT | `MemberProfileImageResponse` |
| GET | `/me/profile-img` | 내 프로필 이미지 조회 | 없음 | JWT | `MemberProfileImageResponse` |
| GET | `/partner/profile-img` | 상대방 프로필 이미지 조회 | 없음 | JWT | `MemberProfileImageResponse` |
| GET | `/partner-nickname` | 상대방 표시 닉네임 조회 | 없음 | JWT | `PartnerNicknameResponse` |
| PATCH | `/partner-nickname` | 상대방 애칭 등록·수정 | body: `PartnerNicknameRequest` | JWT | `PartnerNicknameResponse` |
| GET | `/status-message` | 상대방 상태 메시지 조회 | 없음 | JWT | `PartnerStatusMessageResponse` |

## 3. 커플(`/couples`)

| Method | URL | 설명 | 요청값 | 인증 | 성공 응답 |
| --- | --- | --- | --- | --- | --- |
| GET | `/room-id` | 현재 커플방 ID 조회 | 없음 | JWT | `CoupleRoomIdResponse` |
| GET | `/status` | 커플 연결 상태 조회 | 없음 | JWT | `CoupleStatusResponse` |
| POST | `/invitation` | 커플 초대 코드 생성 | 없음 | JWT | `CoupleInvitationResponse` |
| POST | `/invitation/regenerate` | 커플 초대 코드 재생성 | 없음 | JWT | `CoupleInvitationResponse` |
| POST | `/connect` | 초대 코드로 커플 연결 | body: `CoupleConnectRequest` | JWT | `CoupleConnectResponse` |
| POST | `/reconnect` | 커플 재연결 | body: `CoupleReconnectRequest` | JWT | `CoupleConnectResponse` |
| GET | `/startDate` | 연애 시작일 조회 | 없음 | JWT | `CoupleStartDateResponse` |
| POST | `/startDate` | 연애 시작일 등록·수정 | body: `CoupleStartDateRequest` | JWT | `CoupleStartDateResponse` |
| DELETE |  | 커플 연결 해제 | 없음 | JWT | `CoupleDisconnectResponse` |
| GET | `/me/mood-notification-setting` | 기분 알림 설정 조회 | 없음 | JWT | `MoodNotificationResponse` |
| PUT | `/me/mood-notification-setting` | 기분 알림 설정 변경 | body: `MoodNotificationUpdateRequest` | JWT | `MoodNotificationResponse` |

## 4. 일정·기념일·일기

### 일정(`/schedules`)

| Method | URL | 설명 | 요청값 | 인증 | 성공 응답 |
| --- | --- | --- | --- | --- | --- |
| GET |  | 월별 일정 조회 | `year*`, `month*` (query) | JWT | `List<ScheduleResponse>` |
| POST |  | 일정 등록 | body: `ScheduleCreateRequest` | JWT | `ScheduleResponse` |
| PATCH | `/{scheduleId}` | 일정 수정 | `scheduleId*` (path), body: `ScheduleUpdateRequest` | JWT | `ScheduleResponse` |
| DELETE | `/{scheduleId}` | 일정 삭제 | `scheduleId*` (path) | JWT | 응답 데이터 없음 |

### 기념일(`/anniversaries`)

| Method | URL | 설명 | 요청값 | 인증 | 성공 응답 |
| --- | --- | --- | --- | --- | --- |
| GET |  | 기념일 목록 조회 | 없음 | JWT | `List<ScheduleResponse>` |
| POST |  | 기념일 등록 | body: `AnniversaryCreateRequest` | JWT | `ScheduleResponse` |
| PATCH | `/{anniversaryId}` | 기념일 수정 | `anniversaryId*` (path), body: `AnniversaryUpdateRequest` | JWT | `ScheduleResponse` |
| DELETE | `/{anniversaryId}` | 기념일 삭제 | `anniversaryId*` (path) | JWT | 응답 데이터 없음 |

### 일기(`/diaries`)

| Method | URL | 설명 | 요청값 | 인증 | 성공 응답 |
| --- | --- | --- | --- | --- | --- |
| GET |  | 일기 목록 조회 | 없음 | JWT | `List<DiaryResponse>` |
| POST |  | 일기 등록 | body: `DiaryCreateRequest` | JWT | `DiaryResponse` |
| PATCH | `/{diaryId}` | 일기 수정 | `diaryId*` (path), body: `DiaryUpdateRequest` | JWT | `DiaryResponse` |
| DELETE | `/{diaryId}` | 일기 삭제 | `diaryId*` (path) | JWT | 응답 데이터 없음 |

## 5. 기분 및 알림(`/moods`)

| Method | URL | 설명 | 요청값 | 인증 | 성공 응답 |
| --- | --- | --- | --- | --- | --- |
| GET |  | 기분 기록 목록 조회 | 없음 | JWT | `List<MoodResponse>` |
| POST |  | 기분 기록 등록 | body: `MoodCreateRequest` | JWT | `MoodCreateResponse` |
| PATCH | `/{moodId}` | 기분 기록 수정 | `moodId*` (path), body: `MoodUpdateRequest` | JWT | `MoodUpdateResponse` |

## 6. 홈 설정(`/home`)

| Method | URL | 설명 | 요청값 | 인증 | 성공 응답 |
| --- | --- | --- | --- | --- | --- |
| GET | `/settings` | 커플 공용 홈 설정 조회 | 없음 | JWT | `HomeSettingResponse` |
| PUT | `/settings` | 홈 문구 및 스타일 저장 | body: `HomeSettingUpdateRequest` | JWT | `HomeSettingResponse` |
| POST | `/settings/image` | 커플 공용 홈 이미지 업로드 | multipart: 이미지 파일 | JWT | `HomeSettingResponse` |

## 7. 앨범(`/photos`)

| Method | URL | 설명 | 요청값 | 인증 | 성공 응답 |
| --- | --- | --- | --- | --- | --- |
| GET |  | 커플 앨범 사진 목록 조회 | 없음 | JWT | `List<AlbumPhotoResponse>` |
| POST |  | 앨범 사진 업로드 | multipart: 이미지 파일, `memo` (query, 선택) | JWT | `AlbumPhotoResponse` |
| PATCH | `/{photoId}/memo` | 사진 메모 수정 | `photoId*` (path), body: `MemoUpdateRequest` | JWT | `AlbumPhotoResponse` |
| DELETE | `/{photoId}` | 앨범 사진 삭제 | `photoId*` (path) | JWT | 응답 데이터 없음 |

## 8. 채팅(`/chats`)

### 메시지

| Method | URL | 설명 | 요청값 | 인증 | 성공 응답 |
| --- | --- | --- | --- | --- | --- |
| GET |  | 이전 채팅 메시지 조회 | `roomId*`, `beforeMessageId`, `size` (query) | JWT | `ChatHistoryResponse` |
| GET | `/after` | 기준 메시지 이후 채팅 조회 | `roomId*`, `afterMessageId*`, `size` (query) | JWT | `ChatNewerHistoryResponse` |
| GET | `/{messageId}/context` | 특정 메시지 주변 대화 조회 | `messageId*` (path), `beforeSize`, `afterSize` (query) | JWT | `ChatMessageContextResponse` |
| POST |  | REST 방식 채팅 메시지 전송 | body: `ChatRestMessageRequest` | JWT | `ChatMessageResponse` |
| GET | `/search` | 채팅 메시지 검색 | `roomId*`, `keyword*`, `beforeMessageId`, `size` (query) | JWT | `ChatHistoryResponse` |
| POST | `/suggest` | AI 답장 문장 추천 | body: `ChatSuggestionRequest` | JWT | `ChatSuggestionResponse` |

### 읽음 상태

| Method | URL | 설명 | 요청값 | 인증 | 성공 응답 |
| --- | --- | --- | --- | --- | --- |
| POST | `/{messageId}/read` | 메시지 읽음 처리 | `messageId*` (path) | JWT | `ChatReadResponse` |
| GET | `/unread-count` | 안 읽은 채팅 개수 조회 | `roomId*` (query) | JWT | `ChatUnreadCountResponse` |
| GET | `/read-status` | 상대방 읽음 상태 조회 | `roomId*` (query) | JWT | `ChatReadStatusResponse` |

### 공감

| Method | URL | 설명 | 요청값 | 인증 | 성공 응답 |
| --- | --- | --- | --- | --- | --- |
| POST | `/{messageId}/reaction` | 메시지 공감 추가·변경 | `messageId*` (path), body: `ChatReactionRequest` | JWT | `ChatReactionResponse` |
| DELETE | `/{messageId}/reaction` | 메시지 공감 취소 | `messageId*` (path) | JWT | `204 No Content` |

### 북마크

| Method | URL | 설명 | 요청값 | 인증 | 성공 응답 |
| --- | --- | --- | --- | --- | --- |
| POST | `/{messageId}/bookmark` | 메시지 북마크 저장 | `messageId*` (path) | JWT | `ChatBookmarkResponse` |
| DELETE | `/{messageId}/bookmark` | 메시지 북마크 취소 | `messageId*` (path) | JWT | `204 No Content` |
| GET | `/bookmarks` | 저장한 메시지 목록 조회 | `roomId*`, `beforeBookmarkId`, `size`, `period`, `date` (query) | JWT | `ChatBookmarkListResponse` |

### 채팅 이미지

| Method | URL | 설명 | 요청값 | 인증 | 성공 응답 |
| --- | --- | --- | --- | --- | --- |
| POST | `/chat/images` | 채팅 이미지 업로드 | `roomId*` (query), multipart: 이미지 파일 | JWT | `201 ChatImageUploadResponse` |
| DELETE | `/images/{imageId}` | 채팅 이미지 삭제 | `imageId*` (path) | JWT | `ChatImageDeleteResponse` |

## 9. 대시보드(`/dashboards`)

`period` 값은 `DAY`, `WEEK`, `MONTH`, `YEAR`, `ALL` 중 하나입니다.

| Method | URL | 설명 | 요청값 | 인증 | 성공 응답 |
| --- | --- | --- | --- | --- | --- |
| GET | `/me/counts` | 기간별 개인 기록 조회 | `roomId*`, `period`, `date` (query) | JWT | `MemberDashboardCountResponse` |
| GET | `/couple/counts` | 기간별 커플 정량 기록 조회 | `roomId*`, `period`, `date` (query) | JWT | `DashboardCountResponse` |
| GET | `/couple/emotion-flow` | 기간별 커플 감정 흐름 조회 | `roomId*`, `period`, `date` (query) | JWT | `DashboardCoupleEmotionFlowResponse` |
| GET | `/couple/main-emotions` | 사용자별 주요 감정 조회 | `roomId*`, `period`, `date` (query) | JWT | `DashboardCoupleMainEmotionResponse` |
| GET | `/couple/frequent-words` | 커플이 자주 사용한 단어 조회 | `roomId*`, `period`, `date`, `limit` (query) | JWT | `DashboardFrequentWordsResponse` |
| GET | `/couple/conversation-flow` | 기간별 커플 대화 흐름 조회 | `roomId*`, `period`, `date` (query) | JWT | `DashboardConversationFlowResponse` |

## 10. WebSocket 채팅

| 구분 | 주소 | 설명 |
| --- | --- | --- |
| 연결 | `/ws` | STOMP WebSocket 연결 |
| 메시지 전송 | `/pub/chat/rooms/{roomId}/messages` | 채팅 메시지 전송 |
| 메시지 구독 | `/sub/chat/rooms/{roomId}/messages` | 채팅 메시지 수신 |
| 감정 분석 구독 | `/sub/chat/rooms/{roomId}/analysis` | 메시지 감정 분석 결과 수신 |
| 읽음 전송 | `/pub/chat/rooms/{roomId}/read` | 읽음 상태 전송 |
| 읽음 구독 | `/sub/chat/rooms/{roomId}/read` | 상대방 읽음 상태 수신 |
| 개인 오류 구독 | `/user/queue/errors` | 인증·채팅 오류 수신 |

[11. AI (AI 기능)](11%20AI%20(AI%20%EA%B8%B0%EB%8A%A5)%203a70300302a88062a897dd39032de08a.csv)

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