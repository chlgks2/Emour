package com.ssafy.emour.chat.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

import java.util.List;

public record AiSuggestionRequest(
        @JsonProperty("speaker_id")
        String speakerId,

        @JsonProperty("target_message")
        String targetMessage,

        List<AiSuggestionHistory> history
) {
}
