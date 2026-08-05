package com.ssafy.emour.mood.service;

import com.ssafy.emour.couple.entity.CoupleRoom;
import com.ssafy.emour.couple.repository.CoupleRoomRepository;
import com.ssafy.emour.member.repository.MemberRepository;
import com.ssafy.emour.mood.dto.request.MoodNotificationUpdateRequest;
import com.ssafy.emour.mood.entity.MoodNotification;
import com.ssafy.emour.mood.repository.MoodNotificationRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalTime;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class MoodNotificationServiceTest {

    private static final Long USER_ID = 1L;
    private static final Long ROOM_ID = 10L;

    @Mock
    private MoodNotificationRepository moodNotificationRepository;

    @Mock
    private MemberRepository memberRepository;

    @Mock
    private CoupleRoomRepository coupleRoomRepository;

    private MoodNotificationService moodNotificationService;

    @BeforeEach
    void setUp() {
        moodNotificationService = new MoodNotificationService(
                moodNotificationRepository,
                memberRepository,
                coupleRoomRepository
        );
    }

    @Test
    void 설정이_없으면_커플방_공용_알림_설정을_생성한다() {
        givenActiveRoom();
        given(moodNotificationRepository.findById(ROOM_ID))
                .willReturn(Optional.empty());
        given(moodNotificationRepository.save(any(MoodNotification.class)))
                .willAnswer(invocation -> invocation.getArgument(0));

        var response = moodNotificationService.update(
                USER_ID,
                request(true, "09:00", "21:00", 3)
        );

        assertThat(response.roomId()).isEqualTo(ROOM_ID);
        assertThat(response.isEnabled()).isTrue();
        assertThat(response.startTime()).isEqualTo(LocalTime.of(9, 0));
        assertThat(response.endTime()).isEqualTo(LocalTime.of(21, 0));
        assertThat(response.intervalHours()).isEqualTo(3);
    }

    @Test
    void 기존_커플방_알림_설정을_수정한다() {
        givenActiveRoom();
        MoodNotification notification = MoodNotification.create(
                ROOM_ID,
                LocalTime.of(9, 0),
                LocalTime.of(21, 0),
                3
        );
        given(moodNotificationRepository.findById(ROOM_ID))
                .willReturn(Optional.of(notification));
        given(moodNotificationRepository.save(notification))
                .willReturn(notification);

        var response = moodNotificationService.update(
                USER_ID,
                request(false, "10:00", "22:00", 4)
        );

        assertThat(response.isEnabled()).isFalse();
        assertThat(response.startTime()).isEqualTo(LocalTime.of(10, 0));
        assertThat(response.endTime()).isEqualTo(LocalTime.of(22, 0));
        assertThat(response.intervalHours()).isEqualTo(4);
    }

    @Test
    void 커플방에_저장된_알림_설정을_조회한다() {
        givenActiveRoom();
        MoodNotification notification = MoodNotification.create(
                ROOM_ID,
                LocalTime.of(8, 0),
                LocalTime.of(20, 0),
                2
        );
        given(moodNotificationRepository.findById(ROOM_ID))
                .willReturn(Optional.of(notification));

        var response = moodNotificationService.get(USER_ID);

        assertThat(response.roomId()).isEqualTo(ROOM_ID);
        assertThat(response.startTime()).isEqualTo(LocalTime.of(8, 0));
        assertThat(response.endTime()).isEqualTo(LocalTime.of(20, 0));
        assertThat(response.intervalHours()).isEqualTo(2);
    }

    @Test
    void createsDefaultSettingWhenActiveRoomHasNoSetting() {
        givenActiveRoom();
        given(moodNotificationRepository.findById(ROOM_ID))
                .willReturn(Optional.empty());
        given(moodNotificationRepository.save(any(MoodNotification.class)))
                .willAnswer(invocation -> invocation.getArgument(0));

        var response = moodNotificationService.get(USER_ID);

        assertThat(response.startTime()).isEqualTo(LocalTime.of(8, 0));
        assertThat(response.endTime()).isEqualTo(LocalTime.of(22, 0));
        assertThat(response.intervalHours()).isEqualTo(2);
        assertThat(response.isEnabled()).isTrue();
        verify(moodNotificationRepository).save(any(MoodNotification.class));
    }

    private MoodNotificationUpdateRequest request(
            boolean isEnabled,
            String startTime,
            String endTime,
            int intervalHours
    ) {
        return new MoodNotificationUpdateRequest(
                isEnabled,
                LocalTime.parse(startTime),
                LocalTime.parse(endTime),
                intervalHours
        );
    }

    private void givenActiveRoom() {
        CoupleRoom room = mock(CoupleRoom.class);
        given(memberRepository.existsById(USER_ID)).willReturn(true);
        given(coupleRoomRepository.findActiveRoomByUserId(USER_ID))
                .willReturn(Optional.of(room));
        given(room.getId()).willReturn(ROOM_ID);
    }
}
