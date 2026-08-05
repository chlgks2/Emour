package com.ssafy.emour.auth.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * 회원가입 요청 데이터.
 *
 * record = 값만 담는 간결한 불변 클래스. (getter/생성자 등을 자동 생성)
 * 각 필드의 검증 규칙(@NotBlank 등)은 컨트롤러에서 @Valid 로 자동 검사되고,
 * 위반 시 GlobalExceptionHandler 가 잡아 "메시지"를 응답으로 내려준다.
 */
public record SignUpRequest(

        @NotBlank(message = "이메일은 필수입니다.")
        @Email(message = "이메일 형식이 아닙니다.")
        String email,

        @NotBlank(message = "비밀번호는 필수입니다.")
        @Size(min = 8, max = 64, message = "비밀번호는 8자 이상 64자 이하여야 합니다.")
        String password,

        @NotBlank(message = "닉네임은 필수입니다.")
        @Size(min = 2, max = 20, message = "닉네임은 2자 이상 20자 이하여야 합니다.")
        String nickname
) {
}
