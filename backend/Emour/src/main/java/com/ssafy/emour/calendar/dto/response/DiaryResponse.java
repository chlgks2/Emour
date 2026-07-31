package com.ssafy.emour.calendar.dto.response;

import com.ssafy.emour.calendar.entity.Diary;

import java.time.LocalDate;
import java.time.LocalDateTime;

public record DiaryResponse(
        Long diaryId,
        Long coupleRoomId,
        Long userId,
        LocalDate date,
        String content,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {
    public static DiaryResponse from(Diary diary) {
        return new DiaryResponse(
                diary.getId(),
                diary.getRoomId(),
                diary.getUserId(),
                diary.getDiaryDate(),
                diary.getContent(),
                diary.getCreatedAt(),
                diary.getUpdatedAt()
        );
    }
}
