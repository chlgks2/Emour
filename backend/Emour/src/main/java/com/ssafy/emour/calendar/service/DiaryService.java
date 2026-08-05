package com.ssafy.emour.calendar.service;

import com.ssafy.emour.calendar.dto.request.DiaryCreateRequest;
import com.ssafy.emour.calendar.dto.request.DiaryUpdateRequest;
import com.ssafy.emour.calendar.dto.response.DiaryResponse;
import com.ssafy.emour.calendar.entity.Diary;
import com.ssafy.emour.calendar.repository.DiaryRepository;
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
public class DiaryService {

    private final DiaryRepository diaryRepository;
    private final MemberRepository memberRepository;
    private final CoupleRoomRepository coupleRoomRepository;
    private final DiaryDateProvider diaryDateProvider;

    @Transactional
    public DiaryResponse create(Long userId, DiaryCreateRequest request) {
        CoupleRoom room = getActiveRoom(userId);
        var diaryDate = diaryDateProvider.today();
        if (diaryRepository.existsByRoomIdAndUserIdAndDiaryDate(
                room.getId(),
                userId,
                diaryDate
        )) {
            throw new CustomException(ErrorCode.DIARY_ALREADY_EXISTS);
        }

        Diary diary = Diary.create(
                room.getId(),
                userId,
                diaryDate,
                request.content().trim()
        );
        return DiaryResponse.from(diaryRepository.save(diary));
    }

    @Transactional
    public DiaryResponse update(
            Long userId,
            Long diaryId,
            DiaryUpdateRequest request
    ) {
        CoupleRoom room = getActiveRoom(userId);
        Diary diary = getMyDiary(userId, room.getId(), diaryId);
        diary.updateContent(request.content().trim());
        return DiaryResponse.from(diary);
    }

    @Transactional
    public void delete(Long userId, Long diaryId) {
        CoupleRoom room = getActiveRoom(userId);
        Diary diary = getMyDiary(userId, room.getId(), diaryId);
        diaryRepository.delete(diary);
    }

    @Transactional(readOnly = true)
    public List<DiaryResponse> getAll(Long userId) {
        CoupleRoom room = getReadableRoom(userId);
        return diaryRepository
                .findAllByRoomIdAndUserIdOrderByDiaryDateDesc(
                        room.getId(),
                        userId
                )
                .stream()
                .map(DiaryResponse::from)
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

    private Diary getMyDiary(Long userId, Long roomId, Long diaryId) {
        Diary diary = diaryRepository.findById(diaryId)
                .orElseThrow(() -> new CustomException(
                        ErrorCode.DIARY_NOT_FOUND
                ));
        if (!diary.getRoomId().equals(roomId)
                || !diary.getUserId().equals(userId)) {
            throw new CustomException(ErrorCode.ACCESS_DENIED);
        }
        return diary;
    }
}
