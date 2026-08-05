package com.ssafy.emour.auth.dto.request;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

/**
 * 로그인 요청 데이터.
 */
@Schema(description = "이메일 로그인 요청")
public record LoginRequest(

        @Schema(
                description = "가입할 때 사용한 이메일",
                example = "test@ssafy.com",
                requiredMode = Schema.RequiredMode.REQUIRED
        )
        @NotBlank(message = "이메일은 필수입니다.")
        @Email(message = "이메일 형식이 아닙니다.")
        String email,

        @Schema(
                description = "회원 비밀번호",
                example = "password123!",
                format = "password",
                requiredMode = Schema.RequiredMode.REQUIRED
        )
        @NotBlank(message = "비밀번호는 필수입니다.")
        String password
) {
}
