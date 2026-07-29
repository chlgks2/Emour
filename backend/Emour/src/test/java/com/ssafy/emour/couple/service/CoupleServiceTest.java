package com.ssafy.emour.couple.service;

import com.ssafy.emour.couple.dto.response.CoupleInvitationResponse;
import com.ssafy.emour.couple.entity.CoupleMember;
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
import org.springframework.data.domain.Pageable;
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
class CoupleServiceTest {

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
    void 신규_초대자는_대기방과_멤버가_생성된다() {
        givenLockedMember();
        given(coupleMemberRepository.existsActiveCoupleByUserId(USER_ID))
                .willReturn(false);
        given(invitationCodeGenerator.generate()).willReturn(INVITATION_CODE);
        given(coupleRoomRepository.existsByRoomCode(INVITATION_CODE)).willReturn(false);
        given(coupleMemberRepository.findWaitingRoomsByUserId(
                any(Long.class),
                any(Pageable.class)
        )).willReturn(List.of());
        given(coupleRoomRepository.save(any(CoupleRoom.class)))
                .willAnswer(invocation -> {
                    CoupleRoom room = invocation.getArgument(0);
                    ReflectionTestUtils.setField(room, "id", ROOM_ID);
                    return room;
                });

        LocalDateTime before = LocalDateTime.now().plusHours(24).minusSeconds(1);
        CoupleInvitationResponse response = coupleService.createInvitation(USER_ID);
        LocalDateTime after = LocalDateTime.now().plusHours(24).plusSeconds(1);

        assertThat(response.roomId()).isEqualTo(ROOM_ID);
        assertThat(response.invitationCode()).isEqualTo(INVITATION_CODE);
        assertThat(response.expiresAt()).isBetween(before, after);
        verify(coupleRoomRepository).save(any(CoupleRoom.class));
        verify(coupleMemberRepository).save(any(CoupleMember.class));
    }

    @Test
    void 기존_대기방이_있으면_새_방을_만들지_않고_코드를_재발급한다() {
        CoupleRoom waitingRoom = CoupleRoom.waiting(
                "OLD1-CODE",
                LocalDateTime.now().minusDays(1)
        );
        ReflectionTestUtils.setField(waitingRoom, "id", ROOM_ID);

        givenLockedMember();
        given(coupleMemberRepository.existsActiveCoupleByUserId(USER_ID))
                .willReturn(false);
        given(invitationCodeGenerator.generate()).willReturn(INVITATION_CODE);
        given(coupleRoomRepository.existsByRoomCode(INVITATION_CODE)).willReturn(false);
        given(coupleMemberRepository.findWaitingRoomsByUserId(
                any(Long.class),
                any(Pageable.class)
        )).willReturn(List.of(waitingRoom));

        CoupleInvitationResponse response = coupleService.createInvitation(USER_ID);

        assertThat(response.roomId()).isEqualTo(ROOM_ID);
        assertThat(response.invitationCode()).isEqualTo(INVITATION_CODE);
        verify(coupleRoomRepository, never()).save(any(CoupleRoom.class));
        verify(coupleMemberRepository, never()).save(any(CoupleMember.class));
    }

    @Test
    void 이미_활성_커플이면_초대_코드를_생성할_수_없다() {
        givenLockedMember();
        given(coupleMemberRepository.existsActiveCoupleByUserId(USER_ID))
                .willReturn(true);

        assertThatThrownBy(() -> coupleService.createInvitation(USER_ID))
                .isInstanceOf(CustomException.class)
                .satisfies(exception -> assertThat(
                        ((CustomException) exception).getErrorCode()
                ).isEqualTo(ErrorCode.ALREADY_COUPLED));

        verify(invitationCodeGenerator, never()).generate();
        verify(coupleRoomRepository, never()).save(any(CoupleRoom.class));
    }

    @Test
    void 중복_코드가_생성되면_새_코드를_다시_생성한다() {
        String duplicateCode = "AAAA-2222";

        givenLockedMember();
        given(coupleMemberRepository.existsActiveCoupleByUserId(USER_ID))
                .willReturn(false);
        given(invitationCodeGenerator.generate())
                .willReturn(duplicateCode, INVITATION_CODE);
        given(coupleRoomRepository.existsByRoomCode(duplicateCode)).willReturn(true);
        given(coupleRoomRepository.existsByRoomCode(INVITATION_CODE)).willReturn(false);
        given(coupleMemberRepository.findWaitingRoomsByUserId(
                any(Long.class),
                any(Pageable.class)
        )).willReturn(List.of());
        given(coupleRoomRepository.save(any(CoupleRoom.class)))
                .willAnswer(invocation -> {
                    CoupleRoom room = invocation.getArgument(0);
                    ReflectionTestUtils.setField(room, "id", ROOM_ID);
                    return room;
                });

        CoupleInvitationResponse response = coupleService.createInvitation(USER_ID);

        assertThat(response.invitationCode()).isEqualTo(INVITATION_CODE);
        verify(coupleRoomRepository).existsByRoomCode(duplicateCode);
        verify(coupleRoomRepository).existsByRoomCode(INVITATION_CODE);
    }

    private void givenLockedMember() {
        Member member = Member.builder()
                .email("couple@example.com")
                .passwordHash("encoded-password")
                .nickname("초대자")
                .build();
        given(memberRepository.findByIdForUpdate(USER_ID)).willReturn(Optional.of(member));
    }
}
