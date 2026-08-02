package com.ssafy.emour.chat.messaging;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;

@Component
public class ChatRealtimePublisher {

    private final StringRedisTemplate redisTemplate;
    private final ObjectMapper objectMapper;

    private final String channel;

    public ChatRealtimePublisher(
            StringRedisTemplate redisTemplate,
            ObjectMapper objectMapper,
            @Value("${chat.redis.channel:emour:chat:events}") String channel
    ) {
        this.redisTemplate = redisTemplate;
        this.objectMapper = objectMapper;
        this.channel = channel;
    }

    public void publishMessage(Long roomId, Object payload) {
        publish(roomDestination(roomId, "messages"), payload);
    }

    public void publishRead(Long roomId, Object payload) {
        publish(roomDestination(roomId, "read"), payload);
    }

    public void publishReaction(Long roomId, Object payload) {
        publish(roomDestination(roomId, "reactions"), payload);
    }

    public void publishAnalysis(Long roomId, Object payload) {
        publish(roomDestination(roomId, "analysis"), payload);
    }

    private void publish(String destination, Object payload) {
        try {
            // Java 객체를 JSON으로 바꿔 Redis 채널에 한 번만 발행합니다.
            JsonNode payloadNode = objectMapper.valueToTree(payload);
            String eventJson = objectMapper.writeValueAsString(
                    new ChatRedisEvent(destination, payloadNode)
            );
            redisTemplate.convertAndSend(channel, eventJson);
        } catch (JsonProcessingException exception) {
            throw new IllegalStateException("채팅 실시간 이벤트를 만들 수 없습니다.", exception);
        }
    }

    private String roomDestination(Long roomId, String eventName) {
        if (roomId == null) {
            throw new IllegalArgumentException("채팅방 번호가 필요합니다.");
        }
        return "/sub/chat/rooms/" + roomId + "/" + eventName;
    }
}
