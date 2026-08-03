package com.ssafy.emour.couple.dto.response;

import com.ssafy.emour.couple.entity.CoupleRoom;

import java.time.LocalDateTime;

public record CoupleInvitationResponse(
        Long roomId,
        String invitationCode,
        LocalDateTime expiresAt
) {
    public static CoupleInvitationResponse from(CoupleRoom room) {
        return new CoupleInvitationResponse(
                room.getId(),
                room.getRoomCode(),
                room.getRoomCodeExpiresAt()
        );
    }
}
