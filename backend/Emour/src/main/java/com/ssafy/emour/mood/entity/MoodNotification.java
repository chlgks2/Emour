package com.ssafy.emour.mood.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalTime;

@Entity
@Table(name = "mood_notification")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class MoodNotification {

    public static final LocalTime DEFAULT_START_TIME = LocalTime.of(8, 0);
    public static final LocalTime DEFAULT_END_TIME = LocalTime.of(22, 0);
    public static final int DEFAULT_INTERVAL_HOURS = 2;

    @Id
    @Column(name = "room_id")
    private Long roomId;

    @Column(name = "start_time", nullable = false)
    private LocalTime startTime;

    @Column(name = "end_time", nullable = false)
    private LocalTime endTime;

    @Column(name = "interval_hours", nullable = false)
    private int intervalHours;

    @Column(name = "is_active", nullable = false)
    private boolean active;

    public static MoodNotification createDefault(Long roomId) {
        return create(
                roomId,
                DEFAULT_START_TIME,
                DEFAULT_END_TIME,
                DEFAULT_INTERVAL_HOURS,
                true
        );
    }

    public static MoodNotification create(
            Long roomId,
            LocalTime startTime,
            LocalTime endTime,
            int intervalHours
    ) {
        return create(roomId, startTime, endTime, intervalHours, true);
    }

    public static MoodNotification create(
            Long roomId,
            LocalTime startTime,
            LocalTime endTime,
            int intervalHours,
            boolean active
    ) {
        MoodNotification notification = new MoodNotification();
        notification.roomId = roomId;
        notification.startTime = startTime;
        notification.endTime = endTime;
        notification.intervalHours = intervalHours;
        notification.active = active;
        return notification;
    }

    public void update(
            LocalTime startTime,
            LocalTime endTime,
            int intervalHours,
            boolean active
    ) {
        this.startTime = startTime;
        this.endTime = endTime;
        this.intervalHours = intervalHours;
        this.active = active;
    }
}
