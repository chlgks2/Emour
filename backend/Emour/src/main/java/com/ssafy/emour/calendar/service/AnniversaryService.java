package com.ssafy.emour.calendar.service;

import com.ssafy.emour.calendar.dto.request.AnniversaryCreateRequest;
import com.ssafy.emour.calendar.dto.request.AnniversaryUpdateRequest;
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

import java.util.List;

@Service
@RequiredArgsConstructor
public class AnniversaryService {

    private final CoupleScheduleRepository scheduleRepository;
    private final MemberRepository memberRepository;
    private final CoupleRoomRepository coupleRoomRepository;

    @Transactional
    public ScheduleResponse create(
            Long userId,
            AnniversaryCreateRequest request
    ) {
        CoupleRoom room = getActiveRoom(userId);
        CoupleSchedule anniversary = CoupleSchedule.createAnniversary(
                room.getId(),
                userId,
                request.name(),
                request.description(),
                request.scheduleDate()
        );
        return ScheduleResponse.from(scheduleRepository.save(anniversary));
    }

    @Transactional
    public ScheduleResponse update(
            Long userId,
            Long anniversaryId,
            AnniversaryUpdateRequest request
    ) {
        CoupleRoom room = getActiveRoom(userId);
        CoupleSchedule anniversary = getEditableAnniversary(
                userId,
                room.getId(),
                anniversaryId
        );
        anniversary.updateAnniversary(
                request.name(),
                request.description(),
                request.scheduleDate()
        );
        return ScheduleResponse.from(anniversary);
    }

    @Transactional
    public void delete(Long userId, Long anniversaryId) {
        CoupleRoom room = getActiveRoom(userId);
        CoupleSchedule anniversary = getEditableAnniversary(
                userId,
                room.getId(),
                anniversaryId
        );
        scheduleRepository.delete(anniversary);
    }

    @Transactional(readOnly = true)
    public List<ScheduleResponse> getAll(Long userId) {
        CoupleRoom room = getReadableRoom(userId);
        return scheduleRepository
                .findAllByRoomIdAndScheduleTypeOrderByScheduleDateAsc(
                        room.getId(),
                        ScheduleType.ANNIVERSARY
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

    private CoupleSchedule getEditableAnniversary(
            Long userId,
            Long roomId,
            Long anniversaryId
    ) {
        CoupleSchedule anniversary = scheduleRepository.findById(anniversaryId)
                .orElseThrow(() -> new CustomException(
                        ErrorCode.SCHEDULE_NOT_FOUND
                ));
        if (!anniversary.getRoomId().equals(roomId)
                || !anniversary.getCreatorId().equals(userId)) {
            throw new CustomException(ErrorCode.ACCESS_DENIED);
        }
        if (anniversary.getScheduleType() != ScheduleType.ANNIVERSARY) {
            throw new CustomException(ErrorCode.ANNIVERSARY_TYPE_MISMATCH);
        }
        return anniversary;
    }
}
