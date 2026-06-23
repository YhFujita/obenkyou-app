
export const CharacterSVG = ({ type = 'normal', width = 120, height = 120 }) => {
  // 表情や状態によってSVGを出し分ける軽量なキャラクター実装
  const getFace = () => {
    switch (type) {
      case 'happy':
        return (
          <>
            <path d="M 30 45 Q 40 35 50 45" fill="none" stroke="#333" strokeWidth="4" strokeLinecap="round" />
            <path d="M 70 45 Q 80 35 90 45" fill="none" stroke="#333" strokeWidth="4" strokeLinecap="round" />
            <path d="M 40 65 Q 60 85 80 65" fill="none" stroke="#333" strokeWidth="4" strokeLinecap="round" />
            <circle cx="25" cy="55" r="8" fill="#FFB6C1" opacity="0.6"/>
            <circle cx="95" cy="55" r="8" fill="#FFB6C1" opacity="0.6"/>
          </>
        );
      case 'sad':
        return (
          <>
            <circle cx="40" cy="45" r="5" fill="#333" />
            <circle cx="80" cy="45" r="5" fill="#333" />
            <path d="M 45 75 Q 60 65 75 75" fill="none" stroke="#333" strokeWidth="4" strokeLinecap="round" />
          </>
        );
      case 'normal':
      default:
        return (
          <>
            <circle cx="40" cy="45" r="5" fill="#333" />
            <circle cx="80" cy="45" r="5" fill="#333" />
            <path d="M 45 65 Q 60 75 75 65" fill="none" stroke="#333" strokeWidth="4" strokeLinecap="round" />
          </>
        );
    }
  };

  return (
    <svg 
      width={width} 
      height={height} 
      viewBox="0 0 120 120" 
      xmlns="http://www.w3.org/2000/svg"
      className={type === 'happy' ? 'animate-bounce' : ''}
    >
      {/* 影 */}
      <ellipse cx="60" cy="110" rx="40" ry="10" fill="rgba(0,0,0,0.1)" />
      {/* 体（ひよこ風） */}
      <path d="M 60 10 C 20 10 10 50 10 70 C 10 100 40 105 60 105 C 80 105 110 100 110 70 C 110 50 100 10 60 10 Z" fill="#FFE66D" />
      {/* 羽 */}
      <path d="M 10 60 Q -5 75 10 85" fill="#FFE66D" stroke="#FFD166" strokeWidth="3" strokeLinecap="round" />
      <path d="M 110 60 Q 125 75 110 85" fill="#FFE66D" stroke="#FFD166" strokeWidth="3" strokeLinecap="round" />
      
      {getFace()}
    </svg>
  );
};
