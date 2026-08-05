package com.ssafy.emour.chat.service;

import com.ssafy.emour.chat.dto.AiAnalyzeRequest;
import com.ssafy.emour.chat.dto.AiContextMessage;
import com.ssafy.emour.chat.dto.AiEmotionResult;
import com.ssafy.emour.chat.dto.AiTargetMessage;
import com.ssafy.emour.chat.dto.ChatAnalysisBatchResponse;
import com.ssafy.emour.chat.entity.ChatAnalysis;
import com.ssafy.emour.chat.entity.ChatMessage;
import com.ssafy.emour.chat.entity.EmotionType;
import com.ssafy.emour.chat.repository.ChatAnalysisRepository;
import com.ssafy.emour.chat.repository.PendingAnalysisRoomSummary;
import com.ssafy.emour.dashboard.event.DashboardChangePublisher;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Stream;

@Service
@RequiredArgsConstructor
public class ChatAnalysisService {

    private static final int MAX_CONTEXT_COUNT = 10;
    private static final int MAX_TARGET_COUNT = 10;
    private static final int MAX_ROOM_SCAN_COUNT = 100;
    private static final int IDLE_SECONDS = 10;

    private final ChatAnalysisRepository chatAnalysisRepository;
    private final AiAnalysisClient aiAnalysisClient;
    private final Clock dashboardClock;
    private final DashboardChangePublisher dashboardChangePublisher;

    /**
     * 분석할 준비가 된 방 하나를 골라 최대 10개의 메시지를 분석합니다.
     *
     * <p>대기 메시지가 10개이면 바로 분석합니다. 10개 미만이어도
     * 마지막 메시지 이후 10초 동안 새 메시지가 없으면 분석합니다.</p>
     */
    @Transactional
    public Optional<ChatAnalysisBatchResponse> analyzeReadyBatch() {
        LocalDateTime idleThreshold = LocalDateTime
                .now(dashboardClock)
                .minusSeconds(IDLE_SECONDS);

        return chatAnalysisRepository.findPendingRoomSummaries(
                        PageRequest.of(0, MAX_ROOM_SCAN_COUNT)
                ).stream()
                .filter(summary -> isReady(
                        summary,
                        idleThreshold
                ))
                .findFirst()
                .map(summary -> analyzeRoom(summary.getRoomId()))
                .filter(response -> response.analyzedCount() > 0);
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
        // DB에서는 최신순으로 조회하고, AI에는 시간 오름차순으로 보냅니다.
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

            // AI의 한글/영문 감정값을 DB의 영문 Enum 값으로 통일해 저장합니다.
            EmotionType emotionType = EmotionType.fromStoredValue(
                    result.emotion()
            );
            target.complete(emotionType);
            savedEmotions.put(messageId, emotionType.name());
            dashboardChangePublisher.analysisCompleted(
                    target.getMessage()
            );
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

    private boolean isReady(
            PendingAnalysisRoomSummary summary,
            LocalDateTime idleThreshold
    ) {
        if (summary.getPendingCount() >= MAX_TARGET_COUNT) {
            return true;
        }

        return summary.getLastSentAt() != null
                && !summary.getLastSentAt().isAfter(idleThreshold);
    }

}
