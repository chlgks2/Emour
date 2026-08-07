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
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
@RequiredArgsConstructor
public class HomeSettingService {

    private static final String IMAGE_URL_PREFIX = "/uploads/";
    private static final long MAX_IMAGE_SIZE = 10L * 1024 * 1024;
    private static final Pattern RGB_COLOR_PATTERN = Pattern.compile(
            "(?i)^rgb\\(\\s*(\\d{1,3})\\s*,\\s*(\\d{1,3})\\s*,\\s*(\\d{1,3})\\s*\\)$"
    );
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
        Long roomId = getReadableRoomId(userId);
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
                request.backgroundTransparency(),
                normalizeRgbColor(request.textColor())
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

    /** RGB 문자열을 검증하고 프런트에서 사용하기 쉬운 동일한 형식으로 정리합니다. */
    private String normalizeRgbColor(String textColor) {
        Matcher matcher = RGB_COLOR_PATTERN.matcher(textColor.trim());
        if (!matcher.matches()) {
            throw new CustomException(ErrorCode.INVALID_INPUT);
        }

        int red = Integer.parseInt(matcher.group(1));
        int green = Integer.parseInt(matcher.group(2));
        int blue = Integer.parseInt(matcher.group(3));
        if (red > 255 || green > 255 || blue > 255) {
            throw new CustomException(ErrorCode.INVALID_INPUT);
        }
        return "rgb(%d, %d, %d)".formatted(red, green, blue);
    }

    private Long getActiveRoomId(Long userId) {
        return coupleRoomRepository.findActiveRoomByUserId(userId)
                .map(CoupleRoom::getId)
                .orElseThrow(() -> new CustomException(
                        ErrorCode.ACTIVE_COUPLE_NOT_FOUND
                ));
    }

    /**
     * 상대방이 나가 방이 INACTIVE가 된 뒤에도 남아 있는 사용자는
     * 기존 홈 화면 설정을 계속 조회할 수 있습니다.
     */
    private Long getReadableRoomId(Long userId) {
        return coupleRoomRepository
                .findReadableRoomsByUserId(userId, PageRequest.of(0, 1))
                .stream()
                .findFirst()
                .map(CoupleRoom::getId)
                .orElseThrow(() -> new CustomException(
                        ErrorCode.ACTIVE_COUPLE_NOT_FOUND
                ));
    }
}
