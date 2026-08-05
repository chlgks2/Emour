package com.ssafy.emour.chat.service;

import com.ssafy.emour.chat.dto.AiSuggestionHistory;
import com.ssafy.emour.chat.dto.AiSuggestionRequest;
import com.ssafy.emour.chat.dto.AiSuggestionResponse;
import com.ssafy.emour.chat.dto.ChatSuggestionRequest;
import com.ssafy.emour.chat.dto.ChatSuggestionResponse;
import com.ssafy.emour.chat.exception.ChatException;
import com.ssafy.emour.chat.repository.ChatMessageRepository;
import com.ssafy.emour.couple.entity.CoupleMember;
import com.ssafy.emour.couple.repository.CoupleMemberRepository;
import com.ssafy.emour.global.exception.CustomException;
import com.ssafy.emour.global.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

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
        Long roomId = getActiveRoomId(userId);

        var recentMessages = new ArrayList<>(
                chatMessageRepository.findRecentTextMessages(
                        roomId,
                        PageRequest.of(0, HISTORY_LIMIT)
                )
        );
        Collections.reverse(recentMessages);

        AiSuggestionRequest aiRequest = new AiSuggestionRequest(
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
        validateResponse(response);
        return ChatSuggestionResponse.from(response);
    }

    private void validateInput(
            Long userId,
            ChatSuggestionRequest request
    ) {
        if (userId == null || request == null
                || request.targetMessage() == null
                || request.targetMessage().isBlank()
                || request.targetMessage().length() > 2000) {
            throw new ChatException("추천받을 메시지 정보를 확인해 주세요.");
        }
    }

    private Long getActiveRoomId(Long userId) {
        List<CoupleMember> memberships =
                coupleMemberRepository.findActiveMembershipsByUserId(
                        userId,
                        PageRequest.of(0, 1)
        );
        if (memberships.isEmpty()) {
            throw new CustomException(ErrorCode.ACTIVE_COUPLE_NOT_FOUND);
        }
        return memberships.get(0).getId().getRoomId();
    }

    private void validateResponse(AiSuggestionResponse response) {
        if (response == null
                || (!response.blocked()
                && (response.suggestions() == null
                || response.suggestions().isEmpty()))) {
            throw new CustomException(ErrorCode.AI_SERVICE_ERROR);
        }
    }
}
