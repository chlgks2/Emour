package com.ssafy.emour.chat.service;

import com.ssafy.emour.chat.dto.AiAnalyzeRequest;
import com.ssafy.emour.chat.dto.AiContextMessage;
import com.ssafy.emour.chat.dto.AiEmotionResult;
import com.ssafy.emour.chat.dto.AiTargetMessage;
import com.ssafy.emour.chat.dto.ChatAnalysisBatchResponse;
import com.ssafy.emour.chat.entity.AnalysisStatus;
import com.ssafy.emour.chat.entity.ChatAnalysis;
import com.ssafy.emour.chat.entity.ChatMessage;
import com.ssafy.emour.chat.entity.EmotionType;
import com.ssafy.emour.chat.exception.ChatException;
import com.ssafy.emour.chat.repository.ChatAnalysisRepository;
import com.ssafy.emour.couple.entity.CoupleMemberId;
import com.ssafy.emour.couple.entity.CoupleMemberStatus;
import com.ssafy.emour.couple.repository.CoupleMemberRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Stream;

@Service
@RequiredArgsConstructor
public class ChatAnalysisService {

    private static final int MAX_CONTEXT_COUNT = 10;
    private static final int MAX_TARGET_COUNT = 10;

    private final ChatAnalysisRepository chatAnalysisRepository;
    private final CoupleMemberRepository coupleMemberRepository;
    private final AiAnalysisClient aiAnalysisClient;

    /**
     * Swagger에서 특정 방의 미분석 메시지를 즉시 분석할 때 사용합니다.
     */
    @Transactional
    public ChatAnalysisBatchResponse analyzePendingMessages(
            Long roomId,
            Long userId
    ) {
        validateActiveMember(roomId, userId);
        return analyzeRoom(roomId);
    }

    /**
     * 스케줄러가 가장 오래 기다린 메시지가 있는 방 하나를 분석합니다.
     */
    @Transactional
    public int analyzeNextBatch() {
        List<ChatAnalysis> oldest = chatAnalysisRepository
                .findOldestByStatus(
                        AnalysisStatus.PENDING,
                        PageRequest.of(0, 1)
                );
        if (oldest.isEmpty()) {
            return 0;
        }

        Long roomId = oldest.get(0).getMessage().getRoomId();
        return analyzeRoom(roomId).analyzedCount();
    }

    private ChatAnalysisBatchResponse analyzeRoom(Long roomId) {
        List<ChatAnalysis> targets =
                chatAnalysisRepository.findPendingTargets(
                        roomId,
                        PageRequest.of(0, MAX_TARGET_COUNT)
                );
        if (targets.isEmpty()) {
            return new ChatAnalysisBatchResponse(
                    roomId,
                    0,
                    Map.of()
            );
        }

        ChatMessage firstTarget = targets.get(0).getMessage();
        List<ChatAnalysis> context =
                chatAnalysisRepository.findRecentContext(
                        roomId,
                        firstTarget.getSentAt(),
                        firstTarget.getMessageId(),
                        PageRequest.of(0, MAX_CONTEXT_COUNT)
                );
        // DB에서는 최신 순으로 가져오고, AI에는 옛 메시지부터 보냅니다.
        context = new ArrayList<>(context);
        Collections.reverse(context);

        Map<Long, String> speakers = createSpeakers(context, targets);
        AiAnalyzeRequest request = createRequest(
                context,
                targets,
                speakers
        );

        targets.forEach(ChatAnalysis::startProcessing);
        Map<String, AiEmotionResult> aiResponse =
                aiAnalysisClient.analyze(request);

        Map<Long, String> savedEmotions = new LinkedHashMap<>();
        for (ChatAnalysis target : targets) {
            Long messageId = target.getMessage().getMessageId();
            AiEmotionResult result = aiResponse.get(
                    String.valueOf(messageId)
            );
            if (result == null
                    || result.emotion() == null
                    || result.emotion().isBlank()) {
                throw new IllegalStateException(
                        "AI 응답에 메시지 감정이 없습니다: " + messageId
                );
            }

            // AI의 한글 감정도 백엔드의 영문 Enum 값으로 통일해 저장합니다.
            EmotionType emotionType = EmotionType.fromStoredValue(
                    result.emotion()
            );
            target.complete(emotionType);
            savedEmotions.put(messageId, emotionType.name());
        }

        return new ChatAnalysisBatchResponse(
                roomId,
                targets.size(),
                savedEmotions
        );
    }

    private AiAnalyzeRequest createRequest(
            List<ChatAnalysis> context,
            List<ChatAnalysis> targets,
            Map<Long, String> speakers
    ) {
        List<AiContextMessage> contextMessages = context.stream()
                .map(ChatAnalysis::getMessage)
                .map(message -> new AiContextMessage(
                        speakers.get(message.getSenderId()),
                        message.getContent()
                ))
                .toList();

        List<AiTargetMessage> targetMessages = targets.stream()
                .map(ChatAnalysis::getMessage)
                .map(message -> new AiTargetMessage(
                        message.getMessageId(),
                        speakers.get(message.getSenderId()),
                        message.getContent()
                ))
                .toList();

        return new AiAnalyzeRequest(
                contextMessages,
                targetMessages
        );
    }

    private Map<Long, String> createSpeakers(
            List<ChatAnalysis> context,
            List<ChatAnalysis> targets
    ) {
        List<Long> senderIds = Stream.concat(
                        context.stream(),
                        targets.stream()
                )
                .map(ChatAnalysis::getMessage)
                .map(ChatMessage::getSenderId)
                .distinct()
                .sorted()
                .toList();

        Map<Long, String> speakers = new LinkedHashMap<>();
        for (int index = 0; index < senderIds.size(); index++) {
            // 1:1 채팅이므로 작은 사용자 번호부터 A, B로 고정합니다.
            speakers.put(
                    senderIds.get(index),
                    index == 0 ? "A" : "B"
            );
        }
        return speakers;
    }

    private void validateActiveMember(Long roomId, Long userId) {
        if (roomId == null || userId == null) {
            throw new ChatException("사용자 번호와 방 번호가 필요합니다.");
        }
        boolean activeMember = coupleMemberRepository.existsByIdAndStatus(
                new CoupleMemberId(userId, roomId),
                CoupleMemberStatus.ACTIVE
        );
        if (!activeMember) {
            throw new ChatException(
                    "해당 채팅방에 참여 중인 사용자가 아닙니다."
            );
        }
    }
}
