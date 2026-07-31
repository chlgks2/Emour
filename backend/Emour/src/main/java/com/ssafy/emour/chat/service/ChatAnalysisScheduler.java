package com.ssafy.emour.chat.service;

import com.ssafy.emour.chat.dto.ChatAnalysisBatchResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
@ConditionalOnProperty(
        name = "ai.service.enabled",
        havingValue = "true",
        matchIfMissing = true
)
public class ChatAnalysisScheduler {

    private final ChatAnalysisService chatAnalysisService;
    private final SimpMessagingTemplate messagingTemplate;

    @Scheduled(
            fixedDelayString = "${ai.service.poll-delay-ms:1000}"
    )
    public void analyzePendingMessages() {
        try {
            /*
             * 서비스 메서드가 반환될 때 DB 트랜잭션은 이미 커밋된 상태입니다.
             * 따라서 프런트는 WebSocket 결과를 받자마자 저장된 값을 조회할 수 있습니다.
             */
            chatAnalysisService.analyzeReadyBatch()
                    .ifPresent(this::publishAnalysis);
        } catch (Exception exception) {
            // AI 서버가 잠시 꺼져 있어도 백엔드 전체가 종료되지 않게 합니다.
            log.warn(
                    "채팅 감정 분석 요청에 실패했습니다: {}",
                    exception.getMessage()
            );
        }
    }

    private void publishAnalysis(
            ChatAnalysisBatchResponse response
    ) {
        messagingTemplate.convertAndSend(
                "/sub/chat/rooms/" + response.roomId() + "/analysis",
                response
        );
    }
}
