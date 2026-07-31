package com.ssafy.emour.dashboard.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(
        name = "dashboard",
        uniqueConstraints = @UniqueConstraint(
                name = "uq_dashboard_daily_user",
                columnNames = {"room_id", "user_id", "summary_date"}
        )
)
public class Dashboard {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "dashboard_id")
    private Long dashboardId;

    @Column(name = "room_id", nullable = false)
    private Long roomId;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "summary_date", nullable = false)
    private LocalDate summaryDate;

    @Column(name = "message_count", nullable = false)
    private int messageCount;

    @Column(name = "image_count", nullable = false)
    private int imageCount;

    @Column(name = "reaction_count", nullable = false)
    private int reactionCount;

    @Column(name = "bookmark_count", nullable = false)
    private int bookmarkCount;

    @Column(name = "emotion_summary", columnDefinition = "json")
    private String emotionSummary;

    @Column(name = "emotion_flow", columnDefinition = "json")
    private String emotionFlow;

    @Column(name = "frequent_words", columnDefinition = "json")
    private String frequentWords;

    @Column(name = "aggregated_until")
    private LocalDateTime aggregatedUntil;

    @Column(name = "finalized_until")
    private LocalDateTime finalizedUntil;

    @Column(name = "calculated_at", nullable = false)
    private LocalDateTime calculatedAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    protected Dashboard() {
    }

    public static Dashboard create(
            Long roomId,
            Long userId,
            LocalDate summaryDate
    ) {
        Dashboard dashboard = new Dashboard();
        dashboard.roomId = roomId;
        dashboard.userId = userId;
        dashboard.summaryDate = summaryDate;
        dashboard.calculatedAt = LocalDateTime.now();
        dashboard.updatedAt = dashboard.calculatedAt;
        return dashboard;
    }

    public void updateCounts(
            int messageCount,
            int imageCount,
            int reactionCount,
            int bookmarkCount
    ) {
        // 원본 데이터를 다시 세어 저장하므로 메시지 삭제 등의 변화도 반영됩니다.
        this.messageCount = messageCount;
        this.imageCount = imageCount;
        this.reactionCount = reactionCount;
        this.bookmarkCount = bookmarkCount;
        this.calculatedAt = LocalDateTime.now();
        this.updatedAt = this.calculatedAt;
    }

    public void updateEmotionSummary(String emotionSummary) {
        // 감정별 개수를 도넛 그래프용 JSON으로 보관합니다.
        this.emotionSummary = emotionSummary;
        this.calculatedAt = LocalDateTime.now();
        this.updatedAt = this.calculatedAt;
    }

    public void updateEmotionFlow(String emotionFlow) {
        // 프런트가 바로 사용할 수 있는 2시간 단위 배열을 JSON으로 보관합니다.
        this.emotionFlow = emotionFlow;
        this.calculatedAt = LocalDateTime.now();
        this.updatedAt = this.calculatedAt;
    }

    public void updateFrequentWords(String frequentWords) {
        // 단어와 사용 횟수 목록을 JSON으로 보관합니다.
        this.frequentWords = frequentWords;
        this.calculatedAt = LocalDateTime.now();
        this.updatedAt = this.calculatedAt;
    }

    public void applyHourlySnapshot(
            int messageCount,
            int imageCount,
            int reactionCount,
            int bookmarkCount,
            String emotionSummary,
            String emotionFlow,
            String frequentWords,
            LocalDateTime snapshotUntil,
            boolean finalized,
            LocalDateTime calculatedAt
    ) {
        // 모든 대시보드 항목을 먼저 바꾼 다음 마지막에 집계 경계를 기록합니다.
        this.messageCount = messageCount;
        this.imageCount = imageCount;
        this.reactionCount = reactionCount;
        this.bookmarkCount = bookmarkCount;
        this.emotionSummary = emotionSummary;
        this.emotionFlow = emotionFlow;
        this.frequentWords = frequentWords;
        this.aggregatedUntil = snapshotUntil;
        if (finalized) {
            this.finalizedUntil = snapshotUntil;
        }
        this.calculatedAt = calculatedAt;
        this.updatedAt = calculatedAt;
    }

    public Long getDashboardId() {
        return dashboardId;
    }

    public Long getRoomId() {
        return roomId;
    }

    public Long getUserId() {
        return userId;
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

    public int getBookmarkCount() {
        return bookmarkCount;
    }

    public String getEmotionSummary() {
        return emotionSummary;
    }

    public String getEmotionFlow() {
        return emotionFlow;
    }

    public String getFrequentWords() {
        return frequentWords;
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
