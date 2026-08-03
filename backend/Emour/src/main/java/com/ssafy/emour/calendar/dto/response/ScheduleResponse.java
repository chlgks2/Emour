package com.ssafy.emour.calendar.dto.response;

import com.ssafy.emour.calendar.entity.CoupleSchedule;
import com.ssafy.emour.calendar.entity.ScheduleType;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

public record ScheduleResponse(
        Long scheduleId,
        Long roomId,
        Long creatorId,
        String name,
        String description,
        LocalDate scheduleDate,
        LocalTime scheduleTime,
        ScheduleType scheduleType,
        boolean yearlyRecurring,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {
    public static ScheduleResponse from(CoupleSchedule schedule) {
        return new ScheduleResponse(
                schedule.getId(),
                schedule.getRoomId(),
                schedule.getCreatorId(),
                schedule.getName(),
                schedule.getDescription(),
                schedule.getScheduleDate(),
                schedule.getScheduleTime(),
                schedule.getScheduleType(),
                schedule.isYearlyRecurring(),
                schedule.getCreatedAt(),
                schedule.getUpdatedAt()
        );
    }
}
