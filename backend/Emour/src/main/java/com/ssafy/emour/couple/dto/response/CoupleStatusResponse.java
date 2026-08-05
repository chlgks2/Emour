package com.ssafy.emour.couple.dto.response;

import com.ssafy.emour.couple.entity.CoupleRoom;
import com.ssafy.emour.couple.entity.CoupleRoomStatus;

public record CoupleStatusResponse(
        Long roomId,
        CoupleRoomStatus status
) {
    public static CoupleStatusResponse from(CoupleRoom room) {
        return new CoupleStatusResponse(
                room.getId(),
                room.getStatus()
        );
    }
}
