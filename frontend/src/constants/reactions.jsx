import { Heart, CheckCircle2, ThumbsUp } from "lucide-react";
import { REACTION_TYPE } from "./enums";

/**
 * 채팅 메시지에 달 수 있는 리액션 옵션
 * - reactionType 은 chat_reaction.reaction_type ENUM('HEART','CHECK','GREAT') 값과 동일하게 유지할 것
 *   (기존 프론트 목업의 'heart' / 'check' / 'boom' → 'HEART' / 'CHECK' / 'GREAT' 로 교체됨)
 * - 옵션을 늘리거나 줄이려면 이 배열만 수정하면 액션시트/말풍선에 모두 반영됨
 *   단, 값 추가는 DB ENUM 변경이 필요하므로 백엔드와 함께 진행해야 한다.
 */
export const REACTION_OPTIONS = [
  { reactionType: REACTION_TYPE.HEART, label: "하트", Icon: Heart, color: "#ff6f91" },
  { reactionType: REACTION_TYPE.CHECK, label: "체크", Icon: CheckCircle2, color: "#4caf82" },
  { reactionType: REACTION_TYPE.GREAT, label: "붐업", Icon: ThumbsUp, color: "#ffa552" },
];

export const REACTION_MAP = REACTION_OPTIONS.reduce((acc, opt) => {
  acc[opt.reactionType] = opt;
  return acc;
}, {});
