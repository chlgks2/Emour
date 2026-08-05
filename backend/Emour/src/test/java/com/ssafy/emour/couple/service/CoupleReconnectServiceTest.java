package com.ssafy.emour.couple.service;

import com.ssafy.emour.couple.dto.request.CoupleReconnectRequest;
import com.ssafy.emour.couple.entity.CoupleMember;
import com.ssafy.emour.couple.entity.CoupleMemberId;
import com.ssafy.emour.couple.entity.CoupleMemberStatus;
import com.ssafy.emour.couple.entity.CoupleRoom;
import com.ssafy.emour.couple.entity.CoupleRoomStatus;
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

import java.time.LocalDateTime;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class CoupleReconnectServiceTest {

    private static final Long USER_ID = 1L;
    private static final Long ROOM_ID = 10L;
    private static final String INVITATION_CODE = "ABCD-2345";

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
    void 연결을_해제한_사용자가_기존_코드로_재결합한다() {
        CoupleRoom room = inactiveRoom();
        CoupleMember leaver = leftMember();
        givenReconnectLookup(room, leaver);
        given(coupleMemberRepository.countByIdRoomIdAndStatus(
                ROOM_ID,
                CoupleMemberStatus.ACTIVE
        )).willReturn(1L);

        var response = coupleService.reconnect(
                USER_ID,
                new CoupleReconnectRequest("  abcd-2345  ")
        );

        assertThat(response.roomId()).isEqualTo(ROOM_ID);
        assertThat(response.status()).isEqualTo(CoupleRoomStatus.ACTIVE);
        assertThat(room.getStatus()).isEqualTo(CoupleRoomStatus.ACTIVE);
        assertThat(leaver.getStatus()).isEqualTo(CoupleMemberStatus.ACTIVE);
        assertThat(leaver.getLeftAt()).isNull();
        verify(coupleRoomRepository)
                .findByRoomCodeForUpdate(INVITATION_CODE);
    }

    @Test
    void 만료된_초대코드로는_재결합할_수_없다() {
        CoupleRoom room = inactiveRoom();
        CoupleMember leaver = leftMember();
        ReflectionTestUtils.setField(
                room,
                "roomCodeExpiresAt",
                LocalDateTime.now().minusDays(1)
        );
        givenLockedUser();
        given(coupleMemberRepository.existsActiveCoupleByUserId(USER_ID))
                .willReturn(false);
        given(coupleRoomRepository.findByRoomCodeForUpdate(INVITATION_CODE))
                .willReturn(Optional.of(room));

        assertError(
                () -> coupleService.reconnect(
                        USER_ID,
                        new CoupleReconnectRequest(INVITATION_CODE)
                ),
                ErrorCode.INVITATION_CODE_EXPIRED
        );

        assertThat(leaver.getStatus()).isEqualTo(CoupleMemberStatus.LEFT);
        assertThat(room.getStatus()).isEqualTo(CoupleRoomStatus.INACTIVE);
    }

    @Test
    void 기존_멤버가_아닌_사용자는_코드를_알아도_재결합할_수_없다() {
        CoupleRoom room = inactiveRoom();
        givenLockedUser();
        given(coupleMemberRepository.existsActiveCoupleByUserId(USER_ID))
                .willReturn(false);
        given(coupleRoomRepository.findByRoomCodeForUpdate(INVITATION_CODE))
                .willReturn(Optional.of(room));
        given(coupleMemberRepository.findById(
                new CoupleMemberId(USER_ID, ROOM_ID)
        )).willReturn(Optional.empty());

        assertError(
                () -> coupleService.reconnect(
                        USER_ID,
                        new CoupleReconnectRequest(INVITATION_CODE)
                ),
                ErrorCode.RECONNECT_NOT_AVAILABLE
        );
        assertThat(room.getStatus()).isEqualTo(CoupleRoomStatus.INACTIVE);
    }

    @Test
    void 방에_남아있는_사용자가_없으면_재결합할_수_없다() {
        CoupleRoom room = inactiveRoom();
        CoupleMember leaver = leftMember();
        givenReconnectLookup(room, leaver);
        given(coupleMemberRepository.countByIdRoomIdAndStatus(
                ROOM_ID,
                CoupleMemberStatus.ACTIVE
        )).willReturn(0L);

        assertError(
                () -> coupleService.reconnect(
                        USER_ID,
                        new CoupleReconnectRequest(INVITATION_CODE)
                ),
                ErrorCode.RECONNECT_NOT_AVAILABLE
        );
        assertThat(leaver.getStatus()).isEqualTo(CoupleMemberStatus.LEFT);
        assertThat(room.getStatus()).isEqualTo(CoupleRoomStatus.INACTIVE);
    }

    @Test
    void 이미_다른_활성_커플이_있으면_재결합할_수_없다() {
        givenLockedUser();
        given(coupleMemberRepository.existsActiveCoupleByUserId(USER_ID))
                .willReturn(true);

        assertError(
                () -> coupleService.reconnect(
                        USER_ID,
                        new CoupleReconnectRequest(INVITATION_CODE)
                ),
                ErrorCode.ALREADY_COUPLED
        );
        verify(coupleRoomRepository, never())
                .findByRoomCodeForUpdate(INVITATION_CODE);
    }

    private CoupleRoom inactiveRoom() {
        CoupleRoom room = CoupleRoom.waiting(
                INVITATION_CODE,
                LocalDateTime.now().plusHours(1)
        );
        ReflectionTestUtils.setField(room, "id", ROOM_ID);
        room.activate();
        room.deactivate();
        return room;
    }

    private CoupleMember leftMember() {
        CoupleMember member = CoupleMember.active(USER_ID, ROOM_ID);
        member.leave(LocalDateTime.now().minusHours(1));
        return member;
    }

    private void givenReconnectLookup(
            CoupleRoom room,
            CoupleMember member
    ) {
        givenLockedUser();
        given(coupleMemberRepository.existsActiveCoupleByUserId(USER_ID))
                .willReturn(false);
        given(coupleRoomRepository.findByRoomCodeForUpdate(INVITATION_CODE))
                .willReturn(Optional.of(room));
        given(coupleMemberRepository.findById(
                new CoupleMemberId(USER_ID, ROOM_ID)
        )).willReturn(Optional.of(member));
    }

    private void givenLockedUser() {
        Member member = Member.builder()
                .email("reconnect@example.com")
                .passwordHash("encoded-password")
                .nickname("재결합 요청자")
                .build();
        given(memberRepository.findByIdForUpdate(USER_ID))
                .willReturn(Optional.of(member));
    }

    private void assertError(Runnable action, ErrorCode errorCode) {
        assertThatThrownBy(action::run)
                .isInstanceOf(CustomException.class)
                .satisfies(exception -> assertThat(
                        ((CustomException) exception).getErrorCode()
                ).isEqualTo(errorCode));
    }
}
