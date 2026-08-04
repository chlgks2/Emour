package com.ssafy.emour.home.dto.request;

import com.ssafy.emour.home.entity.HomeBackgroundStyle;
import com.ssafy.emour.home.entity.HomeTextAlignment;
import com.ssafy.emour.home.entity.HomeTextColor;
import com.ssafy.emour.home.entity.HomeTextSize;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
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
        HomeTextSize textSize,

        @NotNull(message = "문구 정렬이 필요합니다.")
        HomeTextAlignment textAlignment,

        @NotNull(message = "문구 배경 스타일이 필요합니다.")
        HomeBackgroundStyle backgroundStyle,

        @NotNull(message = "문구 색상이 필요합니다.")
        HomeTextColor textColor
) {
}
