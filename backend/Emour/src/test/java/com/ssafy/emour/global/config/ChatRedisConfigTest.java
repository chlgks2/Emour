package com.ssafy.emour.global.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

class ChatRedisConfigTest {

    @Test
    void providesJacksonMapperForRedisEvents() throws Exception {
        ObjectMapper objectMapper =
                new ChatRedisConfig().chatRedisObjectMapper();

        String json = objectMapper.writeValueAsString(Map.of(
                "sentAt",
                LocalDateTime.of(2026, 8, 3, 12, 30)
        ));

        assertThat(json).contains("2026-08-03T12:30:00");
    }
}
