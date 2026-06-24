import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import StrokeOrderCanvas from '../components/StrokeOrderCanvas';
import { CharacterSVG } from '../CharacterSVG';
import { playCorrectSound, playFinishSound } from '../audio';
import { db } from '../db';
import { hiraganaList, katakanaList, kanjiList, kanjiDetails } from '../data/charList';

const Japanese = () => {
  const navigate = useNavigate();

  // 画面モード: 'menu' (メニュー) または 'practice' (なぞり書き練習中)
  const [viewMode, setViewMode] = useState('menu');
  // カテゴリ: 'hiragana' | 'katakana' | 'kanji'
  const [category, setCategory] = useState('hiragana');
  // プレイモード: 'game' (ステップアップ) | 'select' (えらんで練習)
  const [playMode, setPlayMode] = useState('game');

  // 練習中の文字
  const [activeChar, setActiveChar] = useState('');
  
  // データベースからの進行状況
  const [progress, setProgress] = useState({
    hiragana: { completed: [], currentIdx: 0 },
    katakana: { completed: [], currentIdx: 0 },
    kanji: { completed: [], currentIdx: 0 }
  });
  
  // がんばりポイント (トータルスコア)
  const [score, setScore] = useState(0);

  // なぞり書き成功時の演出オーバーレイ
  const [showSuccess, setShowSuccess] = useState(false);

  // 初期データの読み込み
  useEffect(() => {
    const loadData = async () => {
      const prog = await db.getJapaneseProgress();
      setProgress(prog);

      const scores = await db.getScores('japanese');
      const totalScore = scores.reduce((sum, s) => sum + (s.score || 0), 0);
      setScore(totalScore);
    };
    loadData();
  }, []);

  // カテゴリに対応する文字リストを取得
  const getCharList = (cat) => {
    if (cat === 'hiragana') return hiraganaList;
    if (cat === 'katakana') return katakanaList;
    return kanjiList;
  };

  const getCategoryLabel = (cat) => {
    if (cat === 'hiragana') return 'ひらがな';
    if (cat === 'katakana') return 'カタカナ';
    return 'かんじ（1ねんせい）';
  };

  // 練習開始
  const startPractice = (char) => {
    setActiveChar(char);
    setViewMode('practice');
    setShowSuccess(false);
  };

  // なぞり書き完了時の処理
  const handleFinishDraw = async () => {
    playCorrectSound();
    
    // スコアの保存（1文字クリアで +10 ポイント）
    setScore(s => s + 10);
    await db.saveScore('japanese', { score: 10, date: new Date().toLocaleDateString() });

    // 進捗データの更新
    const catData = progress[category];
    const charList = getCharList(category);
    const charIdx = charList.indexOf(activeChar);

    const newCompleted = [...catData.completed];
    if (!newCompleted.includes(activeChar)) {
      newCompleted.push(activeChar);
    }

    let newCurrentIdx = catData.currentIdx;
    // 現在挑戦中のステージをクリアした場合、次のステージをアンロック
    if (charIdx === catData.currentIdx && catData.currentIdx < charList.length - 1) {
      newCurrentIdx = catData.currentIdx + 1;
    }

    const newProgress = {
      ...progress,
      [category]: {
        completed: newCompleted,
        currentIdx: newCurrentIdx
      }
    };

    setProgress(newProgress);
    await db.saveJapaneseProgress(newProgress);

    // 成功アニメーションを表示
    setShowSuccess(true);
  };

  // 次の文字へ進む (ゲームモード用)
  const handleNextChar = () => {
    const charList = getCharList(category);
    const currentIdx = charList.indexOf(activeChar);
    
    if (currentIdx < charList.length - 1) {
      startPractice(charList[currentIdx + 1]);
    } else {
      // カテゴリ全クリア
      playFinishSound();
      alert(`おめでとう！ ${getCategoryLabel(category)} を ぜんぶクリアしたよ！`);
      setViewMode('menu');
    }
  };

  // 進捗リセット機能 (動作確認ややり直し用)
  const handleResetProgress = async () => {
    if (window.confirm('これまでの すすんだデータを ぜんぶ消して、はじめから やりなおす？')) {
      const resetData = {
        hiragana: { completed: [], currentIdx: 0 },
        katakana: { completed: [], currentIdx: 0 },
        kanji: { completed: [], currentIdx: 0 }
      };
      setProgress(resetData);
      await db.saveJapaneseProgress(resetData);
    }
  };

  // --- UI レンダリングパーツ ---

  // カテゴリ切り替えタブ
  const renderTabs = () => (
    <div style={{ display: 'flex', background: '#e2e8f0', borderRadius: '16px', padding: '6px', marginBottom: '20px', gap: '4px' }}>
      {['hiragana', 'katakana', 'kanji'].map((cat) => {
        const isActive = category === cat;
        return (
          <button
            key={cat}
            onClick={() => setCategory(cat)}
            style={{
              flex: 1,
              background: isActive ? 'white' : 'transparent',
              border: 'none',
              borderRadius: '12px',
              padding: '12px 8px',
              fontWeight: 'bold',
              fontSize: '1rem',
              color: isActive ? 'var(--primary-color)' : '#475569',
              cursor: 'pointer',
              boxShadow: isActive ? '0 4px 10px rgba(0,0,0,0.05)' : 'none',
              transition: 'all 0.2s ease'
            }}
          >
            {cat === 'hiragana' ? 'あいうえお' : cat === 'katakana' ? 'アイウエオ' : 'かんじ'}
          </button>
        );
      })}
    </div>
  );

  // プレイモード切り替え (トグル)
  const renderModeSelector = () => (
    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '25px' }}>
      <div 
        style={{ 
          display: 'inline-flex', 
          background: 'rgba(255,255,255,0.8)', 
          borderRadius: '50px', 
          padding: '4px',
          boxShadow: '0 4px 15px rgba(0,0,0,0.05)',
          border: '1px solid rgba(0,0,0,0.05)'
        }}
      >
        <button
          onClick={() => setPlayMode('game')}
          style={{
            background: playMode === 'game' ? 'linear-gradient(135deg, #FF6B6B 0%, #FF8E53 100%)' : 'transparent',
            color: playMode === 'game' ? 'white' : '#64748b',
            border: 'none',
            borderRadius: '50px',
            padding: '10px 20px',
            fontSize: '0.95rem',
            fontWeight: 'bold',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            boxShadow: playMode === 'game' ? '0 4px 10px rgba(255,107,107,0.3)' : 'none'
          }}
        >
          🎮 ステップアップ
        </button>
        <button
          onClick={() => setPlayMode('select')}
          style={{
            background: playMode === 'select' ? 'linear-gradient(135deg, #4ECDC4 0%, #2AB7CA 100%)' : 'transparent',
            color: playMode === 'select' ? 'white' : '#64748b',
            border: 'none',
            borderRadius: '50px',
            padding: '10px 20px',
            fontSize: '0.95rem',
            fontWeight: 'bold',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            boxShadow: playMode === 'select' ? '0 4px 10px rgba(78,205,196,0.3)' : 'none'
          }}
        >
          🔍 えらんでれんしゅう
        </button>
      </div>
    </div>
  );

  // キャラクターのフキダシ応援メッセージ
  const getSupportMessage = () => {
    const catData = progress[category];
    const total = getCharList(category).length;
    const completedCount = catData.completed.length;

    if (completedCount === total) {
      return `すごい！ ${getCategoryLabel(category)} を ぜんぶクリアしたよ！てんさいだね！`;
    }
    
    if (playMode === 'game') {
      const nextChar = getCharList(category)[catData.currentIdx];
      return `つぎは 「${nextChar}」 に ちょうせんしてみよう！`;
    } else {
      return `れんしゅう したい もじ を クリックしてね！`;
    }
  };

  // メニュー画面の描画
  const renderMenu = () => {
    const charList = getCharList(category);
    const catData = progress[category];

    return (
      <div>
        {renderTabs()}
        {renderModeSelector()}

        {/* キャラクターと応援メッセージ */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '20px', margin: '20px 0', padding: '15px', background: 'rgba(255,255,255,0.4)', borderRadius: '20px' }}>
          <CharacterSVG type="normal" width={70} height={70} />
          <div style={{
            position: 'relative',
            background: 'white',
            border: '2px solid #e2e8f0',
            borderRadius: '16px',
            padding: '12px 18px',
            fontSize: '1rem',
            fontWeight: 'bold',
            color: '#334155',
            maxWidth: '300px',
            boxShadow: '0 4px 10px rgba(0,0,0,0.02)'
          }}>
            <div style={{
              position: 'absolute',
              left: '-10px',
              top: '50%',
              transform: 'translateY(-50%) rotate(45deg)',
              width: '16px',
              height: '16px',
              background: 'white',
              borderLeft: '2px solid #e2e8f0',
              borderBottom: '2px solid #e2e8f0'
            }} />
            {getSupportMessage()}
          </div>
        </div>

        {/* 進捗ゲージ */}
        <div style={{ margin: '20px auto', maxWidth: '400px', textAlign: 'center' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', color: '#64748b', marginBottom: '6px', fontWeight: 'bold' }}>
            <span>クリアしたもじ</span>
            <span>{catData.completed.length} / {charList.length} もじ</span>
          </div>
          <div style={{ width: '100%', height: '12px', background: '#e2e8f0', borderRadius: '10px', overflow: 'hidden' }}>
            <div 
              style={{ 
                width: `${(catData.completed.length / charList.length) * 100}%`, 
                height: '100%', 
                background: 'linear-gradient(90deg, #4ECDC4 0%, #2AB7CA 100%)',
                borderRadius: '10px',
                transition: 'width 0.5s ease-out'
              }} 
            />
          </div>
        </div>

        {/* 文字ステージ一覧 */}
        <div 
          style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fill, minmax(55px, 1fr))', 
            gap: '12px', 
            background: 'white', 
            padding: '24px', 
            borderRadius: '24px',
            boxShadow: 'inset 0 4px 10px rgba(0,0,0,0.02)',
            maxHeight: '400px',
            overflowY: 'auto'
          }}
        >
          {charList.map((char, index) => {
            const isCompleted = catData.completed.includes(char);
            const isCurrent = index === catData.currentIdx;
            const isLocked = playMode === 'game' && index > catData.currentIdx;

            // ボタンのスタイル設定
            let btnBg = 'white';
            let btnBorder = '2px solid #e2e8f0';
            let btnColor = '#475569';
            let btnShadow = 'none';
            let cursor = 'pointer';

            if (isCompleted) {
              btnBg = 'linear-gradient(135deg, #E8F9FD 0%, #C4EDDE 100%)';
              btnBorder = '2px solid #4ECDC4';
              btnColor = '#1A535C';
            } else if (isCurrent && playMode === 'game') {
              btnBg = 'linear-gradient(135deg, #FFFDF0 0%, #FFF5C2 100%)';
              btnBorder = '3px solid #FFE66D';
              btnColor = '#B25E00';
              btnShadow = '0 0 12px rgba(255, 230, 109, 0.8)';
            } else if (isLocked) {
              btnBg = '#f1f5f9';
              btnBorder = '2px dashed #cbd5e1';
              btnColor = '#94a3b8';
              cursor = 'not-allowed';
            }

            return (
              <button
                key={char}
                onClick={() => !isLocked && startPractice(char)}
                disabled={isLocked}
                className={isCurrent && playMode === 'game' ? 'pulse-btn' : ''}
                style={{
                  width: '55px',
                  height: '55px',
                  borderRadius: '16px',
                  background: btnBg,
                  border: btnBorder,
                  color: btnColor,
                  fontSize: '1.4rem',
                  fontWeight: 'bold',
                  cursor: cursor,
                  boxShadow: btnShadow,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'relative',
                  transition: 'all 0.2s ease',
                  outline: 'none'
                }}
              >
                {/* 鍵マーク */}
                {isLocked ? (
                  <span style={{ fontSize: '0.9rem' }}>🔒</span>
                ) : (
                  char
                )}

                {/* クリア済みの星 */}
                {isCompleted && (
                  <span 
                    style={{ 
                      position: 'absolute', 
                      bottom: '2px', 
                      right: '2px', 
                      fontSize: '0.65rem',
                      color: '#FFB800'
                    }}
                  >
                    ★
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* データリセットボタン */}
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: '25px' }}>
          <button 
            onClick={handleResetProgress}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#94a3b8',
              fontSize: '0.85rem',
              cursor: 'pointer',
              textDecoration: 'underline'
            }}
          >
            データを リセットする
          </button>
        </div>
      </div>
    );
  };

  // 練習画面の描画
  const renderPractice = () => {
    return (
      <div style={{ position: 'relative' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <button 
            className="btn" 
            onClick={() => setViewMode('menu')}
            style={{ 
              background: '#f8fafc', 
              color: '#475569', 
              border: '1px solid #cbd5e1',
              padding: '10px 20px',
              fontSize: '1rem'
            }}
          >
            ← いちらんへ
          </button>
          <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--blue-color)' }}>
            「{activeChar}」 の れんしゅう
          </div>
          <div style={{ fontSize: '1rem', color: '#64748b', fontWeight: 'bold' }}>
            {playMode === 'game' ? '🎮 ステップアップ' : '🔍 えらんで練習'}
          </div>
        </div>

        {/* 読み方の表示 */}
        {category === 'kanji' && kanjiDetails[activeChar] && (
          <div 
            style={{ 
              background: 'white', 
              border: '2px solid #e2e8f0', 
              borderRadius: '24px', 
              padding: '16px 20px', 
              margin: '0 auto 15px auto', 
              maxWidth: '350px',
              display: 'flex', 
              flexDirection: 'column',
              gap: '12px',
              fontSize: '0.95rem',
              color: '#334155',
              boxShadow: '0 8px 16px rgba(0,0,0,0.03)'
            }}
          >
            {/* 音・訓読み */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: '25px', borderBottom: '1px dashed #e2e8f0', paddingBottom: '8px' }}>
              {kanjiDetails[activeChar].kunyomi && (
                <div>
                  <span style={{ fontWeight: 'bold', color: '#FF6B6B' }}>くんよみ:</span> {kanjiDetails[activeChar].kunyomi}
                </div>
              )}
              {kanjiDetails[activeChar].onyomi && (
                <div>
                  <span style={{ fontWeight: 'bold', color: '#4ECDC4' }}>おんよみ:</span> {kanjiDetails[activeChar].onyomi}
                </div>
              )}
            </div>
            
            {/* 例文 */}
            {kanjiDetails[activeChar].examples && kanjiDetails[activeChar].examples.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'center' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#64748b', alignSelf: 'flex-start' }}>✏️ つかいかたの れい:</span>
                {kanjiDetails[activeChar].examples.map((ex, i) => (
                  <div 
                    key={i} 
                    style={{ 
                      background: '#f8fafc', 
                      padding: '6px 12px', 
                      borderRadius: '8px', 
                      width: '100%', 
                      fontSize: '0.9rem', 
                      fontWeight: 'bold',
                      color: '#475569',
                      borderLeft: '3px solid #FFD166',
                      textAlign: 'left'
                    }}
                  >
                    {ex}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <StrokeOrderCanvas 
          targetText={activeChar} 
          onFinish={handleFinishDraw} 
        />

        {/* 成功時のオーバーレイ演出 */}
        {showSuccess && (
          <div 
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              background: 'rgba(255,255,255,0.92)',
              borderRadius: '24px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '20px',
              zIndex: 100,
              animation: 'fadeIn 0.3s ease'
            }}
          >
            {/* 花丸 */}
            <div 
              style={{
                width: '150px',
                height: '150px',
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                animation: 'success-pop 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
              }}
            >
              {/* 高精度なはなまるSVG */}
              <svg viewBox="0 0 120 120" width="100%" height="100%">
                <path 
                  d="M 60,8 C 53,8 50,20 45,22 C 37,25 31,14 24,19 C 18,24 25,34 22,41 C 20,49 8,53 8,60 C 8,67 20,71 22,79 C 25,86 18,96 24,101 C 31,106 37,95 45,98 C 50,100 53,112 60,112 C 67,112 70,100 75,98 C 83,95 89,106 96,101 C 102,96 95,86 98,79 C 100,71 112,67 112,60 C 112,53 100,49 98,41 C 95,34 102,24 96,19 C 89,14 83,25 75,22 C 70,20 67,8 60,8 Z" 
                  fill="none" 
                  stroke="#FF3366" 
                  strokeWidth="5.5" 
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <circle cx="60" cy="60" r="32" fill="none" stroke="#FF3366" strokeWidth="4.5" />
              </svg>
              {/* 文字の絶対配置（中央・白フチ付き） */}
              <div 
                style={{
                  position: 'absolute',
                  fontSize: '0.8rem',
                  fontWeight: '900',
                  color: '#FF3366',
                  textAlign: 'center',
                  width: '120px',
                  lineHeight: '1.35',
                  fontFamily: "'Kosugi Maru', sans-serif",
                  textShadow: '2px 2px 0 #fff, -2px -2px 0 #fff, 2px -2px 0 #fff, -2px 2px 0 #fff, 0 2px 0 #fff, 2px 0 0 #fff, 0 -2px 0 #fff, -2px 0 0 #fff'
                }}
              >
                たいへん<br />
                <span style={{ whiteSpace: 'nowrap' }}>よくできました</span>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <CharacterSVG type="happy" width={90} height={90} />
            </div>

            <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: '#FF3366', textAlign: 'center' }}>
              きれいに かけたね！<br />
              <span style={{ fontSize: '1.1rem', color: '#FF8E53' }}>+10 がんばりポイント！</span>
            </div>

            <div style={{ display: 'flex', gap: '15px', marginTop: '10px' }}>
              <button 
                className="btn" 
                onClick={() => setViewMode('menu')}
                style={{ background: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1' }}
              >
                いちらんに もどる
              </button>

              {playMode === 'game' ? (
                <button 
                  className="btn btn-primary"
                  onClick={handleNextChar}
                  style={{
                    background: 'linear-gradient(135deg, #FF6B6B 0%, #FF8E53 100%)',
                    border: 'none',
                    boxShadow: '0 4px 15px rgba(255,107,107,0.3)'
                  }}
                >
                  つぎのもじへ →
                </button>
              ) : (
                <button 
                  className="btn btn-primary"
                  onClick={() => setShowSuccess(false)}
                  style={{
                    background: 'linear-gradient(135deg, #4ECDC4 0%, #2AB7CA 100%)',
                    border: 'none',
                    boxShadow: '0 4px 15px rgba(78,205,196,0.3)'
                  }}
                >
                  もういちど かく
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="glass-panel" style={{ padding: '24px 20px' }}>
      {/* トップバー */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <button 
          className="btn" 
          onClick={() => {
            if (viewMode === 'practice') {
              setViewMode('menu');
            } else {
              navigate('/');
            }
          }}
          style={{ padding: '8px 16px', fontSize: '0.95rem' }}
        >
          ◀ もどる
        </button>
        <h2 style={{ margin: 0, fontSize: '1.4rem' }}>こくご（もじのれんしゅう）</h2>
        <div 
          style={{ 
            fontWeight: 'bold', 
            color: '#FF6B6B', 
            background: 'white', 
            padding: '8px 16px', 
            borderRadius: '50px',
            boxShadow: '0 4px 10px rgba(0,0,0,0.05)',
            fontSize: '0.95rem'
          }}
        >
          🌟 ポイント: {score}
        </div>
      </div>

      {viewMode === 'menu' ? renderMenu() : renderPractice()}

      {/* スタイル定義 */}
      <style>{`
        @keyframes success-pop {
          0% { transform: scale(0.3); opacity: 0; }
          70% { transform: scale(1.1); }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes pulse-active {
          0% { transform: scale(1); box-shadow: 0 0 8px rgba(255, 230, 109, 0.6); }
          100% { transform: scale(1.06); box-shadow: 0 0 18px rgba(255, 230, 109, 0.9); }
        }
        .pulse-btn {
          animation: pulse-active 1.2s infinite alternate ease-in-out;
        }
      `}</style>
    </div>
  );
};

export default Japanese;
