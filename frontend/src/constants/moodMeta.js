import {
  EMPTY_MOOD_COLOR as EMPTY_COLOR,
  MOOD_TYPES,
} from '../utils/moodEmotion.js'

/*
 * 기록이 없는 날의 색. 원본은 utils/moodEmotion.js 한 곳에만 두고
 * 여기서는 다시 내보내기만 해서 두 값이 어긋나지 않게 한다.
 */
export const EMPTY_MOOD_COLOR = EMPTY_COLOR

/*
 * 캘린더와 무드 입력 화면이 같은 5단계 설정을 사용합니다.
 * DB mood.mood_type ENUM과 1:1로 대응합니다.
 */
export const MOOD_META =
  Object.fromEntries(
    MOOD_TYPES.map((mood) => [
      mood.moodType,
      {
        label: mood.label,
        level: mood.level,
        color: mood.color,
      },
    ]),
  )
