package com.ssafy.emour.chat.service;

import com.ssafy.emour.chat.dto.ChatImageUploadResponse;
import com.ssafy.emour.chat.exception.ChatException;
import com.ssafy.emour.couple.entity.CoupleMemberId;
import com.ssafy.emour.couple.entity.CoupleMemberStatus;
import com.ssafy.emour.couple.repository.CoupleMemberRepository;
import com.ssafy.emour.global.storage.FileStorage;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ChatImageUploadServiceTest {

    @Mock
    private FileStorage fileStorage;

    @Mock
    private CoupleMemberRepository coupleMemberRepository;

    @InjectMocks
    private ChatImageUploadService chatImageUploadService;

    @Test
    void returnsUploadedImageUrls() {
        MultipartFile first = imageFile("first.jpg");
        MultipartFile second = imageFile("second.png");
        allowActiveMember(10L, 2L);
        when(fileStorage.store(first))
                .thenReturn("2026/08/03/first.jpg");
        when(fileStorage.store(second))
                .thenReturn("2026\\08\\03\\second.png");

        ChatImageUploadResponse response = chatImageUploadService.upload(
                2L,
                10L,
                List.of(first, second)
        );

        assertThat(response.imageUrls()).containsExactly(
                "/uploads/2026/08/03/first.jpg",
                "/uploads/2026/08/03/second.png"
        );
    }

    @Test
    void rejectsNonImageFile() {
        MultipartFile textFile = new MockMultipartFile(
                "files",
                "memo.txt",
                "text/plain",
                "hello".getBytes()
        );
        allowActiveMember(10L, 2L);

        assertThatThrownBy(() -> chatImageUploadService.upload(
                2L,
                10L,
                List.of(textFile)
        ))
                .isInstanceOf(ChatException.class)
                .hasMessage("이미지 파일만 업로드할 수 있습니다.");

        verify(fileStorage, never()).store(textFile);
    }

    @Test
    void removesStoredFilesWhenUploadFails() {
        MultipartFile first = imageFile("first.jpg");
        MultipartFile second = imageFile("second.jpg");
        allowActiveMember(10L, 2L);
        when(fileStorage.store(first)).thenReturn("first.jpg");
        when(fileStorage.store(second))
                .thenThrow(new IllegalStateException("storage error"));

        assertThatThrownBy(() -> chatImageUploadService.upload(
                2L,
                10L,
                List.of(first, second)
        )).isInstanceOf(IllegalStateException.class);

        verify(fileStorage).delete("first.jpg");
    }

    private MultipartFile imageFile(String name) {
        return new MockMultipartFile(
                "files",
                name,
                "image/jpeg",
                new byte[]{1, 2, 3}
        );
    }

    private void allowActiveMember(Long userId, Long roomId) {
        when(coupleMemberRepository.existsByIdAndStatus(
                new CoupleMemberId(userId, roomId),
                CoupleMemberStatus.ACTIVE
        )).thenReturn(true);
    }
}
