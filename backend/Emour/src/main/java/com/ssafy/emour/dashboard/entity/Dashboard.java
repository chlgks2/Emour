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

    public LocalDateTime getCalculatedAt() {
        return calculatedAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }
}
