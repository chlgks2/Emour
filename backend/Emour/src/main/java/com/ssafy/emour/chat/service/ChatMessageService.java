package com.ssafy.emour.chat.service;

import com.ssafy.emour.chat.dto.ChatImageResponse;
import com.ssafy.emour.chat.dto.ChatMessageRequest;
import com.ssafy.emour.chat.dto.ChatMessageResponse;
import com.ssafy.emour.chat.entity.ChatAnalysis;
import com.ssafy.emour.chat.entity.ChatMessage;
import com.ssafy.emour.chat.entity.MessageType;
import com.ssafy.emour.chat.exception.ChatException;
import com.ssafy.emour.chat.repository.ChatAnalysisRepository;
import com.ssafy.emour.chat.repository.ChatMessageRepository;
import com.ssafy.emour.couple.entity.CoupleMemberId;
import com.ssafy.emour.couple.entity.CoupleMemberStatus;
import com.ssafy.emour.couple.repository.CoupleMemberRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ChatMessageService {

    private static final int MAX_IMAGE_COUNT = 10;

    private final ChatMessageRepository chatMessageRepository;
    private final ChatAnalysisRepository chatAnalysisRepository;
    private final CoupleMemberRepository coupleMemberRepository;

    @Transactional
    public ChatMessageResponse sendMessage(
            Long roomId,
            ChatMessageRequest request
    ) {
        validateRequest(request);
        validateActiveMember(request.senderId(), roomId);

        // 같은 UUID의 메시지가 이미 있다면 다시 저장하지 않고 기존 값을 돌려줍니다.
        return chatMessageRepository
                .findBySenderIdAndClientMessageId(
                        request.senderId(),
                        request.clientMessageId()
                )
                .map(this::toResponse)
                .orElseGet(() -> saveNewMessage(roomId, request));
    }

    private ChatMessageResponse saveNewMessage(
            Long roomId,
            ChatMessageRequest request
    ) {
        String content = trimToNull(request.content());
        ChatMessage message = ChatMessage.create(
                roomId,
                request.senderId(),
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

        return toResponse(saved);
    }

    private void validateRequest(ChatMessageRequest request) {
        if (request == null || request.senderId() == null) {
            throw new ChatException("보낸 사람 번호는 꼭 필요합니다.");
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
        List<ChatImageResponse> images = message.getImages().stream()
                .map(image -> new ChatImageResponse(
                        image.getImageId(),
                        image.getImageUrl(),
                        image.getDisplayOrder()
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
                message.getSentAt()
        );
    }

}
