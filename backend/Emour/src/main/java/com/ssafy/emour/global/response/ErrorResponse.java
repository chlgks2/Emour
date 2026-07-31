package com.ssafy.emour.global.response;

import io.swagger.v3.oas.annotations.media.Schema;

import java.time.LocalDateTime;

@Schema(description = "API 오류 응답")
public record ErrorResponse(
        @Schema(
                description = "사용자에게 보여줄 수 있는 오류 내용",
                example = "해당 채팅방에 참여 중인 사용자가 아닙니다."
        )
        String message,

        @Schema(description = "오류가 발생한 시각")
        LocalDateTime timestamp
) {
    public static ErrorResponse of(String message) {
        return new ErrorResponse(message, LocalDateTime.now());
    }
}
