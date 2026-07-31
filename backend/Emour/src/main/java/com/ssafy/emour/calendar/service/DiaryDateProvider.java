package com.ssafy.emour.calendar.service;

import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.time.ZoneId;

@Component
public class DiaryDateProvider {

    private static final ZoneId KOREA_ZONE = ZoneId.of("Asia/Seoul");

    public LocalDate today() {
        return LocalDate.now(KOREA_ZONE);
    }
}
