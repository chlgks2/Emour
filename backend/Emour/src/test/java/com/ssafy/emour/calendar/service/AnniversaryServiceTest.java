package com.ssafy.emour.calendar.service;

import com.ssafy.emour.calendar.dto.request.AnniversaryCreateRequest;
import com.ssafy.emour.calendar.entity.CoupleSchedule;
import com.ssafy.emour.calendar.entity.ScheduleType;
import com.ssafy.emour.calendar.repository.CoupleScheduleRepository;
import com.ssafy.emour.couple.entity.CoupleRoom;
import com.ssafy.emour.couple.repository.CoupleRoomRepository;
import com.ssafy.emour.member.repository.MemberRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.mock;

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
                        LocalDate.of(2025, 8, 15)
                )
        );

        assertThat(response.roomId()).isEqualTo(roomId);
        assertThat(response.creatorId()).isEqualTo(userId);
        assertThat(response.scheduleType())
                .isEqualTo(ScheduleType.ANNIVERSARY);
        assertThat(response.yearlyRecurring()).isTrue();
        assertThat(response.scheduleTime()).isNull();
    }
}
