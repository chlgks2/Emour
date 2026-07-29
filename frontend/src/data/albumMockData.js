function createMockImage(
  label,
  startColor,
  endColor,
) {
  const svg = `
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="600"
      height="600"
      viewBox="0 0 600 600"
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
            stop-color="${startColor}"
          />

          <stop
            offset="100%"
            stop-color="${endColor}"
          />
        </linearGradient>
      </defs>

      <rect
        width="600"
        height="600"
        fill="url(#background)"
      />

      <circle
        cx="300"
        cy="245"
        r="118"
        fill="rgba(255,255,255,0.28)"
      />

      <path
        d="
          M110 535
          C165 390, 435 390, 490 535
        "
        fill="rgba(255,255,255,0.32)"
      />

      <text
        x="300"
        y="570"
        text-anchor="middle"
        font-family="Arial, sans-serif"
        font-size="28"
        font-weight="700"
        fill="rgba(64,64,64,0.72)"
      >
        ${label}
      </text>
    </svg>
  `

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(
    svg,
  )}`
}

/*
 * album_photo 테이블 응답
 */
export const MOCK_ALBUM_PHOTO_RESPONSE = [
  {
    photo_id: 1,
    room_id: 1,
    uploader_id: 1,
    image_url: createMockImage(
      '우리의 첫 여행',
      '#F5D8CF',
      '#E7B9B4',
    ),
    memo: '부산에서 함께 본 바다',
    created_at:
      '2026-07-26T15:30:00',
    updated_at:
      '2026-07-26T15:30:00',
  },
  {
    photo_id: 2,
    room_id: 1,
    uploader_id: 2,
    image_url: createMockImage(
      '카페 데이트',
      '#F4E4C4',
      '#D8C39A',
    ),
    memo: '분위기가 좋았던 카페',
    created_at:
      '2026-07-22T13:10:00',
    updated_at:
      '2026-07-22T13:10:00',
  },
  {
    photo_id: 3,
    room_id: 1,
    uploader_id: 1,
    image_url: createMockImage(
      '한강 산책',
      '#DCE8D0',
      '#AFC7A0',
    ),
    memo: '',
    created_at:
      '2026-07-18T18:20:00',
    updated_at:
      '2026-07-18T18:20:00',
  },
]

/*
 * chat_message_image 테이블 응답
 */
export const MOCK_CHAT_IMAGE_RESPONSE = [
  {
    image_id: 101,
    message_id: 501,
    image_url: createMockImage(
      '오늘의 저녁',
      '#F0D7D1',
      '#CCABA4',
    ),
    display_order: 1,
    created_at:
      '2026-07-28T19:20:00',
    deleted_at: null,
  },
  {
    image_id: 102,
    message_id: 525,
    image_url: createMockImage(
      '귀여운 강아지',
      '#E0D9EF',
      '#B9ACD1',
    ),
    display_order: 1,
    created_at:
      '2026-07-27T14:05:00',
    deleted_at: null,
  },
  {
    image_id: 103,
    message_id: 541,
    image_url: createMockImage(
      '퇴근길 하늘',
      '#D6E6ED',
      '#A9C4D0',
    ),
    display_order: 1,
    created_at:
      '2026-07-25T18:40:00',
    deleted_at: null,
  },
  {
    image_id: 104,
    message_id: 550,
    image_url: createMockImage(
      '디저트',
      '#F3DADB',
      '#D7AEB2',
    ),
    display_order: 2,
    created_at:
      '2026-07-24T16:30:00',
    deleted_at: null,
  },
]