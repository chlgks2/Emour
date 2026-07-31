package com.ssafy.emour.calendar.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

@Entity
@Table(name = "couple_schedule")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class CoupleSchedule {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "schedule_id")
    private Long id;

    @Column(name = "room_id", nullable = false)
    private Long roomId;

    @Column(name = "creator_id", nullable = false)
    private Long creatorId;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(length = 1000)
    private String description;

    @Column(name = "schedule_date", nullable = false)
    private LocalDate scheduleDate;

    @Column(name = "schedule_time")
    private LocalTime scheduleTime;

    @Enumerated(EnumType.STRING)
    @Column(name = "schedule_type", nullable = false)
    private ScheduleType scheduleType;

    @Column(name = "yearly_recurring", nullable = false)
    private boolean yearlyRecurring;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    public static CoupleSchedule createSchedule(
            Long roomId,
            Long creatorId,
            String name,
            LocalDate scheduleDate,
            LocalTime scheduleTime
    ) {
        CoupleSchedule schedule = new CoupleSchedule();
        schedule.roomId = roomId;
        schedule.creatorId = creatorId;
        schedule.name = name;
        schedule.scheduleDate = scheduleDate;
        schedule.scheduleTime = scheduleTime;
        schedule.scheduleType = ScheduleType.SCHEDULE;
        schedule.yearlyRecurring = false;
        return schedule;
    }

    public void updateSchedule(
            String name,
            LocalDate scheduleDate,
            LocalTime scheduleTime
    ) {
        this.name = name;
        this.scheduleDate = scheduleDate;
        this.scheduleTime = scheduleTime;
    }
}
