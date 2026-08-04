import { RefreshCw, Sparkles } from "lucide-react";
import styles from "./SuggestionChips.module.css";

export default function SuggestionChips({ suggestions, onSelect, onRefresh, loading }) {
  if (!suggestions?.length && !loading) return null;

  return (
    <div className={styles.wrap}>
      <div className={styles.header}>
        <span className={styles.title}>
          <Sparkles size={13} /> 문장 다듬기 추천 (입력한 문장을 더 자연스럽게)
        </span>
        <button type="button" className={styles.refreshBtn} onClick={onRefresh} aria-label="다시 추천받기">
          <RefreshCw size={13} />
          새로고침
        </button>
      </div>
      <div className={styles.chipRow}>
        {loading
          ? Array.from({ length: 3 }).map((_, i) => <div key={i} className={styles.skeletonChip} />)
          : suggestions.map((suggestion) => (
              <button
                key={`${suggestion.style}-${suggestion.text}`}
                type="button"
                className={styles.chip}
                onClick={() => onSelect(suggestion.text)}
              >
                {suggestion.label && (
                  <span className={styles.chipLabel}>{suggestion.label}</span>
                )}
                <span>{suggestion.text}</span>
              </button>
            ))}
      </div>
      <p className={styles.hint}>추천 문장을 탭하면 입력창에 반영돼요.</p>
    </div>
  );
}
