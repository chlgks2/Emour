package com.ssafy.emour.mood.dto.request;

import com.ssafy.emour.mood.entity.MoodType;
import jakarta.validation.constraints.NotNull;

public record MoodCreateRequest(

        @NotNull(message = "기분은 필수입니다.")
        MoodType moodType
) {
}
