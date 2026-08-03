package com.ssafy.emour.chat.messaging;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.data.redis.connection.Message;
import org.springframework.messaging.simp.SimpMessagingTemplate;

import java.nio.charset.StandardCharsets;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class ChatRedisSubscriberTest {

    private final ObjectMapper objectMapper =
            new ObjectMapper().findAndRegisterModules();
    private final SimpMessagingTemplate messagingTemplate =
            mock(SimpMessagingTemplate.class);
    private final ChatRedisSubscriber subscriber =
            new ChatRedisSubscriber(objectMapper, messagingTemplate);

    @Test
    void forwardsRedisEventToWebSocketSubscribers() {
        Message message = redisMessage("""
                {
                  "destination": "/sub/chat/rooms/2/messages",
                  "payload": {"messageId": 101}
                }
                """);

        subscriber.onMessage(message, null);

        verify(messagingTemplate).convertAndSend(
                eq("/sub/chat/rooms/2/messages"),
                eq("{\"messageId\":101}")
        );
    }

    @Test
    void ignoresUnknownDestination() {
        Message message = redisMessage("""
                {
                  "destination": "/sub/admin",
                  "payload": {"messageId": 101}
                }
                """);

        subscriber.onMessage(message, null);

        verify(messagingTemplate, never())
                .convertAndSend(any(String.class), any(Object.class));
    }

    @Test
    void forwardsImageDeletionEvent() {
        Message message = redisMessage("""
                {
                  "destination": "/sub/chat/rooms/2/image-deletions",
                  "payload": {"imageId": 10}
                }
                """);

        subscriber.onMessage(message, null);

        verify(messagingTemplate).convertAndSend(
                eq("/sub/chat/rooms/2/image-deletions"),
                eq("{\"imageId\":10}")
        );
    }

    private Message redisMessage(String json) {
        Message message = mock(Message.class);
        when(message.getBody()).thenReturn(
                json.getBytes(StandardCharsets.UTF_8)
        );
        return message;
    }
}
