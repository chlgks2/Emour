import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowDown, CloudOff, MessageCircleHeart } from "lucide-react";
import EmptyState from "../components/common/EmptyState";
import ChatHeader from "../components/chat/ChatHeader";
import MessageBubble from "../components/chat/MessageBubble";
import DateDivider from "../components/chat/DateDivider";
import SuggestionChips from "../components/chat/SuggestionChips";
import ChatInputBar from "../components/chat/ChatInputBar";
import MessageActionPopover from "../components/chat/MessageActionPopover";
import { useInfiniteScroll } from "../hooks/useInfiniteScroll";
import {
  fetchChatPartner,
  fetchMessages,
  fetchPartnerReadState,
  sendMessage,
  fetchSuggestions,
} from "../api/chatApi";
import { connectChatSocket } from "../api/chatSocket.js";
import { fetchBookmarkedMessageIds, toggleBookmark } from "../api/bookmarkApi";
import { fetchReactions, setMyReaction } from "../api/reactionApi";
import { createClientMessageId, MY_USER_ID } from "../api/mock/db";
import { getCurrentCoupleRoom } from "../utils/pendingCoupleRoom.js";
import { useAuth } from "../hooks/useAuth";
import { useToast } from "../hooks/useToast";
import { ANALYSIS_STATUS, MESSAGE_TYPE } from "../constants/enums";
import { HOME_SECTION } from "../constants/navigation";
import { isSameDay } from "../utils/emotions";
import ChatSkeleton from "../components/chat/ChatSkeleton";
import styles from "./ChatRoomPage.module.css";

export default function ChatRoomPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  // 내 메시지 판별은 senderId === 내 userId 로 한다. (기존 목업의 sender: "me" | "partner" 대체)
  // 목업 상수는 세션이 비어있을 때의 폴백이며, 연동 후에는 user 값만 쓰면 된다.
  const myUserId = user?.userId ?? MY_USER_ID;
  const currentRoom =
    getCurrentCoupleRoom();
  const roomId =
    user?.roomId ??
    currentRoom?.roomId ??
    null;

  const [partner, setPartner] = useState(null);
  const [messages, setMessages] = useState([]);
  const [nextBeforeMessageId, setNextBeforeMessageId] = useState(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [sending, setSending] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [suggestLoading, setSuggestLoading] = useState(false);

  // 스크롤 다운 버튼 상태
  const [showScrollDown, setShowScrollDown] = useState(false);

  // 북마크(나만 보이는 값) / 리액션(양쪽에 보이는 값) 상태
  const [bookmarkedMessageIds, setBookmarkedMessageIds] = useState(() => new Set());
  const [reactions, setReactions] = useState({}); // { [messageId]: reaction[] }
  // chat_read_state: 상대방이 마지막으로 읽은 messageId. "읽음" 표시를 여기서 파생시킨다.
  const [partnerLastReadMessageId, setPartnerLastReadMessageId] = useState(null);
  // 롱프레스로 선택된 메시지 + 메뉴를 붙일 말풍선 좌표 { message, anchorRect }
  const [actionTarget, setActionTarget] = useState(null);

  const hasMore = nextBeforeMessageId !== null;
  const justPrependedRef = useRef(false);
  const suggestTimerRef = useRef(null);
  const chatSocketRef = useRef(null);
  // 이전 페이지 요청 중복 방지 (state 는 비동기라 ref 로 즉시 잠근다)
  const fetchingMoreRef = useRef(false);

  const loadMore = useCallback(async () => {
    if (!hasMore || fetchingMoreRef.current) return;
    fetchingMoreRef.current = true;
    setLoadingMore(true);
    try {
      const { messages: olderPage, nextBeforeMessageId: nextCursor } = await fetchMessages({
        roomId,
        beforeMessageId: nextBeforeMessageId,
      });
      justPrependedRef.current = true;
      setMessages((prev) => [...olderPage, ...prev]);
      setNextBeforeMessageId(nextCursor);
    } catch {
      // 계속 재시도하며 도는 것을 막고 알림만 준다.
      setNextBeforeMessageId(null);
      showToast("이전 대화를 불러오지 못했어요.", { tone: "error" });
    } finally {
      fetchingMoreRef.current = false;
      setLoadingMore(false);
    }
  }, [hasMore, nextBeforeMessageId, roomId, showToast]);

  const { containerRef, sentinelRef, restoreScrollPosition } = useInfiniteScroll({
    onLoadMore: loadMore,
    hasMore,
    loading: loadingMore,
  });

  // 최초 진입 시 최신 메시지 페이지 로드 + 상대방 정보/읽음 상태 + 북마크/리액션 조회
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [partnerInfo, page, myBookmarkedMessageIds, allReactions, partnerReadState] =
          await Promise.all([
            fetchChatPartner(),
            fetchMessages({ roomId, beforeMessageId: null }),
            fetchBookmarkedMessageIds(roomId),
            fetchReactions(roomId),
            fetchPartnerReadState(),
          ]);
        if (cancelled) return;
        setPartner(partnerInfo);
        setMessages(page.messages);
        setNextBeforeMessageId(page.nextBeforeMessageId);
        setBookmarkedMessageIds(myBookmarkedMessageIds);
        setReactions(allReactions);
        setPartnerLastReadMessageId(partnerReadState.lastReadMessageId);
      } catch {
        if (!cancelled) setLoadFailed(true);
      } finally {
        if (!cancelled) setInitialLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [roomId]);

  // 같은 커플방의 메시지·읽음·공감 이벤트를 실시간으로 구독한다.
  useEffect(() => {
    if (!roomId) return undefined;

    let isActive = true;

    const socket = connectChatSocket({
      roomId,
      onMessage: (incomingMessage) => {
        if (!isActive) return;

        setMessages((previous) => {
          const existingIndex =
            previous.findIndex(
              (message) =>
                message.messageId ===
                  incomingMessage.messageId ||
                (message.clientMessageId &&
                  message.clientMessageId ===
                    incomingMessage.clientMessageId),
            );

          if (existingIndex >= 0) {
            return previous.map(
              (message, index) =>
                index === existingIndex
                  ? incomingMessage
                  : message,
            );
          }

          return [
            ...previous,
            incomingMessage,
          ];
        });

        if (
          Number(incomingMessage.senderId) !==
          Number(myUserId)
        ) {
          chatSocketRef.current?.markAsRead(
            incomingMessage.messageId,
          );
        }

        requestAnimationFrame(() => {
          if (containerRef.current) {
            const {
              scrollTop,
              scrollHeight,
              clientHeight,
            } = containerRef.current;
            const isNearBottom =
              scrollHeight -
                scrollTop -
                clientHeight <
              180;

            if (isNearBottom) {
              containerRef.current.scrollTop =
                scrollHeight;
            }
          }
        });
      },
      onReaction: (event) => {
        if (!isActive || !event.reaction) {
          return;
        }

        const { action, reaction } =
          event;

        setReactions((previous) => {
          const messageReactions = [
            ...(previous[
              reaction.messageId
            ] ?? []),
          ];
          const filtered =
            messageReactions.filter(
              (item) =>
                Number(item.userId) !==
                Number(reaction.userId),
            );

          return {
            ...previous,
            [reaction.messageId]:
              action === "REMOVED"
                ? filtered
                : [...filtered, reaction],
          };
        });
      },
      onRead: (readState) => {
        if (
          !isActive ||
          Number(readState.userId) ===
            Number(myUserId)
        ) {
          return;
        }

        setPartnerLastReadMessageId(
          readState.lastReadMessageId,
        );
      },
      onError: (error) => {
        if (isActive) {
          console.error(
            "실시간 채팅 연결 오류:",
            error,
          );
        }
      },
    });

    chatSocketRef.current = socket;

    return () => {
      isActive = false;
      chatSocketRef.current = null;
      socket?.disconnect();
    };
  }, [
    containerRef,
    myUserId,
    roomId,
  ]);

  // 최초 로드 완료 시 맨 아래(최신 메시지)로 스크롤
  useEffect(() => {
    if (!initialLoading && containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialLoading]);

  // 과거 메시지를 앞쪽에 붙인 직후엔 스크롤이 위로 튀지 않도록 위치를 보정
  useLayoutEffect(() => {
    if (justPrependedRef.current) {
      restoreScrollPosition();
      justPrependedRef.current = false;
    }
  }, [messages, restoreScrollPosition]);

  // 입력값이 바뀔 때마다 AI 문장 다듬기 추천을 (debounce로) 요청
  useEffect(() => {
    clearTimeout(suggestTimerRef.current);
    if (!inputValue.trim()) {
      return;
    }
    suggestTimerRef.current = setTimeout(async () => {
      setSuggestLoading(true);
      try {
        setSuggestions(await fetchSuggestions(inputValue));
      } catch {
        // 문장 추천은 보조 기능이라 실패해도 조용히 비운다.
        setSuggestions([]);
      } finally {
        setSuggestLoading(false);
      }
    }, 500);
    return () => clearTimeout(suggestTimerRef.current);
  }, [inputValue]);

  const handleInputChange = (content) => {
    setInputValue(content);
    if (!content.trim()) {
      setSuggestions([]);
    }
  };

  // 추천 새로고침도 실패를 삼키지 않고 로딩 상태를 표시한다.
  const handleRefreshSuggestions = async () => {
    if (!inputValue.trim()) return;
    setSuggestLoading(true);
    try {
      setSuggestions(await fetchSuggestions(inputValue));
    } catch {
      showToast("추천 문장을 불러오지 못했어요.", { tone: "error" });
    } finally {
      setSuggestLoading(false);
    }
  };

  const handleSend = async () => {
    const content = inputValue.trim();
    if (!content || sending) return;
    setInputValue("");
    setSuggestions([]);
    setSending(true);

    // 낙관적 렌더링: 서버가 messageId 를 만들어주기 전이라 clientMessageId 로 식별한다.
    const clientMessageId = createClientMessageId();
    const optimisticMessage = {
      messageId: null,
      roomId,
      senderId: myUserId,
      clientMessageId,
      messageType: MESSAGE_TYPE.TEXT,
      content,
      sentAt: new Date().toISOString(),
      images: [],
      emotionType: null,
      analysisStatus: ANALYSIS_STATUS.PENDING,
    };
    setMessages((prev) => [...prev, optimisticMessage]);
    requestAnimationFrame(() => {
      if (containerRef.current) {
        containerRef.current.scrollTop = containerRef.current.scrollHeight;
      }
    });

    try {
      // 서버 응답(messageId, 감정 분석 결과 등)으로 낙관적 메시지를 교체
      const savedMessage = await sendMessage({ roomId, content, clientMessageId });
      setMessages((prev) =>
        prev.map((m) =>
          m.clientMessageId === clientMessageId ||
          m.messageId === savedMessage.messageId
            ? savedMessage
            : m
        )
      );
    } catch {
      // 전송 실패한 말풍선을 그대로 남기면 "보낸 것처럼" 보이므로 되돌리고,
      // 입력창에 문구를 복원해서 다시 보낼 수 있게 한다.
      setMessages((prev) => prev.filter((m) => m.clientMessageId !== clientMessageId));
      setInputValue((cur) => (cur ? cur : content));
      showToast("메시지를 보내지 못했어요. 다시 시도해주세요.", { tone: "error" });
    } finally {
      setSending(false);
    }
  };

  // ─────────────────────────────────────────────────────────
  // 스크롤 감지 및 맨 아래로 이동
  // ─────────────────────────────────────────────────────────
  const handleScroll = (e) => {
    const { scrollTop, scrollHeight, clientHeight } = e.target;
    const isScrolledUp = scrollHeight - scrollTop - clientHeight > 150;
    setShowScrollDown(isScrolledUp);
  };

  const scrollToBottom = () => {
    if (containerRef.current) {
      containerRef.current.scrollTo({
        top: containerRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  };

  // ─────────────────────────────────────────────────────────
  // 롱프레스 액션 메뉴 (리액션 / 북마크) - 말풍선 옆에 뜨는 논모달 팝오버
  // ─────────────────────────────────────────────────────────
  const handleLongPressMessage = (message, anchorRect) => {
    // 아직 서버에 저장되지 않은(messageId 없는) 메시지는 리액션/북마크를 걸 수 없다.
    if (message.messageId === null) return;
    setActionTarget({ message, anchorRect });
  };

  const closeActionMenu = () => setActionTarget(null);

  const handleSelectReaction = async (reactionType) => {
    const target = actionTarget?.message;
    if (!target) return;
    closeActionMenu();
    try {
      const updatedReactions = await setMyReaction(target.messageId, reactionType);
      setReactions((prev) => {
        const existingReactions =
          prev[target.messageId] ?? [];
        const reactionsFromOthers =
          existingReactions.filter(
            (reaction) =>
              Number(reaction.userId) !==
              Number(myUserId),
          );

        const next = { ...prev };
        if (updatedReactions.length > 0) {
          next[target.messageId] = [
            ...reactionsFromOthers,
            ...updatedReactions,
          ];
        } else {
          next[target.messageId] =
            reactionsFromOthers;
        }
        return next;
      });
    } catch {
      showToast("반응을 남기지 못했어요.", { tone: "error" });
    }
  };

  const handleToggleBookmark = async () => {
    const target = actionTarget?.message;
    if (!target) return;
    closeActionMenu();
    const isCurrentlyBookmarked = bookmarkedMessageIds.has(target.messageId);
    try {
      await toggleBookmark(target, isCurrentlyBookmarked);
      setBookmarkedMessageIds((prev) => {
        const next = new Set(prev);
        if (isCurrentlyBookmarked) {
          next.delete(target.messageId);
        } else {
          next.add(target.messageId);
        }
        return next;
      });
      showToast(isCurrentlyBookmarked ? "북마크를 해제했어요." : "북마크에 저장했어요.", {
        tone: "success",
      });
    } catch {
      showToast("북마크를 변경하지 못했어요.", { tone: "error" });
    }
  };

  // 채팅방에서 나갈 때는 홈 맨 위가 아니라, 들어올 때 있던 대시보드 섹션으로 돌려보낸다.
  // replace 로 이동해서 히스토리에 /chat 이 남아 브라우저 뒤로가기로 다시 들어오는 것도 막는다.
  const handleBack = () => {
    navigate("/dashboard", { replace: true, state: { section: HOME_SECTION.DASHBOARD } });
  };

  return (
    <div className={`app-shell ${styles.container || ""}`}>
      <ChatHeader partner={partner} onBack={handleBack} onSearchClick={() => {}} />

      <div
        className={styles.messageArea}
        ref={containerRef}
        onScroll={handleScroll}
        aria-busy={initialLoading}
        /* 모달이 열리면 global.css 가 이 영역의 스크롤을 잠근다.
           (액션 메뉴는 논모달이라 잠그지 않고, 스크롤하면 그냥 닫힌다) */
        data-scroll-container
      >
        {initialLoading && <ChatSkeleton />}

        {!initialLoading && loadFailed && (
          <EmptyState
            tone="error"
            icon={<CloudOff size={22} />}
            title="대화를 불러오지 못했어요"
            description="네트워크 상태를 확인한 뒤 새로고침해주세요."
            actionLabel="새로고침"
            onAction={() => window.location.reload()}
          />
        )}

        {!initialLoading && !loadFailed && messages.length === 0 && (
          <EmptyState
            icon={<MessageCircleHeart size={22} />}
            title="아직 나눈 대화가 없어요"
            description="첫 메시지를 보내 오늘 하루를 물어보는 건 어때요?"
          />
        )}

        {hasMore && (
          <div ref={sentinelRef} className={styles.sentinel}>
            {loadingMore && <span className={styles.loadingText}>이전 대화를 불러오는 중...</span>}
          </div>
        )}
        {!hasMore && !initialLoading && !loadFailed && messages.length > 0 && (
          <p className={styles.chatStartText}>대화의 시작이에요 💬</p>
        )}

        {messages.map((message, idx) => {
          const prevMessage = messages[idx - 1];
          const showDateDivider = !prevMessage || !isSameDay(prevMessage.sentAt, message.sentAt);
          const isReadByPartner =
            message.messageId !== null &&
            partnerLastReadMessageId !== null &&
            message.messageId <= partnerLastReadMessageId;
          return (
            <div key={message.messageId ?? message.clientMessageId}>
              {showDateDivider && <DateDivider dateTime={message.sentAt} />}
              <MessageBubble
                message={message}
                myUserId={myUserId}
                isBookmarked={bookmarkedMessageIds.has(message.messageId)}
                reactions={reactions[message.messageId] ?? []}
                isReadByPartner={isReadByPartner}
                onLongPressMessage={handleLongPressMessage}
              />
            </div>
          );
        })}
      </div>

      {showScrollDown && (
        <button
          className={styles.scrollDownBtn}
          onClick={scrollToBottom}
          aria-label="맨 아래로"
        >
          <ArrowDown size={20} />
        </button>
      )}

      <SuggestionChips
        suggestions={suggestions}
        onSelect={(content) => setInputValue(content)}
        onRefresh={handleRefreshSuggestions}
        loading={suggestLoading}
      />

      <ChatInputBar
        value={inputValue}
        onChange={handleInputChange}
        onSend={handleSend}
        disabled={sending}
      />

      {/* 열려 있을 때만 마운트해서, 닫힌 동안 전역 리스너(바깥 클릭/스크롤)가 붙지 않게 한다 */}
      {actionTarget && (
        <MessageActionPopover
          anchorRect={actionTarget.anchorRect}
          isBookmarked={bookmarkedMessageIds.has(actionTarget.message.messageId)}
          myReactionType={
            reactions[actionTarget.message.messageId]?.find((r) => r.userId === myUserId)
              ?.reactionType ?? null
          }
          onClose={closeActionMenu}
          onSelectReaction={handleSelectReaction}
          onToggleBookmark={handleToggleBookmark}
        />
      )}
    </div>
  );
}
