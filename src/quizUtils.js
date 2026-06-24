/**
 * クイズのプールから、履歴を考慮し、かつ正解ができるだけ多様になるように問題を選び出します。
 * 
 * @param {Array} pool - 問題の全配列
 * @param {number} count - 抽出する問題数
 * @param {string} historyKey - localStorageに保存する際のキー名
 * @param {string} identityProp - 問題を一意に特定するプロパティ名 (例: 'q', 'sentence', 'word')
 * @param {boolean} enforceDiverseAnswers - 正解 (answer) の重複を避けるかどうか
 * @returns {Array} 選出された問題の配列
 */
export const selectQuizzes = (pool, count, historyKey, identityProp = 'q', enforceDiverseAnswers = false) => {
  if (!pool || pool.length === 0) return [];
  
  // 1. 履歴の読み込み
  let history = [];
  try {
    const saved = localStorage.getItem(historyKey);
    if (saved) {
      history = JSON.parse(saved);
    }
  } catch (e) {
    console.error('Failed to load quiz history', e);
  }

  // pool をディープコピーしてシャッフルする
  const shuffledPool = [...pool].sort(() => Math.random() - 0.5);

  const selected = [];
  const usedAnswers = new Set();

  // 履歴にない問題を抽出する関数
  const extract = (filterFn) => {
    for (const q of shuffledPool) {
      if (selected.length >= count) break;
      const idValue = q[identityProp];
      if (selected.includes(q)) continue;
      
      // 履歴に含まれているか判定
      const inHistory = history.includes(idValue);
      
      if (filterFn(q, inHistory)) {
        selected.push(q);
        if (enforceDiverseAnswers && q.answer) {
          usedAnswers.add(q.answer);
        }
      }
    }
  };

  // パス 1: 履歴になく、正解 (answer) も重複しないものを最優先
  if (enforceDiverseAnswers) {
    extract((q, inHistory) => !inHistory && !usedAnswers.has(q.answer));
  } else {
    extract((q, inHistory) => !inHistory);
  }

  // パス 2: (正解多様性ありの場合のみ) 履歴にはないが、正解の重複は許容する
  if (enforceDiverseAnswers && selected.length < count) {
    extract((q, inHistory) => !inHistory);
  }

  // パス 3: 履歴にあるが、正解が重複しないものを許容
  if (enforceDiverseAnswers && selected.length < count) {
    extract((q, inHistory) => inHistory && !usedAnswers.has(q.answer));
  }

  // パス 4: 残りを埋める（履歴にあり、正解重複も許容）
  if (selected.length < count) {
    extract(() => true);
  }

  // 新しい履歴の保存 (直近の履歴として、今回の出題分を保存)
  const newHistory = [...history];
  for (const q of selected) {
    const idValue = q[identityProp];
    if (idValue === undefined || idValue === null) continue;
    const idx = newHistory.indexOf(idValue);
    if (idx !== -1) {
      newHistory.splice(idx, 1); // 古い位置から削除
    }
    newHistory.push(idValue); // 末尾に追加
  }

  // プール数の半分以下、かつ最大10件程度に履歴を制限（過去の問題が全く出なくなるのを防ぐため）
  const maxHistorySize = Math.max(1, Math.min(Math.floor(pool.length / 2), 10));
  if (newHistory.length > maxHistorySize) {
    newHistory.splice(0, newHistory.length - maxHistorySize);
  }

  try {
    localStorage.setItem(historyKey, JSON.stringify(newHistory));
  } catch (e) {
    console.error('Failed to save quiz history', e);
  }

  return selected;
};
