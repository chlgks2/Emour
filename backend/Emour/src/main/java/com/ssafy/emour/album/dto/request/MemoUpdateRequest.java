package com.ssafy.emour.album.dto.request;

import jakarta.validation.constraints.Size;

/**
 * 사진 메모 작성/수정 요청.
 */
public record MemoUpdateRequest(

        @Size(max = 500, message = "메모는 500자 이하여야 합니다.")
        String memo
) {
}
