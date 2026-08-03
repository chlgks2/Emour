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

/** 회원별 북마크 수와 감정 흐름 스냅샷입니다. */
@Entity
@Table(
        name = "member_dashboard",
        uniqueConstraints = @UniqueConstraint(
                name = "uq_member_dashboard_daily_user",
                columnNames = {"room_id", "user_id", "summary_date"}
        )
)
public class Dashboard {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "member_dashboard_id")
    private Long dashboardId;

    @Column(name = "room_id", nullable = false)
    private Long roomId;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "summary_date", nullable = false)
    private LocalDate summaryDate;

    @Column(name = "bookmark_count", nullable = false)
    private int bookmarkCount;

    @Column(name = "emotion_flow", columnDefinition = "json")
    private String emotionFlow;

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

    public void applyHourlySnapshot(
            int bookmarkCount,
            String emotionFlow,
            LocalDateTime snapshotUntil,
            boolean finalized,
            LocalDateTime calculatedAt
    ) {
        this.bookmarkCount = bookmarkCount;
        this.emotionFlow = emotionFlow;
        this.aggregatedUntil = snapshotUntil;
        if (finalized) {
            this.finalizedUntil = snapshotUntil;
        }
        this.calculatedAt = calculatedAt;
        this.updatedAt = calculatedAt;
    }

    public void updateBookmarkCount(int bookmarkCount) {
        this.bookmarkCount = bookmarkCount;
        touch();
    }

    public void updateEmotionFlow(String emotionFlow) {
        this.emotionFlow = emotionFlow;
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

    public Long getUserId() {
        return userId;
    }

    public LocalDate getSummaryDate() {
        return summaryDate;
    }

    public int getBookmarkCount() {
        return bookmarkCount;
    }

    public String getEmotionFlow() {
        return emotionFlow;
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
