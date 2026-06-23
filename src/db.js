import localforage from 'localforage';

// データベースの設定
localforage.config({
  driver: localforage.INDEXEDDB, // IndexedDBを優先
  name: 'ObenkyouApp',
  version: 1.0,
  storeName: 'scores', // 保存先ストア名
  description: '学習スコア保存用'
});

export const db = {
  // スコアの取得（科目ごとのスコア配列）
  async getScores(subject) {
    try {
      const scores = await localforage.getItem(subject);
      return scores || [];
    } catch (err) {
      console.error('Error fetching scores:', err);
      return [];
    }
  },

  // スコアの保存
  async saveScore(subject, scoreObj) {
    try {
      // scoreObj は { date: 'YYYY-MM-DD', score: 100 } のような形式
      const currentScores = await this.getScores(subject);
      currentScores.push({ ...scoreObj, timestamp: Date.now() });
      await localforage.setItem(subject, currentScores);
    } catch (err) {
      console.error('Error saving score:', err);
    }
  },

  // 全科目のスコアを取得（グラフ用など）
  async getAllScores() {
    const subjects = ['japanese', 'math', 'life', 'english'];
    const allData = {};
    for (const sub of subjects) {
      allData[sub] = await this.getScores(sub);
    }
    return allData;
  },

  // 国語の進捗データの取得
  async getJapaneseProgress() {
    try {
      const progress = await localforage.getItem('japanese_progress');
      return progress || {
        hiragana: { completed: [], currentIdx: 0 },
        katakana: { completed: [], currentIdx: 0 },
        kanji: { completed: [], currentIdx: 0 }
      };
    } catch (err) {
      console.error('Error fetching Japanese progress:', err);
      return {
        hiragana: { completed: [], currentIdx: 0 },
        katakana: { completed: [], currentIdx: 0 },
        kanji: { completed: [], currentIdx: 0 }
      };
    }
  },

  // 国語の進捗データの保存
  async saveJapaneseProgress(progress) {
    try {
      await localforage.setItem('japanese_progress', progress);
    } catch (err) {
      console.error('Error saving Japanese progress:', err);
    }
  },

  // バックアップデータの書き出し
  async exportBackup() {
    try {
      const keys = ['japanese', 'math', 'life', 'english', 'japanese_progress'];
      const backup = {};
      for (const key of keys) {
        const val = await localforage.getItem(key);
        backup[key] = val;
      }
      return backup;
    } catch (err) {
      console.error('Error exporting backup:', err);
      return null;
    }
  },

  // バックアップデータの読み込み
  async importBackup(backupData) {
    try {
      if (!backupData || typeof backupData !== 'object') {
        throw new Error('Invalid backup data');
      }
      const keys = Object.keys(backupData);
      for (const key of keys) {
        await localforage.setItem(key, backupData[key]);
      }
      return true;
    } catch (err) {
      console.error('Error importing backup:', err);
      return false;
    }
  }
};
