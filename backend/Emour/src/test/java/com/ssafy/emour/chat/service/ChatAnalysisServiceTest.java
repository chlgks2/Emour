package com.ssafy.emour.chat.service;

import com.ssafy.emour.chat.dto.AiAnalyzeRequest;
import com.ssafy.emour.chat.dto.AiEmotionResult;
import com.ssafy.emour.chat.dto.ChatAnalysisBatchResponse;
import com.ssafy.emour.chat.entity.AnalysisStatus;
import com.ssafy.emour.chat.entity.ChatAnalysis;
import com.ssafy.emour.chat.entity.ChatMessage;
import com.ssafy.emour.chat.entity.EmotionType;
import com.ssafy.emour.chat.repository.ChatAnalysisRepository;
import com.ssafy.emour.couple.entity.CoupleMemberId;
import com.ssafy.emour.couple.entity.CoupleMemberStatus;
import com.ssafy.emour.couple.repository.CoupleMemberRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Pageable;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ChatAnalysisServiceTest {

    @Mock
    private ChatAnalysisRepository chatAnalysisRepository;

    @Mock
    private CoupleMemberRepository coupleMemberRepository;

    @Mock
    private AiAnalysisClient aiAnalysisClient;

    private ChatAnalysisService chatAnalysisService;

    @BeforeEach
    void setUp() {
        chatAnalysisService = new ChatAnalysisService(
                chatAnalysisRepository,
                coupleMemberRepository,
                aiAnalysisClient
        );
    }

    // 같은 방의 과거 문맥과 미분석 메시지를 분리하여 AI에 보내고 결과를 저장합니다.
    @Test
    void analyzesPendingMessages() {
        LocalDateTime base = LocalDateTime.of(
                2026,
                7,
                31,
                10,
                0
        );
        ChatAnalysis oldContext = analysis(
                90L,
                1L,
                20L,
                "과거 첫 메시지",
                base.minusMinutes(10),
                true
        );
        ChatAnalysis recentContext = analysis(
                91L,
                1L,
                21L,
                "과거 최신 메시지",
                base.minusMinutes(5),
                true
        );
        ChatAnalysis firstTarget = analysis(
                101L,
                1L,
                21L,
                "오늘 뭐해?",
                base,
                false
        );
        ChatAnalysis secondTarget = analysis(
                102L,
                1L,
                20L,
                "공강이야",
                base.plusMinutes(1),
                false
        );

        when(coupleMemberRepository.existsByIdAndStatus(
                new CoupleMemberId(21L, 1L),
                CoupleMemberStatus.ACTIVE
        )).thenReturn(true);
        when(chatAnalysisRepository.findPendingTargets(
                eq(1L),
                any(Pageable.class)
        )).thenReturn(List.of(firstTarget, secondTarget));
        // Repository는 최신순으로 가져오므로 서비스가 오름차순으로 뒤집습니다.
        when(chatAnalysisRepository.findRecentContext(
                eq(1L),
                eq(base),
                eq(101L),
                any(Pageable.class)
        )).thenReturn(List.of(recentContext, oldContext));
        when(aiAnalysisClient.analyze(any(AiAnalyzeRequest.class)))
                .thenReturn(Map.of(
                        "101", new AiEmotionResult("JOY"),
                        "102", new AiEmotionResult("NEUTRAL")
                ));

        ChatAnalysisBatchResponse response =
                chatAnalysisService.analyzePendingMessages(
                        1L,
                        21L
                );

        ArgumentCaptor<AiAnalyzeRequest> requestCaptor =
                ArgumentCaptor.forClass(AiAnalyzeRequest.class);
        verify(aiAnalysisClient).analyze(requestCaptor.capture());
        AiAnalyzeRequest request = requestCaptor.getValue();

        assertThat(request.context())
                .extracting(message -> message.text())
                .containsExactly("과거 첫 메시지", "과거 최신 메시지");
        assertThat(request.target())
                .extracting(message -> message.messageId())
                .containsExactly(101L, 102L);
        assertThat(response.analyzedCount()).isEqualTo(2);
        assertThat(response.emotions())
                .containsEntry(101L, "JOY")
                .containsEntry(102L, "NEUTRAL");
        assertThat(firstTarget.getAnalysisStatus())
                .isEqualTo(AnalysisStatus.COMPLETED);
        assertThat(firstTarget.getEmotionType()).isEqualTo("JOY");
        assertThat(firstTarget.getAnalyzedAt()).isNotNull();
    }

    private ChatAnalysis analysis(
            Long messageId,
            Long roomId,
            Long senderId,
            String content,
            LocalDateTime sentAt,
            boolean completed
    ) {
        ChatMessage message = mock(ChatMessage.class);
        lenient().when(message.getMessageId()).thenReturn(messageId);
        lenient().when(message.getRoomId()).thenReturn(roomId);
        lenient().when(message.getSenderId()).thenReturn(senderId);
        lenient().when(message.getContent()).thenReturn(content);
        lenient().when(message.getSentAt()).thenReturn(sentAt);

        ChatAnalysis analysis = ChatAnalysis.pending(message);
        if (completed) {
            analysis.complete(EmotionType.NEUTRAL);
        }
        return analysis;
    }
}
