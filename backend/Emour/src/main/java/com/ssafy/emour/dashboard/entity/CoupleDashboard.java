package com.ssafy.emour.dashboard.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

/** 커플방 전체가 공유하는 대시보드 스냅샷입니다. */
@Entity
@Table(
        name = "couple_dashboard",
        uniqueConstraints = @UniqueConstraint(
                name = "uq_couple_dashboard_daily_room",
                columnNames = {"room_id", "summary_date"}
        )
)
public class CoupleDashboard {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "couple_dashboard_id")
    private Long dashboardId;

    @Column(name = "room_id", nullable = false)
    private Long roomId;

    @Column(name = "summary_date", nullable = false)
    private LocalDate summaryDate;

    @Column(name = "message_count", nullable = false)
    private int messageCount;

    @Column(name = "image_count", nullable = false)
    private int imageCount;

    @Column(name = "reaction_count", nullable = false)
    private int reactionCount;

    @Column(name = "emotion_summary", columnDefinition = "json")
    private String emotionSummary;

    @Column(name = "frequent_words", columnDefinition = "json")
    private String frequentWords;

    @Column(name = "average_response_seconds", precision = 12, scale = 2)
    private BigDecimal averageResponseSeconds;

    @Column(name = "busiest_hour")
    private Integer busiestHour;

    @Column(name = "conversation_frequency", columnDefinition = "json")
    private String conversationFrequency;

    @Column(name = "aggregated_until")
    private LocalDateTime aggregatedUntil;

    @Column(name = "finalized_until")
    private LocalDateTime finalizedUntil;

    @Column(name = "calculated_at", nullable = false)
    private LocalDateTime calculatedAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    protected CoupleDashboard() {
    }

    public static CoupleDashboard create(Long roomId, LocalDate summaryDate) {
        CoupleDashboard dashboard = new CoupleDashboard();
        dashboard.roomId = roomId;
        dashboard.summaryDate = summaryDate;
        dashboard.calculatedAt = LocalDateTime.now();
        dashboard.updatedAt = dashboard.calculatedAt;
        return dashboard;
    }

    public void applyHourlySnapshot(
            int messageCount,
            int imageCount,
            int reactionCount,
            String emotionSummary,
            String frequentWords,
            BigDecimal averageResponseSeconds,
            Integer busiestHour,
            String conversationFrequency,
            LocalDateTime snapshotUntil,
            boolean finalized,
            LocalDateTime calculatedAt
    ) {
        this.messageCount = messageCount;
        this.imageCount = imageCount;
        this.reactionCount = reactionCount;
        this.emotionSummary = emotionSummary;
        this.frequentWords = frequentWords;
        this.averageResponseSeconds = averageResponseSeconds;
        this.busiestHour = busiestHour;
        this.conversationFrequency = conversationFrequency;
        this.aggregatedUntil = snapshotUntil;
        if (finalized) {
            this.finalizedUntil = snapshotUntil;
        }
        this.calculatedAt = calculatedAt;
        this.updatedAt = calculatedAt;
    }

    public void updateCounts(
            int messageCount,
            int imageCount,
            int reactionCount
    ) {
        this.messageCount = messageCount;
        this.imageCount = imageCount;
        this.reactionCount = reactionCount;
        touch();
    }

    public void updateFrequentWords(String frequentWords) {
        this.frequentWords = frequentWords;
        touch();
    }

    private void touch() {
        this.calculatedAt = LocalDateTime.now();
        this.updatedAt = this.calculatedAt;
    }

    public Long getDashboardId() {
        return dashboardId;
    }

    public Long getRoomId() {
        return roomId;
    }

    public LocalDate getSummaryDate() {
        return summaryDate;
    }

    public int getMessageCount() {
        return messageCount;
    }

    public int getImageCount() {
        return imageCount;
    }

    public int getReactionCount() {
        return reactionCount;
    }

    public String getEmotionSummary() {
        return emotionSummary;
    }

    public String getFrequentWords() {
        return frequentWords;
    }

    public BigDecimal getAverageResponseSeconds() {
        return averageResponseSeconds;
    }

    public Integer getBusiestHour() {
        return busiestHour;
    }

    public String getConversationFrequency() {
        return conversationFrequency;
    }

    public LocalDateTime getAggregatedUntil() {
        return aggregatedUntil;
    }

    public LocalDateTime getFinalizedUntil() {
        return finalizedUntil;
    }

    public LocalDateTime getCalculatedAt() {
        return calculatedAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }
}
