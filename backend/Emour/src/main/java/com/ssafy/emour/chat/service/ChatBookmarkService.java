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
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

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
                .orElseGet(() -> chatBookmarkRepository.save(
                        ChatBookmark.create(
                                message.getRoomId(),
                                userId,
                                message
                        )
                ));

        return toResponse(bookmark);
    }

    @Transactional
    public void removeBookmark(Long messageId, Long userId) {
        ChatMessage message = chatMessageService.findMessage(messageId);
        validateActiveMember(userId, message.getRoomId());

        // 이미 취소된 북마크라면 오류를 내지 않고 그대로 끝냅니다.
        chatBookmarkRepository
                .findByUserIdAndMessage_MessageId(userId, messageId)
                .ifPresent(chatBookmarkRepository::delete);
    }

    @Transactional(readOnly = true)
    public ChatBookmarkListResponse getBookmarks(
            Long roomId,
            Long userId,
            Long beforeBookmarkId,
            Integer requestedSize
    ) {
        validateActiveMember(userId, roomId);

        int size = normalizePageSize(requestedSize);
        PageRequest page = PageRequest.of(0, size + 1);

        List<ChatBookmark> found = beforeBookmarkId == null
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
}
