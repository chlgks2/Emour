package com.ssafy.emour.global.config;

import com.ssafy.emour.chat.messaging.ChatRedisSubscriber;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.listener.ChannelTopic;
import org.springframework.data.redis.listener.RedisMessageListenerContainer;

@Configuration
public class ChatRedisConfig {

    @Bean
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
