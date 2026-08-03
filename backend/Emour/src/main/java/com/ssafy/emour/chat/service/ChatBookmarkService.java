package com.ssafy.emour.chat.service;

import com.ssafy.emour.chat.dto.ChatBookmarkListResponse;
import com.ssafy.emour.chat.dto.ChatBookmarkResponse;
import com.ssafy.emour.chat.entity.ChatBookmark;
import com.ssafy.emour.chat.entity.ChatMessage;
import com.ssafy.emour.chat.exception.ChatException;
import com.ssafy.emour.chat.repository.ChatBookmarkRepository;
import com.ssafy.emour.couple.entity.CoupleMemberId;
import com.ssafy.emour.couple.entity.CoupleMemberStatus;
import com.ssafy.emour.couple.repository.CoupleMemberRepository;
import com.ssafy.emour.dashboard.dto.DashboardPeriod;
import com.ssafy.emour.dashboard.event.DashboardChangePublisher;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

@Service
@RequiredArgsConstructor
public class ChatBookmarkService {

    private static final int DEFAULT_PAGE_SIZE = 20;
    private static final int MAX_PAGE_SIZE = 100;

    private final ChatBookmarkRepository chatBookmarkRepository;
    private final CoupleMemberRepository coupleMemberRepository;
    private final ChatMessageService chatMessageService;
    private final DashboardChangePublisher dashboardChangePublisher;

    @Transactional
    public ChatBookmarkResponse addBookmark(
            Long messageId,
            Long userId
    ) {
        ChatMessage message = chatMessageService.findMessage(messageId);
        validateActiveMember(userId, message.getRoomId());

        // 이미 저장한 메시지라면 같은 북마크를 그대로 돌려줍니다.
        ChatBookmark bookmark = chatBookmarkRepository
                .findByUserIdAndMessage_MessageId(userId, messageId)
                .orElse(null);
        if (bookmark == null) {
            bookmark = chatBookmarkRepository.save(ChatBookmark.create(
                    message.getRoomId(),
                    userId,
                    message
            ));
            dashboardChangePublisher.bookmarkChanged(
                    bookmark.getRoomId(),
                    bookmark.getUserId(),
                    bookmark.getCreatedAt()
            );
        }

        return toResponse(bookmark);
    }

    @Transactional
    public void removeBookmark(Long messageId, Long userId) {
        ChatMessage message = chatMessageService.findMessage(messageId);
        validateActiveMember(userId, message.getRoomId());

        // 이미 취소된 북마크라면 오류를 내지 않고 그대로 끝냅니다.
        chatBookmarkRepository
                .findByUserIdAndMessage_MessageId(userId, messageId)
                .ifPresent(bookmark -> {
                    chatBookmarkRepository.delete(bookmark);
                    dashboardChangePublisher.bookmarkChanged(
                            bookmark.getRoomId(),
                            bookmark.getUserId(),
                            bookmark.getCreatedAt()
                    );
                });
    }

    @Transactional(readOnly = true)
    public ChatBookmarkListResponse getBookmarks(
            Long roomId,
            Long userId,
            Long beforeBookmarkId,
            Integer requestedSize
    ) {
        return getBookmarks(
                roomId,
                userId,
                beforeBookmarkId,
                requestedSize,
                null,
                null
        );
    }

    @Transactional(readOnly = true)
    public ChatBookmarkListResponse getBookmarks(
            Long roomId,
            Long userId,
            Long beforeBookmarkId,
            Integer requestedSize,
            DashboardPeriod period,
            LocalDate date
    ) {
        validateActiveMember(userId, roomId);
        validatePeriod(period, date);

        int size = normalizePageSize(requestedSize);
        PageRequest page = PageRequest.of(0, size + 1);

        List<ChatBookmark> found = period == null
                ? findAllBookmarks(
                        roomId,
                        userId,
                        beforeBookmarkId,
                        page
                )
                : findPeriodBookmarks(
                        roomId,
                        userId,
                        beforeBookmarkId,
                        page,
                        createRange(period, date)
                );

        boolean hasNext = found.size() > size;
        List<ChatBookmark> pageBookmarks = new ArrayList<>(
                found.subList(0, Math.min(found.size(), size))
        );

        // 화면에서는 오래전에 저장한 메시지부터 보이도록 순서를 돌려줍니다.
        Collections.reverse(pageBookmarks);

        List<ChatBookmarkResponse> responses = pageBookmarks.stream()
                .map(this::toResponse)
                .toList();

        Long nextCursor = pageBookmarks.isEmpty()
                ? null
                : pageBookmarks.get(0).getBookmarkId();

        return new ChatBookmarkListResponse(
                responses,
                nextCursor,
                hasNext
        );
    }

    private List<ChatBookmark> findAllBookmarks(
            Long roomId,
            Long userId,
            Long beforeBookmarkId,
            PageRequest page
    ) {
        return beforeBookmarkId == null
                ? chatBookmarkRepository
                .findByRoomIdAndUserIdOrderByBookmarkIdDesc(
                        roomId,
                        userId,
                        page
                )
                : chatBookmarkRepository
                .findByRoomIdAndUserIdAndBookmarkIdLessThanOrderByBookmarkIdDesc(
                        roomId,
                        userId,
                        beforeBookmarkId,
                        page
                );
    }

    private List<ChatBookmark> findPeriodBookmarks(
            Long roomId,
            Long userId,
            Long beforeBookmarkId,
            PageRequest page,
            DateRange range
    ) {
        LocalDateTime start = range.startDate().atStartOfDay();
        LocalDateTime end = range.endExclusive().atStartOfDay();
        return beforeBookmarkId == null
                ? chatBookmarkRepository.findPeriodBookmarks(
                        roomId,
                        userId,
                        start,
                        end,
                        page
                )
                : chatBookmarkRepository.findPeriodBookmarksBefore(
                        roomId,
                        userId,
                        beforeBookmarkId,
                        start,
                        end,
                        page
                );
    }

    private void validatePeriod(
            DashboardPeriod period,
            LocalDate date
    ) {
        if ((period == null) != (date == null)) {
            throw new ChatException(
                    "기간 조회에서는 period와 date를 함께 입력해 주세요."
            );
        }
    }

    private DateRange createRange(
            DashboardPeriod period,
            LocalDate date
    ) {
        return switch (period) {
            case DAY -> new DateRange(date, date.plusDays(1));
            case MONTH -> {
                LocalDate start = date.withDayOfMonth(1);
                yield new DateRange(start, start.plusMonths(1));
            }
            case YEAR -> {
                LocalDate start = date.withDayOfYear(1);
                yield new DateRange(start, start.plusYears(1));
            }
        };
    }

    private ChatBookmarkResponse toResponse(ChatBookmark bookmark) {
        return new ChatBookmarkResponse(
                bookmark.getBookmarkId(),
                bookmark.getCreatedAt(),
                chatMessageService.toResponse(bookmark.getMessage())
        );
    }

    private void validateActiveMember(Long userId, Long roomId) {
        if (userId == null || roomId == null) {
            throw new ChatException("사용자 번호와 방 번호는 꼭 필요합니다.");
        }

        boolean activeMember = coupleMemberRepository.existsByIdAndStatus(
                new CoupleMemberId(userId, roomId),
                CoupleMemberStatus.ACTIVE
        );
        if (!activeMember) {
            throw new ChatException("해당 채팅방에 참여 중인 사용자가 아닙니다.");
        }
    }

    private int normalizePageSize(Integer requestedSize) {
        if (requestedSize == null) {
            return DEFAULT_PAGE_SIZE;
        }
        if (requestedSize < 1 || requestedSize > MAX_PAGE_SIZE) {
            throw new ChatException("북마크는 한 번에 1개부터 100개까지 조회할 수 있습니다.");
        }
        return requestedSize;
    }

    private record DateRange(
            LocalDate startDate,
            LocalDate endExclusive
    ) {
    }
}
