package com.ssafy.emour.dashboard.service;

import com.ssafy.emour.chat.repository.ChatAnalysisRepository;
import com.ssafy.emour.chat.repository.ChatMessageRepository;
import com.ssafy.emour.chat.repository.ChatReactionRepository;
import com.ssafy.emour.couple.repository.CoupleMemberRepository;
import com.ssafy.emour.dashboard.entity.CoupleDashboard;
import com.ssafy.emour.dashboard.repository.CoupleDashboardRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CoupleDashboardSnapshotServiceTest {

    @Mock
    private CoupleDashboardRepository coupleDashboardRepository;
    @Mock
    private ChatMessageRepository chatMessageRepository;
    @Mock
    private ChatReactionRepository chatReactionRepository;
    @Mock
    private ChatAnalysisRepository chatAnalysisRepository;
    @Mock
    private CoupleMemberRepository coupleMemberRepository;

    @Test
    void aggregatesWholeRoomData() {
        LocalDate date = LocalDate.of(2026, 8, 3);
        LocalDateTime start = date.atStartOfDay();
        LocalDateTime end = date.atTime(13, 0);
        CoupleDashboardSnapshotService service = new CoupleDashboardSnapshotService(
                coupleDashboardRepository,
                chatMessageRepository,
                chatReactionRepository,
                chatAnalysisRepository,
                coupleMemberRepository,
                new ConversationFlowCalculator(),
                Clock.fixed(
                        Instant.parse("2026-08-03T04:05:00Z"),
                        ZoneId.of("Asia/Seoul")
                )
        );

        when(chatMessageRepository
                .countByRoomIdAndSentAtGreaterThanEqualAndSentAtLessThan(
                        1L,
                        start,
                        end
                )).thenReturn(8L);
        when(chatMessageRepository.countRoomImages(1L, start, end))
                .thenReturn(2L);
        when(chatReactionRepository
                .countByRoomIdAndCreatedAtGreaterThanEqualAndCreatedAtLessThan(
                        1L,
                        start,
                        end
                )).thenReturn(3L);
        when(chatAnalysisRepository.findCompletedRoomEmotionTypes(
                1L,
                start,
                end
        )).thenReturn(List.of("JOY", "JOY", "SADNESS"));
        when(chatMessageRepository.findRoomTextContents(1L, start, end))
                .thenReturn(List.of("love today", "love together"));
        when(chatMessageRepository.findConversationMessages(1L, start, end))
                .thenReturn(List.of());
        when(coupleDashboardRepository.findByRoomIdAndSummaryDate(1L, date))
                .thenReturn(Optional.empty());
        when(coupleDashboardRepository.save(any(CoupleDashboard.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        CoupleDashboard result = service.refreshSnapshot(
                1L,
                date,
                end,
                true
        );

        assertThat(result.getMessageCount()).isEqualTo(8);
        assertThat(result.getImageCount()).isEqualTo(2);
        assertThat(result.getReactionCount()).isEqualTo(3);
        assertThat(result.getEmotionSummary()).contains("\"JOY\":2");
        assertThat(result.getFrequentWords())
                .contains("\"word\":\"love\"", "\"count\":2");
        assertThat(result.getFinalizedUntil()).isEqualTo(end);
    }
}
