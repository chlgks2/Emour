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
                mood.getCreatedAt(),
                mood.getUpdatedAt()
        );
    }
}
