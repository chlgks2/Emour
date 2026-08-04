package com.ssafy.emour.chat.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

import java.util.List;

public record AiSuggestionResponse(
        @JsonProperty("message_id")
        String messageId,

        List<AiSuggestionItem> suggestions,

        boolean blocked,

        @JsonProperty("block_reason")
        String blockReason
) {
    /** 차단된 요청에서는 AI가 문장을 반환해도 프런트에 전달하지 않습니다. */
    public AiSuggestionResponse withoutBlockedSuggestions() {
        if (!blocked) {
            return this;
        }
        return new AiSuggestionResponse(
                messageId,
                List.of(),
                true,
                blockReason
        );
    }
}
