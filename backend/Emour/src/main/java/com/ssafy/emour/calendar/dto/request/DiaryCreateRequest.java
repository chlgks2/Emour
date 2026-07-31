package com.ssafy.emour.calendar.dto.request;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record DiaryCreateRequest(
        @Schema(example = "오늘 함께 산책해서 행복했다.")
        @NotBlank @Size(max = 100) String content
) {
}
