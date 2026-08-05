package com.ssafy.emour.couple.dto.response;

import com.ssafy.emour.couple.entity.CoupleRoom;
import com.ssafy.emour.couple.entity.CoupleRoomStatus;

public record CoupleConnectResponse(
        Long roomId,
        CoupleRoomStatus status
) {
    public static CoupleConnectResponse from(CoupleRoom room) {
        return new CoupleConnectResponse(
                room.getId(),
                room.getStatus()
        );
    }
}
