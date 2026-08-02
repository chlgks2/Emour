package com.ssafy.emour.couple.dto.response;

import com.ssafy.emour.couple.entity.CoupleRoom;

import java.time.LocalDate;
import java.util.List;

public record CoupleStartDateResponse(
        Long roomId,
        LocalDate datingStartDate,
        List<CoupleMilestoneResponse> milestones
) {
    private static final List<Integer> MILESTONE_DAYS =
            List.of(100, 200, 500);

    public static CoupleStartDateResponse from(CoupleRoom room) {
        LocalDate startDate = room.getDatingStartDate();
        List<CoupleMilestoneResponse> milestones = MILESTONE_DAYS.stream()
                .map(days -> CoupleMilestoneResponse.from(startDate, days))
                .toList();

        return new CoupleStartDateResponse(
                room.getId(),
                startDate,
                milestones
        );
    }
}
