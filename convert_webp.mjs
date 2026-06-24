import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

const dir = './public/images/nature';

async function convertAll() {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    if (file.endsWith('.png')) {
      const srcPath = path.join(dir, file);
      const webpPath = path.join(dir, file.replace('.png', '.webp'));
      
      try {
        await sharp(srcPath)
          .resize(600) // サイズを落とす
          .webp({ quality: 80 }) // 軽量化
          .toFile(webpPath);
        
        console.log(`Converted ${file} to WebP`);
        // 成功したら元のPNGを削除
        fs.unlinkSync(srcPath);
      } catch (err) {
        console.error(`Error converting ${file}:`, err);
      }
    }
  }
}

convertAll();
