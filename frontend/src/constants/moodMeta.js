import {
  MOOD_TYPES,
} from '../utils/moodEmotion.js'

export const EMPTY_MOOD_COLOR = '#F2EFED'

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
