package com.ssafy.emour.chat.dto;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class ChatSuggestionRequestTest {

    @Test
    void ignoresLegacyMessageIdFromFrontend() throws Exception {
        ChatSuggestionRequest request = new ObjectMapper().readValue(
                """
                        {
                          "messageId": 101,
                          "targetMessage": "오늘 만날래?"
                        }
                        """,
                ChatSuggestionRequest.class
        );

        assertThat(request.targetMessage()).isEqualTo("오늘 만날래?");
    }
}
