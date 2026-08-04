package com.ssafy.emour.chat.service;

import com.ssafy.emour.chat.dto.AiSuggestionRequest;
import com.ssafy.emour.chat.dto.AiSuggestionResponse;
import com.ssafy.emour.global.exception.CustomException;
import com.ssafy.emour.global.exception.ErrorCode;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import java.time.Duration;

@Component
public class AiSuggestionClient {

    private final RestClient restClient;

    @Autowired
    public AiSuggestionClient(
            @Value("${ai.service.url}") String aiServiceUrl
    ) {
        this(createBuilder(), aiServiceUrl);
    }

    AiSuggestionClient(
            RestClient.Builder builder,
            String aiServiceUrl
    ) {
        this.restClient = builder
                .baseUrl(aiServiceUrl)
                .build();
    }

    public AiSuggestionResponse suggest(AiSuggestionRequest request) {
        try {
            AiSuggestionResponse response = restClient.post()
                    .uri("/v1/messages/suggest")
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(request)
                    .retrieve()
                    .body(AiSuggestionResponse.class);

            if (response == null) {
                throw new CustomException(ErrorCode.AI_SERVICE_ERROR);
            }
            return response;
        } catch (RestClientException exception) {
            throw new CustomException(ErrorCode.AI_SERVICE_ERROR);
        }
    }

    private static RestClient.Builder createBuilder() {
        SimpleClientHttpRequestFactory requestFactory =
                new SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout(Duration.ofSeconds(5));
        requestFactory.setReadTimeout(Duration.ofSeconds(30));
        return RestClient.builder().requestFactory(requestFactory);
    }
}
