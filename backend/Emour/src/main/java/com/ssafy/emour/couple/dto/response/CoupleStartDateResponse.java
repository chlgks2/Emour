package com.ssafy.emour.couple.dto.response;

import com.ssafy.emour.couple.entity.CoupleRoom;

import java.time.LocalDate;

public record CoupleStartDateResponse(
        Long roomId,
        LocalDate datingStartDate
) {
    public static CoupleStartDateResponse from(CoupleRoom room) {
        return new CoupleStartDateResponse(
                room.getId(),
                room.getDatingStartDate()
        );
    }
}
