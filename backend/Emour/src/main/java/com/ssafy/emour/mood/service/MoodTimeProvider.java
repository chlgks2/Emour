package com.ssafy.emour.mood.service;

import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.time.ZoneId;

@Component
public class MoodTimeProvider {

    private static final ZoneId SERVICE_ZONE = ZoneId.of("Asia/Seoul");

    public LocalDateTime now() {
        return LocalDateTime.now(SERVICE_ZONE);
    }
}
