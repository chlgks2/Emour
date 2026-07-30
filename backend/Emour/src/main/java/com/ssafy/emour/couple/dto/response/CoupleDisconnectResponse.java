package com.ssafy.emour.couple.dto.response;

import com.ssafy.emour.couple.entity.CoupleRoom;
import com.ssafy.emour.couple.entity.CoupleRoomStatus;

import java.time.LocalDateTime;

public record CoupleDisconnectResponse(
        Long roomId,
        CoupleRoomStatus status,
        LocalDateTime disconnectedAt,
        boolean roomDeleted
) {
    public static CoupleDisconnectResponse of(
            CoupleRoom room,
            LocalDateTime disconnectedAt,
            boolean roomDeleted
    ) {
        return new CoupleDisconnectResponse(
                room.getId(),
                room.getStatus(),
                disconnectedAt,
                roomDeleted
        );
    }
}
