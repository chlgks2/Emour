package com.ssafy.emour.dashboard.service;

import com.ssafy.emour.couple.repository.CoupleRoomRepository;
import com.ssafy.emour.global.exception.CustomException;
import com.ssafy.emour.global.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

/** 같은 방의 스냅샷 갱신이 동시에 실행되지 않도록 DB 행을 잠급니다. */
@Service
@RequiredArgsConstructor
public class DashboardSnapshotLockService {

    private final CoupleRoomRepository coupleRoomRepository;

    public void lockRoom(Long roomId) {
        coupleRoomRepository.findByIdForUpdate(roomId)
                .orElseThrow(() -> new CustomException(
                        ErrorCode.INVALID_INPUT
                ));
    }
}
