import { useNavigate } from 'react-router-dom';
import { CharacterSVG } from '../CharacterSVG';

const Life = () => {
  const navigate = useNavigate();

  return (
    <div className="glass-panel">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <button className="btn" onClick={() => navigate('/')}>もどる</button>
        <h2>せいかつ</h2>
        <div style={{ width: '80px' }}></div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', margin: '20px 0' }}>
        <CharacterSVG type="happy" width={100} height={100} />
      </div>

      <p style={{ textAlign: 'center', fontSize: '1.2rem', marginBottom: '30px' }}>
        どのおべんきょうをする？
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', alignItems: 'center' }}>
        <div 
          className="subject-card"
          style={{ width: '80%', borderBottom: '4px solid #FFE66D', cursor: 'pointer' }}
          onClick={() => navigate('/life-quiz')}
        >
          <div className="subject-icon">🌱</div>
          <h3>せいかつのルール</h3>
          <p style={{ fontSize: '0.9rem', color: '#666', margin: 0 }}>あいさつや きせつ の クイズ</p>
        </div>

        <div 
          className="subject-card"
          style={{ width: '80%', borderBottom: '4px solid #4ECDC4', cursor: 'pointer' }}
          onClick={() => navigate('/nature-quiz')}
        >
          <div className="subject-icon">🦋</div>
          <h3>しぜんかんさつ</h3>
          <p style={{ fontSize: '0.9rem', color: '#666', margin: 0 }}>むし や おはな の しゃしんクイズ</p>
        </div>
      </div>
    </div>
  );
};

export default Life;
