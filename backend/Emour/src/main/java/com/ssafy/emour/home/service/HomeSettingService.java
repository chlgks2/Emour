package com.ssafy.emour.home.service;

import com.ssafy.emour.couple.entity.CoupleRoom;
import com.ssafy.emour.couple.repository.CoupleRoomRepository;
import com.ssafy.emour.global.exception.CustomException;
import com.ssafy.emour.global.exception.ErrorCode;
import com.ssafy.emour.home.dto.request.HomeSettingUpdateRequest;
import com.ssafy.emour.home.dto.response.HomeSettingResponse;
import com.ssafy.emour.home.entity.HomeImageSetting;
import com.ssafy.emour.home.repository.HomeImageSettingRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class HomeSettingService {

    private final HomeImageSettingRepository homeImageSettingRepository;
    private final CoupleRoomRepository coupleRoomRepository;

    @Transactional(readOnly = true)
    public HomeSettingResponse getSetting(Long userId) {
        Long roomId = getActiveRoomId(userId);
        HomeImageSetting setting = homeImageSettingRepository.findById(roomId)
                .orElseGet(() -> HomeImageSetting.defaults(roomId));
        return HomeSettingResponse.from(setting);
    }

    @Transactional
    public HomeSettingResponse updateSetting(
            Long userId,
            HomeSettingUpdateRequest request
    ) {
        Long roomId = getActiveRoomId(userId);
        HomeImageSetting setting = homeImageSettingRepository.findById(roomId)
                .orElseGet(() -> HomeImageSetting.defaults(roomId));

        setting.updateTextSetting(
                normalizeText(request.textContent()),
                request.textPositionX(),
                request.textPositionY(),
                request.textSize(),
                request.textAlignment(),
                request.backgroundStyle(),
                request.textColor()
        );

        return HomeSettingResponse.from(
                homeImageSettingRepository.save(setting)
        );
    }

    private String normalizeText(String textContent) {
        if (textContent == null || textContent.isBlank()) {
            return null;
        }
        return textContent.trim();
    }

    private Long getActiveRoomId(Long userId) {
        return coupleRoomRepository.findActiveRoomByUserId(userId)
                .map(CoupleRoom::getId)
                .orElseThrow(() -> new CustomException(
                        ErrorCode.ACTIVE_COUPLE_NOT_FOUND
                ));
    }
}
