// VOICEVOXのAPIを叩いて音声ファイル（.wav）を生成するスクリプト
// 実行前に、PCでVOICEVOXアプリを起動しておく必要があります。

import fs from 'fs';
import path from 'path';

// 保存先のディレクトリ
const outputDir = path.join(process.cwd(), 'public', 'voices');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// キャラクター（話者）のID
// 3: ずんだもん（ノーマル）, 2: 四国めたん（ノーマル）, 8: 春日部つむぎ（ノーマル）
const SPEAKER_ID = 3; 

// 生成したい音声のリスト
const voiceList = [
  { filename: 'home_select.wav', text: 'どれを、おべんきょうする？' },
  { filename: 'correct.wav', text: 'せいかい！すごいね！' },
  { filename: 'incorrect.wav', text: 'ざんねん、もういちどかんがえてみよう！' },
  { filename: 'finish.wav', text: 'よくできました！がんばりポイントをゲットしたよ！' },
  { filename: 'japanese_start.wav', text: 'おてほんをなぞって、きれいなじをかこう！' }
];

async function generateAudio(text, filename) {
  try {
    // 1. クエリの作成
    const queryRes = await fetch(`http://127.0.0.1:50021/audio_query?text=${encodeURIComponent(text)}&speaker=${SPEAKER_ID}`, {
      method: 'POST'
    });
    
    if (!queryRes.ok) {
      throw new Error(`クエリ作成失敗: ${queryRes.statusText}`);
    }
    const queryJson = await queryRes.json();

    // 少し話すスピードをゆっくりにするなど、クエリのパラメータ調整も可能
    queryJson.speedScale = 0.9;

    // 2. 音声合成
    const synthRes = await fetch(`http://127.0.0.1:50021/synthesis?speaker=${SPEAKER_ID}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(queryJson)
    });

    if (!synthRes.ok) {
      throw new Error(`音声合成失敗: ${synthRes.statusText}`);
    }

    const arrayBuffer = await synthRes.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 3. ファイルに保存
    const outputPath = path.join(outputDir, filename);
    fs.writeFileSync(outputPath, buffer);
    console.log(`✅ 作成完了: ${filename} (${text})`);

  } catch (error) {
    console.error(`❌ エラー (${filename}):`, error.message);
    console.log('VOICEVOXアプリが起動しているか確認してください。');
  }
}

async function main() {
  console.log('VOICEVOXによる音声生成を開始します...');
  for (const item of voiceList) {
    await generateAudio(item.text, item.filename);
  }
  console.log('すべての処理が完了しました！');
}

main();
