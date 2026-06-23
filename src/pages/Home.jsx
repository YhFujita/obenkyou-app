import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CharacterSVG } from '../CharacterSVG';
import { db } from '../db';

const Home = () => {
  const navigate = useNavigate();
  const [totalScores, setTotalScores] = useState({ japanese: 0, math: 0, life: 0, english: 0 });

  useEffect(() => {
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
    fetchScores();
  }, []);

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

      {/* バックアップと復元セクション */}
      <div 
        style={{ 
          marginTop: '35px', 
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
