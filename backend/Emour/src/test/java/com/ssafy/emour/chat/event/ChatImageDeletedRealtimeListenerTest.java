package com.ssafy.emour.chat.event;

import com.ssafy.emour.chat.dto.ChatImageDeleteResponse;
import com.ssafy.emour.chat.messaging.ChatRealtimePublisher;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;

class ChatImageDeletedRealtimeListenerTest {

    @Test
    void publishesDeletionAfterCommit() {
        ChatRealtimePublisher publisher = mock(ChatRealtimePublisher.class);
        ChatImageDeletedRealtimeListener listener =
                new ChatImageDeletedRealtimeListener(publisher);
        ChatImageDeleteResponse response = response();

        listener.publish(new ChatImageDeletedEvent(response));

        verify(publisher).publishImageDeletion(1L, response);
    }

    @Test
    void ignoresRedisFailureAfterDatabaseDeletion() {
        ChatRealtimePublisher publisher = mock(ChatRealtimePublisher.class);
        ChatImageDeletedRealtimeListener listener =
                new ChatImageDeletedRealtimeListener(publisher);
        ChatImageDeleteResponse response = response();
        doThrow(new IllegalStateException("Redis down"))
                .when(publisher)
                .publishImageDeletion(1L, response);

        assertThatCode(() -> listener.publish(
                new ChatImageDeletedEvent(response)
        )).doesNotThrowAnyException();
    }

    private ChatImageDeleteResponse response() {
        return new ChatImageDeleteResponse(
                1L,
                100L,
                10L,
                1,
                false,
                LocalDateTime.of(2026, 8, 3, 15, 30)
        );
    }
}
