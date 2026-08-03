"""
로컬 파인튜닝 모델(KcELECTRA) 구현체.

기존 LLM(OpenAI 등)과 '완전히 같은 계약'(EmotionLLM.classify)을 지키므로,
LLM_PROVIDER=local 로 바꾸기만 하면 백엔드·프론트는 아무것도 안 고쳐도 된다.

지금은 '메시지 1건당 감정 1개'(단일 문장 분류)만 한다. context 는 받지만 사용하지 않는다.
→ 추후 여러 메시지/맥락을 활용하는 버전으로 확장할 자리를 열어둔다.
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

        self.tokenizer = AutoTokenizer.from_pretrained(path)
        self.model = (
            AutoModelForSequenceClassification.from_pretrained(path)
            .to(self.device)
            .eval()
        )
        # 모델이 저장한 id2label 을 정본으로 사용
        self.id2label = {int(k): v for k, v in self.model.config.id2label.items()}
        logger.info(
            "KcELECTRA 로드 완료 | path=%s | device=%s | labels=%d",
            path, self.device, len(self.id2label),
        )

    def _predict_sync(self, texts: List[str]) -> List[str]:
        torch = self._torch
        enc = self.tokenizer(
            texts, padding=True, truncation=True,
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
        context: List[ContextMessage],   # 지금은 미사용 (단일 문장 분류)
        target: List[TargetMessage],
    ) -> List[Dict]:
        if not target:
            return []
        texts = [t.text for t in target]
        # 추론은 CPU/GPU 바운드라 이벤트 루프를 막지 않게 스레드로 오프로딩
        labels = await asyncio.to_thread(self._predict_sync, texts)
        return [{"index": i, "label": lab} for i, lab in enumerate(labels)]
