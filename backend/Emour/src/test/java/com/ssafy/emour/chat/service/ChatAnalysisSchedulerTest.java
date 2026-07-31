package com.ssafy.emour.chat.service;

import com.ssafy.emour.chat.dto.ChatAnalysisBatchResponse;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.messaging.simp.SimpMessagingTemplate;

import java.util.Map;
import java.util.Optional;

import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ChatAnalysisSchedulerTest {

    @Mock
    private ChatAnalysisService chatAnalysisService;

    @Mock
    private SimpMessagingTemplate messagingTemplate;

    // DB 저장을 마친 분석 결과를 같은 방의 WebSocket 구독자에게 전달합니다.
    @Test
    void publishesSavedResult() {
        ChatAnalysisBatchResponse response =
                new ChatAnalysisBatchResponse(
                        1L,
                        2,
                        Map.of(
                                101L,
                                "JOY",
                                102L,
                                "NEUTRAL"
                        )
                );
        when(chatAnalysisService.analyzeReadyBatch())
                .thenReturn(Optional.of(response));

        ChatAnalysisScheduler scheduler = new ChatAnalysisScheduler(
                chatAnalysisService,
                messagingTemplate
        );
        scheduler.analyzePendingMessages();

        verify(messagingTemplate).convertAndSend(
                "/sub/chat/rooms/1/analysis",
                response
        );
    }
}
