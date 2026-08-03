package com.ssafy.emour.calendar.service;

import com.ssafy.emour.calendar.dto.request.AnniversaryCreateRequest;
import com.ssafy.emour.calendar.dto.request.AnniversaryUpdateRequest;
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
import org.springframework.data.domain.PageRequest;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class AnniversaryServiceTest {

    @Mock
    private CoupleScheduleRepository scheduleRepository;
    @Mock
    private MemberRepository memberRepository;
    @Mock
    private CoupleRoomRepository coupleRoomRepository;

    private AnniversaryService anniversaryService;

    @BeforeEach
    void setUp() {
        anniversaryService = new AnniversaryService(
                scheduleRepository,
                memberRepository,
                coupleRoomRepository
        );
    }

    @Test
    void 매년_반복되는_기념일을_등록한다() {
        Long userId = 1L;
        Long roomId = 10L;
        CoupleRoom room = mock(CoupleRoom.class);
        given(memberRepository.existsById(userId)).willReturn(true);
        given(coupleRoomRepository.findActiveRoomByUserId(userId))
                .willReturn(Optional.of(room));
        given(room.getId()).willReturn(roomId);
        given(scheduleRepository.save(any(CoupleSchedule.class)))
                .willAnswer(invocation -> invocation.getArgument(0));

        var response = anniversaryService.create(
                userId,
                new AnniversaryCreateRequest(
                        "첫 데이트 기념일",
                        "처음 만난 날",
                        LocalDate.of(2025, 8, 15)
                )
        );

        assertThat(response.roomId()).isEqualTo(roomId);
        assertThat(response.creatorId()).isEqualTo(userId);
        assertThat(response.description()).isEqualTo("처음 만난 날");
        assertThat(response.scheduleType())
                .isEqualTo(ScheduleType.ANNIVERSARY);
        assertThat(response.yearlyRecurring()).isTrue();
        assertThat(response.scheduleTime()).isNull();
    }

    @Test
    void 자신이_만든_기념일을_수정한다() {
        Long userId = 1L;
        Long roomId = 10L;
        Long anniversaryId = 100L;
        CoupleRoom room = mock(CoupleRoom.class);
        CoupleSchedule anniversary = CoupleSchedule.createAnniversary(
                roomId, userId, "첫 데이트 기념일",
                LocalDate.of(2025, 8, 15)
        );
        given(memberRepository.existsById(userId)).willReturn(true);
        given(coupleRoomRepository.findActiveRoomByUserId(userId))
                .willReturn(Optional.of(room));
        given(room.getId()).willReturn(roomId);
        given(scheduleRepository.findById(anniversaryId))
                .willReturn(Optional.of(anniversary));

        var response = anniversaryService.update(
                userId,
                anniversaryId,
                new AnniversaryUpdateRequest(
                        "첫 여행 기념일",
                        "함께 떠난 첫 여행",
                        LocalDate.of(2025, 9, 1)
                )
        );

        assertThat(response.name()).isEqualTo("첫 여행 기념일");
        assertThat(response.description()).isEqualTo("함께 떠난 첫 여행");
        assertThat(response.scheduleDate())
                .isEqualTo(LocalDate.of(2025, 9, 1));
        assertThat(response.yearlyRecurring()).isTrue();
    }

    @Test
    void 일반_일정은_기념일_API로_수정할_수_없다() {
        Long userId = 1L;
        Long roomId = 10L;
        Long scheduleId = 100L;
        CoupleRoom room = mock(CoupleRoom.class);
        CoupleSchedule schedule = CoupleSchedule.createSchedule(
                roomId, userId, "데이트",
                LocalDate.of(2026, 8, 5),
                java.time.LocalTime.of(19, 0)
        );
        given(memberRepository.existsById(userId)).willReturn(true);
        given(coupleRoomRepository.findActiveRoomByUserId(userId))
                .willReturn(Optional.of(room));
        given(room.getId()).willReturn(roomId);
        given(scheduleRepository.findById(scheduleId))
                .willReturn(Optional.of(schedule));

        assertThatThrownBy(() -> anniversaryService.update(
                userId,
                scheduleId,
                new AnniversaryUpdateRequest(
                        "변경 시도",
                        LocalDate.of(2025, 9, 1)
                )
        ))
                .isInstanceOf(CustomException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.ANNIVERSARY_TYPE_MISMATCH);
    }

    @Test
    void 자신이_만든_기념일을_삭제한다() {
        Long userId = 1L;
        Long roomId = 10L;
        Long anniversaryId = 100L;
        CoupleRoom room = mock(CoupleRoom.class);
        CoupleSchedule anniversary = CoupleSchedule.createAnniversary(
                roomId, userId, "첫 데이트 기념일",
                LocalDate.of(2025, 8, 15)
        );
        given(memberRepository.existsById(userId)).willReturn(true);
        given(coupleRoomRepository.findActiveRoomByUserId(userId))
                .willReturn(Optional.of(room));
        given(room.getId()).willReturn(roomId);
        given(scheduleRepository.findById(anniversaryId))
                .willReturn(Optional.of(anniversary));

        anniversaryService.delete(userId, anniversaryId);

        verify(scheduleRepository).delete(anniversary);
    }

    @Test
    void 커플이_등록한_기념일_목록을_함께_조회한다() {
        Long userId = 1L;
        Long partnerId = 2L;
        Long roomId = 10L;
        CoupleRoom room = mock(CoupleRoom.class);
        CoupleSchedule first = CoupleSchedule.createAnniversary(
                roomId, userId, "첫 데이트",
                LocalDate.of(2025, 8, 15)
        );
        CoupleSchedule second = CoupleSchedule.createAnniversary(
                roomId, partnerId, "첫 여행",
                LocalDate.of(2025, 9, 1)
        );
        given(memberRepository.existsById(userId)).willReturn(true);
        given(coupleRoomRepository.findReadableRoomsByUserId(
                userId,
                PageRequest.of(0, 1)
        )).willReturn(List.of(room));
        given(room.getId()).willReturn(roomId);
        given(scheduleRepository
                .findAllByRoomIdAndScheduleTypeOrderByScheduleDateAsc(
                        roomId,
                        ScheduleType.ANNIVERSARY
                ))
                .willReturn(List.of(first, second));

        var responses = anniversaryService.getAll(userId);

        assertThat(responses).hasSize(2);
        assertThat(responses)
                .extracting(response -> response.creatorId())
                .containsExactly(userId, partnerId);
        assertThat(responses)
                .extracting(response -> response.scheduleType())
                .containsOnly(ScheduleType.ANNIVERSARY);
        assertThat(responses)
                .allMatch(response -> response.yearlyRecurring());
    }
}
