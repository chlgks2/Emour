package com.ssafy.emour.chat.service;

import com.ssafy.emour.chat.dto.ChatImageUploadResponse;
import com.ssafy.emour.chat.exception.ChatException;
import com.ssafy.emour.couple.entity.CoupleMemberId;
import com.ssafy.emour.couple.entity.CoupleMemberStatus;
import com.ssafy.emour.couple.repository.CoupleMemberRepository;
import com.ssafy.emour.global.storage.FileStorage;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class ChatImageUploadService {

    private static final int MAX_IMAGE_COUNT = 10;
    private static final String IMAGE_URL_PREFIX = "/uploads/";

    private final FileStorage fileStorage;
    private final CoupleMemberRepository coupleMemberRepository;

    public ChatImageUploadResponse upload(
            Long roomId,
            Long userId,
            List<MultipartFile> files
    ) {
        validateActiveMember(roomId, userId);
        validateFiles(files);

        List<String> storedKeys = new ArrayList<>();
        try {
            for (MultipartFile file : files) {
                // 파일 저장소가 만든 key를 브라우저에서 접근할 수 있는 URL로 바꿉니다.
                storedKeys.add(fileStorage.store(file));
            }
        } catch (RuntimeException exception) {
            // 여러 장 중 하나라도 실패하면 앞에서 저장된 파일도 정리합니다.
            storedKeys.forEach(fileStorage::delete);
            throw exception;
        }

        List<String> imageUrls = storedKeys.stream()
                .map(this::toImageUrl)
                .toList();
        return new ChatImageUploadResponse(imageUrls);
    }

    private void validateActiveMember(Long roomId, Long userId) {
        if (roomId == null || userId == null) {
            throw new ChatException("사용자 번호와 채팅방 번호가 필요합니다.");
        }

        boolean activeMember = coupleMemberRepository.existsByIdAndStatus(
                new CoupleMemberId(userId, roomId),
                CoupleMemberStatus.ACTIVE
        );
        if (!activeMember) {
            throw new ChatException("해당 채팅방에 참여 중인 사용자가 아닙니다.");
        }
    }

    private void validateFiles(List<MultipartFile> files) {
        if (files == null || files.isEmpty()) {
            throw new ChatException("업로드할 이미지를 선택해 주세요.");
        }
        if (files.size() > MAX_IMAGE_COUNT) {
            throw new ChatException("이미지는 한 번에 최대 10장까지 업로드할 수 있습니다.");
        }

        for (MultipartFile file : files) {
            if (file == null || file.isEmpty()) {
                throw new ChatException("비어 있는 이미지 파일이 있습니다.");
            }
            String contentType = file.getContentType();
            if (contentType == null || !contentType.startsWith("image/")) {
                throw new ChatException("이미지 파일만 업로드할 수 있습니다.");
            }
        }
    }

    private String toImageUrl(String key) {
        String normalizedKey = key.replace('\\', '/');
        return IMAGE_URL_PREFIX
                + (normalizedKey.startsWith("/")
                ? normalizedKey.substring(1)
                : normalizedKey);
    }
}
