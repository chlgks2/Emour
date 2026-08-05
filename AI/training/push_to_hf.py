# -*- coding: utf-8 -*-
"""
파인튜닝 모델을 Hugging Face Hub 에 업로드한다.

사전:  1) huggingface.co 가입 → Access Token(Write) 발급
       2) set HF_USERNAME=본인아이디   /   set HF_TOKEN=hf_xxx
usage: python push_to_hf.py <model_dir>   (repo 이름 = 모델 폴더명)
"""
import os, sys
from huggingface_hub import HfApi, create_repo

DATA_DIR = os.environ.get("EMOUR_DATA_DIR", os.path.join(os.path.dirname(os.path.abspath(__file__)), "data"))
_p = lambda n: n if os.path.isabs(n) else os.path.join(DATA_DIR, n)

PRIVATE = False   # False=공개(서버에 토큰 불필요, 배포 간단) / True=비공개(서버에 HF_TOKEN 필요)

def main():
    if len(sys.argv) < 2:
        sys.exit("usage: python push_to_hf.py <model_dir>")
    model_dir = _p(sys.argv[1])
    user = os.environ.get("HF_USERNAME")
    token = os.environ.get("HF_TOKEN")
    if not user:
        sys.exit("먼저 set HF_USERNAME=본인아이디 (그리고 set HF_TOKEN=hf_xxx)")

    repo_id = f"{user}/{os.path.basename(model_dir.rstrip(os.sep))}"
    print(f"업로드: {model_dir} → {repo_id} (private={PRIVATE})")
    create_repo(repo_id, private=PRIVATE, exist_ok=True, token=token)
    HfApi(token=token).upload_folder(
        folder_path=model_dir, repo_id=repo_id,
        ignore_patterns=["checkpoint-*", "checkpoint-*/*", "runs*", "*.pt",
                         "optimizer*", "scheduler*", "trainer_state*", "rng_state*"],
    )
    print(f"\n✅ 완료 → https://huggingface.co/{repo_id}")
    print(f"   서버 설정:  LLM_PROVIDER=local  /  LOCAL_MODEL_PATH={repo_id}")

if __name__ == "__main__":
    main()
