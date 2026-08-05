package com.ssafy.emour.chat.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record ChatSuggestionRequest(
        @NotNull(message = "메시지 번호는 꼭 필요합니다.")
        Long messageId,

        @NotBlank(message = "추천받을 문장을 입력해 주세요.")
        @Size(max = 2000, message = "추천받을 문장은 2000자까지 입력할 수 있습니다.")
        String targetMessage
) {
}
