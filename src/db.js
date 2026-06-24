import localforage from 'localforage';
import { firestore, auth } from './firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

// データベースの設定
localforage.config({
  driver: localforage.INDEXEDDB, // IndexedDBを優先
  name: 'ObenkyouApp',
  version: 1.0,
  storeName: 'scores', // 保存先ストア名
  description: '学習スコア保存用'
});

export const db = {
  // クラウドとローカルの同期処理
  async syncDataWithCloud(userId) {
    if (!userId) return;
    try {
      console.log('Starting cloud sync for user:', userId);
      const userDocRef = doc(firestore, 'users', userId);
      const docSnap = await getDoc(userDocRef);
      const subjects = ['japanese', 'math', 'life', 'english'];
      
      let cloudData = {};
      if (docSnap.exists()) {
        cloudData = docSnap.data();
      }

      // 1. 各科目のスコア同期
      for (const subject of subjects) {
        const localScores = await localforage.getItem(subject) || [];
        const cloudScores = cloudData[subject] || [];
        
        // 重複を除外してマージ
        const mergedScores = this.mergeScores(localScores, cloudScores);
        
        // ローカルとクラウドの両方に保存
        await localforage.setItem(subject, mergedScores);
        cloudData[subject] = mergedScores;
      }

      // 2. 国語の進捗データの同期
      const localProgress = await localforage.getItem('japanese_progress') || {
        hiragana: { completed: [], currentIdx: 0 },
        katakana: { completed: [], currentIdx: 0 },
        kanji: { completed: [], currentIdx: 0 }
      };
      const cloudProgress = cloudData.japanese_progress || {
        hiragana: { completed: [], currentIdx: 0 },
        katakana: { completed: [], currentIdx: 0 },
        kanji: { completed: [], currentIdx: 0 }
      };

      const mergedProgress = this.mergeProgress(localProgress, cloudProgress);
      await localforage.setItem('japanese_progress', mergedProgress);
      cloudData.japanese_progress = mergedProgress;

      // 3. 生活習慣・自立支援データの同期
      const habitKeys = ['life_stamps', 'life_rhythm', 'life_goals'];
      for (const key of habitKeys) {
        const localData = await localforage.getItem(key);
        const cloudDataVal = cloudData[key];
        
        let mergedData;
        if (key === 'life_stamps') {
          mergedData = this.mergeStamps(localData || [], cloudDataVal || []);
        } else if (key === 'life_rhythm') {
          mergedData = this.mergeRhythm(localData || {}, cloudDataVal || {});
        } else if (key === 'life_goals') {
          mergedData = this.mergeGoals(localData || { goalText: '', seals: [] }, cloudDataVal || { goalText: '', seals: [] });
        }
        
        await localforage.setItem(key, mergedData);
        cloudData[key] = mergedData;
      }

      // クラウドに最終マージデータを保存
      await setDoc(userDocRef, cloudData, { merge: true });
      console.log('Cloud sync completed successfully for user:', userId);
    } catch (err) {
      console.error('Error syncing with cloud:', err);
    }
  },

  // スコア配列のマージ（重複除去）
  mergeScores(local, cloud) {
    const map = new Map();
    [...local, ...cloud].forEach(item => {
      // タイムスタンプ、または日付＋スコアで一意にする
      const key = item.timestamp || `${item.date}_${item.score}`;
      map.set(key, item);
    });
    return Array.from(map.values()).sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
  },

  // 進捗データのマージ
  mergeProgress(local, cloud) {
    const mergeCat = (locCat, cldCat) => {
      const completed = Array.from(new Set([...(locCat.completed || []), ...(cldCat.completed || [])]));
      const currentIdx = Math.max(locCat.currentIdx || 0, cldCat.currentIdx || 0);
      return { completed, currentIdx };
    };
    return {
      hiragana: mergeCat(local.hiragana, cloud.hiragana),
      katakana: mergeCat(local.katakana, cloud.katakana),
      kanji: mergeCat(local.kanji, cloud.kanji)
    };
  },

  // お手伝いスタンプのマージ（オブジェクト形式）
  mergeStamps(local, cloud) {
    const merged = { ...local };
    Object.keys(cloud).forEach(date => {
      if (merged[date]) {
        merged[date] = { ...merged[date] };
        Object.keys(cloud[date]).forEach(taskKey => {
          merged[date][taskKey] = merged[date][taskKey] || cloud[date][taskKey] || false;
        });
      } else {
        merged[date] = cloud[date];
      }
    });
    return merged;
  },

  // 生活リズムのマージ
  mergeRhythm(local, cloud) {
    const merged = { ...local };
    Object.keys(cloud).forEach(date => {
      if (merged[date]) {
        merged[date] = {
          wakeup: merged[date].wakeup || cloud[date].wakeup || false,
          breakfast: merged[date].breakfast || cloud[date].breakfast || false,
          teeth: merged[date].teeth || cloud[date].teeth || false,
          bath: merged[date].bath || cloud[date].bath || false,
          prep: merged[date].prep || cloud[date].prep || false,
          sleep: merged[date].sleep || cloud[date].sleep || false,
        };
      } else {
        merged[date] = cloud[date];
      }
    });
    return merged;
  },

  // 目標達成シールのマージ（画像・テキスト対応）
  mergeGoals(local, cloud) {
    const currentGoalImg = local.currentGoalImg || cloud.currentGoalImg || '';
    
    const chosens = { ...(local.chosens || {}) };
    Object.keys(cloud.chosens || {}).forEach(date => {
      if (chosens[date]) {
        chosens[date] = {
          challenge: chosens[date].challenge || cloud.chosens[date].challenge || '',
          achieved: chosens[date].achieved || cloud.chosens[date].achieved || ''
        };
      } else {
        chosens[date] = cloud.chosens[date];
      }
    });

    const map = new Map();
    [...(local.seals || []), ...(cloud.seals || [])].forEach(item => {
      const key = item.id || `${item.date}_${item.x}_${item.y}`;
      map.set(key, item);
    });
    const seals = Array.from(map.values());
    
    return { currentGoalImg, chosens, seals };
  },

  // スコアの取得（科目ごとのスコア配列）
  async getScores(subject) {
    try {
      const user = auth.currentUser;
      if (user) {
        // ログイン中の場合、まずFirestoreから取得を試みる
        try {
          const userDocRef = doc(firestore, 'users', user.uid);
          const docSnap = await getDoc(userDocRef);
          if (docSnap.exists()) {
            const data = docSnap.data();
            const cloudScores = data[subject] || [];
            // ローカルキャッシュを更新
            await localforage.setItem(subject, cloudScores);
            return cloudScores;
          }
        } catch (cloudErr) {
          console.warn('Failed to fetch from Cloud, using Local cache:', cloudErr);
        }
      }
      // 未ログインまたはオフライン時はローカルから取得
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
      const currentScores = await this.getScores(subject);
      const newScore = { ...scoreObj, timestamp: Date.now() };
      currentScores.push(newScore);
      
      // 1. ローカルに保存
      await localforage.setItem(subject, currentScores);

      // 2. ログイン中ならクラウドにも保存
      const user = auth.currentUser;
      if (user) {
        try {
          const userDocRef = doc(firestore, 'users', user.uid);
          await setDoc(userDocRef, { [subject]: currentScores }, { merge: true });
        } catch (cloudErr) {
          console.error('Failed to save to Cloud:', cloudErr);
        }
      }
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
    const defaultProgress = {
      hiragana: { completed: [], currentIdx: 0 },
      katakana: { completed: [], currentIdx: 0 },
      kanji: { completed: [], currentIdx: 0 }
    };
    try {
      const user = auth.currentUser;
      if (user) {
        try {
          const userDocRef = doc(firestore, 'users', user.uid);
          const docSnap = await getDoc(userDocRef);
          if (docSnap.exists()) {
            const data = docSnap.data();
            const cloudProgress = data.japanese_progress || defaultProgress;
            // ローカルキャッシュを更新
            await localforage.setItem('japanese_progress', cloudProgress);
            return cloudProgress;
          }
        } catch (cloudErr) {
          console.warn('Failed to fetch progress from Cloud, using Local cache:', cloudErr);
        }
      }
      const progress = await localforage.getItem('japanese_progress');
      return progress || defaultProgress;
    } catch (err) {
      console.error('Error fetching Japanese progress:', err);
      return defaultProgress;
    }
  },

  // 国語の進捗データの保存
  async saveJapaneseProgress(progress) {
    try {
      // 1. ローカルに保存
      await localforage.setItem('japanese_progress', progress);

      // 2. ログイン中ならクラウドにも保存
      const user = auth.currentUser;
      if (user) {
        try {
          const userDocRef = doc(firestore, 'users', user.uid);
          await setDoc(userDocRef, { japanese_progress: progress }, { merge: true });
        } catch (cloudErr) {
          console.error('Failed to save progress to Cloud:', cloudErr);
        }
      }
    } catch (err) {
      console.error('Error saving Japanese progress:', err);
    }
  },

  // 生活習慣データの取得
  async getLifeHabitData(key) {
    const defaultMap = {
      life_stamps: {},
      life_rhythm: {},
      life_goals: { currentGoalImg: '', chosens: {}, seals: [] }
    };
    const defaultVal = defaultMap[key] || null;
    try {
      const user = auth.currentUser;
      if (user) {
        try {
          const userDocRef = doc(firestore, 'users', user.uid);
          const docSnap = await getDoc(userDocRef);
          if (docSnap.exists()) {
            const data = docSnap.data();
            const cloudVal = data[key] || defaultVal;
            await localforage.setItem(key, cloudVal);
            return cloudVal;
          }
        } catch (cloudErr) {
          console.warn(`Failed to fetch ${key} from Cloud, using Local cache:`, cloudErr);
        }
      }
      const val = await localforage.getItem(key);
      return val || defaultVal;
    } catch (err) {
      console.error(`Error fetching ${key}:`, err);
      return defaultVal;
    }
  },

  // 生活習慣データの保存
  async saveLifeHabitData(key, data) {
    try {
      // 1. ローカルに保存
      await localforage.setItem(key, data);

      // 2. ログイン中ならクラウドにも保存
      const user = auth.currentUser;
      if (user) {
        try {
          const userDocRef = doc(firestore, 'users', user.uid);
          await setDoc(userDocRef, { [key]: data }, { merge: true });
        } catch (cloudErr) {
          console.error(`Failed to save ${key} to Cloud:`, cloudErr);
        }
      }
    } catch (err) {
      console.error(`Error saving ${key}:`, err);
    }
  },

  // バックアップデータの書き出し（手動用）
  async exportBackup() {
    try {
      const keys = ['japanese', 'math', 'life', 'english', 'japanese_progress', 'life_stamps', 'life_rhythm', 'life_goals'];
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

  // バックアップデータの読み込み（手動用）
  async importBackup(backupData) {
    try {
      if (!backupData || typeof backupData !== 'object') {
        throw new Error('Invalid backup data');
      }
      const keys = Object.keys(backupData);
      for (const key of keys) {
        await localforage.setItem(key, backupData[key]);
      }
      
      // もしログイン中なら、インポートしたデータをクラウドに即座に同期する
      const user = auth.currentUser;
      if (user) {
        await this.syncDataWithCloud(user.uid);
      }
      return true;
    } catch (err) {
      console.error('Error importing backup:', err);
      return false;
    }
  },

  // なぞり書きパスデータのキャッシュ取得
  async getCachedStroke(char) {
    try {
      const cached = await localforage.getItem(`stroke_${char}`);
      return cached; // { paths, numbers } or null
    } catch (err) {
      console.error('Error fetching cached stroke:', err);
      return null;
    }
  },

  // なぞり書きパスデータのキャッシュ保存
  async saveCachedStroke(char, data) {
    try {
      await localforage.setItem(`stroke_${char}`, data);
    } catch (err) {
      console.error('Error saving cached stroke:', err);
    }
  }
};
