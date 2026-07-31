import { useRef } from "react";
import { Bookmark } from "lucide-react";
import { getEmotionStyle, toEmotionLabel, formatTime } from "../../utils/emotions";
import { useLongPress } from "../../hooks/useLongPress";
import { REACTION_MAP } from "../../constants/reactions";
import { ANALYSIS_STATUS, MESSAGE_TYPE } from "../../constants/enums";
import styles from "./MessageBubble.module.css";

/**
 * @param {object} message - chat_message 기준
 *   { messageId, roomId, senderId, clientMessageId, messageType, content, sentAt, images, emotionType }
 * @param {number} myUserId - 내 user_id. senderId 와 비교해 내 메시지인지 판별한다.
 * @param {boolean} [isBookmarked] - 내가 이 메시지를 북마크했는지 (나만 보이는 값)
 * @param {Array<{reactionId:number, userId:number, reactionType:string}>} [reactions]
 *   이 메시지에 달린 리액션 목록 (양쪽 모두에게 보임. 나/상대 각각 1개까지)
 * @param {boolean} [isReadByPartner] - chat_read_state.last_read_message_id 로 파생된 읽음 여부
 * @param {(message: object, anchorRect: DOMRect|null) => void} [onLongPressMessage]
 *   꾹 눌렀을 때 액션 메뉴를 열기 위한 콜백. 메뉴를 말풍선 옆에 붙이기 위해 말풍선 좌표도 넘긴다.
 * @param {(message: object) => void} [onDoubleTapMessage]
 *   더블클릭/더블탭 시 하트를 바로 남기기 위한 콜백. (내 메시지에는 붙이지 않는다)
 */
export default function MessageBubble({
  message,
  myUserId,
  isBookmarked,
  reactions = [],
  isReadByPartner,
  onLongPressMessage,
  onDoubleTapMessage,
}) {
  const isMine = message.senderId === myUserId;
  const emotionStyle = message.emotionType ? getEmotionStyle(message.emotionType) : null;
  const isTextMessage =
    message.messageType === MESSAGE_TYPE.TEXT;
  const isAnalyzing =
    isTextMessage &&
    (message.analysisStatus === ANALYSIS_STATUS.PENDING ||
      message.analysisStatus === ANALYSIS_STATUS.PROCESSING);
  const hasAnalysisFailed =
    isTextMessage &&
    message.analysisStatus === ANALYSIS_STATUS.FAILED;

  const bubbleRef = useRef(null);

  const openActionMenu = () => {
    onLongPressMessage?.(message, bubbleRef.current?.getBoundingClientRect() ?? null);
  };

  const longPressHandlers = useLongPress(openActionMenu);

  /*
   * 내 메시지에는 반응도 북마크도 할 수 없다.
   * 그래서 말풍선을 아예 버튼으로 만들지 않는다. 롱프레스·더블탭·키보드 진입을
   * 모두 막아야 "눌리는데 아무 일도 안 일어나는" 상태가 생기지 않는다.
   */
  const interactionProps = isMine
    ? {}
    : {
        role: "button",
        tabIndex: 0,
        "aria-label": `상대방 메시지: ${message.content}. 반응 및 북마크 메뉴 열기`,
        onKeyDown: (e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            openActionMenu();
          }
        },
        onDoubleClick: () => onDoubleTapMessage?.(message),
        ...longPressHandlers,
      };

  return (
    <div
      className={[
        styles.row,
        isMine ? styles.rowMine : styles.rowPartner,
        // 리본은 말풍선 위로, 리액션 뱃지는 아래로 튀어나온다.
        // 붙은 쪽만 여백을 넓혀서 옆 메시지와 겹치거나 누를 곳이 좁아지지 않게 한다.
        isBookmarked ? styles.rowBookmarked : "",
        reactions.length > 0 ? styles.rowReacted : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className={styles.column}>
        {emotionStyle && (
          <span className={styles.emotionTag} style={{ color: emotionStyle.color }}>
            <emotionStyle.Icon size={11} aria-hidden="true" />
            {toEmotionLabel(message.emotionType)}
          </span>
        )}
        {!emotionStyle && isAnalyzing && (
          <span className={styles.analysisTag}>
            <span className={styles.analysisSpinner} aria-hidden="true" />
            AI 감정 분석 중
          </span>
        )}
        {hasAnalysisFailed && (
          <span className={styles.analysisFailed}>
            감정 분석 실패
          </span>
        )}

        <div className={styles.bubbleWrap}>
          {/* 색은 CSS(.bookmarkRibbon)에서 준다. fill/color prop 은 SVG presentation
              attribute 로 들어가 var() 가 해석되지 않는다. */}
          {isBookmarked && (
            <Bookmark size={20} className={styles.bookmarkRibbon} aria-label="북마크됨" />
          )}

          {/*
            롱프레스는 마우스/터치 전용이라 키보드 사용자는 리액션·북마크에 접근할 수 없었다.
            role="button" + Enter/Space 로 같은 액션 메뉴를 열 수 있게 한다.
            (내 메시지는 interactionProps 가 비어 있어 그냥 텍스트로 남는다)
          */}
          <div
            ref={bubbleRef}
            className={[
              styles.bubble,
              isMine ? styles.bubbleMine : styles.bubblePartner,
              // 눌림 피드백·선택 방지는 실제로 눌리는 말풍선에만 건다
              isMine ? "" : styles.bubbleInteractive,
            ]
              .filter(Boolean)
              .join(" ")}
            {...interactionProps}
          >
            {message.content}
          </div>

          {reactions.length > 0 && (
            <span
              className={[
                styles.reactionBadges,
                isMine ? styles.reactionBadgesMine : styles.reactionBadgesPartner,
              ].join(" ")}
            >
              {reactions.map((reaction) => {
                const option = REACTION_MAP[reaction.reactionType];
                if (!option) return null;
                const ReactionIcon = option.Icon;
                return (
                  <span
                    key={reaction.reactionId}
                    className={styles.reactionBadge}
                    style={{ background: option.color }}
                    aria-label={`${option.label}${reaction.userId === myUserId ? " (나)" : ""}`}
                  >
                    <ReactionIcon size={12} color="#fff" />
                  </span>
                );
              })}
            </span>
          )}
        </div>
      </div>
      <div className={styles.metaColumn}>
        {isMine && isReadByPartner && <span className={styles.readTag}>읽음</span>}
        <span className={styles.time}>{formatTime(message.sentAt)}</span>
      </div>
    </div>
  );
}
