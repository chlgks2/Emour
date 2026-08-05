import { useRef, useState } from "react";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Blend,
  Check,
  GripHorizontal,
  ImagePlus,
  Type,
  X,
} from "lucide-react";
import styles from "./HomeEditPage.module.css";

const ALIGNS = [
  { key: "left", label: "왼쪽 정렬", Icon: AlignLeft },
  { key: "center", label: "가운데 정렬", Icon: AlignCenter },
  { key: "right", label: "오른쪽 정렬", Icon: AlignRight },
];

const LEGACY_FONT_SIZE = { sm: 15, md: 19, lg: 24 };
const LEGACY_BOX_TRANSPARENCY = { none: 100, dim: 60, solid: 20 };
const clampXPercent = (value) => Math.min(94, Math.max(6, value));
// 홈 상단의 날짜·커플 프로필과 문구 박스가 겹치지 않는 안전 영역.
const clampYPercent = (value) => Math.min(94, Math.max(30, value));

// 인스타그램 스토리 업로드 화면 참고: 사진 위에서 문구 박스를 직접 드래그해서
// 위치를 잡고, 아래 컨트롤에서 문구/크기/정렬/배경 톤/글자색을 고른다.
export default function HomeEditPage({ initial, onCancel, onSave }) {
  const [imageFile, setImageFile] = useState(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState(initial?.imageUrl ?? "");
  const [caption, setCaption] = useState(initial?.caption ?? "");
  const initialPosition = initial?.captionPosition ?? { xPercent: 50, yPercent: 72 };
  const [position, setPosition] = useState({
    xPercent: clampXPercent(Number(initialPosition.xPercent) || 50),
    yPercent: clampYPercent(Number(initialPosition.yPercent) || 72),
  });
  const initialStyle = initial?.captionStyle ?? {};
  const [style, setStyle] = useState({
    fontSizePx: Number(initialStyle.fontSizePx) || LEGACY_FONT_SIZE[initialStyle.fontSize] || 19,
    backgroundTransparency: Number.isFinite(Number(initialStyle.backgroundTransparency))
      ? Number(initialStyle.backgroundTransparency)
      : LEGACY_BOX_TRANSPARENCY[initialStyle.box] ?? 60,
    align: initialStyle.align ?? "left",
    color: initialStyle.color ?? "#ffffff",
  });
  const [fontSizeInput, setFontSizeInput] = useState(String(
    Number(initialStyle.fontSizePx) || LEGACY_FONT_SIZE[initialStyle.fontSize] || 19,
  ));
  const [transparencyInput, setTransparencyInput] = useState(String(
    Number.isFinite(Number(initialStyle.backgroundTransparency))
      ? Number(initialStyle.backgroundTransparency)
      : LEGACY_BOX_TRANSPARENCY[initialStyle.box] ?? 60,
  ));
  const [saving, setSaving] = useState(false);

  const stageRef = useRef(null);
  const draggingRef = useRef(false);
  const fileInputRef = useRef(null);

  const updatePositionFromPointer = (clientX, clientY) => {
    const rect = stageRef.current?.getBoundingClientRect();
    if (!rect) return;
    setPosition({
      xPercent: clampXPercent(((clientX - rect.left) / rect.width) * 100),
      yPercent: clampYPercent(((clientY - rect.top) / rect.height) * 100),
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
    background: `rgba(20, 20, 20, ${1 - style.backgroundTransparency / 100})`,
  };

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
          className={styles.captionBox}
          style={boxInlineStyle}
        >
          <div className={styles.captionToolbar} aria-label="문구 스타일 편집">
            <label className={styles.toolbarField} title="글자 크기">
              <Type size={14} aria-hidden="true" />
              <input type="number" min="10" max="48" value={fontSizeInput}
                onChange={(event) => {
                  const value = event.target.value;
                  setFontSizeInput(value);
                  if (value !== "") setStyle((current) => ({
                    ...current,
                    fontSizePx: Math.min(48, Math.max(10, Number(value) || 10)),
                  }));
                }}
                onBlur={() => setFontSizeInput(String(style.fontSizePx))} />
              <span>px</span>
            </label>
            <label className={styles.toolbarField} title="배경 투명도">
              <Blend size={14} aria-hidden="true" />
              <input type="number" min="0" max="100" value={transparencyInput}
                onChange={(event) => {
                  const value = event.target.value;
                  setTransparencyInput(value);
                  if (value !== "") setStyle((current) => ({
                    ...current,
                    backgroundTransparency: Math.min(100, Math.max(0, Number(value) || 0)),
                  }));
                }}
                onBlur={() => setTransparencyInput(String(style.backgroundTransparency))} />
              <span>%</span>
            </label>
            <label className={styles.colorField} title="글자색" aria-label="글자색 선택">
              <input type="color" value={style.color}
                onChange={(event) => setStyle((current) => ({ ...current, color: event.target.value }))} />
            </label>
            <span className={styles.toolbarDivider} aria-hidden="true" />
            <div className={styles.alignButtons} aria-label="문구 정렬">
              {ALIGNS.map(({ key, label, Icon }) => (
                <button key={key} type="button" aria-label={label} aria-pressed={style.align === key}
                  className={style.align === key ? styles.toolbarButtonActive : ""}
                  onClick={() => setStyle((current) => ({ ...current, align: key }))}>
                  <Icon size={15} aria-hidden="true" />
                </button>
              ))}
            </div>
          </div>
          <textarea
            className={styles.captionInlineInput}
            aria-label="홈 화면 문구"
            placeholder="문구를 입력해보세요"
            value={caption}
            maxLength={60}
            rows={1}
            style={{ fontSize: `${style.fontSizePx}px` }}
            onChange={(event) => {
              setCaption(event.target.value);
              event.target.style.height = "auto";
              event.target.style.height = `${event.target.scrollHeight}px`;
            }}
          />
          <button
            type="button"
            className={styles.captionMoveHandle}
            aria-label="문구 박스 위치 이동"
            onPointerDown={handleBoxPointerDown}
            onPointerUp={handleBoxPointerUp}
          >
            <GripHorizontal size={18} aria-hidden="true" />
          </button>
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

    </div>
  );
}
