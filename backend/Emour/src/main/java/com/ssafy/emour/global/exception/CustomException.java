package com.ssafy.emour.global.exception;

import lombok.Getter;

/**
 * 서비스 로직에서 "이건 예외 상황이다" 싶을 때 던지는 예외.
 *
 * 사용 예)
 *   if (emailExists) {
 *       throw new CustomException(ErrorCode.EMAIL_ALREADY_EXISTS);
 *   }
 *
 * 이렇게 던지면 GlobalExceptionHandler 가 잡아서
 * 알맞은 상태코드 + 메시지로 응답해 준다.
 */
@Getter
public class CustomException extends RuntimeException {

    private final ErrorCode errorCode;

    public CustomException(ErrorCode errorCode) {
        super(errorCode.getMessage());
        this.errorCode = errorCode;
    }
}
