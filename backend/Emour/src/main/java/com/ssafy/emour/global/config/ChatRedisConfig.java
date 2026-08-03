package com.ssafy.emour.global.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.ssafy.emour.chat.messaging.ChatRedisSubscriber;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.listener.ChannelTopic;
import org.springframework.data.redis.listener.RedisMessageListenerContainer;

@Configuration
public class ChatRedisConfig {

    @Bean
    public ObjectMapper chatRedisObjectMapper() {
        /*
         * Spring Boot 4는 Jackson 3를 기본으로 사용합니다.
         * 채팅 Redis 코드는 Jackson 2 타입을 사용하므로 전용 Bean을 직접 등록합니다.
         */
        return new ObjectMapper()
                .findAndRegisterModules()
                .disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);
    }

    @Bean
    @ConditionalOnProperty(
            name = "chat.redis.enabled",
            havingValue = "true",
            matchIfMissing = true
    )
    public RedisMessageListenerContainer chatRedisMessageListenerContainer(
            RedisConnectionFactory connectionFactory,
            ChatRedisSubscriber subscriber,
            @Value("${chat.redis.channel:emour:chat:events}") String channel
    ) {
        RedisMessageListenerContainer container =
                new RedisMessageListenerContainer();
        container.setConnectionFactory(connectionFactory);

        // 모든 백엔드 서버가 같은 Redis 채널을 듣도록 등록합니다.
        container.addMessageListener(subscriber, new ChannelTopic(channel));
        return container;
    }
}
