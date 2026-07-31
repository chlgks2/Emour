package com.ssafy.emour.chat.service;

import com.ssafy.emour.chat.dto.AiAnalyzeRequest;
import com.ssafy.emour.chat.dto.AiEmotionResult;
import com.ssafy.emour.chat.dto.ChatAnalysisBatchResponse;
import com.ssafy.emour.chat.entity.AnalysisStatus;
import com.ssafy.emour.chat.entity.ChatAnalysis;
import com.ssafy.emour.chat.entity.ChatMessage;
import com.ssafy.emour.chat.entity.EmotionType;
import com.ssafy.emour.chat.repository.ChatAnalysisRepository;
import com.ssafy.emour.chat.repository.PendingAnalysisRoomSummary;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Pageable;

import java.time.Clock;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ChatAnalysisServiceTest {

    private static final ZoneId SEOUL = ZoneId.of("Asia/Seoul");
    private static final LocalDateTime NOW = LocalDateTime.of(
            2026,
            7,
            31,
            10,
            0,
            20
    );

    @Mock
    private ChatAnalysisRepository chatAnalysisRepository;

    @Mock
    private AiAnalysisClient aiAnalysisClient;

    private ChatAnalysisService chatAnalysisService;

    @BeforeEach
    void setUp() {
        Clock clock = Clock.fixed(
                NOW.atZone(SEOUL).toInstant(),
                SEOUL
        );
        chatAnalysisService = new ChatAnalysisService(
                chatAnalysisRepository,
                aiAnalysisClient,
                clock
        );
    }

    // 두 사람이 메시지를 보낸 뒤 10초간 새 메시지가 없으면 분석합니다.
    @Test
    void analyzesAfterIdle() {
        LocalDateTime base = NOW.minusSeconds(20);
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
                base.plusSeconds(1),
                false
        );
        PendingAnalysisRoomSummary summary = roomSummary(
                1L,
                2,
                2,
                base.plusSeconds(1)
        );

        when(chatAnalysisRepository.findPendingRoomSummaries(
                any(Pageable.class)
        )).thenReturn(List.of(summary));
        when(chatAnalysisRepository.findPendingTargets(
                eq(1L),
                any(Pageable.class)
        )).thenReturn(List.of(firstTarget, secondTarget));
        // Repository는 최신순으로 반환하므로 서비스가 시간 오름차순으로 뒤집습니다.
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

        Optional<ChatAnalysisBatchResponse> optionalResponse =
                chatAnalysisService.analyzeReadyBatch();

        assertThat(optionalResponse).isPresent();
        ChatAnalysisBatchResponse response =
                optionalResponse.orElseThrow();

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

    // 메시지가 10개 쌓이면 한 사람만 보냈어도 바로 분석합니다.
    @Test
    void analyzesAtTenMessages() {
        ChatAnalysis target = analysis(
                101L,
                1L,
                21L,
                "열 번째 메시지",
                NOW,
                false
        );
        PendingAnalysisRoomSummary summary = roomSummary(
                1L,
                10,
                1,
                NOW
        );

        when(chatAnalysisRepository.findPendingRoomSummaries(
                any(Pageable.class)
        )).thenReturn(List.of(summary));
        when(chatAnalysisRepository.findPendingTargets(
                eq(1L),
                any(Pageable.class)
        )).thenReturn(List.of(target));
        when(chatAnalysisRepository.findRecentContext(
                eq(1L),
                eq(NOW),
                eq(101L),
                any(Pageable.class)
        )).thenReturn(List.of());
        when(aiAnalysisClient.analyze(any(AiAnalyzeRequest.class)))
                .thenReturn(Map.of(
                        "101", new AiEmotionResult("JOY")
                ));

        assertThat(chatAnalysisService.analyzeReadyBatch()).isPresent();
        verify(aiAnalysisClient).analyze(any(AiAnalyzeRequest.class));
    }

    // 10개 미만이고 마지막 메시지 후 10초가 지나지 않았으면 기다립니다.
    @Test
    void waitsBeforeIdle() {
        PendingAnalysisRoomSummary summary = roomSummary(
                1L,
                2,
                2,
                NOW.minusSeconds(9)
        );
        when(chatAnalysisRepository.findPendingRoomSummaries(
                any(Pageable.class)
        )).thenReturn(List.of(summary));

        assertThat(chatAnalysisService.analyzeReadyBatch()).isEmpty();
        verify(
                chatAnalysisRepository,
                never()
        ).findPendingTargets(any(), any(Pageable.class));
        verify(
                aiAnalysisClient,
                never()
        ).analyze(any(AiAnalyzeRequest.class));
    }

    private PendingAnalysisRoomSummary roomSummary(
            Long roomId,
            long pendingCount,
            long senderCount,
            LocalDateTime lastSentAt
    ) {
        PendingAnalysisRoomSummary summary =
                mock(PendingAnalysisRoomSummary.class);
        lenient().when(summary.getRoomId()).thenReturn(roomId);
        lenient().when(summary.getPendingCount())
                .thenReturn(pendingCount);
        lenient().when(summary.getSenderCount())
                .thenReturn(senderCount);
        lenient().when(summary.getLastSentAt())
                .thenReturn(lastSentAt);
        return summary;
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
