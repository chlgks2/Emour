package com.ssafy.emour.calendar.service;

import com.ssafy.emour.calendar.dto.request.ScheduleCreateRequest;
import com.ssafy.emour.calendar.dto.request.ScheduleUpdateRequest;
import com.ssafy.emour.calendar.entity.CoupleSchedule;
import com.ssafy.emour.calendar.entity.ScheduleType;
import com.ssafy.emour.calendar.repository.CoupleScheduleRepository;
import com.ssafy.emour.couple.entity.CoupleRoom;
import com.ssafy.emour.couple.repository.CoupleRoomRepository;
import com.ssafy.emour.global.exception.CustomException;
import com.ssafy.emour.global.exception.ErrorCode;
import com.ssafy.emour.member.repository.MemberRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class ScheduleServiceTest {

    @Mock
    private CoupleScheduleRepository scheduleRepository;

    @Mock
    private MemberRepository memberRepository;

    @Mock
    private CoupleRoomRepository coupleRoomRepository;

    private ScheduleService scheduleService;

    @BeforeEach
    void setUp() {
        scheduleService = new ScheduleService(
                scheduleRepository,
                memberRepository,
                coupleRoomRepository
        );
    }

    @Test
    void 활성_커플방에_일정을_등록한다() {
        Long userId = 1L;
        Long roomId = 10L;
        CoupleRoom room = mock(CoupleRoom.class);
        ScheduleCreateRequest request = new ScheduleCreateRequest(
                "데이트",
                LocalDate.of(2026, 8, 5),
                LocalTime.of(19, 0)
        );
        given(memberRepository.existsById(userId)).willReturn(true);
        given(coupleRoomRepository.findActiveRoomByUserId(userId))
                .willReturn(Optional.of(room));
        given(room.getId()).willReturn(roomId);
        given(scheduleRepository.save(any(CoupleSchedule.class)))
                .willAnswer(invocation -> invocation.getArgument(0));

        var response = scheduleService.create(userId, request);

        assertThat(response.roomId()).isEqualTo(roomId);
        assertThat(response.creatorId()).isEqualTo(userId);
        assertThat(response.name()).isEqualTo("데이트");
        assertThat(response.scheduleDate())
                .isEqualTo(LocalDate.of(2026, 8, 5));
        assertThat(response.scheduleTime())
                .isEqualTo(LocalTime.of(19, 0));
        assertThat(response.scheduleType()).isEqualTo(ScheduleType.SCHEDULE);
        assertThat(response.yearlyRecurring()).isFalse();
    }

    @Test
    void 활성_커플방이_없으면_일정을_등록할_수_없다() {
        Long userId = 1L;
        given(memberRepository.existsById(userId)).willReturn(true);
        given(coupleRoomRepository.findActiveRoomByUserId(userId))
                .willReturn(Optional.empty());

        assertThatThrownBy(() -> scheduleService.create(
                userId,
                new ScheduleCreateRequest(
                        "데이트",
                        LocalDate.of(2026, 8, 5),
                        LocalTime.of(19, 0)
                )
        ))
                .isInstanceOf(CustomException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.ACTIVE_COUPLE_NOT_FOUND);

        verify(scheduleRepository, never()).save(any());
    }

    @Test
    void 자신이_만든_일정을_수정한다() {
        Long userId = 1L;
        Long roomId = 10L;
        Long scheduleId = 100L;
        CoupleRoom room = mock(CoupleRoom.class);
        CoupleSchedule schedule = CoupleSchedule.createSchedule(
                roomId, userId, "데이트",
                LocalDate.of(2026, 8, 5), LocalTime.of(19, 0)
        );
        given(memberRepository.existsById(userId)).willReturn(true);
        given(coupleRoomRepository.findActiveRoomByUserId(userId))
                .willReturn(Optional.of(room));
        given(room.getId()).willReturn(roomId);
        given(scheduleRepository.findById(scheduleId))
                .willReturn(Optional.of(schedule));

        var response = scheduleService.update(
                userId,
                scheduleId,
                new ScheduleUpdateRequest(
                        "영화 데이트",
                        LocalDate.of(2026, 8, 6),
                        LocalTime.of(20, 0)
                )
        );

        assertThat(response.name()).isEqualTo("영화 데이트");
        assertThat(response.scheduleDate())
                .isEqualTo(LocalDate.of(2026, 8, 6));
        assertThat(response.scheduleTime())
                .isEqualTo(LocalTime.of(20, 0));
    }

    @Test
    void 상대방이_만든_일정은_수정할_수_없다() {
        Long userId = 1L;
        Long roomId = 10L;
        Long scheduleId = 100L;
        CoupleRoom room = mock(CoupleRoom.class);
        CoupleSchedule partnerSchedule = CoupleSchedule.createSchedule(
                roomId, 2L, "상대방 일정",
                LocalDate.of(2026, 8, 5), LocalTime.of(19, 0)
        );
        given(memberRepository.existsById(userId)).willReturn(true);
        given(coupleRoomRepository.findActiveRoomByUserId(userId))
                .willReturn(Optional.of(room));
        given(room.getId()).willReturn(roomId);
        given(scheduleRepository.findById(scheduleId))
                .willReturn(Optional.of(partnerSchedule));

        assertThatThrownBy(() -> scheduleService.update(
                userId,
                scheduleId,
                new ScheduleUpdateRequest(
                        "변경 시도",
                        LocalDate.of(2026, 8, 6),
                        LocalTime.of(20, 0)
                )
        ))
                .isInstanceOf(CustomException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.ACCESS_DENIED);

        assertThat(partnerSchedule.getName()).isEqualTo("상대방 일정");
    }

    @Test
    void 자신이_만든_일정을_삭제한다() {
        Long userId = 1L;
        Long roomId = 10L;
        Long scheduleId = 100L;
        CoupleRoom room = mock(CoupleRoom.class);
        CoupleSchedule schedule = CoupleSchedule.createSchedule(
                roomId, userId, "데이트",
                LocalDate.of(2026, 8, 5), LocalTime.of(19, 0)
        );
        given(memberRepository.existsById(userId)).willReturn(true);
        given(coupleRoomRepository.findActiveRoomByUserId(userId))
                .willReturn(Optional.of(room));
        given(room.getId()).willReturn(roomId);
        given(scheduleRepository.findById(scheduleId))
                .willReturn(Optional.of(schedule));

        scheduleService.delete(userId, scheduleId);

        verify(scheduleRepository).delete(schedule);
    }

    @Test
    void 상대방이_만든_일정은_삭제할_수_없다() {
        Long userId = 1L;
        Long roomId = 10L;
        Long scheduleId = 100L;
        CoupleRoom room = mock(CoupleRoom.class);
        CoupleSchedule partnerSchedule = CoupleSchedule.createSchedule(
                roomId, 2L, "상대방 일정",
                LocalDate.of(2026, 8, 5), LocalTime.of(19, 0)
        );
        given(memberRepository.existsById(userId)).willReturn(true);
        given(coupleRoomRepository.findActiveRoomByUserId(userId))
                .willReturn(Optional.of(room));
        given(room.getId()).willReturn(roomId);
        given(scheduleRepository.findById(scheduleId))
                .willReturn(Optional.of(partnerSchedule));

        assertThatThrownBy(() -> scheduleService.delete(userId, scheduleId))
                .isInstanceOf(CustomException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.ACCESS_DENIED);

        verify(scheduleRepository, never()).delete(any());
    }

    @Test
    void 커플의_해당_월_일정을_함께_조회한다() {
        Long userId = 1L;
        Long partnerId = 2L;
        Long roomId = 10L;
        CoupleRoom room = mock(CoupleRoom.class);
        CoupleSchedule mySchedule = CoupleSchedule.createSchedule(
                roomId, userId, "내 일정",
                LocalDate.of(2026, 8, 5), LocalTime.of(19, 0)
        );
        CoupleSchedule partnerSchedule = CoupleSchedule.createSchedule(
                roomId, partnerId, "상대방 일정",
                LocalDate.of(2026, 8, 12), LocalTime.of(20, 0)
        );
        given(memberRepository.existsById(userId)).willReturn(true);
        given(coupleRoomRepository.findActiveRoomByUserId(userId))
                .willReturn(Optional.of(room));
        given(room.getId()).willReturn(roomId);
        given(scheduleRepository
                .findAllByRoomIdAndScheduleTypeAndScheduleDateBetweenOrderByScheduleDateAscScheduleTimeAsc(
                        roomId,
                        ScheduleType.SCHEDULE,
                        LocalDate.of(2026, 8, 1),
                        LocalDate.of(2026, 8, 31)
                ))
                .willReturn(List.of(mySchedule, partnerSchedule));

        var responses = scheduleService.getMonthly(userId, 2026, 8);

        assertThat(responses).hasSize(2);
        assertThat(responses)
                .extracting(response -> response.creatorId())
                .containsExactly(userId, partnerId);
        assertThat(responses)
                .extracting(response -> response.name())
                .containsExactly("내 일정", "상대방 일정");
    }

    @Test
    void 유효하지_않은_월은_조회할_수_없다() {
        Long userId = 1L;
        Long roomId = 10L;
        CoupleRoom room = mock(CoupleRoom.class);
        given(memberRepository.existsById(userId)).willReturn(true);
        given(coupleRoomRepository.findActiveRoomByUserId(userId))
                .willReturn(Optional.of(room));

        assertThatThrownBy(() -> scheduleService.getMonthly(userId, 2026, 13))
                .isInstanceOf(CustomException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.INVALID_INPUT);
    }
}
