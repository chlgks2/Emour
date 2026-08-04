package com.ssafy.emour.chat.event;

import com.ssafy.emour.global.storage.FileStorage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

@Slf4j
@Component
@RequiredArgsConstructor
public class ChatImageFileDeleteListener {

    private static final String UPLOAD_URL_PREFIX = "/uploads/";

    private final FileStorage fileStorage;

    @TransactionalEventListener(
            phase = TransactionPhase.AFTER_COMMIT,
            fallbackExecution = true
    )
    public void deleteFile(ChatImageFileDeleteEvent event) {
        String storageKey = extractStorageKey(event.imageUrl());
        if (storageKey == null) {
            log.warn("삭제할 수 없는 채팅 이미지 URL입니다: {}", event.imageUrl());
            return;
        }
        fileStorage.delete(storageKey);
    }

    private String extractStorageKey(String imageUrl) {
        if (imageUrl == null || imageUrl.isBlank()) {
            return null;
        }
        int prefixIndex = imageUrl.indexOf(UPLOAD_URL_PREFIX);
        if (prefixIndex < 0) {
            return null;
        }
        String key = imageUrl.substring(
                prefixIndex + UPLOAD_URL_PREFIX.length()
        );
        return key.isBlank() ? null : key;
    }
}
