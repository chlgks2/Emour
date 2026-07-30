function createMockProfileImage() {
  const svg = `
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="400"
      height="400"
      viewBox="0 0 400 400"
    >
      <defs>
        <linearGradient
          id="background"
          x1="0"
          y1="0"
          x2="1"
          y2="1"
        >
          <stop
            offset="0%"
            stop-color="#F8E3E6"
          />

          <stop
            offset="100%"
            stop-color="#E3C6BB"
          />
        </linearGradient>
      </defs>

      <rect
        width="400"
        height="400"
        rx="200"
        fill="url(#background)"
      />

      <circle
        cx="200"
        cy="160"
        r="78"
        fill="#F5CFB7"
      />

      <path
        d="
          M120 150
          C122 62, 278 55, 280 150
          C257 118, 236 107, 200 110
          C166 107, 142 121, 120 150
        "
        fill="#4A3B38"
      />

      <path
        d="
          M95 390
          C100 275, 153 235, 200 235
          C247 235, 300 275, 305 390
        "
        fill="#D97B82"
      />

      <circle
        cx="169"
        cy="165"
        r="7"
        fill="#404040"
      />

      <circle
        cx="231"
        cy="165"
        r="7"
        fill="#404040"
      />

      <path
        d="
          M174 202
          C189 218, 211 218, 226 202
        "
        fill="none"
        stroke="#B66C6C"
        stroke-width="7"
        stroke-linecap="round"
      />
    </svg>
  `

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(
    svg,
  )}`
}

export const MOCK_MY_PAGE_USER_RESPONSE = {
  user_id: 1,
  email: 'test@example.com',
  nickname: '김철수',
  birth: '2000-05-12',
  profile_image_url:
    createMockProfileImage(),
  status_message: '오늘도 잘 부탁해 ♡',
  status: 'ACTIVE',
  created_at:
    '2026-01-10T10:00:00',
  updated_at:
    '2026-07-29T10:00:00',
  deleted_at: null,
  is_email_verified: true,
}

export const MOCK_MY_PAGE_ROOM_RESPONSE = {
  room_id: 1,
  room_code: 'LOVE-7Q2M',
  room_code_expires_at:
    '2026-08-05T23:59:59',
  started_at: '2026-02-14',
  status: 'ACTIVE',
  created_at:
    '2026-02-14T14:00:00',
  updated_at:
    '2026-07-29T10:00:00',
  ended_at: null,
}

export const MOCK_MY_PAGE_MEMBER_RESPONSE = {
  room_id: 1,
  user_id: 1,
  partner_nickname: '영희',
  alarm_time: '21:00:00',
  status: 'ACTIVE',
  joined_at:
    '2026-02-14T14:00:00',
  left_at: null,
}