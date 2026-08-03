package com.ssafy.emour.chat.service;

import com.ssafy.emour.chat.dto.ChatReactionRequest;
import com.ssafy.emour.chat.dto.ChatReactionResponse;
import com.ssafy.emour.chat.entity.ChatMessage;
import com.ssafy.emour.chat.entity.ChatReaction;
import com.ssafy.emour.chat.exception.ChatException;
import com.ssafy.emour.chat.repository.ChatReactionRepository;
import com.ssafy.emour.couple.entity.CoupleMemberId;
import com.ssafy.emour.couple.entity.CoupleMemberStatus;
import com.ssafy.emour.couple.repository.CoupleMemberRepository;
import com.ssafy.emour.dashboard.event.DashboardChangePublisher;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Locale;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class ChatReactionService {

    private static final int MAX_REACTION_TYPE_LENGTH = 255;

    private final ChatReactionRepository chatReactionRepository;
    private final CoupleMemberRepository coupleMemberRepository;
    private final ChatMessageService chatMessageService;
    private final DashboardChangePublisher dashboardChangePublisher;

    @Transactional
    public ChatReactionResponse setReaction(
            Long messageId,
            Long userId,
            ChatReactionRequest request
    ) {
        ChatMessage message = chatMessageService.findMessage(messageId);
        validateActiveMember(userId, message.getRoomId());
        String reactionType = normalizeReactionType(request);

        // 이미 공감했다면 행을 추가하지 않고 반응 종류만 바꿉니다.
        Optional<ChatReaction> existing = chatReactionRepository
                .findByUserIdAndMessage_MessageId(userId, messageId);
        ChatReaction reaction;
        if (existing.isPresent()) {
            reaction = existing.get();
            reaction.changeType(reactionType);
        } else {
            reaction = ChatReaction.create(
                    message.getRoomId(),
                    userId,
                    message,
                    reactionType
            );
        }

        ChatReaction saved = chatReactionRepository.save(reaction);
        if (existing.isEmpty()) {
            dashboardChangePublisher.reactionChanged(
                    saved.getRoomId(),
                    saved.getCreatedAt()
            );
        }
        return toResponse(saved);
    }

    @Transactional
    public Optional<ChatReactionResponse> removeReaction(
            Long messageId,
            Long userId
    ) {
        ChatMessage message = chatMessageService.findMessage(messageId);
        validateActiveMember(userId, message.getRoomId());

        // 이미 취소된 상태라면 오류 없이 빈 결과를 반환합니다.
        return chatReactionRepository
                .findByUserIdAndMessage_MessageId(userId, messageId)
                .map(reaction -> {
                    ChatReactionResponse response = toResponse(reaction);
                    reaction.detachFromMessage();
                    chatReactionRepository.delete(reaction);
                    dashboardChangePublisher.reactionChanged(
                            reaction.getRoomId(),
                            reaction.getCreatedAt()
                    );
                    return response;
                });
    }

    public ChatReactionResponse toResponse(ChatReaction reaction) {
        return new ChatReactionResponse(
                reaction.getReactionId(),
                reaction.getRoomId(),
                reaction.getMessage().getMessageId(),
                reaction.getUserId(),
                reaction.getReactionType(),
                reaction.getCreatedAt(),
                reaction.getUpdatedAt()
        );
    }

    private String normalizeReactionType(ChatReactionRequest request) {
        if (request == null
                || request.reactionType() == null
                || request.reactionType().isBlank()) {
            throw new ChatException("공감 종류를 입력해 주세요.");
        }

        String reactionType = request.reactionType()
                .trim()
                .toUpperCase(Locale.ROOT);

        if (reactionType.length() > MAX_REACTION_TYPE_LENGTH) {
            throw new ChatException("공감 종류는 255자까지 입력할 수 있습니다.");
        }
        return reactionType;
    }

    private void validateActiveMember(Long userId, Long roomId) {
        boolean activeMember = coupleMemberRepository.existsByIdAndStatus(
                new CoupleMemberId(userId, roomId),
                CoupleMemberStatus.ACTIVE
        );
        if (!activeMember) {
            throw new ChatException("해당 채팅방에 참여 중인 사용자가 아닙니다.");
        }
    }
}
