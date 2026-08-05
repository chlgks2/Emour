package com.ssafy.emour.chat.service;

import com.ssafy.emour.chat.dto.AiSuggestionHistory;
import com.ssafy.emour.chat.dto.AiSuggestionRequest;
import com.ssafy.emour.chat.dto.AiSuggestionResponse;
import com.ssafy.emour.chat.dto.ChatSuggestionRequest;
import com.ssafy.emour.chat.dto.ChatSuggestionResponse;
import com.ssafy.emour.chat.entity.ChatMessage;
import com.ssafy.emour.chat.exception.ChatException;
import com.ssafy.emour.chat.repository.ChatMessageRepository;
import com.ssafy.emour.couple.entity.CoupleMemberId;
import com.ssafy.emour.couple.entity.CoupleMemberStatus;
import com.ssafy.emour.couple.repository.CoupleMemberRepository;
import com.ssafy.emour.global.exception.CustomException;
import com.ssafy.emour.global.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Objects;

@Service
@RequiredArgsConstructor
public class ChatSuggestionService {

    private static final int HISTORY_LIMIT = 12;

    private final ChatMessageRepository chatMessageRepository;
    private final CoupleMemberRepository coupleMemberRepository;
    private final AiSuggestionClient aiSuggestionClient;

    public ChatSuggestionResponse suggest(
            Long userId,
            ChatSuggestionRequest request
    ) {
        validateInput(userId, request);
        ChatMessage target = chatMessageRepository
                .findByMessageId(request.messageId())
                .orElseThrow(() -> new ChatException(
                        "메시지를 찾을 수 없습니다."
                ));
        validateUser(userId, target);

        List<ChatMessage> recentMessages = new ArrayList<>(
                chatMessageRepository.findRecentTextMessagesBefore(
                        target.getRoomId(),
                        target.getMessageId(),
                        PageRequest.of(0, HISTORY_LIMIT)
                )
        );
        Collections.reverse(recentMessages);

        AiSuggestionRequest aiRequest = new AiSuggestionRequest(
                String.valueOf(target.getMessageId()),
                String.valueOf(userId),
                request.targetMessage().trim(),
                recentMessages.stream()
                        .map(message -> new AiSuggestionHistory(
                                String.valueOf(message.getSenderId()),
                                message.getContent()
                        ))
                        .toList()
        );
        AiSuggestionResponse response = aiSuggestionClient.suggest(aiRequest);
        validateResponse(aiRequest.messageId(), response);
        return ChatSuggestionResponse.from(response);
    }

    private void validateInput(
            Long userId,
            ChatSuggestionRequest request
    ) {
        if (userId == null || request == null
                || request.messageId() == null
                || request.targetMessage() == null
                || request.targetMessage().isBlank()
                || request.targetMessage().length() > 2000) {
            throw new ChatException("추천받을 메시지 정보를 확인해 주세요.");
        }
    }

    private void validateUser(Long userId, ChatMessage message) {
        boolean activeMember = coupleMemberRepository.existsByIdAndStatus(
                new CoupleMemberId(userId, message.getRoomId()),
                CoupleMemberStatus.ACTIVE
        );
        if (!activeMember) {
            throw new ChatException(
                    "해당 채팅방에 참여 중인 사용자가 아닙니다."
            );
        }
        if (!message.getSenderId().equals(userId)) {
            throw new ChatException(
                    "본인이 보낸 메시지만 답장을 추천받을 수 있습니다."
            );
        }
    }

    private void validateResponse(
            String requestedMessageId,
            AiSuggestionResponse response
    ) {
        if (response == null
                || !Objects.equals(
                        requestedMessageId,
                        response.messageId()
                )
                || (!response.blocked()
                && (response.suggestions() == null
                || response.suggestions().isEmpty()))) {
            throw new CustomException(ErrorCode.AI_SERVICE_ERROR);
        }
    }
}
