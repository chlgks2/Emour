package com.ssafy.emour.couple.service;

import com.ssafy.emour.couple.dto.request.CoupleConnectRequest;
import com.ssafy.emour.couple.dto.request.CoupleReconnectRequest;
import com.ssafy.emour.couple.dto.request.CoupleStartDateRequest;
import com.ssafy.emour.couple.dto.response.CoupleConnectResponse;
import com.ssafy.emour.couple.dto.response.CoupleDisconnectResponse;
import com.ssafy.emour.couple.dto.response.CoupleInvitationResponse;
import com.ssafy.emour.couple.dto.response.CoupleStatusResponse;
import com.ssafy.emour.couple.dto.response.CoupleStartDateResponse;
import com.ssafy.emour.couple.entity.CoupleMember;
import com.ssafy.emour.couple.entity.CoupleMemberId;
import com.ssafy.emour.couple.entity.CoupleMemberStatus;
import com.ssafy.emour.couple.entity.CoupleRoom;
import com.ssafy.emour.couple.entity.CoupleRoomStatus;
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
import java.util.Locale;

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

        List<CoupleRoom> waitingRooms = coupleMemberRepository.findWaitingRoomsByUserId(
                userId,
                PageRequest.of(0, 1)
        );

        LocalDateTime currentTime = LocalDateTime.now();
        if (!waitingRooms.isEmpty()) {
            CoupleRoom waitingRoom = waitingRooms.get(0);
            if (waitingRoom.hasValidInvitationAt(currentTime)) {
                return CoupleInvitationResponse.from(waitingRoom);
            }

            waitingRoom.refreshInvitation(
                    generateUniqueCode(),
                    currentTime.plusHours(invitationValidityHours)
            );
            return CoupleInvitationResponse.from(waitingRoom);
        }

        CoupleRoom waitingRoom = createWaitingRoom(
                userId,
                generateUniqueCode(),
                currentTime.plusHours(invitationValidityHours)
        );
        return CoupleInvitationResponse.from(waitingRoom);
    }

    @Transactional
    public CoupleConnectResponse connect(Long userId, CoupleConnectRequest request) {
        memberRepository.findByIdForUpdate(userId)
                .orElseThrow(() -> new CustomException(ErrorCode.USER_NOT_FOUND));

        if (coupleMemberRepository.existsActiveCoupleByUserId(userId)) {
            throw new CustomException(ErrorCode.ALREADY_COUPLED);
        }

        String invitationCode = normalizeInvitationCode(request.invitationCode());
        CoupleRoom room = coupleRoomRepository.findByRoomCodeForUpdate(invitationCode)
                .orElseThrow(() -> new CustomException(ErrorCode.INVITATION_CODE_NOT_FOUND));

        validateInvitation(room, userId);

        coupleMemberRepository.save(CoupleMember.active(userId, room.getId()));
        room.activate();

        return CoupleConnectResponse.from(room);
    }

    @Transactional
    public CoupleConnectResponse reconnect(
            Long userId,
            CoupleReconnectRequest request
    ) {
        memberRepository.findByIdForUpdate(userId)
                .orElseThrow(() -> new CustomException(ErrorCode.USER_NOT_FOUND));

        if (coupleMemberRepository.existsActiveCoupleByUserId(userId)) {
            throw new CustomException(ErrorCode.ALREADY_COUPLED);
        }

        String invitationCode = normalizeInvitationCode(
                request.invitationCode()
        );
        CoupleRoom room = coupleRoomRepository
                .findByRoomCodeForUpdate(invitationCode)
                .orElseThrow(() -> new CustomException(
                        ErrorCode.INVITATION_CODE_NOT_FOUND
                ));

        if (room.getStatus() != CoupleRoomStatus.INACTIVE) {
            throw new CustomException(ErrorCode.RECONNECT_NOT_AVAILABLE);
        }

        CoupleMember member = coupleMemberRepository.findById(
                        new CoupleMemberId(userId, room.getId())
                )
                .orElseThrow(() -> new CustomException(
                        ErrorCode.RECONNECT_NOT_AVAILABLE
                ));
        if (member.getStatus() != CoupleMemberStatus.LEFT) {
            throw new CustomException(ErrorCode.RECONNECT_NOT_AVAILABLE);
        }

        long remainingMemberCount =
                coupleMemberRepository.countByIdRoomIdAndStatus(
                        room.getId(),
                        CoupleMemberStatus.ACTIVE
                );
        if (remainingMemberCount != 1) {
            throw new CustomException(ErrorCode.RECONNECT_NOT_AVAILABLE);
        }

        member.reconnect();
        room.reconnect();
        return CoupleConnectResponse.from(room);
    }

    @Transactional
    public CoupleStartDateResponse updateStartDate(
            Long userId,
            CoupleStartDateRequest request
    ) {
        memberRepository.findByIdForUpdate(userId)
                .orElseThrow(() -> new CustomException(ErrorCode.USER_NOT_FOUND));

        CoupleRoom room = coupleRoomRepository
                .findActiveRoomByUserIdForUpdate(userId)
                .orElseThrow(() -> new CustomException(
                        ErrorCode.ACTIVE_COUPLE_NOT_FOUND
                ));

        room.updateDatingStartDate(request.startDate());
        return CoupleStartDateResponse.from(room);
    }

    @Transactional(readOnly = true)
    public CoupleStatusResponse getStatus(Long userId) {
        if (!memberRepository.existsById(userId)) {
            throw new CustomException(ErrorCode.USER_NOT_FOUND);
        }

        List<CoupleRoom> currentRooms = coupleRoomRepository.findCurrentRoomsByUserId(
                userId,
                PageRequest.of(0, 1)
        );

        if (currentRooms.isEmpty()) {
            throw new CustomException(ErrorCode.ACTIVE_COUPLE_NOT_FOUND);
        }

        return CoupleStatusResponse.from(currentRooms.get(0));
    }

    @Transactional(readOnly = true)
    public Long getCurrentRoomId(Long userId) {
        List<Long> roomIds = coupleMemberRepository.findCurrentRoomIdsByUserId(
                userId,
                LocalDateTime.now(),
                PageRequest.of(0, 1)
        );
        if (roomIds.isEmpty()) {
            throw new CustomException(ErrorCode.ACTIVE_COUPLE_NOT_FOUND);
        }
        return roomIds.get(0);
    }

    @Transactional
    public CoupleDisconnectResponse disconnect(Long userId) {
        memberRepository.findByIdForUpdate(userId)
                .orElseThrow(() -> new CustomException(ErrorCode.USER_NOT_FOUND));

        CoupleRoom room = findRoomToLeave(userId);

        CoupleMember member = coupleMemberRepository.findById(
                        new CoupleMemberId(userId, room.getId())
                )
                .orElseThrow(() -> new CustomException(ErrorCode.ACTIVE_COUPLE_NOT_FOUND));

        LocalDateTime disconnectedAt = LocalDateTime.now();
        long activeMemberCount = coupleMemberRepository.countByIdRoomIdAndStatus(
                room.getId(),
                CoupleMemberStatus.ACTIVE
        );

        if (activeMemberCount < 1 || activeMemberCount > 2) {
            throw new CustomException(ErrorCode.INTERNAL_ERROR);
        }

        member.leave(disconnectedAt);

        if (activeMemberCount == 2) {
            room.deactivate();
            return CoupleDisconnectResponse.of(room, disconnectedAt, false);
        }

        coupleRoomRepository.delete(room);
        return CoupleDisconnectResponse.of(room, disconnectedAt, true);
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

    private CoupleRoom findRoomToLeave(Long userId) {
        return coupleRoomRepository.findActiveRoomByUserIdForUpdate(userId)
                .orElseGet(() -> {
                    List<CoupleRoom> waitingRooms =
                            coupleRoomRepository.findWaitingRoomsByUserIdForUpdate(
                                    userId,
                                    PageRequest.of(0, 1)
                            );
                    if (!waitingRooms.isEmpty()) {
                        return waitingRooms.get(0);
                    }

                    List<CoupleRoom> inactiveRooms =
                            coupleRoomRepository.findRetainedInactiveRoomsByUserIdForUpdate(
                                    userId,
                                    PageRequest.of(0, 1)
                            );
                    if (inactiveRooms.isEmpty()) {
                        throw new CustomException(ErrorCode.ACTIVE_COUPLE_NOT_FOUND);
                    }
                    return inactiveRooms.get(0);
                });
    }

    private String normalizeInvitationCode(String invitationCode) {
        return invitationCode.trim().toUpperCase(Locale.ROOT);
    }

    private void validateInvitation(CoupleRoom room, Long userId) {
        if (room.getStatus() != CoupleRoomStatus.WAITING) {
            throw new CustomException(ErrorCode.INVITATION_CODE_NOT_AVAILABLE);
        }
        if (room.getRoomCodeExpiresAt() == null
                || !room.getRoomCodeExpiresAt().isAfter(LocalDateTime.now())) {
            throw new CustomException(ErrorCode.INVITATION_CODE_EXPIRED);
        }
        if (coupleMemberRepository.existsById(
                new CoupleMemberId(userId, room.getId())
        )) {
            throw new CustomException(ErrorCode.CANNOT_USE_OWN_INVITATION);
        }
        long activeMemberCount = coupleMemberRepository.countByIdRoomIdAndStatus(
                room.getId(),
                CoupleMemberStatus.ACTIVE
        );
        if (activeMemberCount != 1) {
            throw new CustomException(ErrorCode.INVITATION_CODE_NOT_AVAILABLE);
        }
    }
}
