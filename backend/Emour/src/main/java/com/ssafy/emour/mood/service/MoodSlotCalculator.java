package com.ssafy.emour.mood.service;

import com.ssafy.emour.mood.entity.MoodNotification;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.temporal.ChronoUnit;
import java.util.Optional;

@Component
public class MoodSlotCalculator {

    public Optional<LocalDateTime> currentSlot(
            MoodNotification notification,
            LocalDateTime currentTime
    ) {
        LocalDateTime normalizedTime = currentTime.truncatedTo(ChronoUnit.MINUTES);

        for (LocalDate baseDate : candidateDates(normalizedTime.toLocalDate())) {
            MoodWindow window = window(notification, baseDate);
            if (!normalizedTime.isBefore(window.start())
                    && normalizedTime.isBefore(window.end())) {
                long intervalMinutes = notification.getIntervalHours() * 60L;
                long elapsedMinutes = Duration.between(
                        window.start(),
                        normalizedTime
                ).toMinutes();
                return Optional.of(
                        window.start().plusMinutes(
                                (elapsedMinutes / intervalMinutes) * intervalMinutes
                        )
                );
            }
        }

        return Optional.empty();
    }

    public Optional<LocalDateTime> slotEndingAt(
            MoodNotification notification,
            LocalDateTime currentTime
    ) {
        LocalDateTime boundary = currentTime.truncatedTo(ChronoUnit.MINUTES);
        long intervalMinutes = notification.getIntervalHours() * 60L;

        for (LocalDate baseDate : candidateDates(boundary.toLocalDate())) {
            MoodWindow window = window(notification, baseDate);
            LocalDateTime slotStart = window.start();

            while (slotStart.isBefore(window.end())) {
                LocalDateTime slotEnd = slotStart.plusMinutes(intervalMinutes);
                if (slotEnd.isAfter(window.end())) {
                    slotEnd = window.end();
                }
                if (slotEnd.equals(boundary)) {
                    return Optional.of(slotStart);
                }
                slotStart = slotEnd;
            }
        }

        return Optional.empty();
    }

    private MoodWindow window(
            MoodNotification notification,
            LocalDate baseDate
    ) {
        LocalTime startTime = notification.getStartTime()
                .truncatedTo(ChronoUnit.MINUTES);
        LocalTime endTime = notification.getEndTime()
                .truncatedTo(ChronoUnit.MINUTES);
        LocalDateTime start = LocalDateTime.of(baseDate, startTime);
        LocalDateTime end = LocalDateTime.of(baseDate, endTime);

        if (!endTime.isAfter(startTime)) {
            end = end.plusDays(1);
        }

        return new MoodWindow(start, end);
    }

    private LocalDate[] candidateDates(LocalDate date) {
        return new LocalDate[]{date, date.minusDays(1)};
    }

    private record MoodWindow(
            LocalDateTime start,
            LocalDateTime end
    ) {
    }
}
