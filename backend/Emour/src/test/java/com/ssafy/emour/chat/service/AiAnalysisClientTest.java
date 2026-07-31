package com.ssafy.emour.chat.service;

import com.ssafy.emour.chat.dto.AiAnalyzeRequest;
import com.ssafy.emour.chat.dto.AiContextMessage;
import com.ssafy.emour.chat.dto.AiEmotionResult;
import com.ssafy.emour.chat.dto.AiTargetMessage;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.content;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

class AiAnalysisClientTest {

    // 설정된 주소의 /analyze로 약속한 JSON 형식을 전송하고 응답을 읽습니다.
    @Test
    void sendsAnalyzeRequest() {
        RestClient.Builder builder = RestClient.builder();
        MockRestServiceServer server = MockRestServiceServer
                .bindTo(builder)
                .build();
        AiAnalysisClient client = new AiAnalysisClient(
                builder,
                "http://localhost:8000"
        );
        server.expect(requestTo("http://localhost:8000/analyze"))
                .andExpect(content().json("""
                        {
                          "context": [
                            {"speaker": "A", "text": "안녕"}
                          ],
                          "target": [
                            {
                              "message_id": 101,
                              "speaker": "B",
                              "text": "오늘 뭐해?"
                            }
                          ]
                        }
                        """))
                .andRespond(withSuccess(
                        """
                                {
                                  "101": {"emotion": "기쁨"}
                                }
                                """,
                        MediaType.APPLICATION_JSON
                ));

        Map<String, AiEmotionResult> response = client.analyze(
                new AiAnalyzeRequest(
                        List.of(new AiContextMessage("A", "안녕")),
                        List.of(new AiTargetMessage(
                                101L,
                                "B",
                                "오늘 뭐해?"
                        ))
                )
        );

        assertThat(response.get("101").emotion()).isEqualTo("기쁨");
        server.verify();
    }
}
