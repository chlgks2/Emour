package com.ssafy.emour.home.dto.request;

import com.ssafy.emour.home.entity.HomeTextAlignment;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;

public record HomeSettingUpdateRequest(
        @Size(max = 100, message = "홈 문구는 100자 이하여야 합니다.")
        String textContent,

        @NotNull(message = "문구의 가로 위치가 필요합니다.")
        @DecimalMin(value = "0.00", message = "가로 위치는 0 이상이어야 합니다.")
        @DecimalMax(value = "100.00", message = "가로 위치는 100 이하여야 합니다.")
        BigDecimal textPositionX,

        @NotNull(message = "문구의 세로 위치가 필요합니다.")
        @DecimalMin(value = "0.00", message = "세로 위치는 0 이상이어야 합니다.")
        @DecimalMax(value = "100.00", message = "세로 위치는 100 이하여야 합니다.")
        BigDecimal textPositionY,

        @NotNull(message = "문구 크기가 필요합니다.")
        @Min(value = 10, message = "문구 크기는 10 이상이어야 합니다.")
        @Max(value = 48, message = "문구 크기는 48 이하여야 합니다.")
        Integer textSize,

        @NotNull(message = "문구 정렬이 필요합니다.")
        HomeTextAlignment textAlignment,

        @NotNull(message = "문구 배경 투명도가 필요합니다.")
        @Min(value = 0, message = "배경 투명도는 0 이상이어야 합니다.")
        @Max(value = 100, message = "배경 투명도는 100 이하여야 합니다.")
        Integer backgroundTransparency,

        @NotBlank(message = "문구 색상이 필요합니다.")
        @Size(max = 100, message = "문구 색상은 100자 이하여야 합니다.")
        @Pattern(
                regexp = "(?i)^rgb\\(\\s*\\d{1,3}\\s*,\\s*\\d{1,3}\\s*,\\s*\\d{1,3}\\s*\\)$",
                message = "문구 색상은 rgb(255, 255, 255) 형식이어야 합니다."
        )
        String textColor
) {
}
