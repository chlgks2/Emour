package com.ssafy.emour.chat.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

public record AiSuggestionHistory(
        @JsonProperty("speaker_id")
        String speakerId,

        String text
) {
}
