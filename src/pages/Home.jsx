import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CharacterSVG } from '../CharacterSVG';
import { db } from '../db';
import { auth, googleProvider, signInWithPopup, signOut } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';

const Home = () => {
  const navigate = useNavigate();
  const [totalScores, setTotalScores] = useState({ japanese: 0, math: 0, life: 0, english: 0 });
  const [user, setUser] = useState(null);
  const [syncing, setSyncing] = useState(false);

  const fetchScores = async () => {
    const allScores = await db.getAllScores();
    const totals = {
      japanese: allScores.japanese.reduce((acc, curr) => acc + curr.score, 0),
      math: allScores.math.reduce((acc, curr) => acc + curr.score, 0),
      life: allScores.life.reduce((acc, curr) => acc + curr.score, 0),
      english: allScores.english.reduce((acc, curr) => acc + curr.score, 0),
    };
    setTotalScores(totals);
  };

  useEffect(() => {
    // 認証状態の変更を監視
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        setSyncing(true);
        // ログインしたらクラウドとデータを同期する
        await db.syncDataWithCloud(currentUser.uid);
        setSyncing(false);
      }
      // 同期後に改めてスコアを再読み込み
      fetchScores();
    });

    return () => unsubscribe();
  }, []);

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      console.error('Login failed:', err);
      alert('ログインに失敗しました。');
    }
  };

  const handleLogout = async () => {
    if (window.confirm('ログアウトしますか？（ログアウトしても、このパソコンのデータは消えません）')) {
      try {
        await signOut(auth);
        alert('ログアウトしました。');
      } catch (err) {
        console.error('Logout failed:', err);
      }
    }
  };

  const subjects = [
    { id: 'japanese', name: 'こくご', icon: '🍉', path: '/japanese', color: '#FF6B6B' },
    { id: 'math', name: 'さんすう', icon: '🍎', path: '/math', color: '#4ECDC4' },
    { id: 'life', name: 'せいかつ', icon: '🌻', path: '/life', color: '#FFE66D' },
    { id: 'english', name: 'えいご', icon: '🍓', path: '/english', color: '#1A535C' },
  ];

  const handleExportBackup = async () => {
    const data = await db.exportBackup();
    if (!data) {
      alert('バックアップデータの作成に失敗しました。');
      return;
    }
    const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
      JSON.stringify(data, null, 2)
    )}`;
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', jsonString);
    const dateStr = new Date().toISOString().slice(0, 10);
    downloadAnchor.setAttribute('download', `obenkyou_backup_${dateStr}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleImportBackup = (e) => {
    const fileReader = new FileReader();
    const file = e.target.files[0];
    if (!file) return;

    fileReader.onload = async (event) => {
      try {
        const parsedData = JSON.parse(event.target.result);
        const success = await db.importBackup(parsedData);
        if (success) {
          alert('データのふくげんにせいこうしました！アプリをさいきどうします。');
          window.location.reload();
        } else {
          alert('データのふくげんにしっぱいしました。ファイルがただしいか確認してください。');
        }
      } catch (err) {
        console.error('Import error:', err);
        alert('ファイルのよみこみにしっぱいしました。ただしいバックアップファイルを選択してください。');
      }
    };
    fileReader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="glass-panel">
      <h1>おべんきょうアプリ</h1>
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
        <CharacterSVG type="happy" />
      </div>
      <p>どれを おべんきょう する？</p>
      
      <div className="subject-grid">
        {subjects.map((sub) => (
          <div 
            key={sub.id} 
            className="subject-card"
            style={{ borderBottom: `4px solid ${sub.color}` }}
            onClick={() => navigate(sub.path)}
          >
            <div className="subject-icon">{sub.icon}</div>
            <h2>{sub.name}</h2>
            <div style={{ fontSize: '0.9rem', color: '#666' }}>
              がんばりポイント: {totalScores[sub.id]}
            </div>
          </div>
        ))}
      </div>

      {/* クラウド同期セクション */}
      <div 
        style={{ 
          marginTop: '25px', 
          padding: '20px', 
          background: 'linear-gradient(135deg, #FFFDF0 0%, #FFF9D4 100%)', 
          borderRadius: '24px',
          border: '2px solid #FFE66D',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '12px',
          boxShadow: '0 8px 16px rgba(255, 230, 109, 0.15)'
        }}
      >
        <h3 style={{ fontSize: '1.15rem', margin: 0, color: '#B25E00', display: 'flex', alignItems: 'center', gap: '6px' }}>
          ☁️ クラウドで じどう保存（ほぞん）
        </h3>
        
        {syncing ? (
          <p style={{ fontSize: '0.9rem', color: '#B25E00', fontWeight: 'bold', margin: 0 }}>
            しんちょくを クラウドと 同期（どうき）しているよ... 🔄
          </p>
        ) : user ? (
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: '0.95rem', color: '#475569', margin: '0 0 10px 0', fontWeight: 'bold' }}>
              👤 <span style={{ color: '#0F766E' }}>{user.displayName}</span> さんで ログイン中
            </p>
            <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '0 0 15px 0' }}>
              お勉強のデータはクラウドに自動で保存されています。他のパソコンやスマホでも続きから遊べるよ！
            </p>
            <button 
              className="btn" 
              onClick={handleLogout}
              style={{ 
                fontSize: '0.85rem', 
                padding: '8px 16px', 
                background: '#f1f5f9', 
                color: '#64748b', 
                border: '1px solid #cbd5e1' 
              }}
            >
              サインアウト（ログアウト）
            </button>
          </div>
        ) : (
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: '0.85rem', color: '#64748b', margin: '0 0 15px 0' }}>
              ログインすると、データがクラウドに保存され、他のスマホやタブレットでも同じデータで遊べるようになります。
            </p>
            <button 
              className="btn btn-primary" 
              onClick={handleLogin}
              style={{ 
                fontSize: '1rem', 
                padding: '12px 24px', 
                background: 'linear-gradient(135deg, #FFE66D 0%, #FFCC00 100%)',
                color: '#B25E00',
                border: 'none',
                boxShadow: '0 4px 15px rgba(255, 230, 109, 0.4)',
                fontWeight: 'bold'
              }}
            >
              Googleアカウントで ログインする
            </button>
          </div>
        )}
      </div>

      {/* バックアップと復元セクション */}
      <div 
        style={{ 
          marginTop: '25px', 
          padding: '20px', 
          background: 'rgba(255, 255, 255, 0.4)', 
          borderRadius: '20px',
          border: '1px solid rgba(255, 255, 255, 0.6)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '12px'
        }}
      >
        <h3 style={{ fontSize: '1rem', margin: 0, color: '#475569' }}>💾 データの ほぞん・よみこみ（バックアップ）</h3>
        <p style={{ fontSize: '0.85rem', color: '#64748b', margin: 0, textAlign: 'center' }}>
          ブラウザのデータを消してしまった時のために、データをパソコンに保存したり、元に戻したりできます。
        </p>
        <div style={{ display: 'flex', gap: '15px', marginTop: '5px' }}>
          <button 
            className="btn" 
            onClick={handleExportBackup}
            style={{ 
              fontSize: '0.9rem', 
              padding: '10px 20px', 
              background: '#f8fafc', 
              color: '#475569', 
              border: '1px solid #cbd5e1' 
            }}
          >
            データを ほぞんする
          </button>
          
          <label 
            className="btn btn-primary"
            style={{ 
              fontSize: '0.9rem', 
              padding: '10px 20px', 
              background: 'linear-gradient(135deg, #4ECDC4 0%, #2AB7CA 100%)',
              border: 'none',
              cursor: 'pointer',
              boxShadow: '0 4px 10px rgba(78,205,196,0.2)'
            }}
          >
            データを よみこむ
            <input 
              type="file" 
              accept=".json" 
              onChange={handleImportBackup} 
              style={{ display: 'none' }} 
            />
          </label>
        </div>
      </div>
    </div>
  );
};

export default Home;
