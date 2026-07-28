function createMockImage({
  startColor,
  endColor,
  symbol,
}) {
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
        rx="48"
        fill="url(#background)"
      />

      <circle
        cx="480"
        cy="115"
        r="95"
        fill="rgba(255, 255, 255, 0.22)"
      />

      <circle
        cx="110"
        cy="505"
        r="135"
        fill="rgba(255, 255, 255, 0.13)"
      />

      <path
        d="M80 400 C190 300, 300 510, 520 315"
        fill="none"
        stroke="rgba(255,255,255,0.22)"
        stroke-width="28"
        stroke-linecap="round"
      />

      <text
        x="300"
        y="335"
        text-anchor="middle"
        font-size="120"
      >
        ${symbol}
      </text>
    </svg>
  `

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(
    svg,
  )}`
}

export const MOCK_ALBUM_PHOTO_RESPONSES = [
  {
    photo_id: 1,
    couple_room_id: 1,
    image: createMockImage({
      startColor: '#F3A76F',
      endColor: '#D77D75',
      symbol: '🌇',
    }),
    memo: '함께 노을을 보면서 천천히 걸었던 날.',
    taken_at: '2026-04-02',
    created_at: '2026-04-02T19:10:00',
    updated_at: '2026-04-02T19:10:00',
    deleted_at: null,
  },
  {
    photo_id: 2,
    couple_room_id: 1,
    image: createMockImage({
      startColor: '#D7A7BE',
      endColor: '#A989B8',
      symbol: '💐',
    }),
    memo: '서로에게 어울리는 꽃을 골라줬다.',
    taken_at: '2026-04-05',
    created_at: '2026-04-05T15:20:00',
    updated_at: '2026-04-05T15:20:00',
    deleted_at: null,
  },
  {
    photo_id: 3,
    couple_room_id: 1,
    image: createMockImage({
      startColor: '#A86E55',
      endColor: '#543F4B',
      symbol: '✨',
    }),
    memo: '조명이 예뻤던 카페에서 오래 이야기했다.',
    taken_at: '2026-04-08',
    created_at: '2026-04-08T21:10:00',
    updated_at: '2026-04-08T21:10:00',
    deleted_at: null,
  },
  {
    photo_id: 4,
    couple_room_id: 1,
    image: createMockImage({
      startColor: '#CDB59D',
      endColor: '#9B7666',
      symbol: '☕',
    }),
    memo: '비 오는 날 함께 마신 따뜻한 커피.',
    taken_at: '2026-04-12',
    created_at: '2026-04-12T16:30:00',
    updated_at: '2026-04-12T16:30:00',
    deleted_at: null,
  },
  {
    photo_id: 5,
    couple_room_id: 1,
    image: createMockImage({
      startColor: '#E7B8C8',
      endColor: '#B58991',
      symbol: '🌸',
    }),
    memo: '올해 벚꽃이 정말 예뻤던 날! 함께 걸어서 더 행복했다.',
    taken_at: '2026-04-15',
    created_at: '2026-04-15T18:30:00',
    updated_at: '2026-04-15T18:30:00',
    deleted_at: null,
  },
  {
    photo_id: 6,
    couple_room_id: 1,
    image: createMockImage({
      startColor: '#9FC9D5',
      endColor: '#6D91B6',
      symbol: '🌊',
    }),
    memo: '바다를 보면서 다음 여행 계획을 세웠다.',
    taken_at: '2026-04-18',
    created_at: '2026-04-18T17:40:00',
    updated_at: '2026-04-18T17:40:00',
    deleted_at: null,
  },
]

export const MOCK_CHAT_PHOTO_RESPONSES = [
  {
    message_id: 101,
    couple_room_id: 1,
    user_id: 2,
    reply_message_id: null,
    message_type: 'IMAGE',
    content: createMockImage({
      startColor: '#E5C19A',
      endColor: '#A87965',
      symbol: '🍽️',
    }),
    read_at: '2026-07-20T20:31:00',
    send_at: '2026-07-20T20:30:00',
    updated_at: '2026-07-20T20:30:00',
    deleted_at: null,
  },
  {
    message_id: 102,
    couple_room_id: 1,
    user_id: 1,
    reply_message_id: null,
    message_type: 'IMAGE',
    content: createMockImage({
      startColor: '#DCC7AD',
      endColor: '#A68D7F',
      symbol: '🐈',
    }),
    read_at: '2026-07-21T14:11:00',
    send_at: '2026-07-21T14:10:00',
    updated_at: '2026-07-21T14:10:00',
    deleted_at: null,
  },
  {
    message_id: 103,
    couple_room_id: 1,
    user_id: 2,
    reply_message_id: null,
    message_type: 'IMAGE',
    content: createMockImage({
      startColor: '#D8C1B9',
      endColor: '#A9918B',
      symbol: '🤝',
    }),
    read_at: '2026-07-23T18:11:00',
    send_at: '2026-07-23T18:10:00',
    updated_at: '2026-07-23T18:10:00',
    deleted_at: null,
  },
]