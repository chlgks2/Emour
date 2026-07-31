package com.ssafy.emour.mood.service;

import com.ssafy.emour.couple.entity.CoupleMember;
import com.ssafy.emour.couple.entity.CoupleMemberStatus;
import com.ssafy.emour.couple.repository.CoupleMemberRepository;
import com.ssafy.emour.mood.entity.Mood;
import com.ssafy.emour.mood.entity.MoodNotification;
import com.ssafy.emour.mood.entity.MoodType;
import com.ssafy.emour.mood.repository.MoodNotificationRepository;
import com.ssafy.emour.mood.repository.MoodRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class MoodDefaultSchedulerTest {

    @Mock
    private MoodNotificationRepository moodNotificationRepository;

    @Mock
    private CoupleMemberRepository coupleMemberRepository;

    @Mock
    private MoodRepository moodRepository;

    @Mock
    private MoodTimeProvider moodTimeProvider;

    private MoodDefaultScheduler scheduler;

    @BeforeEach
    void setUp() {
        scheduler = new MoodDefaultScheduler(
                moodNotificationRepository,
                coupleMemberRepository,
                moodRepository,
                new MoodSlotCalculator(),
                moodTimeProvider
        );
    }

    @Test
    void 시간대가_끝나면_미등록_사용자에게_NEUTRAL을_생성한다() {
        Long roomId = 10L;
        Long firstUserId = 1L;
        Long secondUserId = 2L;
        LocalDateTime currentTime = LocalDateTime.of(
                2026, 7, 31, 12, 0
        );
        LocalDateTime closedSlot = LocalDateTime.of(
                2026, 7, 31, 9, 0
        );
        MoodNotification notification = MoodNotification.create(
                roomId,
                LocalTime.of(9, 0),
                LocalTime.of(21, 0),
                3
        );
        CoupleMember firstMember = CoupleMember.active(firstUserId, roomId);
        CoupleMember secondMember = CoupleMember.active(secondUserId, roomId);

        given(moodTimeProvider.now()).willReturn(currentTime);
        given(moodNotificationRepository.findAllByActiveTrue())
                .willReturn(List.of(notification));
        given(coupleMemberRepository.findAllByIdRoomIdAndStatus(
                roomId,
                CoupleMemberStatus.ACTIVE
        )).willReturn(List.of(firstMember, secondMember));
        given(moodRepository.existsByRoomIdAndUserIdAndMoodDatetime(
                roomId,
                firstUserId,
                closedSlot
        )).willReturn(true);
        given(moodRepository.existsByRoomIdAndUserIdAndMoodDatetime(
                roomId,
                secondUserId,
                closedSlot
        )).willReturn(false);

        scheduler.createDefaultsForClosedSlots();

        @SuppressWarnings("unchecked")
        ArgumentCaptor<List<Mood>> captor = ArgumentCaptor.forClass(List.class);
        verify(moodRepository).saveAll(captor.capture());

        assertThat(captor.getValue()).hasSize(1);
        Mood defaultMood = captor.getValue().get(0);
        assertThat(defaultMood.getUserId()).isEqualTo(secondUserId);
        assertThat(defaultMood.getMoodDatetime()).isEqualTo(closedSlot);
        assertThat(defaultMood.getMoodType()).isEqualTo(MoodType.NEUTRAL);
    }
}
