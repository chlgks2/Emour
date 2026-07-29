package com.ssafy.emour.couple.service;

import com.ssafy.emour.couple.dto.response.CoupleInvitationResponse;
import com.ssafy.emour.couple.entity.CoupleMember;
import com.ssafy.emour.couple.entity.CoupleRoom;
import com.ssafy.emour.couple.repository.CoupleMemberRepository;
import com.ssafy.emour.couple.repository.CoupleRoomRepository;
import com.ssafy.emour.global.exception.CustomException;
import com.ssafy.emour.global.exception.ErrorCode;
import com.ssafy.emour.member.repository.MemberRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class CoupleService {

    private static final int MAX_CODE_GENERATION_ATTEMPTS = 10;

    private final CoupleRoomRepository coupleRoomRepository;
    private final CoupleMemberRepository coupleMemberRepository;
    private final MemberRepository memberRepository;
    private final InvitationCodeGenerator invitationCodeGenerator;
    private final long invitationValidityHours;

    public CoupleService(
            CoupleRoomRepository coupleRoomRepository,
            CoupleMemberRepository coupleMemberRepository,
            MemberRepository memberRepository,
            InvitationCodeGenerator invitationCodeGenerator,
            @Value("${couple.invitation-validity-hours:24}") long invitationValidityHours
    ) {
        this.coupleRoomRepository = coupleRoomRepository;
        this.coupleMemberRepository = coupleMemberRepository;
        this.memberRepository = memberRepository;
        this.invitationCodeGenerator = invitationCodeGenerator;
        this.invitationValidityHours = invitationValidityHours;
    }

    @Transactional
    public CoupleInvitationResponse createInvitation(Long userId) {
        memberRepository.findByIdForUpdate(userId)
                .orElseThrow(() -> new CustomException(ErrorCode.USER_NOT_FOUND));

        if (coupleMemberRepository.existsActiveCoupleByUserId(userId)) {
            throw new CustomException(ErrorCode.ALREADY_COUPLED);
        }

        String invitationCode = generateUniqueCode();
        LocalDateTime expiresAt = LocalDateTime.now().plusHours(invitationValidityHours);

        List<CoupleRoom> waitingRooms = coupleMemberRepository.findWaitingRoomsByUserId(
                userId,
                PageRequest.of(0, 1)
        );

        CoupleRoom waitingRoom;
        if (waitingRooms.isEmpty()) {
            waitingRoom = createWaitingRoom(userId, invitationCode, expiresAt);
        } else {
            waitingRoom = waitingRooms.get(0);
            waitingRoom.refreshInvitation(invitationCode, expiresAt);
        }

        return CoupleInvitationResponse.from(waitingRoom);
    }

    private CoupleRoom createWaitingRoom(
            Long userId,
            String invitationCode,
            LocalDateTime expiresAt
    ) {
        CoupleRoom room = coupleRoomRepository.save(
                CoupleRoom.waiting(invitationCode, expiresAt)
        );
        coupleMemberRepository.save(CoupleMember.active(userId, room.getId()));
        return room;
    }

    private String generateUniqueCode() {
        for (int attempt = 0; attempt < MAX_CODE_GENERATION_ATTEMPTS; attempt++) {
            String code = invitationCodeGenerator.generate();
            if (!coupleRoomRepository.existsByRoomCode(code)) {
                return code;
            }
        }
        throw new CustomException(ErrorCode.INVITATION_CODE_GENERATION_FAILED);
    }
}
