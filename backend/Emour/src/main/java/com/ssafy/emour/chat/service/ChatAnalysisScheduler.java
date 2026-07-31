package com.ssafy.emour.chat.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
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

    @Scheduled(
            fixedDelayString = "${ai.service.poll-delay-ms:5000}"
    )
    public void analyzePendingMessages() {
        try {
            chatAnalysisService.analyzeNextBatch();
        } catch (Exception exception) {
            // AI 서버가 잠시 꺼져 있어도 백엔드 전체가 종료되지 않게 합니다.
            log.warn(
                    "채팅 감정 분석 요청에 실패했습니다: {}",
                    exception.getMessage()
            );
        }
    }
}
