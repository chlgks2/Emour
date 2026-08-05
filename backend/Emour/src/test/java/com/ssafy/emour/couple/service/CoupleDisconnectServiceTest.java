package com.ssafy.emour.couple.service;

import com.ssafy.emour.couple.dto.response.CoupleDisconnectResponse;
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
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class CoupleDisconnectServiceTest {

    private static final Long USER_ID = 1L;
    private static final Long PARTNER_ID = 2L;
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
    void 요청자만_방에서_나가고_커플방은_비활성화한다() {
        CoupleRoom room = activeRoom();
        CoupleMember requester = CoupleMember.active(USER_ID, ROOM_ID);
        CoupleMember partner = CoupleMember.active(PARTNER_ID, ROOM_ID);

        givenLockedMember();
        given(coupleRoomRepository.findActiveRoomByUserIdForUpdate(USER_ID))
                .willReturn(Optional.of(room));
        given(coupleMemberRepository.findById(
                new CoupleMemberId(USER_ID, ROOM_ID)
        )).willReturn(Optional.of(requester));
        given(coupleMemberRepository.countByIdRoomIdAndStatus(
                ROOM_ID,
                CoupleMemberStatus.ACTIVE
        )).willReturn(2L);

        CoupleDisconnectResponse response = coupleService.disconnect(USER_ID);

        assertThat(response.roomId()).isEqualTo(ROOM_ID);
        assertThat(response.status()).isEqualTo(CoupleRoomStatus.INACTIVE);
        assertThat(response.disconnectedAt()).isNotNull();
        assertThat(response.roomDeleted()).isFalse();
        assertThat(room.getStatus()).isEqualTo(CoupleRoomStatus.INACTIVE);
        assertThat(requester.getStatus()).isEqualTo(CoupleMemberStatus.LEFT);
        assertThat(requester.getLeftAt()).isEqualTo(response.disconnectedAt());
        assertThat(partner.getStatus()).isEqualTo(CoupleMemberStatus.ACTIVE);

        verify(coupleRoomRepository, never()).delete(any(CoupleRoom.class));
        verify(coupleMemberRepository, never()).delete(any(CoupleMember.class));
    }

    @Test
    void 마지막_사용자가_나가면_멤버와_커플방을_완전히_삭제한다() {
        CoupleRoom room = activeRoom();
        LocalDateTime firstLeaveTime = LocalDateTime.now().minusMinutes(1);
        room.deactivate();

        CoupleMember firstLeaver = CoupleMember.active(USER_ID, ROOM_ID);
        firstLeaver.leave(firstLeaveTime);
        CoupleMember lastMember = CoupleMember.active(PARTNER_ID, ROOM_ID);

        givenLockedMember(PARTNER_ID);
        given(coupleRoomRepository.findActiveRoomByUserIdForUpdate(PARTNER_ID))
                .willReturn(Optional.empty());
        given(coupleRoomRepository.findRetainedInactiveRoomsByUserIdForUpdate(
                org.mockito.ArgumentMatchers.eq(PARTNER_ID),
                any(org.springframework.data.domain.Pageable.class)
        )).willReturn(List.of(room));
        given(coupleMemberRepository.findById(
                new CoupleMemberId(PARTNER_ID, ROOM_ID)
        )).willReturn(Optional.of(lastMember));
        given(coupleMemberRepository.countByIdRoomIdAndStatus(
                ROOM_ID,
                CoupleMemberStatus.ACTIVE
        )).willReturn(1L);
        CoupleDisconnectResponse response = coupleService.disconnect(PARTNER_ID);

        assertThat(response.roomId()).isEqualTo(ROOM_ID);
        assertThat(response.status()).isEqualTo(CoupleRoomStatus.INACTIVE);
        assertThat(response.roomDeleted()).isTrue();
        assertThat(lastMember.getStatus()).isEqualTo(CoupleMemberStatus.LEFT);
        verify(coupleRoomRepository).delete(room);
    }

    @Test
    void 대기_중인_초대방에서_나가면_방을_즉시_삭제한다() {
        CoupleRoom room = waitingRoom();
        CoupleMember requester = CoupleMember.active(USER_ID, ROOM_ID);

        givenLockedMember();
        given(coupleRoomRepository.findActiveRoomByUserIdForUpdate(USER_ID))
                .willReturn(Optional.empty());
        given(coupleRoomRepository.findWaitingRoomsByUserIdForUpdate(
                org.mockito.ArgumentMatchers.eq(USER_ID),
                any(org.springframework.data.domain.Pageable.class)
        )).willReturn(List.of(room));
        given(coupleMemberRepository.findById(
                new CoupleMemberId(USER_ID, ROOM_ID)
        )).willReturn(Optional.of(requester));
        given(coupleMemberRepository.countByIdRoomIdAndStatus(
                ROOM_ID,
                CoupleMemberStatus.ACTIVE
        )).willReturn(1L);

        CoupleDisconnectResponse response = coupleService.disconnect(USER_ID);

        assertThat(response.roomId()).isEqualTo(ROOM_ID);
        assertThat(response.status()).isEqualTo(CoupleRoomStatus.WAITING);
        assertThat(response.roomDeleted()).isTrue();
        assertThat(requester.getStatus()).isEqualTo(CoupleMemberStatus.LEFT);
        verify(coupleRoomRepository).delete(room);
        verify(
                coupleRoomRepository,
                never()
        ).findRetainedInactiveRoomsByUserIdForUpdate(
                org.mockito.ArgumentMatchers.eq(USER_ID),
                any(org.springframework.data.domain.Pageable.class)
        );
    }

    @Test
    void 활성_커플이_없으면_연결을_해제할_수_없다() {
        givenLockedMember();
        given(coupleRoomRepository.findActiveRoomByUserIdForUpdate(USER_ID))
                .willReturn(Optional.empty());
        given(coupleRoomRepository.findRetainedInactiveRoomsByUserIdForUpdate(
                org.mockito.ArgumentMatchers.eq(USER_ID),
                any(org.springframework.data.domain.Pageable.class)
        )).willReturn(List.of());

        assertError(
                () -> coupleService.disconnect(USER_ID),
                ErrorCode.ACTIVE_COUPLE_NOT_FOUND
        );
        verify(coupleMemberRepository, never()).findById(any(CoupleMemberId.class));
    }

    @Test
    void 활성_방의_요청자_멤버가_없으면_상태를_변경하지_않는다() {
        CoupleRoom room = activeRoom();
        givenLockedMember(USER_ID);
        given(coupleRoomRepository.findActiveRoomByUserIdForUpdate(USER_ID))
                .willReturn(Optional.of(room));
        given(coupleMemberRepository.findById(
                new CoupleMemberId(USER_ID, ROOM_ID)
        )).willReturn(Optional.empty());

        assertError(
                () -> coupleService.disconnect(USER_ID),
                ErrorCode.ACTIVE_COUPLE_NOT_FOUND
        );
        assertThat(room.getStatus()).isEqualTo(CoupleRoomStatus.ACTIVE);
    }

    private CoupleRoom activeRoom() {
        CoupleRoom room = waitingRoom();
        room.activate();
        return room;
    }

    private CoupleRoom waitingRoom() {
        CoupleRoom room = CoupleRoom.waiting(
                "ABCD-2345",
                LocalDateTime.now().plusHours(1)
        );
        ReflectionTestUtils.setField(room, "id", ROOM_ID);
        return room;
    }

    private void givenLockedMember() {
        givenLockedMember(USER_ID);
    }

    private void givenLockedMember(Long userId) {
        Member member = Member.builder()
                .email("disconnect@example.com")
                .passwordHash("encoded-password")
                .nickname("연결해제요청자")
                .build();
        given(memberRepository.findByIdForUpdate(userId))
                .willReturn(Optional.of(member));
    }

    private void assertError(Runnable action, ErrorCode expectedErrorCode) {
        assertThatThrownBy(action::run)
                .isInstanceOf(CustomException.class)
                .satisfies(exception -> assertThat(
                        ((CustomException) exception).getErrorCode()
                ).isEqualTo(expectedErrorCode));
    }
}
