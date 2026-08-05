package com.ssafy.emour.chat.service;

import com.ssafy.emour.chat.dto.ChatHistoryResponse;
import com.ssafy.emour.chat.dto.ChatImageResponse;
import com.ssafy.emour.chat.dto.ChatMessageRequest;
import com.ssafy.emour.chat.dto.ChatMessageResponse;
import com.ssafy.emour.chat.dto.ChatReactionResponse;
import com.ssafy.emour.chat.entity.ChatAnalysis;
import com.ssafy.emour.chat.entity.ChatMessage;
import com.ssafy.emour.chat.entity.MessageType;
import com.ssafy.emour.chat.exception.ChatException;
import com.ssafy.emour.chat.repository.ChatAnalysisRepository;
import com.ssafy.emour.chat.repository.ChatMessageRepository;
import com.ssafy.emour.couple.entity.CoupleMemberId;
import com.ssafy.emour.couple.entity.CoupleMemberStatus;
import com.ssafy.emour.couple.repository.CoupleMemberRepository;
import com.ssafy.emour.dashboard.event.DashboardChangePublisher;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Collections;
import java.util.Map;
import java.util.List;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ChatMessageService {

    private static final int DEFAULT_PAGE_SIZE = 50;
    private static final int MAX_PAGE_SIZE = 100;
    private static final int MAX_IMAGE_COUNT = 10;

    private final ChatMessageRepository chatMessageRepository;
    private final ChatAnalysisRepository chatAnalysisRepository;
    private final CoupleMemberRepository coupleMemberRepository;
    private final DashboardChangePublisher dashboardChangePublisher;

    @Transactional
    public ChatMessageResponse sendMessage(
            Long roomId,
            Long senderId,
            ChatMessageRequest request
    ) {
        validateRequest(request);
        validateActiveMember(senderId, roomId);

        // 같은 UUID의 메시지가 이미 있다면 다시 저장하지 않고 기존 값을 돌려줍니다.
        return chatMessageRepository
                .findBySenderIdAndClientMessageId(
                        senderId,
                        request.clientMessageId()
                )
                .map(this::toResponse)
                .orElseGet(() -> saveNewMessage(roomId, senderId, request));
    }

    @Transactional(readOnly = true)
    public ChatHistoryResponse getMessages(
            Long roomId,
            Long userId,
            Long beforeMessageId,
            Integer requestedSize
    ) {
        validateActiveMember(userId, roomId);

        int size = normalizePageSize(requestedSize);
        PageRequest page = PageRequest.of(0, size + 1);

        // 커서가 없으면 최신 메시지부터, 있으면 그 메시지보다 과거를 찾습니다.
        List<ChatMessage> found = beforeMessageId == null
                ? chatMessageRepository
                .findByRoomIdOrderByMessageIdDesc(roomId, page)
                : chatMessageRepository
                .findByRoomIdAndMessageIdLessThanOrderByMessageIdDesc(
                        roomId,
                        beforeMessageId,
                        page
                );

        return toHistoryResponse(found, size);
    }

    /**
     * 같은 방의 메시지 내용에서 검색어가 들어간 메시지를 찾습니다.
     */
    @Transactional(readOnly = true)
    public ChatHistoryResponse searchMessages(
            Long roomId,
            Long userId,
            String keyword,
            Long beforeMessageId,
            Integer requestedSize
    ) {
        validateActiveMember(userId, roomId);

        String normalizedKeyword = trimToNull(keyword);
        if (normalizedKeyword == null) {
            throw new ChatException("검색어를 입력해 주세요.");
        }

        int size = normalizePageSize(requestedSize);
        PageRequest page = PageRequest.of(0, size + 1);

        List<ChatMessage> found = beforeMessageId == null
                ? chatMessageRepository
                .findByRoomIdAndContentContainingIgnoreCaseOrderByMessageIdDesc(
                        roomId,
                        normalizedKeyword,
                        page
                )
                : chatMessageRepository
                .findByRoomIdAndContentContainingIgnoreCaseAndMessageIdLessThanOrderByMessageIdDesc(
                        roomId,
                        normalizedKeyword,
                        beforeMessageId,
                        page
                );

        return toHistoryResponse(found, size);
    }

    @Transactional(readOnly = true)
    public ChatMessage findMessageInRoom(Long messageId, Long roomId) {
        ChatMessage message = findMessage(messageId);

        if (!message.getRoomId().equals(roomId)) {
            throw new ChatException("다른 채팅방의 메시지는 읽음 처리할 수 없습니다.");
        }
        return message;
    }

    @Transactional(readOnly = true)
    public ChatMessage findMessage(Long messageId) {
        if (messageId == null) {
            throw new ChatException("메시지 번호는 꼭 필요합니다.");
        }

        return chatMessageRepository
                .findByMessageId(messageId)
                .orElseThrow(() -> new ChatException("메시지를 찾을 수 없습니다."));
    }

    private ChatMessageResponse saveNewMessage(
            Long roomId,
            Long senderId,
            ChatMessageRequest request
    ) {
        String content = trimToNull(request.content());
        ChatMessage message = ChatMessage.create(
                roomId,
                senderId,
                request.clientMessageId(),
                request.messageType(),
                content
        );

        List<String> imageUrls = safeImageUrls(request.imageUrls());
        for (int index = 0; index < imageUrls.size(); index++) {
            message.addImage(imageUrls.get(index).trim(), index + 1);
        }

        ChatMessage saved = chatMessageRepository.save(message);

        // AI는 텍스트만 분석하므로 TEXT 메시지에만 PENDING 상태를 만듭니다.
        if (saved.getMessageType() == MessageType.TEXT) {
            chatAnalysisRepository.save(ChatAnalysis.pending(saved));
        }

        // 저장이 실제로 완료된 뒤 오늘 대시보드를 최신 상태로 다시 집계합니다.
        dashboardChangePublisher.messageSaved(saved);

        return toResponse(saved);
    }

    private void validateRequest(ChatMessageRequest request) {
        if (request == null) {
            throw new ChatException("메시지 요청은 꼭 필요합니다.");
        }
        if (request.clientMessageId() == null) {
            throw new ChatException("clientMessageId는 꼭 필요합니다.");
        }

        try {
            UUID.fromString(request.clientMessageId());
        } catch (IllegalArgumentException exception) {
            throw new ChatException("clientMessageId는 UUID 형식이어야 합니다.");
        }

        if (request.messageType() == null) {
            throw new ChatException("메시지 종류는 꼭 필요합니다.");
        }

        List<String> imageUrls = safeImageUrls(request.imageUrls());
        if (request.messageType() == MessageType.TEXT) {
            if (request.content() == null || request.content().isBlank()) {
                throw new ChatException("텍스트 메시지 내용을 입력해 주세요.");
            }
            if (!imageUrls.isEmpty()) {
                throw new ChatException("TEXT 메시지에는 이미지를 넣을 수 없습니다.");
            }
        }

        if (request.messageType() == MessageType.IMAGE) {
            if (request.content() != null && !request.content().isBlank()) {
                throw new ChatException("IMAGE 메시지에는 텍스트 메시지를 넣을 수 없습니다.");
            }
            if (imageUrls.isEmpty()) {
                throw new ChatException("IMAGE 메시지에는 이미지가 한 장 이상 필요합니다.");
            }
            if (imageUrls.size() > MAX_IMAGE_COUNT) {
                throw new ChatException("이미지는 한 번에 최대 10장까지 보낼 수 있습니다.");
            }
            if (imageUrls.stream().anyMatch(url -> url == null || url.isBlank())) {
                throw new ChatException("비어 있는 이미지 주소가 있습니다.");
            }
        }
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
            throw new ChatException("메시지는 한 번에 1개부터 100개까지 조회할 수 있습니다.");
        }
        return requestedSize;
    }

    private List<String> safeImageUrls(List<String> imageUrls) {
        return imageUrls == null ? List.of() : imageUrls;
    }

    private String trimToNull(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.trim();
    }

    public ChatMessageResponse toResponse(ChatMessage message) {
        ChatAnalysis analysis = chatAnalysisRepository
                .findByMessageMessageId(message.getMessageId())
                .orElse(null);
        return toResponse(message, analysis);
    }

    private ChatMessageResponse toResponse(
            ChatMessage message,
            ChatAnalysis analysis
    ) {
        List<ChatImageResponse> images = message.getImages().stream()
                .map(image -> new ChatImageResponse(
                        image.getImageId(),
                        image.getImageUrl(),
                        image.getDisplayOrder()
                ))
                .toList();

        List<ChatReactionResponse> reactions = message.getReactions().stream()
                .map(reaction -> new ChatReactionResponse(
                        reaction.getReactionId(),
                        reaction.getRoomId(),
                        message.getMessageId(),
                        reaction.getUserId(),
                        reaction.getReactionType(),
                        reaction.getCreatedAt(),
                        reaction.getUpdatedAt()
                ))
                .toList();

        return new ChatMessageResponse(
                message.getMessageId(),
                message.getRoomId(),
                message.getSenderId(),
                message.getClientMessageId(),
                message.getMessageType(),
                message.getContent(),
                images,
                reactions,
                analysis == null
                        ? null
                        : analysis.getAnalysisStatus(),
                analysis == null
                        ? null
                        : analysis.getEmotionType(),
                message.getSentAt()
        );
    }

    private ChatHistoryResponse toHistoryResponse(
            List<ChatMessage> found,
            int size
    ) {
        boolean hasNext = found.size() > size;
        List<ChatMessage> pageMessages = new ArrayList<>(
                found.subList(0, Math.min(found.size(), size))
        );

        // 검색 결과도 채팅 화면에서 읽기 쉽도록 오래된 순서로 돌려줍니다.
        Collections.reverse(pageMessages);

        List<Long> messageIds = pageMessages.stream()
                .map(ChatMessage::getMessageId)
                .toList();
        Map<Long, ChatAnalysis> analysesByMessageId =
                chatAnalysisRepository
                        .findByMessageMessageIdIn(messageIds)
                        .stream()
                        .collect(Collectors.toMap(
                                analysis -> analysis
                                        .getMessage()
                                        .getMessageId(),
                                Function.identity()
                        ));

        List<ChatMessageResponse> responses = pageMessages.stream()
                .map(message -> toResponse(
                        message,
                        analysesByMessageId.get(message.getMessageId())
                ))
                .toList();

        Long nextCursor = pageMessages.isEmpty()
                ? null
                : pageMessages.get(0).getMessageId();

        return new ChatHistoryResponse(responses, nextCursor, hasNext);
    }

}
