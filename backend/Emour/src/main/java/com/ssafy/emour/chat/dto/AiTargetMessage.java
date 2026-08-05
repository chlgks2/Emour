package com.ssafy.emour.chat.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

public record AiTargetMessage(
        @JsonProperty("message_id")
        Long messageId,
        String speaker,
        String text
) {
}
