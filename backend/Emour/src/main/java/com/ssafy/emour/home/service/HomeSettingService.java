package com.ssafy.emour.home.service;

import com.ssafy.emour.couple.entity.CoupleRoom;
import com.ssafy.emour.couple.repository.CoupleRoomRepository;
import com.ssafy.emour.global.exception.CustomException;
import com.ssafy.emour.global.exception.ErrorCode;
import com.ssafy.emour.global.storage.FileStorage;
import com.ssafy.emour.home.dto.request.HomeSettingUpdateRequest;
import com.ssafy.emour.home.dto.response.HomeSettingResponse;
import com.ssafy.emour.home.entity.HomeImageSetting;
import com.ssafy.emour.home.repository.HomeImageSettingRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.util.Set;

@Service
@RequiredArgsConstructor
public class HomeSettingService {

    private static final String IMAGE_URL_PREFIX = "/uploads/";
    private static final long MAX_IMAGE_SIZE = 10L * 1024 * 1024;
    private static final Set<String> ALLOWED_IMAGE_TYPES = Set.of(
            "image/jpeg",
            "image/png",
            "image/webp",
            "image/gif"
    );

    private final HomeImageSettingRepository homeImageSettingRepository;
    private final CoupleRoomRepository coupleRoomRepository;
    private final FileStorage fileStorage;

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

    @Transactional
    public HomeSettingResponse uploadImage(Long userId, MultipartFile file) {
        validateImage(file);
        Long roomId = getActiveRoomId(userId);
        HomeImageSetting setting = homeImageSettingRepository.findById(roomId)
                .orElseGet(() -> HomeImageSetting.defaults(roomId));

        String oldImageKey = extractStoredKey(setting.getImageUrl());
        String storedKey = fileStorage.store(file);
        setting.updateImageUrl(toImageUrl(storedKey));
        HomeImageSetting saved = homeImageSettingRepository.save(setting);

        if (oldImageKey != null && !oldImageKey.equals(storedKey)) {
            fileStorage.delete(oldImageKey);
        }
        return HomeSettingResponse.from(saved);
    }

    private void validateImage(MultipartFile file) {
        if (file == null
                || file.isEmpty()
                || file.getSize() > MAX_IMAGE_SIZE
                || !ALLOWED_IMAGE_TYPES.contains(file.getContentType())) {
            throw new CustomException(ErrorCode.INVALID_IMAGE_FILE);
        }
    }

    private String toImageUrl(String storedKey) {
        String normalizedKey = storedKey.replace('\\', '/');
        return IMAGE_URL_PREFIX
                + (normalizedKey.startsWith("/")
                ? normalizedKey.substring(1)
                : normalizedKey);
    }

    private String extractStoredKey(String imageUrl) {
        if (imageUrl == null || !imageUrl.startsWith(IMAGE_URL_PREFIX)) {
            return null;
        }
        return imageUrl.substring(IMAGE_URL_PREFIX.length());
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
