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
import com.ssafy.emour.dashboard.event.DashboardChangePublisher;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

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

    private final ChatAnalysisRepository chatAnalysisRepository;
    private final AiAnalysisClient aiAnalysisClient;
    private final DashboardChangePublisher dashboardChangePublisher;

    /**
     * 대기(미분석) 메시지가 있는 방 하나를 골라, 최신 최대 10개를 '즉시' 분석합니다.
     *
     * <p>대기 시간(타이머) 없이 폴링마다 바로 분석합니다. 맥락은 직전 최대 10개를
     * 슬라이딩 윈도우로 함께 보냅니다. 한 번에 최대 10개까지 분석하고, 더 많으면
     * 다음 폴링에서 이어서 처리합니다.</p>
     */
    @Transactional
    public Optional<ChatAnalysisBatchResponse> analyzeReadyBatch() {
        return chatAnalysisRepository.findPendingRoomSummaries(
                        PageRequest.of(0, MAX_ROOM_SCAN_COUNT)
                ).stream()
                .filter(summary -> summary.getPendingCount() >= 1)
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

}
