package com.ssafy.emour.couple.dto.response;

import java.time.LocalDate;

public record CoupleMilestoneResponse(
        int days,
        LocalDate date
) {
    public static CoupleMilestoneResponse from(
            LocalDate startDate,
            int days
    ) {
        return new CoupleMilestoneResponse(
                days,
                startDate.plusDays(days - 1L)
        );
    }
}
