package com.ssafy.emour.chat.entity;

import java.util.Locale;

public enum EmotionType {

    JOY("기쁨", EmotionPolarity.POSITIVE),
    EXCITEMENT("설렘", EmotionPolarity.POSITIVE),
    COMFORT("편안함", EmotionPolarity.POSITIVE),

    WORRY("걱정", EmotionPolarity.NEUTRAL),
    SURPRISE("놀람", EmotionPolarity.NEUTRAL),
    NEUTRAL("평범", EmotionPolarity.NEUTRAL),
    EMBARRASSMENT("당황", EmotionPolarity.NEUTRAL),
    CURIOSITY("궁금함", EmotionPolarity.NEUTRAL),

    SADNESS("슬픔", EmotionPolarity.NEGATIVE),
    ANGER("화남", EmotionPolarity.NEGATIVE),
    CONFUSION("혼란", EmotionPolarity.NEGATIVE),
    DISTRESS("괴로움", EmotionPolarity.NEGATIVE),

    GRATITUDE("감사", EmotionPolarity.POSITIVE),
    APOLOGY("사과", EmotionPolarity.NEUTRAL),
    HURT("상처", EmotionPolarity.NEGATIVE);

    private final String koreanLabel;
    private final EmotionPolarity polarity;

    EmotionType(
            String koreanLabel,
            EmotionPolarity polarity
    ) {
        this.koreanLabel = koreanLabel;
        this.polarity = polarity;
    }

    public String getKoreanLabel() {
        return koreanLabel;
    }

    public EmotionPolarity getPolarity() {
        return polarity;
    }

    public static EmotionType fromStoredValue(String value) {
        if (value == null || value.isBlank()) {
            return NEUTRAL;
        }

        String normalized = value.trim().toUpperCase(Locale.ROOT);
        return switch (normalized) {
            case "기쁨" -> JOY;
            case "설렘" -> EXCITEMENT;
            case "편안함", "편안" -> COMFORT;
            case "걱정", "불안", "ANXIETY" -> WORRY;
            case "놀람" -> SURPRISE;
            case "평범", "지루함", "BOREDOM" -> NEUTRAL;
            case "당황" -> EMBARRASSMENT;
            case "궁금함" -> CURIOSITY;
            case "슬픔" -> SADNESS;
            case "화남", "짜증", "ANNOYANCE" -> ANGER;
            case "혼란" -> CONFUSION;
            case "괴로움" -> DISTRESS;
            case "감사" -> GRATITUDE;
            case "사과" -> APOLOGY;
            case "상처" -> HURT;
            default -> findEnglishType(normalized);
        };
    }

    private static EmotionType findEnglishType(String value) {
        try {
            return EmotionType.valueOf(value);
        } catch (IllegalArgumentException exception) {
            // 분석 결과가 계약에 없는 값이면 안전값인 평범으로 처리합니다.
            return NEUTRAL;
        }
    }
}
