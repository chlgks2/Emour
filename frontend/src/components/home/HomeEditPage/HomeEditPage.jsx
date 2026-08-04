import { useRef, useState } from "react";
import { X, Check, ImagePlus } from "lucide-react";
import styles from "./HomeEditPage.module.css";

const FONT_SIZES = [
  { key: "sm", label: "작게" },
  { key: "md", label: "보통" },
  { key: "lg", label: "크게" },
];

const ALIGNS = [
  { key: "left", label: "왼쪽" },
  { key: "center", label: "가운데" },
  { key: "right", label: "오른쪽" },
];

const BOX_TONES = [
  { key: "dim", label: "반투명" },
  { key: "solid", label: "진하게" },
  { key: "none", label: "없음" },
];

const TEXT_COLORS = [
  { key: "#ffffff", label: "흰색" },
  { key: "#1c1c1c", label: "검정" },
];

// 인스타그램 스토리 업로드 화면 참고: 사진 위에서 문구 박스를 직접 드래그해서
// 위치를 잡고, 아래 컨트롤에서 문구/크기/정렬/배경 톤/글자색을 고른다.
export default function HomeEditPage({ initial, onCancel, onSave }) {
  const [imageFile, setImageFile] = useState(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState(initial?.imageUrl ?? "");
  const [caption, setCaption] = useState(initial?.caption ?? "");
  const [position, setPosition] = useState(initial?.captionPosition ?? { xPercent: 50, yPercent: 72 });
  const [style, setStyle] = useState(
    initial?.captionStyle ?? { fontSize: "md", align: "left", box: "dim", color: "#ffffff" }
  );
  const [saving, setSaving] = useState(false);

  const stageRef = useRef(null);
  const draggingRef = useRef(false);
  const fileInputRef = useRef(null);

  const clampPercent = (v) => Math.min(94, Math.max(6, v));

  const updatePositionFromPointer = (clientX, clientY) => {
    const rect = stageRef.current?.getBoundingClientRect();
    if (!rect) return;
    setPosition({
      xPercent: clampPercent(((clientX - rect.left) / rect.width) * 100),
      yPercent: clampPercent(((clientY - rect.top) / rect.height) * 100),
    });
  };

  const handleBoxPointerDown = (e) => {
    draggingRef.current = true;
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handleStagePointerMove = (e) => {
    if (!draggingRef.current) return;
    updatePositionFromPointer(e.clientX, e.clientY);
  };

  const handleBoxPointerUp = (e) => {
    draggingRef.current = false;
    e.currentTarget.releasePointerCapture(e.pointerId);
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setImagePreviewUrl(URL.createObjectURL(file));
  };

  const handleSave = async () => {
    if (saving) return;
    setSaving(true);
    try {
      // onSave 가 실패하면 false 를 돌려주므로(부모가 토스트 표시) 편집 화면을 열어둔 채로 남긴다.
      await onSave({
        imageFile,
        imageUrl: imagePreviewUrl,
        caption,
        captionPosition: position,
        captionStyle: style,
      });
    } finally {
      setSaving(false);
    }
  };

  const boxInlineStyle = {
    left: `${position.xPercent}%`,
    top: `${position.yPercent}%`,
    textAlign: style.align,
    color: style.color,
  };

  const boxToneClass =
    style.box === "solid" ? styles.captionBoxSolid : style.box === "none" ? styles.captionBoxNone : styles.captionBoxDim;

  const fontSizeClass =
    style.fontSize === "lg" ? styles.captionLg : style.fontSize === "sm" ? styles.captionSm : styles.captionMd;

  return (
    <div className={styles.overlay}>
      <div className={styles.topBar}>
        <button type="button" className={styles.iconBtn} onClick={onCancel} aria-label="취소">
          <X size={22} />
        </button>
        <button
          type="button"
          className={styles.saveBtn}
          onClick={handleSave}
          disabled={saving}
          aria-busy={saving}
        >
          <Check size={16} aria-hidden="true" />
          {saving ? "저장 중" : "완료"}
        </button>
      </div>

      <div ref={stageRef} className={styles.stage} onPointerMove={handleStagePointerMove}>
        {imagePreviewUrl && <img src={imagePreviewUrl} alt="" className={styles.stagePhoto} />}
        <div className={styles.stageGradient} />

        <div
          className={`${styles.captionBox} ${fontSizeClass} ${boxToneClass}`}
          style={boxInlineStyle}
          onPointerDown={handleBoxPointerDown}
          onPointerUp={handleBoxPointerUp}
        >
          <p className={styles.captionPreviewText}>{caption || "문구를 입력해보세요"}</p>
        </div>

        <button type="button" className={styles.pickPhotoBtn} onClick={() => fileInputRef.current?.click()}>
          <ImagePlus size={16} />
          사진 변경
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className={styles.hiddenInput}
          onChange={handleFileChange}
        />
      </div>

      <div className={styles.controls}>
        <textarea
          className={styles.captionInput}
          placeholder="홈 화면에 보여줄 문구를 입력하세요"
          value={caption}
          maxLength={60}
          onChange={(e) => setCaption(e.target.value)}
        />

        <div className={styles.controlRow}>
          <span className={styles.controlLabel}>크기</span>
          {FONT_SIZES.map((opt) => (
            <button
              key={opt.key}
              type="button"
              className={`${styles.pill} ${style.fontSize === opt.key ? styles.pillActive : ""}`}
              onClick={() => setStyle((s) => ({ ...s, fontSize: opt.key }))}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <div className={styles.controlRow}>
          <span className={styles.controlLabel}>정렬</span>
          {ALIGNS.map((opt) => (
            <button
              key={opt.key}
              type="button"
              className={`${styles.pill} ${style.align === opt.key ? styles.pillActive : ""}`}
              onClick={() => setStyle((s) => ({ ...s, align: opt.key }))}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <div className={styles.controlRow}>
          <span className={styles.controlLabel}>배경</span>
          {BOX_TONES.map((opt) => (
            <button
              key={opt.key}
              type="button"
              className={`${styles.pill} ${style.box === opt.key ? styles.pillActive : ""}`}
              onClick={() => setStyle((s) => ({ ...s, box: opt.key }))}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <div className={styles.controlRow}>
          <span className={styles.controlLabel}>글자색</span>
          {TEXT_COLORS.map((opt) => (
            <button
              key={opt.key}
              type="button"
              className={`${styles.pill} ${style.color === opt.key ? styles.pillActive : ""}`}
              onClick={() => setStyle((s) => ({ ...s, color: opt.key }))}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
