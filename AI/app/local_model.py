"""
로컬 파인튜닝 모델(KcELECTRA) 구현체.

기존 LLM(OpenAI 등)과 '완전히 같은 계약'(EmotionLLM.classify)을 지키므로,
LLM_PROVIDER=local 로 바꾸기만 하면 백엔드·프론트는 아무것도 안 고쳐도 된다.

■ context(맥락) 사용 여부 — 스위치로 켜고 끈다 (LOCAL_USE_CONTEXT)
  - OFF(기본): 메시지 1건당 감정 1개(단일 문장 분류). context 는 받지만 안 쓴다.
      → 지금 배포된 '단일 문장 학습' 모델(chlgks/emour-emotion-kcelectra)에 맞는 안전한 기본값.
  - ON: 직전 대화(context)를 붙여 문장쌍(text-pair)으로 넣는다.
      tokenizer(맥락, 대상) → [CLS] 맥락 [SEP] 대상 [SEP].
      ※ 맥락을 학습한 모델을 배포한 뒤에 켜야 한다. 단일 문장 모델에 켜면 오히려 정확도가 떨어질 수 있다.
      ※ 재학습 시에도 아래 _build_context_text 와 '같은 형식'으로 맞춰야 한다.
"""

import asyncio
import logging
import os
from typing import Dict, List

from .config import EMOUR_LABELS, FALLBACK_LABEL
from .interfaces import EmotionLLM
from .schemas import ContextMessage, TargetMessage

logger = logging.getLogger(__name__)

_VALID = set(EMOUR_LABELS)


class KcElectraEmotionLLM(EmotionLLM):
    """파인튜닝한 KcELECTRA 로 target 문장들의 감정을 분류한다."""

    def __init__(self, model_path: str | None = None, max_len: int = 128) -> None:
        import torch  # 지연 import: mock/LLM 모드에선 torch 불필요
        from transformers import AutoModelForSequenceClassification, AutoTokenizer

        self._torch = torch
        self.max_len = max_len
        path = model_path or os.getenv("LOCAL_MODEL_PATH", "emour-emotion-kcelectra")
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        # 맥락 사용 스위치. 기본 OFF(단일 문장 모델 보호). 맥락 학습 모델 배포 후 .env 에서 켠다.
        self.use_context = os.getenv("LOCAL_USE_CONTEXT", "false").lower() in ("1", "true", "yes")

        self.tokenizer = AutoTokenizer.from_pretrained(path)
        self.model = (
            AutoModelForSequenceClassification.from_pretrained(path)
            .to(self.device)
            .eval()
        )
        # 모델이 저장한 id2label 을 정본으로 사용
        self.id2label = {int(k): v for k, v in self.model.config.id2label.items()}
        logger.info(
            "KcELECTRA 로드 완료 | path=%s | device=%s | labels=%d | use_context=%s",
            path, self.device, len(self.id2label), self.use_context,
        )

    @staticmethod
    def _build_context_text(context: List[ContextMessage]) -> str:
        """직전 대화를 '발화자: 내용' 줄들로 이어 붙인다(시간 오름차순).

        ⚠️ 재학습 시에도 반드시 이 형식과 똑같이 맥락을 만들어야 추론과 일치한다.
        """
        return "\n".join(f"{m.speaker}: {m.text}" for m in context)

    def _predict_sync(
        self, texts_a: List[str], texts_b: List[str] | None = None
    ) -> List[str]:
        torch = self._torch
        # 문장쌍이면 맥락(A)만 잘라 대상(B)은 온전히 보존. 단일이면 평소대로 뒤에서 자른다.
        truncation = "only_first" if texts_b is not None else True
        enc = self.tokenizer(
            texts_a, texts_b, padding=True, truncation=truncation,
            max_length=self.max_len, return_tensors="pt",
        ).to(self.device)
        with torch.no_grad():
            ids = self.model(**enc).logits.argmax(dim=-1).cpu().tolist()
        # 혹시 모를 라벨 이탈은 폴백으로 방어 (service.align_labels 와 이중 안전장치)
        return [
            self.id2label.get(i, FALLBACK_LABEL)
            if self.id2label.get(i, FALLBACK_LABEL) in _VALID
            else FALLBACK_LABEL
            for i in ids
        ]

    async def classify(
        self,
        context: List[ContextMessage],
        target: List[TargetMessage],
    ) -> List[Dict]:
        if not target:
            return []
        texts_b = [t.text for t in target]
        # 추론은 CPU/GPU 바운드라 이벤트 루프를 막지 않게 스레드로 오프로딩
        if self.use_context and context:
            # 같은 맥락을 각 대상 메시지에 짝지어 문장쌍 배치로 분류
            ctx = self._build_context_text(context)
            texts_a = [ctx] * len(texts_b)
            labels = await asyncio.to_thread(self._predict_sync, texts_a, texts_b)
        else:
            labels = await asyncio.to_thread(self._predict_sync, texts_b)
        return [{"index": i, "label": lab} for i, lab in enumerate(labels)]
