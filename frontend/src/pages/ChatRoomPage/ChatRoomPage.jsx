import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowDown, CloudOff, MessageCircleHeart, Search, X } from "lucide-react";
import EmptyState from "../../components/common/EmptyState/EmptyState";
import ChatHeader from "../../components/chat/ChatHeader/ChatHeader";
import MessageBubble from "../../components/chat/MessageBubble/MessageBubble";
import DateDivider from "../../components/chat/DateDivider/DateDivider";
import SuggestionChips from "../../components/chat/SuggestionChips/SuggestionChips";
import ChatInputBar from "../../components/chat/ChatInputBar/ChatInputBar";
import MessageActionPopover from "../../components/chat/MessageActionPopover/MessageActionPopover";
import ImageViewer from "../../components/chat/ImageViewer/ImageViewer";
import ConfirmDialog from "../../components/common/ConfirmDialog/ConfirmDialog";
import { useInfiniteScroll } from "../../hooks/useInfiniteScroll";
import {
  fetchChatPartner,
  fetchMessages,
  dedupeChatMessages,
  fetchPartnerReadState,
  normalizeChatMessage,
  sendMessage,
  uploadChatImages,
  fetchSuggestions,
  deleteChatImage,
  searchChatMessages,
} from "../../api/chatApi";
import { connectChatSocket } from "../../api/chatSocket.js";
import { fetchBookmarkedMessageIds, toggleBookmark } from "../../api/bookmarkApi";
import { clearMyReaction, fetchReactions, setMyReaction } from "../../api/reactionApi";
import { createClientMessageId } from "../../utils/clientMessageId.js";
import { resolveRoomId } from "../../api/coupleRoomContext.js";
import { useAuth } from "../../hooks/useAuth";
import { useToast } from "../../hooks/useToast";
import { ANALYSIS_STATUS, MESSAGE_TYPE, REACTION_TYPE } from "../../constants/enums";
import { HOME_SECTION } from "../../constants/navigation";
import { isSameDay } from "../../utils/emotions";
import ChatSkeleton from "../../components/chat/ChatSkeleton/ChatSkeleton";
import styles from "./ChatRoomPage.module.css";

export default function ChatRoomPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  // 내 메시지 판별은 senderId === 내 userId 로 한다.
  // 목업 상수(MY_USER_ID = 1)로 폴백하던 코드가 있었는데, 세션이 비어 있으면
  // 남의 메시지가 내 것으로 보이는 문제가 있어 없앴다. 로그인 값만 쓴다.
  const myUserId = user?.userId ?? null;

  /*
   * roomId 는 localStorage 가 아니라 서버에서 받아온다.
   * 처음 한 프레임은 null 이므로 아래 로딩 이펙트들은 roomResolved 를 기다린다.
   */
  const [roomId, setRoomId] = useState(null);
  const [roomResolved, setRoomResolved] = useState(false);

  useEffect(() => {
    let cancelled = false;

    resolveRoomId()
      .catch(() => null)
      .then((resolvedRoomId) => {
        if (cancelled) return;
        setRoomId(resolvedRoomId);
        setRoomResolved(true);
      });

    return () => {
      cancelled = true;
    };
  }, [myUserId]);

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
  // 사진 크게 보기 { images, startIndex }. null 이면 닫힘.
  const [imageViewer, setImageViewer] = useState(null);
  const [deleteImageTarget, setDeleteImageTarget] = useState(null);
  const [deletingImage, setDeletingImage] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState("");
  const [searchedKeyword, setSearchedKeyword] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searchNextCursor, setSearchNextCursor] = useState(null);
  const [searchLoading, setSearchLoading] = useState(false);

  const openImageViewer = useCallback((images, startIndex) => {
    setImageViewer({ images, startIndex });
  }, []);

  /**
   * 상대방이 읽은 지점은 뒤로 가지 않는다.
   *
   * 예전에는 서버가 보내주는 값으로 그대로 덮어썼다. 그래서 뒤늦게 도착한
   * 예전 읽음 이벤트(또는 값이 빈 이벤트) 하나가 지금까지의 '읽음'을 통째로
   * 지웠다. 답장까지 받은 메시지에서 읽음 표시가 사라지던 게 이것이다.
   * 읽은 지점은 커지기만 하는 값이므로 더 큰 값일 때만 옮긴다.
   */
  const advancePartnerLastReadMessageId = useCallback((messageId) => {
    if (messageId == null) return;

    setPartnerLastReadMessageId((previous) =>
      previous == null ? messageId : Math.max(previous, messageId)
    );
  }, []);

  const hasMore = nextBeforeMessageId !== null;
  const justPrependedRef = useRef(false);
  const suggestTimerRef = useRef(null);
  const chatSocketRef = useRef(null);
  const latestPartnerMessageIdRef = useRef(null);
  const reportedReadMessageIdRef = useRef(null);
  // 이전 페이지 요청 중복 방지 (state 는 비동기라 ref 로 즉시 잠근다)
  const fetchingMoreRef = useRef(false);

  const markLatestPartnerMessageAsRead =
    useCallback(() => {
      const latestMessageId =
        latestPartnerMessageIdRef.current;

      if (
        !latestMessageId ||
        latestMessageId ===
          reportedReadMessageIdRef.current
      ) {
        return;
      }

      const wasPublished =
        chatSocketRef.current?.markAsRead(
          latestMessageId,
        );

      if (wasPublished) {
        reportedReadMessageIdRef.current =
          latestMessageId;
      }
    }, []);

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
      setMessages((prev) =>
        dedupeChatMessages([...olderPage, ...prev]),
      );
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
    // 방을 아직 못 정했으면 기다린다.
    if (!roomResolved) return undefined;

    let cancelled = false;
    (async () => {
      try {
        // 방을 정했는데 없으면 부를 게 없다. (아래 finally 가 로딩을 끝낸다)
        if (!roomId) return;

        const [partnerInfo, page, myBookmarkedMessageIds, allReactions, partnerReadState] =
          await Promise.all([
            fetchChatPartner(),
            fetchMessages({ roomId, beforeMessageId: null }),
            fetchBookmarkedMessageIds(roomId),
            fetchReactions(roomId),
            fetchPartnerReadState(roomId),
          ]);
        if (cancelled) return;
        const latestPartnerMessage =
          [...page.messages]
            .reverse()
            .find(
              (message) =>
                message.messageId !== null &&
                Number(message.senderId) !==
                  Number(myUserId),
            );

        latestPartnerMessageIdRef.current =
          latestPartnerMessage?.messageId ??
          null;
        setPartner(partnerInfo);
        setMessages(page.messages);
        setNextBeforeMessageId(page.nextBeforeMessageId);
        setBookmarkedMessageIds(myBookmarkedMessageIds);
        setReactions(allReactions);
        setPartnerLastReadMessageId(partnerReadState.lastReadMessageId);
        /*
         * 첫 로딩 때도 같은 추론을 적용한다. 서버의 read-status 가 아직 밀려
         * 있어도, 화면에 상대 메시지가 있으면 그 앞은 읽힌 것이다.
         */
        const lastPartnerMessageId = page.messages
          .filter((m) => Number(m.senderId) !== Number(myUserId))
          .reduce((max, m) => Math.max(max, m.messageId ?? 0), 0);
        if (lastPartnerMessageId > 0) {
          setPartnerLastReadMessageId((previous) =>
            previous == null
              ? lastPartnerMessageId
              : Math.max(previous, lastPartnerMessageId)
          );
        }
      } catch {
        if (!cancelled) setLoadFailed(true);
      } finally {
        if (!cancelled) setInitialLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [myUserId, roomId, roomResolved]);

  // 같은 커플방의 메시지·읽음·공감 이벤트를 실시간으로 구독한다.
  useEffect(() => {
    if (!roomId) return undefined;

    let isActive = true;

    const socket = connectChatSocket({
      roomId,
      onMessage: (incomingMessage) => {
        if (!isActive) return;

        const normalizedMessage =
          normalizeChatMessage(
            incomingMessage,
          );

        if (!normalizedMessage) return;

        setMessages((previous) => {
          const existingIndex =
            previous.findIndex(
              (message) =>
                message.messageId ===
                  normalizedMessage.messageId ||
                (message.clientMessageId &&
                  message.clientMessageId ===
                    normalizedMessage.clientMessageId),
            );

          if (existingIndex >= 0) {
            return previous.map(
              (message, index) =>
                index === existingIndex
                  ? {
                      ...message,
                      ...normalizedMessage,
                      analysisStatus:
                        normalizedMessage.analysisStatus ??
                        message.analysisStatus,
                      emotionType:
                        normalizedMessage.emotionType ??
                        message.emotionType,
                    }
                  : message,
            );
          }

          return [
            ...previous,
            normalizedMessage,
          ];
        });

        if (
          Number(normalizedMessage.senderId) !==
          Number(myUserId)
        ) {
          latestPartnerMessageIdRef.current =
            normalizedMessage.messageId;
          markLatestPartnerMessageAsRead();

          /*
           * 상대가 답장을 보냈다는 건 그 앞의 내 메시지를 봤다는 뜻이다.
           * 읽음 이벤트가 늦게 오거나 유실돼도 답장이 도착한 시점에는
           * 읽음이 떠 있어야 한다. (읽음보다 답장이 먼저 보이면 이상하다)
           */
          advancePartnerLastReadMessageId(
            normalizedMessage.messageId,
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

        advancePartnerLastReadMessageId(
          readState.lastReadMessageId,
        );
      },
      onConnect: () => {
        if (isActive) {
          markLatestPartnerMessageAsRead();
        }
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
    advancePartnerLastReadMessageId,
    containerRef,
    markLatestPartnerMessageAsRead,
    myUserId,
    roomId,
  ]);

  const hasPendingAnalysis =
    messages.some(
      (message) =>
        message.messageType ===
          MESSAGE_TYPE.TEXT &&
        (message.analysisStatus ===
          ANALYSIS_STATUS.PENDING ||
          message.analysisStatus ===
            ANALYSIS_STATUS.PROCESSING),
    );

  // AI 분석은 서버 스케줄러에서 비동기로 끝나므로
  // 대기 중인 메시지가 있을 때 최신 결과를 갱신한다.
  useEffect(() => {
    if (
      !roomId ||
      !hasPendingAnalysis
    ) {
      return undefined;
    }

    let cancelled = false;
    let isRefreshing = false;

    const refreshAnalysisResults =
      async () => {
        if (isRefreshing) return;

        isRefreshing = true;

        try {
          const { messages: latest } =
            await fetchMessages({
              roomId,
              beforeMessageId: null,
              size: 50,
            });

          if (cancelled) return;

          const latestById = new Map(
            latest
              .filter(
                (message) =>
                  message.messageId !==
                  null,
              )
              .map((message) => [
                message.messageId,
                message,
              ]),
          );

          setMessages((previous) =>
            previous.map((message) => {
              const updated =
                latestById.get(
                  message.messageId,
                );

              return updated
                ? {
                    ...message,
                    ...updated,
                    analysisStatus:
                      updated.analysisStatus ??
                      message.analysisStatus,
                    emotionType:
                      updated.emotionType ??
                      message.emotionType,
                  }
                : message;
            }),
          );
        } catch {
          // 채팅 화면을 유지하고 다음 주기에 재시도한다.
        } finally {
          isRefreshing = false;
        }
      };

    const timerId = window.setInterval(
      refreshAnalysisResults,
      3000,
    );

    refreshAnalysisResults();

    return () => {
      cancelled = true;
      window.clearInterval(timerId);
    };
  }, [hasPendingAnalysis, roomId]);

  // 최초 로드 완료 시 기존 상대방 메시지를 읽음 처리하고 맨 아래로 스크롤
  useEffect(() => {
    if (initialLoading) {
      return;
    }

    markLatestPartnerMessageAsRead();

    if (containerRef.current) {
      containerRef.current.scrollTop =
        containerRef.current.scrollHeight;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    initialLoading,
    markLatestPartnerMessageAsRead,
  ]);

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

    // 최초 방 조회가 연결 직후의 일시적인 null로 끝났더라도 전송 시점에 한 번 더
    // 서버의 현재 방을 확인한다. roomId 없는 낙관적 메시지가 생기는 것도 막는다.
    let targetRoomId = roomId;
    if (!targetRoomId) {
      targetRoomId = await resolveRoomId();
      if (targetRoomId) setRoomId(targetRoomId);
    }

    if (!targetRoomId) {
      showToast("현재 참여 중인 커플방을 확인하지 못했어요.", { tone: "error" });
      return;
    }

    setInputValue("");
    setSuggestions([]);
    setSending(true);

    // 낙관적 렌더링: 서버가 messageId 를 만들어주기 전이라 clientMessageId 로 식별한다.
    const clientMessageId = createClientMessageId();
    const optimisticMessage = {
      messageId: null,
      roomId: targetRoomId,
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
      const savedMessage = await sendMessage({
        roomId: targetRoomId,
        content,
        clientMessageId,
      });

      if (!savedMessage) {
        throw new Error("서버가 저장된 메시지 정보를 반환하지 않았어요.");
      }
      setMessages((prev) =>
        prev.map((m) =>
          m.clientMessageId === clientMessageId ||
          m.messageId === savedMessage.messageId
            ? {
                ...m,
                ...savedMessage,
                analysisStatus:
                  savedMessage.analysisStatus ??
                  m.analysisStatus,
                emotionType:
                  savedMessage.emotionType ??
                  m.emotionType,
              }
            : m
        )
      );
    } catch (error) {
      // 전송 실패한 말풍선을 그대로 남기면 "보낸 것처럼" 보이므로 되돌리고,
      // 입력창에 문구를 복원해서 다시 보낼 수 있게 한다.
      setMessages((prev) => prev.filter((m) => m.clientMessageId !== clientMessageId));
      setInputValue((cur) => (cur ? cur : content));
      showToast(
        error?.message || "메시지를 보내지 못했어요. 다시 시도해주세요.",
        { tone: "error" },
      );
    } finally {
      setSending(false);
    }
  };

  const handleImagesSelect = async (files) => {
    if (sending || !files.length) return;

    if (files.length > 10) {
      showToast("사진은 한 번에 최대 10장까지 보낼 수 있어요.", {
        tone: "error",
      });
      return;
    }

    const invalidFile = files.find(
      (file) => !file.type.startsWith("image/"),
    );
    if (invalidFile) {
      showToast("이미지 파일만 전송할 수 있어요.", { tone: "error" });
      return;
    }

    setSending(true);
    const clientMessageId = createClientMessageId();

    try {
      const imageUrls = await uploadChatImages({ roomId, files });
      const optimisticMessage = {
        messageId: null,
        roomId,
        senderId: myUserId,
        clientMessageId,
        messageType: MESSAGE_TYPE.IMAGE,
        content: null,
        sentAt: new Date().toISOString(),
        images: imageUrls.map((imageUrl, index) => ({
          imageUrl,
          imageOrder: index + 1,
        })),
        emotionType: null,
        analysisStatus: null,
      };

      setMessages((previous) => [
        ...previous,
        optimisticMessage,
      ]);

      requestAnimationFrame(() => {
        if (containerRef.current) {
          containerRef.current.scrollTop =
            containerRef.current.scrollHeight;
        }
      });

      const savedMessage = await sendMessage({
        roomId,
        content: null,
        messageType: MESSAGE_TYPE.IMAGE,
        imageUrls,
        clientMessageId,
      });

      setMessages((previous) =>
        previous.map((message) =>
          message.clientMessageId === clientMessageId ||
          message.messageId === savedMessage.messageId
            ? { ...message, ...savedMessage }
            : message,
        ),
      );
    } catch (error) {
      setMessages((previous) =>
        previous.filter(
          (message) => message.clientMessageId !== clientMessageId,
        ),
      );
      showToast(
        error.message || "사진을 보내지 못했어요. 다시 시도해주세요.",
        { tone: "error" },
      );
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
    // 내 메시지에는 반응도 북마크도 하지 않는다.
    if (Number(message.senderId) === Number(myUserId)) return;
    setActionTarget({ message, anchorRect });
  };

  const closeActionMenu = () => setActionTarget(null);

  const requestImageDelete = (message, image) => {
    if (
      Number(message?.senderId) !== Number(myUserId) ||
      !message?.messageId ||
      !image?.imageId
    ) {
      return;
    }

    setDeleteImageTarget({
      messageId: message.messageId,
      imageId: image.imageId,
    });
  };

  const handleDeleteImage = async () => {
    if (!deleteImageTarget || deletingImage) return;

    const { messageId, imageId } = deleteImageTarget;
    setDeletingImage(true);

    try {
      const result = await deleteChatImage(imageId);
      const messageHidden = result?.messageHidden === true;

      setMessages((previous) =>
        previous.flatMap((message) => {
          if (Number(message.messageId) !== Number(messageId)) return [message];
          if (messageHidden) return [];

          const remainingImages = (message.images ?? []).filter((image) => {
            const currentImageId =
              typeof image === "string" ? null : image.imageId ?? image.image_id;
            return Number(currentImageId) !== Number(imageId);
          });

          return remainingImages.length > 0
            ? [{ ...message, images: remainingImages }]
            : [];
        }),
      );

      if (messageHidden) {
        setBookmarkedMessageIds((previous) => {
          const next = new Set(previous);
          next.delete(messageId);
          return next;
        });
        setReactions((previous) => {
          const next = { ...previous };
          delete next[messageId];
          return next;
        });
      }

      setImageViewer(null);
      setDeleteImageTarget(null);
      showToast("채팅 사진을 삭제했어요.", { tone: "success" });
    } catch (error) {
      showToast(error.message || "채팅 사진을 삭제하지 못했어요.", { tone: "error" });
    } finally {
      setDeletingImage(false);
    }
  };

  /**
   * 반응 남기기 / 취소.
   * 이미 같은 반응을 눌러둔 상태에서 다시 누르면 취소한다.
   */
  const applyReaction = async (target, reactionType) => {
    if (!target || target.messageId === null) return;

    // 내 메시지에는 반응할 수 없다.
    if (Number(target.senderId) === Number(myUserId)) return;

    const myCurrentType =
      reactions[target.messageId]?.find(
        (reaction) => Number(reaction.userId) === Number(myUserId),
      )?.reactionType ?? null;

    const isSameReaction = myCurrentType === reactionType;

    try {
      const updatedReactions = isSameReaction
        ? await clearMyReaction(target.messageId)
        : await setMyReaction(target.messageId, reactionType);

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
      showToast(
        isSameReaction ? "반응을 취소하지 못했어요." : "반응을 남기지 못했어요.",
        { tone: "error" },
      );
    }
  };

  const handleSelectReaction = (reactionType) => {
    const target = actionTarget?.message;
    closeActionMenu();
    applyReaction(target, reactionType);
  };

  // 상대 말풍선을 더블클릭/더블탭하면 하트를 바로 남긴다. (이미 하트면 취소)
  const handleDoubleTapMessage = (message) => {
    applyReaction(message, REACTION_TYPE.HEART);
  };

  const handleToggleBookmark = async () => {
    const target = actionTarget?.message;
    if (!target) return;
    // 내 메시지는 북마크하지 않는다. (메뉴가 열리지 않지만 방어적으로 한 번 더)
    if (Number(target.senderId) === Number(myUserId)) return;
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

  const closeSearch = () => {
    setSearchOpen(false);
    setSearchKeyword("");
    setSearchedKeyword("");
    setSearchResults([]);
    setSearchNextCursor(null);
  };

  const runSearch = async ({ append = false } = {}) => {
    const keyword = (append ? searchedKeyword : searchKeyword).trim();
    if (!keyword || !roomId || searchLoading) return;

    setSearchLoading(true);
    try {
      const response = await searchChatMessages({
        roomId,
        keyword,
        beforeMessageId: append ? searchNextCursor : null,
        size: 30,
      });
      const found = (response?.messages ?? [])
        .map(normalizeChatMessage)
        .filter(Boolean);

      setSearchedKeyword(keyword);
      setSearchResults((previous) =>
        append ? dedupeChatMessages([...found, ...previous]) : found,
      );
      setSearchNextCursor(response?.hasNext ? response?.nextCursor ?? null : null);
    } catch (error) {
      showToast(error?.message || "채팅을 검색하지 못했어요.", { tone: "error" });
    } finally {
      setSearchLoading(false);
    }
  };

  const displayedMessages = searchOpen && searchedKeyword ? searchResults : messages;

  return (
    <div className={`app-shell ${styles.container || ""}`}>
      <ChatHeader
        partner={partner}
        onBack={handleBack}
        onSearchClick={() => setSearchOpen(true)}
        searchEnabled={Boolean(roomId)}
      />

      {searchOpen && (
        <form
          className={styles.searchBar}
          onSubmit={(event) => {
            event.preventDefault();
            runSearch();
          }}
        >
          <Search size={18} aria-hidden="true" />
          <input
            autoFocus
            value={searchKeyword}
            onChange={(event) => setSearchKeyword(event.target.value)}
            placeholder="대화 내용 검색"
            aria-label="대화 내용 검색"
          />
          {searchKeyword && (
            <button
              type="button"
              className={styles.searchClearButton}
              onClick={() => setSearchKeyword("")}
              aria-label="검색어 지우기"
            >
              <X size={16} />
            </button>
          )}
          <button
            type="submit"
            className={styles.searchSubmitButton}
            disabled={!searchKeyword.trim() || searchLoading}
          >
            {searchLoading ? "검색 중" : "검색"}
          </button>
          <button type="button" className={styles.searchCloseButton} onClick={closeSearch}>
            닫기
          </button>
        </form>
      )}

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

        {searchOpen && searchedKeyword && !searchLoading && searchResults.length === 0 && (
          <EmptyState
            icon={<Search size={22} />}
            title="검색 결과가 없어요"
            description={`‘${searchedKeyword}’이 포함된 대화를 찾지 못했어요.`}
          />
        )}

        {!searchOpen && !initialLoading && !loadFailed && messages.length === 0 && (
          <EmptyState
            icon={<MessageCircleHeart size={22} />}
            title="아직 나눈 대화가 없어요"
            description="첫 메시지를 보내 오늘 하루를 물어보는 건 어때요?"
          />
        )}

        {!searchOpen && hasMore && (
          <div ref={sentinelRef} className={styles.sentinel}>
            {loadingMore && <span className={styles.loadingText}>이전 대화를 불러오는 중...</span>}
          </div>
        )}
        {!searchOpen && !hasMore && !initialLoading && !loadFailed && messages.length > 0 && (
          <p className={styles.chatStartText}>대화의 시작이에요</p>
        )}

        {searchOpen && searchedKeyword && searchNextCursor && (
          <button
            type="button"
            className={styles.loadSearchButton}
            onClick={() => runSearch({ append: true })}
            disabled={searchLoading}
          >
            {searchLoading ? "검색 중..." : "이전 검색 결과 더 보기"}
          </button>
        )}

        {displayedMessages.map((message, idx) => {
          const prevMessage = displayedMessages[idx - 1];
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
                onDoubleTapMessage={handleDoubleTapMessage}
                onOpenImages={openImageViewer}
                onDeleteImage={requestImageDelete}
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

      {!searchOpen && <SuggestionChips
        suggestions={suggestions}
        onSelect={(content) => setInputValue(content)}
        onRefresh={handleRefreshSuggestions}
        loading={suggestLoading}
      />}

      {!searchOpen && <ChatInputBar
        value={inputValue}
        onChange={handleInputChange}
        onSend={handleSend}
        onImagesSelect={handleImagesSelect}
        disabled={sending}
      />}

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

      {imageViewer && (
        <ImageViewer
          images={imageViewer.images}
          startIndex={imageViewer.startIndex}
          onClose={() => setImageViewer(null)}
        />
      )}

      <ConfirmDialog
        open={Boolean(deleteImageTarget)}
        title="이 사진을 삭제할까요?"
        description="삭제한 사진은 채팅과 앨범에서 다시 볼 수 없습니다."
        confirmLabel={deletingImage ? "삭제 중" : "삭제"}
        cancelLabel="취소"
        destructive
        onConfirm={handleDeleteImage}
        onCancel={() => {
          if (!deletingImage) setDeleteImageTarget(null);
        }}
      />
    </div>
  );
}
