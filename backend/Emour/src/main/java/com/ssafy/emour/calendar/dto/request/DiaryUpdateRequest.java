package com.ssafy.emour.calendar.dto.request;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record DiaryUpdateRequest(
        @Schema(example = "오늘 함께 본 노을이 정말 아름다웠다.")
        @NotBlank @Size(max = 300) String content
) {
}
