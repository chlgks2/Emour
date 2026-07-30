package com.ssafy.emour.member.dto.request;

import jakarta.validation.constraints.Size;

import java.time.LocalDate;

/**
 * 프로필 수정 요청. 모든 필드는 선택(보낸 값만 반영).
 * (null 이면 "그 필드는 그대로 둔다"는 의미 — 부분 수정 PATCH)
 */
public record ProfileUpdateRequest(

        @Size(min = 2, max = 20, message = "닉네임은 2자 이상 20자 이하여야 합니다.")
        String nickname,

        LocalDate birth,

        @Size(max = 255, message = "상태메시지는 255자 이하여야 합니다.")
        String statusMessage
) {
}
