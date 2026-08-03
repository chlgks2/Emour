package com.ssafy.emour.mood.dto.response;

import com.ssafy.emour.mood.entity.Mood;
import com.ssafy.emour.mood.entity.MoodType;

import java.time.LocalDateTime;

public record MoodResponse(
        Long moodId,
        Long roomId,
        Long userId,
        LocalDateTime moodDatetime,
        MoodType moodType,
        String reason,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {
    public static MoodResponse from(Mood mood) {
        return new MoodResponse(
                mood.getId(),
                mood.getRoomId(),
                mood.getUserId(),
                mood.getMoodDatetime(),
                mood.getMoodType(),
                mood.getReason(),
                mood.getCreatedAt(),
                mood.getUpdatedAt()
        );
    }
}
