package com.ssafy.emour.couple.dto.request;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public record CoupleReconnectRequest(
        @Schema(example = "ABCD-2345")
        @NotBlank(message = "초대 코드는 필수입니다.")
        @Pattern(
                regexp = "(?i)\\s*[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{4}-"
                        + "[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{4}\\s*",
                message = "초대 코드는 XXXX-XXXX 형식이어야 합니다."
        )
        String invitationCode
) {
}
