package com.ssafy.emour.calendar.service;

import com.ssafy.emour.calendar.dto.request.ScheduleCreateRequest;
import com.ssafy.emour.calendar.dto.request.ScheduleUpdateRequest;
import com.ssafy.emour.calendar.dto.response.ScheduleResponse;
import com.ssafy.emour.calendar.entity.CoupleSchedule;
import com.ssafy.emour.calendar.entity.ScheduleType;
import com.ssafy.emour.calendar.repository.CoupleScheduleRepository;
import com.ssafy.emour.couple.entity.CoupleRoom;
import com.ssafy.emour.couple.repository.CoupleRoomRepository;
import com.ssafy.emour.global.exception.CustomException;
import com.ssafy.emour.global.exception.ErrorCode;
import com.ssafy.emour.member.repository.MemberRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.data.domain.PageRequest;

import java.time.DateTimeException;
import java.time.YearMonth;
import java.util.List;

@Service
@RequiredArgsConstructor
public class ScheduleService {

    private final CoupleScheduleRepository scheduleRepository;
    private final MemberRepository memberRepository;
    private final CoupleRoomRepository coupleRoomRepository;

    @Transactional
    public ScheduleResponse create(
            Long userId,
            ScheduleCreateRequest request
    ) {
        CoupleRoom room = getActiveRoom(userId);
        CoupleSchedule schedule = CoupleSchedule.createSchedule(
                room.getId(),
                userId,
                request.name(),
                request.description(),
                request.scheduleDate(),
                request.scheduleTime()
        );

        return ScheduleResponse.from(scheduleRepository.save(schedule));
    }

    @Transactional
    public ScheduleResponse update(
            Long userId,
            Long scheduleId,
            ScheduleUpdateRequest request
    ) {
        CoupleRoom room = getActiveRoom(userId);
        CoupleSchedule schedule = getEditableSchedule(
                userId,
                room.getId(),
                scheduleId
        );
        schedule.updateSchedule(
                request.name(),
                request.description(),
                request.scheduleDate(),
                request.scheduleTime()
        );
        return ScheduleResponse.from(schedule);
    }

    @Transactional
    public void delete(Long userId, Long scheduleId) {
        CoupleRoom room = getActiveRoom(userId);
        CoupleSchedule schedule = getEditableSchedule(
                userId,
                room.getId(),
                scheduleId
        );
        scheduleRepository.delete(schedule);
    }

    @Transactional(readOnly = true)
    public List<ScheduleResponse> getMonthly(
            Long userId,
            int year,
            int month
    ) {
        CoupleRoom room = getReadableRoom(userId);
        YearMonth yearMonth;
        try {
            yearMonth = YearMonth.of(year, month);
        } catch (DateTimeException exception) {
            throw new CustomException(ErrorCode.INVALID_INPUT);
        }

        return scheduleRepository
                .findAllByRoomIdAndScheduleTypeAndScheduleDateBetweenOrderByScheduleDateAscScheduleTimeAsc(
                        room.getId(),
                        ScheduleType.SCHEDULE,
                        yearMonth.atDay(1),
                        yearMonth.atEndOfMonth()
                )
                .stream()
                .map(ScheduleResponse::from)
                .toList();
    }

    private CoupleRoom getActiveRoom(Long userId) {
        if (!memberRepository.existsById(userId)) {
            throw new CustomException(ErrorCode.USER_NOT_FOUND);
        }

        return coupleRoomRepository.findActiveRoomByUserId(userId)
                .orElseThrow(() -> new CustomException(
                        ErrorCode.ACTIVE_COUPLE_NOT_FOUND
                ));
    }

    private CoupleRoom getReadableRoom(Long userId) {
        if (!memberRepository.existsById(userId)) {
            throw new CustomException(ErrorCode.USER_NOT_FOUND);
        }

        return coupleRoomRepository.findReadableRoomsByUserId(
                        userId,
                        PageRequest.of(0, 1)
                )
                .stream()
                .findFirst()
                .orElseThrow(() -> new CustomException(
                        ErrorCode.ACTIVE_COUPLE_NOT_FOUND
                ));
    }

    private CoupleSchedule getEditableSchedule(
            Long userId,
            Long roomId,
            Long scheduleId
    ) {
        CoupleSchedule schedule = scheduleRepository.findById(scheduleId)
                .orElseThrow(() -> new CustomException(
                        ErrorCode.SCHEDULE_NOT_FOUND
                ));

        if (!schedule.getRoomId().equals(roomId)
                || !schedule.getCreatorId().equals(userId)) {
            throw new CustomException(ErrorCode.ACCESS_DENIED);
        }
        if (schedule.getScheduleType() != ScheduleType.SCHEDULE) {
            throw new CustomException(ErrorCode.SCHEDULE_TYPE_MISMATCH);
        }
        return schedule;
    }
}
