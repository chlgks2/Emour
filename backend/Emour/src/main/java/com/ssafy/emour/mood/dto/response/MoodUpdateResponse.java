package com.ssafy.emour.mood.dto.response;

import com.ssafy.emour.mood.entity.Mood;
import com.ssafy.emour.mood.entity.MoodType;

import java.time.LocalDateTime;

public record MoodUpdateResponse(
        Long moodId,
        Long roomId,
        Long userId,
        LocalDateTime moodDatetime,
        MoodType moodType,
        String reason,
        LocalDateTime updatedAt
) {
    public static MoodUpdateResponse from(Mood mood) {
        return new MoodUpdateResponse(
                mood.getId(),
                mood.getRoomId(),
                mood.getUserId(),
                mood.getMoodDatetime(),
                mood.getMoodType(),
                mood.getReason(),
                mood.getUpdatedAt()
        );
    }
}
