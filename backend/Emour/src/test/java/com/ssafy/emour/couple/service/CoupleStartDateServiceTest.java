package com.ssafy.emour.couple.service;

import com.ssafy.emour.couple.dto.request.CoupleStartDateRequest;
import com.ssafy.emour.couple.entity.CoupleRoom;
import com.ssafy.emour.couple.repository.CoupleMemberRepository;
import com.ssafy.emour.couple.repository.CoupleRoomRepository;
import com.ssafy.emour.global.exception.CustomException;
import com.ssafy.emour.global.exception.ErrorCode;
import com.ssafy.emour.member.entity.Member;
import com.ssafy.emour.member.repository.MemberRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.BDDMockito.given;

@ExtendWith(MockitoExtension.class)
class CoupleStartDateServiceTest {

    private static final Long USER_ID = 1L;
    private static final Long ROOM_ID = 10L;

    @Mock
    private CoupleRoomRepository coupleRoomRepository;
    @Mock
    private CoupleMemberRepository coupleMemberRepository;
    @Mock
    private MemberRepository memberRepository;
    @Mock
    private InvitationCodeGenerator invitationCodeGenerator;

    private CoupleService coupleService;

    @BeforeEach
    void setUp() {
        coupleService = new CoupleService(
                coupleRoomRepository,
                coupleMemberRepository,
                memberRepository,
                invitationCodeGenerator,
                24
        );
    }

    @Test
    void 활성_커플방에_만난_날을_저장하고_기념일을_계산한다() {
        LocalDate startDate = LocalDate.of(2025, 8, 1);
        CoupleRoom room = activeRoom();
        givenLockedUser();
        given(coupleRoomRepository.findActiveRoomByUserIdForUpdate(USER_ID))
                .willReturn(Optional.of(room));

        var response = coupleService.updateStartDate(
                USER_ID,
                new CoupleStartDateRequest(startDate)
        );

        assertThat(room.getDatingStartDate()).isEqualTo(startDate);
        assertThat(response.roomId()).isEqualTo(ROOM_ID);
        assertThat(response.datingStartDate()).isEqualTo(startDate);
        assertThat(response.milestones())
                .extracting(milestone -> milestone.days())
                .containsExactly(100, 200, 500);
        assertThat(response.milestones())
                .extracting(milestone -> milestone.date())
                .containsExactly(
                        startDate.plusDays(99),
                        startDate.plusDays(199),
                        startDate.plusDays(499)
                );
    }

    @Test
    void 활성_커플방이_없으면_만난_날을_저장할_수_없다() {
        givenLockedUser();
        given(coupleRoomRepository.findActiveRoomByUserIdForUpdate(USER_ID))
                .willReturn(Optional.empty());

        assertThatThrownBy(() -> coupleService.updateStartDate(
                USER_ID,
                new CoupleStartDateRequest(LocalDate.of(2025, 8, 1))
        ))
                .isInstanceOf(CustomException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.ACTIVE_COUPLE_NOT_FOUND);
    }

    private CoupleRoom activeRoom() {
        CoupleRoom room = CoupleRoom.waiting(
                "ABCD-2345",
                LocalDateTime.now().plusHours(1)
        );
        ReflectionTestUtils.setField(room, "id", ROOM_ID);
        room.activate();
        return room;
    }

    private void givenLockedUser() {
        Member member = Member.builder()
                .email("start-date@example.com")
                .passwordHash("encoded-password")
                .nickname("만난 날 입력자")
                .build();
        given(memberRepository.findByIdForUpdate(USER_ID))
                .willReturn(Optional.of(member));
    }
}
