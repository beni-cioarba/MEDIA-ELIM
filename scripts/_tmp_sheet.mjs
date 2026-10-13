import sharp from 'sharp'; import fs from 'node:fs'; import path from 'node:path';
const [,,out,...dirs]=process.argv;
const files=dirs.flatMap(d=>fs.readdirSync(d).filter(f=>/\.(jpe?g|png)$/i.test(f)).sort().map(f=>path.join(d,f)));
const W=220,H=290,cols=6;
const tiles=await Promise.all(files.map(async(f,i)=>{
  const img=await sharp(f).rotate().resize(W,H-30,{fit:'contain',background:'#222'}).toBuffer();
  const label=Buffer.from(`<svg width="${W}" height="30"><rect width="100%" height="100%" fill="#fff"/><text x="4" y="20" font-size="13" font-family="Arial">${i}: ${path.basename(f).slice(-26).replace(/&/g,'')}</text></svg>`);
  return sharp({create:{width:W,height:H,channels:3,background:'#fff'}}).composite([{input:img,top:0,left:0},{input:label,top:H-30,left:0}]).png().toBuffer();
}));
const rows=Math.ceil(tiles.length/cols);
await sharp({create:{width:W*cols,height:H*rows,channels:3,background:'#ccc'}}).composite(tiles.map((t,i)=>({input:t,left:(i%cols)*W,top:Math.floor(i/cols)*H}))).jpeg({quality:80}).toFile(out);
console.log(out, files.length);
