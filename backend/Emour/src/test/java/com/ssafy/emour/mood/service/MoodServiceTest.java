package com.ssafy.emour.mood.service;

import com.ssafy.emour.couple.entity.CoupleRoom;
import com.ssafy.emour.couple.repository.CoupleRoomRepository;
import com.ssafy.emour.global.exception.CustomException;
import com.ssafy.emour.global.exception.ErrorCode;
import com.ssafy.emour.member.repository.MemberRepository;
import com.ssafy.emour.mood.dto.request.MoodCreateRequest;
import com.ssafy.emour.mood.dto.request.MoodUpdateRequest;
import com.ssafy.emour.mood.dto.response.MoodCreateResponse;
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
import org.springframework.data.domain.PageRequest;

import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class MoodServiceTest {

    @Mock
    private MoodRepository moodRepository;

    @Mock
    private MemberRepository memberRepository;

    @Mock
    private CoupleRoomRepository coupleRoomRepository;

    @Mock
    private MoodNotificationRepository moodNotificationRepository;

    @Mock
    private MoodTimeProvider moodTimeProvider;

    private MoodService moodService;

    @BeforeEach
    void setUp() {
        moodService = new MoodService(
                moodRepository,
                memberRepository,
                coupleRoomRepository,
                moodNotificationRepository,
                new MoodSlotCalculator(),
                moodTimeProvider
        );
    }

    @Test
    void 활성_커플방에_기분을_등록한다() {
        Long userId = 1L;
        Long roomId = 10L;
        MoodCreateRequest request = new MoodCreateRequest(
                MoodType.VERY_HAPPY,
                "  좋은 일이 있었어요  "
        );
        LocalDateTime currentTime = LocalDateTime.of(
                2026, 7, 31, 10, 30
        );
        LocalDateTime expectedSlot = LocalDateTime.of(
                2026, 7, 31, 9, 0
        );
        CoupleRoom room = mock(CoupleRoom.class);
        MoodNotification notification = MoodNotification.create(
                roomId,
                LocalTime.of(9, 0),
                LocalTime.of(21, 0),
                3
        );
        given(memberRepository.existsById(userId)).willReturn(true);
        given(coupleRoomRepository.findActiveRoomByUserId(userId))
                .willReturn(Optional.of(room));
        given(room.getId()).willReturn(roomId);
        given(moodNotificationRepository.findById(roomId))
                .willReturn(Optional.of(notification));
        given(moodTimeProvider.now()).willReturn(currentTime);
        given(moodRepository.save(any(Mood.class)))
                .willAnswer(invocation -> invocation.getArgument(0));

        MoodCreateResponse response = moodService.create(userId, request);

        ArgumentCaptor<Mood> moodCaptor = ArgumentCaptor.forClass(Mood.class);
        verify(moodRepository).save(moodCaptor.capture());
        Mood savedMood = moodCaptor.getValue();

        assertThat(savedMood.getRoomId()).isEqualTo(roomId);
        assertThat(savedMood.getUserId()).isEqualTo(userId);
        assertThat(savedMood.getMoodType()).isEqualTo(MoodType.VERY_HAPPY);
        assertThat(savedMood.getReason()).isEqualTo("좋은 일이 있었어요");
        assertThat(savedMood.getMoodDatetime()).isEqualTo(expectedSlot);
        assertThat(savedMood.getCreatedAt()).isEqualTo(currentTime);
        assertThat(savedMood.getUpdatedAt()).isEqualTo(currentTime);
        assertThat(response.roomId()).isEqualTo(roomId);
        assertThat(response.moodDatetime()).isEqualTo(expectedSlot);
        assertThat(response.moodType()).isEqualTo(MoodType.VERY_HAPPY);
        assertThat(response.reason()).isEqualTo("좋은 일이 있었어요");
    }

    @Test
    void 같은_알림_시간대에는_두_번_등록할_수_없다() {
        Long userId = 1L;
        Long roomId = 10L;
        LocalDateTime currentTime = LocalDateTime.of(
                2026, 7, 31, 10, 30
        );
        LocalDateTime currentSlot = LocalDateTime.of(
                2026, 7, 31, 9, 0
        );
        CoupleRoom room = mock(CoupleRoom.class);
        MoodNotification notification = MoodNotification.create(
                roomId,
                LocalTime.of(9, 0),
                LocalTime.of(21, 0),
                3
        );
        given(memberRepository.existsById(userId)).willReturn(true);
        given(coupleRoomRepository.findActiveRoomByUserId(userId))
                .willReturn(Optional.of(room));
        given(room.getId()).willReturn(roomId);
        given(moodNotificationRepository.findById(roomId))
                .willReturn(Optional.of(notification));
        given(moodTimeProvider.now()).willReturn(currentTime);
        given(moodRepository.existsByRoomIdAndUserIdAndMoodDatetime(
                roomId,
                userId,
                currentSlot
        )).willReturn(true);

        assertThatThrownBy(() -> moodService.create(
                userId,
                new MoodCreateRequest(MoodType.HAPPY)
        ))
                .isInstanceOf(CustomException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.MOOD_ALREADY_REGISTERED);

        verify(moodRepository, never()).save(any());
    }

    @Test
    void 존재하지_않는_사용자는_등록할_수_없다() {
        Long userId = 1L;
        given(memberRepository.existsById(userId)).willReturn(false);

        assertThatThrownBy(() -> moodService.create(
                userId,
                new MoodCreateRequest(MoodType.NEUTRAL)
        ))
                .isInstanceOf(CustomException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.USER_NOT_FOUND);

        verify(coupleRoomRepository, never()).findActiveRoomByUserId(any());
        verify(moodRepository, never()).save(any());
    }

    @Test
    void 활성_커플방이_없으면_등록할_수_없다() {
        Long userId = 1L;
        given(memberRepository.existsById(userId)).willReturn(true);
        given(coupleRoomRepository.findActiveRoomByUserId(userId))
                .willReturn(Optional.empty());

        assertThatThrownBy(() -> moodService.create(
                userId,
                new MoodCreateRequest(MoodType.SAD)
        ))
                .isInstanceOf(CustomException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.ACTIVE_COUPLE_NOT_FOUND);

        verify(moodRepository, never()).save(any());
    }

    @Test
    void 현재_알림_시간대의_본인_기분을_수정한다() {
        Long userId = 1L;
        Long roomId = 10L;
        Long moodId = 100L;
        LocalDateTime slot = LocalDateTime.of(2026, 7, 31, 9, 0);
        LocalDateTime currentTime = LocalDateTime.of(2026, 7, 31, 10, 30);
        CoupleRoom room = mock(CoupleRoom.class);
        Mood mood = Mood.create(
                roomId,
                userId,
                slot,
                MoodType.NEUTRAL,
                slot
        );
        MoodNotification notification = MoodNotification.create(
                roomId,
                LocalTime.of(9, 0),
                LocalTime.of(21, 0),
                3
        );

        given(memberRepository.existsById(userId)).willReturn(true);
        given(coupleRoomRepository.findActiveRoomByUserId(userId))
                .willReturn(Optional.of(room));
        given(room.getId()).willReturn(roomId);
        given(moodRepository.findById(moodId)).willReturn(Optional.of(mood));
        given(moodNotificationRepository.findById(roomId))
                .willReturn(Optional.of(notification));
        given(moodTimeProvider.now()).willReturn(currentTime);

        var response = moodService.update(
                userId,
                moodId,
                new MoodUpdateRequest(MoodType.HAPPY, "  기분이 좋아졌어요  ")
        );

        assertThat(mood.getMoodType()).isEqualTo(MoodType.HAPPY);
        assertThat(mood.getReason()).isEqualTo("기분이 좋아졌어요");
        assertThat(mood.getUpdatedAt()).isEqualTo(currentTime);
        assertThat(response.moodType()).isEqualTo(MoodType.HAPPY);
        assertThat(response.reason()).isEqualTo("기분이 좋아졌어요");
        assertThat(response.updatedAt()).isEqualTo(currentTime);
    }

    @Test
    void 상대방의_기분은_수정할_수_없다() {
        Long userId = 1L;
        Long roomId = 10L;
        Long moodId = 100L;
        CoupleRoom room = mock(CoupleRoom.class);
        Mood partnerMood = Mood.create(
                roomId,
                2L,
                LocalDateTime.of(2026, 7, 31, 9, 0),
                MoodType.NEUTRAL,
                LocalDateTime.of(2026, 7, 31, 9, 0)
        );

        given(memberRepository.existsById(userId)).willReturn(true);
        given(coupleRoomRepository.findActiveRoomByUserId(userId))
                .willReturn(Optional.of(room));
        given(room.getId()).willReturn(roomId);
        given(moodRepository.findById(moodId))
                .willReturn(Optional.of(partnerMood));

        assertThatThrownBy(() -> moodService.update(
                userId,
                moodId,
                new MoodUpdateRequest(MoodType.SAD)
        ))
                .isInstanceOf(CustomException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.ACCESS_DENIED);

        assertThat(partnerMood.getMoodType()).isEqualTo(MoodType.NEUTRAL);
    }

    @Test
    void 지난_알림_시간대의_기분은_수정할_수_없다() {
        Long userId = 1L;
        Long roomId = 10L;
        Long moodId = 100L;
        LocalDateTime previousSlot = LocalDateTime.of(2026, 7, 31, 9, 0);
        LocalDateTime currentTime = LocalDateTime.of(2026, 7, 31, 13, 0);
        CoupleRoom room = mock(CoupleRoom.class);
        Mood mood = Mood.create(
                roomId,
                userId,
                previousSlot,
                MoodType.NEUTRAL,
                previousSlot
        );
        MoodNotification notification = MoodNotification.create(
                roomId,
                LocalTime.of(9, 0),
                LocalTime.of(21, 0),
                3
        );

        given(memberRepository.existsById(userId)).willReturn(true);
        given(coupleRoomRepository.findActiveRoomByUserId(userId))
                .willReturn(Optional.of(room));
        given(room.getId()).willReturn(roomId);
        given(moodRepository.findById(moodId)).willReturn(Optional.of(mood));
        given(moodNotificationRepository.findById(roomId))
                .willReturn(Optional.of(notification));
        given(moodTimeProvider.now()).willReturn(currentTime);

        assertThatThrownBy(() -> moodService.update(
                userId,
                moodId,
                new MoodUpdateRequest(MoodType.VERY_HAPPY)
        ))
                .isInstanceOf(CustomException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.MOOD_UPDATE_NOT_ALLOWED);

        assertThat(mood.getMoodType()).isEqualTo(MoodType.NEUTRAL);
    }

    @Test
    void 본인과_상대방의_기분_기록을_모두_조회한다() {
        Long userId = 1L;
        Long partnerId = 2L;
        Long roomId = 10L;
        CoupleRoom room = mock(CoupleRoom.class);
        Mood myMood = Mood.create(
                roomId,
                userId,
                LocalDateTime.of(2026, 7, 31, 12, 0),
                MoodType.HAPPY,
                LocalDateTime.of(2026, 7, 31, 12, 10)
        );
        Mood partnerMood = Mood.create(
                roomId,
                partnerId,
                LocalDateTime.of(2026, 7, 31, 9, 0),
                MoodType.SAD,
                LocalDateTime.of(2026, 7, 31, 9, 5)
        );

        given(memberRepository.existsById(userId)).willReturn(true);
        given(coupleRoomRepository.findReadableRoomsByUserId(
                userId, PageRequest.of(0, 1)
        )).willReturn(List.of(room));
        given(room.getId()).willReturn(roomId);
        given(moodRepository.findAllByRoomIdOrderByMoodDatetimeDescUserIdAsc(
                roomId
        )).willReturn(List.of(myMood, partnerMood));

        var responses = moodService.getAll(userId);

        assertThat(responses).hasSize(2);
        assertThat(responses)
                .extracting(response -> response.userId())
                .containsExactly(userId, partnerId);
        assertThat(responses)
                .extracting(response -> response.moodType())
                .containsExactly(MoodType.HAPPY, MoodType.SAD);
        assertThat(responses)
                .extracting(response -> response.roomId())
                .containsOnly(roomId);
    }

    @Test
    void 조회_가능한_커플방이_없으면_기분을_조회할_수_없다() {
        Long userId = 1L;
        given(memberRepository.existsById(userId)).willReturn(true);
        given(coupleRoomRepository.findReadableRoomsByUserId(
                userId, PageRequest.of(0, 1)
        )).willReturn(List.of());

        assertThatThrownBy(() -> moodService.getAll(userId))
                .isInstanceOf(CustomException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.ACTIVE_COUPLE_NOT_FOUND);

        verify(
                moodRepository,
                never()
        ).findAllByRoomIdOrderByMoodDatetimeDescUserIdAsc(any());
    }
}
