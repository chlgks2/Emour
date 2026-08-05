package com.ssafy.emour.chat.entity;

import org.junit.jupiter.api.Test;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

class EmotionTypeTest {

    @Test
    void mapsAllFifteenAiLabelsToDistinctEmotionTypes() {
        Map<String, EmotionType> labels = Map.ofEntries(
                Map.entry("기쁨", EmotionType.JOY),
                Map.entry("설렘", EmotionType.EXCITEMENT),
                Map.entry("편안", EmotionType.COMFORT),
                Map.entry("걱정", EmotionType.WORRY),
                Map.entry("놀람", EmotionType.SURPRISE),
                Map.entry("평범", EmotionType.NEUTRAL),
                Map.entry("부끄러움", EmotionType.SHYNESS),
                Map.entry("궁금", EmotionType.CURIOSITY),
                Map.entry("슬픔", EmotionType.SADNESS),
                Map.entry("화남", EmotionType.ANGER),
                Map.entry("당황", EmotionType.EMBARRASSMENT),
                Map.entry("힘듦", EmotionType.DISTRESS),
                Map.entry("고마움", EmotionType.GRATITUDE),
                Map.entry("미안함", EmotionType.APOLOGY),
                Map.entry("서운함", EmotionType.HURT)
        );

        assertThat(EmotionType.values()).hasSize(15);
        assertThat(labels.keySet())
                .extracting(EmotionType::fromStoredValue)
                .containsExactlyInAnyOrderElementsOf(labels.values());
        assertThat(labels.values()).doesNotHaveDuplicates();
    }

    @Test
    void keepsShynessAndEmbarrassmentSeparate() {
        assertThat(EmotionType.fromStoredValue("부끄러움"))
                .isEqualTo(EmotionType.SHYNESS);
        assertThat(EmotionType.fromStoredValue("당황"))
                .isEqualTo(EmotionType.EMBARRASSMENT);
        assertThat(EmotionType.SHYNESS.getPolarity())
                .isEqualTo(EmotionPolarity.NEUTRAL);
        assertThat(EmotionType.EMBARRASSMENT.getPolarity())
                .isEqualTo(EmotionPolarity.NEGATIVE);
    }

    @Test
    void mapsLegacyConfusionToEmbarrassment() {
        assertThat(EmotionType.fromStoredValue("CONFUSION"))
                .isEqualTo(EmotionType.EMBARRASSMENT);
        assertThat(EmotionType.fromStoredValue("혼란"))
                .isEqualTo(EmotionType.EMBARRASSMENT);
    }
}
