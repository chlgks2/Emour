package com.ssafy.emour.chat.event;

import com.ssafy.emour.global.storage.FileStorage;
import org.junit.jupiter.api.Test;

import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

class ChatImageFileDeleteListenerTest {

    @Test
    void deletesStoredFileByUploadUrl() {
        FileStorage fileStorage = mock(FileStorage.class);
        ChatImageFileDeleteListener listener =
                new ChatImageFileDeleteListener(fileStorage);

        listener.deleteFile(new ChatImageFileDeleteEvent(
                "https://example.com/uploads/2026/08/03/image.jpg"
        ));

        verify(fileStorage).delete("2026/08/03/image.jpg");
    }

    @Test
    void ignoresUnknownExternalUrl() {
        FileStorage fileStorage = mock(FileStorage.class);
        ChatImageFileDeleteListener listener =
                new ChatImageFileDeleteListener(fileStorage);

        listener.deleteFile(new ChatImageFileDeleteEvent(
                "https://other-storage.example/image.jpg"
        ));

        verify(fileStorage, never()).delete(
                org.mockito.ArgumentMatchers.anyString()
        );
    }
}
