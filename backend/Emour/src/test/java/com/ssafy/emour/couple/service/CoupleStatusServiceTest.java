package com.ssafy.emour.couple.service;

import com.ssafy.emour.couple.dto.response.CoupleStatusResponse;
import com.ssafy.emour.couple.entity.CoupleRoom;
import com.ssafy.emour.couple.entity.CoupleRoomStatus;
import com.ssafy.emour.couple.repository.CoupleMemberRepository;
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
import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.BDDMockito.given;

@ExtendWith(MockitoExtension.class)
class CoupleStatusServiceTest {

    private static final Long INVITER_ID = 1L;
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
    void 초대자는_상대방_연결_전에는_WAITING_상태를_조회한다() {
        CoupleRoom room = waitingRoom();
        givenCurrentRoom(room);

        CoupleStatusResponse response = coupleService.getStatus(INVITER_ID);

        assertThat(response.roomId()).isEqualTo(ROOM_ID);
        assertThat(response.status()).isEqualTo(CoupleRoomStatus.WAITING);
    }

    @Test
    void 초대자는_상대방이_연결하면_ACTIVE_상태를_조회한다() {
        CoupleRoom room = waitingRoom();
        room.activate();
        givenCurrentRoom(room);

        CoupleStatusResponse response = coupleService.getStatus(INVITER_ID);

        assertThat(response.roomId()).isEqualTo(ROOM_ID);
        assertThat(response.status()).isEqualTo(CoupleRoomStatus.ACTIVE);
    }

    @Test
    void 참여_중인_커플방이_없으면_조회할_수_없다() {
        given(memberRepository.existsById(INVITER_ID)).willReturn(true);
        given(coupleRoomRepository.findCurrentRoomsByUserId(
                INVITER_ID,
                PageRequest.of(0, 1)
        )).willReturn(List.of());

        assertThatThrownBy(() -> coupleService.getStatus(INVITER_ID))
                .isInstanceOf(CustomException.class)
                .satisfies(exception -> assertThat(
                        ((CustomException) exception).getErrorCode()
                ).isEqualTo(ErrorCode.ACTIVE_COUPLE_NOT_FOUND));
    }

    private CoupleRoom waitingRoom() {
        CoupleRoom room = CoupleRoom.waiting(
                "ABCD-2345",
                LocalDateTime.now().plusHours(1)
        );
        ReflectionTestUtils.setField(room, "id", ROOM_ID);
        return room;
    }

    private void givenCurrentRoom(CoupleRoom room) {
        given(memberRepository.existsById(INVITER_ID)).willReturn(true);
        given(coupleRoomRepository.findCurrentRoomsByUserId(
                INVITER_ID,
                PageRequest.of(0, 1)
        )).willReturn(List.of(room));
    }
}
