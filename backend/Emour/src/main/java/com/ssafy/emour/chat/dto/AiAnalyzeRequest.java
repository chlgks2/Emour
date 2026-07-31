package com.ssafy.emour.chat.dto;

import java.util.List;

public record AiAnalyzeRequest(
        List<AiContextMessage> context,
        List<AiTargetMessage> target
) {
}
