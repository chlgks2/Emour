package com.ssafy.emour.mood.dto.request;

import com.ssafy.emour.mood.entity.MoodType;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record MoodUpdateRequest(

        @NotNull(message = "기분은 필수입니다.")
        MoodType moodType,

        @Size(max = 100, message = "기분 사유는 100자 이하여야 합니다.")
        String reason
) {
    public MoodUpdateRequest(MoodType moodType) {
        this(moodType, null);
    }
}
