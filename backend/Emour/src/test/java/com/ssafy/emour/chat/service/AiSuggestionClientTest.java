package com.ssafy.emour.chat.service;

import com.ssafy.emour.chat.dto.AiSuggestionHistory;
import com.ssafy.emour.chat.dto.AiSuggestionRequest;
import com.ssafy.emour.chat.dto.AiSuggestionResponse;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.content;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

class AiSuggestionClientTest {

    @Test
    void sendsSuggestionRequest() {
        RestClient.Builder builder = RestClient.builder();
        MockRestServiceServer server = MockRestServiceServer
                .bindTo(builder)
                .build();
        AiSuggestionClient client = new AiSuggestionClient(
                builder,
                "http://ai-test.invalid"
        );
        server.expect(requestTo(
                        "http://ai-test.invalid/v1/messages/suggest"
                ))
                .andExpect(content().json("""
                        {
                          "message_id": "request-101",
                          "speaker_id": "21",
                          "target_message": "오늘 만날래?",
                          "history": [
                            {"speaker_id": "22", "text": "오늘 시간 있어?"}
                          ]
                        }
                        """))
                .andRespond(withSuccess(
                        """
                                {
                                  "message_id": "request-101",
                                  "suggestions": [
                                    {
                                      "style": "gentle",
                                      "label": "상냥하게",
                                      "text": "오늘 만나도 괜찮을까?"
                                    }
                                  ],
                                  "blocked": false,
                                  "block_reason": null
                                }
                                """,
                        MediaType.APPLICATION_JSON
                ));

        AiSuggestionResponse response = client.suggest(
                new AiSuggestionRequest(
                        "request-101",
                        "21",
                        "오늘 만날래?",
                        List.of(new AiSuggestionHistory(
                                "22",
                                "오늘 시간 있어?"
                        ))
                )
        );

        assertThat(response.messageId()).isEqualTo("request-101");
        assertThat(response.suggestions()).hasSize(1);
        server.verify();
    }
}
