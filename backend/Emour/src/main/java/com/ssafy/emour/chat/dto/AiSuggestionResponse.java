package com.ssafy.emour.chat.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

import java.util.List;

public record AiSuggestionResponse(
        List<AiSuggestionItem> suggestions,

        boolean blocked,

        @JsonProperty("block_reason")
        String blockReason
) {
}
