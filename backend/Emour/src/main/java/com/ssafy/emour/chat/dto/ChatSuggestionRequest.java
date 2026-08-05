package com.ssafy.emour.chat.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

@JsonIgnoreProperties(ignoreUnknown = true)
public record ChatSuggestionRequest(
        @NotBlank(message = "추천받을 문장을 입력해 주세요.")
        @Size(max = 2000, message = "추천받을 문장은 2000자까지 입력할 수 있습니다.")
        String targetMessage
) {
}
