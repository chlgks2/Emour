FROM python:3.11-slim
WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
      build-essential curl && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
# 현재 LLM-only + 목업 단계 → torch 미설치. KOTE 도입 시 아래 원본으로 복원.
RUN pip install --no-cache-dir -r requirements.txt
# RUN pip install --no-cache-dir \
#       --extra-index-url https://download.pytorch.org/whl/cpu \
#       -r requirements.txt

# ⭐ KOTE 모델을 빌드 시점에 미리 다운로드 (컨테이너 뜰 때마다 받지 않게)
# RUN python -c "\
# from transformers import AutoTokenizer, AutoModelForSequenceClassification; \
# m='searle-j/kote_for_easygoing_people'; \
# AutoTokenizer.from_pretrained(m); \
# AutoModelForSequenceClassification.from_pretrained(m)"

COPY . .
RUN useradd -m appuser && chown -R appuser:appuser /app
USER appuser
EXPOSE 8000
HEALTHCHECK --interval=30s --timeout=5s --start-period=90s --retries=3 \
  CMD curl -f http://localhost:8000/health || exit 1

# 모델을 메모리에 올리므로 워커 1개 (여러 개면 모델 중복 로드)
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "1"]