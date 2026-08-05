
# 운영 지표 수집기 — "조용한 품질 붕괴"를 잡기 위한 장치.

# 왜 필요한가
#     현재 설계는 LLM이 실패해도 '평범'으로 채워 200 OK 
#     → API 키가 만료돼도, 모델명이 틀려도, 서버는 정상처럼 보이고
#       사용자에게는 전부 '평범'만. 아무도 모릅니다.

#     이걸 '조용한 실패(silent failure)'
#     폴백률(fallback rate)을 세어두면 알아챌 수 있음

# 지표 읽는 법
#     fallback_rate 0.00~0.05 : 정상
#     fallback_rate 0.05~0.20 : 프롬프트/라벨 정합성 점검 필요
#     fallback_rate 0.20 이상 : 사실상 고장. 키·모델명·응답형식부터 확인

# 주의: 이 구현은 프로세스 메모리에만(재시작하면 0).
#       워커를 여러 개 띄우면 워커별로 따로.
#       정식 운영에서는 Prometheus 같은 외부 수집기로.

import threading
from dataclasses import dataclass, field
from typing import Dict


@dataclass
class _Metrics:
    # ── 분석 요청 단위 ──
    requests: int = 0
    messages_total: int = 0        # 분석한 메시지 총 개수
    messages_fallback: int = 0     # 그중 폴백('평범')으로 때운 개수
    label_counts: Dict[str, int] = field(default_factory=dict)

    # ── LLM 호출 단위 ──
    llm_calls: int = 0
    llm_failures: int = 0
    latency_ms_sum: float = 0.0
    prompt_tokens: int = 0
    completion_tokens: int = 0

    _lock: threading.Lock = field(default_factory=threading.Lock, repr=False)

    def record_call(
        self,
        model: str = "",
        latency_ms: float = 0.0,
        prompt_tokens: int = 0,
        completion_tokens: int = 0,
        ok: bool = True,
    ) -> None:
        with self._lock:
            self.llm_calls += 1
            if not ok:
                self.llm_failures += 1
            self.latency_ms_sum += latency_ms
            self.prompt_tokens += prompt_tokens
            self.completion_tokens += completion_tokens

    def record_result(self, labels: list[str], fallback_count: int) -> None:
        with self._lock:
            self.requests += 1
            self.messages_total += len(labels)
            self.messages_fallback += fallback_count
            for lab in labels:
                self.label_counts[lab] = self.label_counts.get(lab, 0) + 1

    def snapshot(self) -> Dict:
        with self._lock:
            n = max(self.messages_total, 1)
            calls = max(self.llm_calls, 1)
            return {
                "requests": self.requests,
                "messages_total": self.messages_total,
                "messages_fallback": self.messages_fallback,
                "fallback_rate": round(self.messages_fallback / n, 4),
                "llm_calls": self.llm_calls,
                "llm_failures": self.llm_failures,
                "llm_failure_rate": round(self.llm_failures / calls, 4),
                "avg_latency_ms": round(self.latency_ms_sum / calls, 1),
                "prompt_tokens": self.prompt_tokens,
                "completion_tokens": self.completion_tokens,
                "label_distribution": dict(
                    sorted(self.label_counts.items(), key=lambda kv: -kv[1])
                ),
            }

    def reset(self) -> None:
        with self._lock:
            self.requests = 0
            self.messages_total = 0
            self.messages_fallback = 0
            self.label_counts = {}
            self.llm_calls = 0
            self.llm_failures = 0
            self.latency_ms_sum = 0.0
            self.prompt_tokens = 0
            self.completion_tokens = 0


METRICS = _Metrics()


# 여기 값은 '대략의 자릿수 감각'을 위한 것이며 추정치
PRICE_TABLE: Dict[str, tuple[float, float]] = {
    # model_name: (input_per_1M, output_per_1M)
    "gpt-4.1-nano": (0.10, 0.40),
    "gpt-4o-mini": (0.15, 0.60),
    "gemini-2.5-flash-lite": (0.10, 0.40),
    "gemini-2.5-flash": (0.30, 2.50),
    "claude-haiku-4-5-20251001": (1.00, 5.00),
}


def estimate_cost_usd(model: str, prompt_tokens: int, completion_tokens: int) -> float:
    # """대략적인 비용 추정."""
    if model not in PRICE_TABLE:
        return 0.0
    pin, pout = PRICE_TABLE[model]
    return (prompt_tokens / 1_000_000) * pin + (completion_tokens / 1_000_000) * pout
