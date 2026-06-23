import fs from 'fs';
import path from 'path';

const words = ['あ', 'ね', 'む', 'シ', 'ツ', '一', '右', '雨', '円', '王', '音'];
const outputDir = path.join(process.cwd(), 'src', 'data');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

async function fetchStrokeData(char) {
  const codePoint = char.codePointAt(0).toString(16).padStart(5, '0');
  const url = `https://cdn.jsdelivr.net/gh/kanjivg/kanjivg@master/kanji/${codePoint}.svg`;
  console.log(`Fetching ${char} (${codePoint}) from ${url}...`);
  
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch ${char}: ${res.statusText}`);
  }
  const svgText = await res.text();
  
  // path の抽出 (d="..." の値を取り出す)
  const pathRegex = /<path[^>]+d="([^"]+)"/g;
  const paths = [];
  let match;
  while ((match = pathRegex.exec(svgText)) !== null) {
    paths.push(match[1]);
  }
  
  // text（書き順の数字と位置）の抽出
  // transform="matrix(1 0 0 1 x y)" の形式
  const textRegex = /<text[^>]+transform="matrix\(1 0 0 1 ([\d.-]+) ([\d.-]+)\)"[^>]*>(\d+)<\/text>/g;
  const numbers = [];
  while ((match = textRegex.exec(svgText)) !== null) {
    numbers.push({
      x: parseFloat(match[1]),
      y: parseFloat(match[2]),
      number: parseInt(match[3], 10)
    });
  }

  // もし座標のパースに失敗した場合のシンプルなフォールバック
  if (numbers.length === 0) {
    const simpleTextRegex = /<text[^>]*>(\d+)<\/text>/g;
    let count = 1;
    while ((match = simpleTextRegex.exec(svgText)) !== null) {
      numbers.push({
        x: 10 * count,
        y: 20,
        number: parseInt(match[1], 10)
      });
      count++;
    }
  }
  
  return { paths, numbers };
}

async function main() {
  const strokeData = {};
  for (const char of words) {
    try {
      const data = await fetchStrokeData(char);
      strokeData[char] = data;
      console.log(`✅ Success: ${char} (${data.paths.length} strokes)`);
    } catch (e) {
      console.error(`❌ Error: ${char}`, e.message);
    }
  }
  
  fs.writeFileSync(
    path.join(outputDir, 'strokeData.json'),
    JSON.stringify(strokeData, null, 2),
    'utf-8'
  );
  console.log('All stroke data saved to src/data/strokeData.json');
}

main();
