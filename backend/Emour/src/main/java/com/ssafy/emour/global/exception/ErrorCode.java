package com.ssafy.emour.global.exception;

import lombok.Getter;
import org.springframework.http.HttpStatus;

/**
 * 서비스에서 발생하는 예외 상황을 한 곳에서 관리하는 목록.
 * (HTTP 상태코드 + 사용자에게 보여줄 메시지) 를 짝지어 둔다.
 *
 * 기능을 만들 때마다 여기에 필요한 항목을 추가해 나가면 된다.
 */
@Getter
public enum ErrorCode {

    // ===== 공통 =====
    INVALID_INPUT(HttpStatus.BAD_REQUEST, "잘못된 입력값입니다."),
    INTERNAL_ERROR(HttpStatus.INTERNAL_SERVER_ERROR, "서버 오류가 발생했습니다."),

    // ===== 인증 / 회원 =====
    EMAIL_ALREADY_EXISTS(HttpStatus.CONFLICT, "이미 사용 중인 이메일입니다."),
    USER_NOT_FOUND(HttpStatus.NOT_FOUND, "사용자를 찾을 수 없습니다."),
    INVALID_CREDENTIALS(HttpStatus.UNAUTHORIZED, "이메일 또는 비밀번호가 올바르지 않습니다."),
    UNAUTHORIZED(HttpStatus.UNAUTHORIZED, "인증이 필요합니다."),
    INVALID_TOKEN(HttpStatus.UNAUTHORIZED, "유효하지 않은 토큰입니다."),

    // ===== 커플 연결 =====
    ALREADY_COUPLED(HttpStatus.CONFLICT, "이미 연결된 커플이 있습니다."),
    INVITATION_CODE_NOT_FOUND(HttpStatus.NOT_FOUND, "초대 코드를 찾을 수 없습니다."),
    INVITATION_CODE_EXPIRED(HttpStatus.GONE, "만료된 초대 코드입니다."),
    INVITATION_CODE_NOT_AVAILABLE(HttpStatus.CONFLICT, "더 이상 사용할 수 없는 초대 코드입니다."),
    CANNOT_USE_OWN_INVITATION(HttpStatus.BAD_REQUEST, "본인이 생성한 초대 코드는 사용할 수 없습니다."),
    INVITATION_CODE_GENERATION_FAILED(
            HttpStatus.INTERNAL_SERVER_ERROR,
            "초대 코드를 생성하지 못했습니다. 잠시 후 다시 시도해 주세요."
    ),
    ;

    private final HttpStatus status;
    private final String message;

    ErrorCode(HttpStatus status, String message) {
        this.status = status;
        this.message = message;
    }
}
