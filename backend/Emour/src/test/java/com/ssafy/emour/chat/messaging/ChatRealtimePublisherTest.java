package com.ssafy.emour.chat.messaging;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.data.redis.core.StringRedisTemplate;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;

class ChatRealtimePublisherTest {

    private final StringRedisTemplate redisTemplate =
            mock(StringRedisTemplate.class);
    private final ObjectMapper objectMapper =
            new ObjectMapper().findAndRegisterModules();

    @Test
    void publishesMessageToRedis() throws Exception {
        ChatRealtimePublisher publisher = new ChatRealtimePublisher(
                redisTemplate,
                objectMapper,
                "emour:chat:events"
        );

        publisher.publishMessage(2L, Map.of("messageId", 101L));

        ArgumentCaptor<String> jsonCaptor =
                ArgumentCaptor.forClass(String.class);
        verify(redisTemplate).convertAndSend(
                org.mockito.ArgumentMatchers.eq("emour:chat:events"),
                jsonCaptor.capture()
        );

        JsonNode event = objectMapper.readTree(jsonCaptor.getValue());
        assertThat(event.get("destination").asText())
                .isEqualTo("/sub/chat/rooms/2/messages");
        assertThat(event.get("payload").get("messageId").asLong())
                .isEqualTo(101L);
    }

    @Test
    void publishesImageDeletionToRedis() throws Exception {
        ChatRealtimePublisher publisher = new ChatRealtimePublisher(
                redisTemplate,
                objectMapper,
                "emour:chat:events"
        );

        publisher.publishImageDeletion(2L, Map.of("imageId", 10L));

        ArgumentCaptor<String> jsonCaptor =
                ArgumentCaptor.forClass(String.class);
        verify(redisTemplate).convertAndSend(
                org.mockito.ArgumentMatchers.eq("emour:chat:events"),
                jsonCaptor.capture()
        );

        JsonNode event = objectMapper.readTree(jsonCaptor.getValue());
        assertThat(event.get("destination").asText())
                .isEqualTo("/sub/chat/rooms/2/image-deletions");
        assertThat(event.get("payload").get("imageId").asLong())
                .isEqualTo(10L);
    }
}
