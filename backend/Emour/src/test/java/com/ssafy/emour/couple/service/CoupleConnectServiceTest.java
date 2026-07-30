package com.ssafy.emour.couple.service;

import com.ssafy.emour.couple.dto.request.CoupleConnectRequest;
import com.ssafy.emour.couple.dto.response.CoupleConnectResponse;
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
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class CoupleConnectServiceTest {

    private static final Long INVITER_ID = 1L;
    private static final Long INVITEE_ID = 2L;
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
    void 유효한_초대_코드로_커플을_연결한다() {
        CoupleRoom room = waitingRoom(LocalDateTime.now().plusHours(1));
        givenLockedInvitee();
        given(coupleMemberRepository.existsActiveCoupleByUserId(INVITEE_ID))
                .willReturn(false);
        given(coupleRoomRepository.findByRoomCodeForUpdate(INVITATION_CODE))
                .willReturn(Optional.of(room));
        given(coupleMemberRepository.existsById(
                new CoupleMemberId(INVITEE_ID, ROOM_ID)
        )).willReturn(false);
        given(coupleMemberRepository.countByIdRoomIdAndStatus(
                ROOM_ID,
                CoupleMemberStatus.ACTIVE
        )).willReturn(1L);

        CoupleConnectResponse response = coupleService.connect(
                INVITEE_ID,
                new CoupleConnectRequest(INVITATION_CODE)
        );

        assertThat(response.roomId()).isEqualTo(ROOM_ID);
        assertThat(response.status()).isEqualTo(CoupleRoomStatus.ACTIVE);
        assertThat(response.connectedAt()).isEqualTo(LocalDate.now());

        ArgumentCaptor<CoupleMember> memberCaptor =
                ArgumentCaptor.forClass(CoupleMember.class);
        verify(coupleMemberRepository).save(memberCaptor.capture());
        assertThat(memberCaptor.getValue().getId())
                .isEqualTo(new CoupleMemberId(INVITEE_ID, ROOM_ID));
    }

    @Test
    void 코드의_소문자와_앞뒤_공백을_정규화한다() {
        CoupleRoom room = waitingRoom(LocalDateTime.now().plusHours(1));
        givenLockedInvitee();
        given(coupleMemberRepository.existsActiveCoupleByUserId(INVITEE_ID))
                .willReturn(false);
        given(coupleRoomRepository.findByRoomCodeForUpdate(INVITATION_CODE))
                .willReturn(Optional.of(room));
        given(coupleMemberRepository.existsById(
                new CoupleMemberId(INVITEE_ID, ROOM_ID)
        )).willReturn(false);
        given(coupleMemberRepository.countByIdRoomIdAndStatus(
                ROOM_ID,
                CoupleMemberStatus.ACTIVE
        )).willReturn(1L);

        coupleService.connect(
                INVITEE_ID,
                new CoupleConnectRequest("  abcd-2345  ")
        );

        verify(coupleRoomRepository).findByRoomCodeForUpdate(INVITATION_CODE);
    }

    @Test
    void 존재하지_않는_초대_코드는_거절한다() {
        givenLockedInvitee();
        given(coupleMemberRepository.existsActiveCoupleByUserId(INVITEE_ID))
                .willReturn(false);
        given(coupleRoomRepository.findByRoomCodeForUpdate(INVITATION_CODE))
                .willReturn(Optional.empty());

        assertError(
                () -> coupleService.connect(
                        INVITEE_ID,
                        new CoupleConnectRequest(INVITATION_CODE)
                ),
                ErrorCode.INVITATION_CODE_NOT_FOUND
        );
    }

    @Test
    void 만료된_초대_코드는_거절한다() {
        CoupleRoom room = waitingRoom(LocalDateTime.now().minusSeconds(1));
        givenRoomCanBeLookedUp(room);

        assertError(
                () -> coupleService.connect(
                        INVITEE_ID,
                        new CoupleConnectRequest(INVITATION_CODE)
                ),
                ErrorCode.INVITATION_CODE_EXPIRED
        );
        verify(coupleMemberRepository, never()).save(
                org.mockito.ArgumentMatchers.any(CoupleMember.class)
        );
    }

    @Test
    void 본인이_생성한_초대_코드는_사용할_수_없다() {
        CoupleRoom room = waitingRoom(LocalDateTime.now().plusHours(1));
        givenRoomCanBeLookedUp(room);
        given(coupleMemberRepository.existsById(
                new CoupleMemberId(INVITEE_ID, ROOM_ID)
        )).willReturn(true);

        assertError(
                () -> coupleService.connect(
                        INVITEE_ID,
                        new CoupleConnectRequest(INVITATION_CODE)
                ),
                ErrorCode.CANNOT_USE_OWN_INVITATION
        );
    }

    @Test
    void 이미_활성_커플인_사용자는_다른_방에_연결할_수_없다() {
        givenLockedInvitee();
        given(coupleMemberRepository.existsActiveCoupleByUserId(INVITEE_ID))
                .willReturn(true);

        assertError(
                () -> coupleService.connect(
                        INVITEE_ID,
                        new CoupleConnectRequest(INVITATION_CODE)
                ),
                ErrorCode.ALREADY_COUPLED
        );
        verify(coupleRoomRepository, never())
                .findByRoomCodeForUpdate(INVITATION_CODE);
    }

    private CoupleRoom waitingRoom(LocalDateTime expiresAt) {
        CoupleRoom room = CoupleRoom.waiting(INVITATION_CODE, expiresAt);
        ReflectionTestUtils.setField(room, "id", ROOM_ID);
        return room;
    }

    private void givenLockedInvitee() {
        Member invitee = Member.builder()
                .email("invitee@example.com")
                .passwordHash("encoded-password")
                .nickname("초대받는 사람")
                .build();
        given(memberRepository.findByIdForUpdate(INVITEE_ID))
                .willReturn(Optional.of(invitee));
    }

    private void givenRoomCanBeLookedUp(CoupleRoom room) {
        givenLockedInvitee();
        given(coupleMemberRepository.existsActiveCoupleByUserId(INVITEE_ID))
                .willReturn(false);
        given(coupleRoomRepository.findByRoomCodeForUpdate(INVITATION_CODE))
                .willReturn(Optional.of(room));
    }

    private void assertError(Runnable action, ErrorCode expectedErrorCode) {
        assertThatThrownBy(action::run)
                .isInstanceOf(CustomException.class)
                .satisfies(exception -> assertThat(
                        ((CustomException) exception).getErrorCode()
                ).isEqualTo(expectedErrorCode));
    }
}
