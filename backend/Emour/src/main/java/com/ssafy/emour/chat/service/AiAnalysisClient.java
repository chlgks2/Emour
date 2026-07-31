package com.ssafy.emour.chat.service;

import com.ssafy.emour.chat.dto.AiAnalyzeRequest;
import com.ssafy.emour.chat.dto.AiEmotionResult;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.time.Duration;
import java.util.Map;

@Component
public class AiAnalysisClient {

    private final RestClient restClient;

    @Autowired
    public AiAnalysisClient(
            @Value("${ai.service.url}") String aiServiceUrl
    ) {
        this(createLocalBuilder(), aiServiceUrl);
    }

    AiAnalysisClient(
            RestClient.Builder builder,
            String aiServiceUrl
    ) {
        this.restClient = builder
                .baseUrl(aiServiceUrl)
                .build();
    }

    public Map<String, AiEmotionResult> analyze(
            AiAnalyzeRequest request
    ) {
        // 설정된 AI 서버의 /analyze 주소로 채팅 문맥과 분석 대상을 보냅니다.
        Map<String, AiEmotionResult> response = restClient.post()
                .uri("/analyze")
                .contentType(MediaType.APPLICATION_JSON)
                .body(request)
                .retrieve()
                .body(new ParameterizedTypeReference<>() {
                });

        if (response == null) {
            throw new IllegalStateException("AI 감정 분석 응답이 비어 있습니다.");
        }
        return response;
    }

    private static RestClient.Builder createLocalBuilder() {
        SimpleClientHttpRequestFactory requestFactory =
                new SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout(Duration.ofSeconds(5));
        requestFactory.setReadTimeout(Duration.ofSeconds(30));
        return RestClient.builder()
                .requestFactory(requestFactory);
    }
}
