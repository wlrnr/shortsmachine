import type {Scene} from './contracts';
export type CardFormat='portrait'|'square';
export function assetUrl(projectId:string,id:string){return `/api/projects/${projectId}/assets?asset=${id}`;}
function lines(c:CanvasRenderingContext2D,text:string,width:number){const out:string[]=[];for(const p of text.split('\n')){let line='';for(const ch of Array.from(p)){if(c.measureText(line+ch).width>width&&line){out.push(line);line=ch;}else line+=ch;}out.push(line);}return out;}
function textBox(c:CanvasRenderingContext2D,text:string,x:number,y:number,width:number,height:number,size:number,color:string,weight=700){
 let wrapped:string[]=[];let n=size;for(;n>=16;n-=2){c.font=`${weight} ${n}px "Apple SD Gothic Neo", "Malgun Gothic", sans-serif`;wrapped=lines(c,text,width);if(wrapped.length*n*1.45<=height)break;}
 if(n<16)throw new Error('문구가 너무 깁니다. 카드의 제목이나 설명을 줄여 주세요.');
 c.fillStyle=color;c.textBaseline='top';wrapped.forEach((line,i)=>c.fillText(line,x,y+i*n*1.45));
}
export async function renderCard(scene:Scene,index:number,count:number,projectId:string,source:string,format:CardFormat='portrait'){
 await document.fonts.ready;const canvas=document.createElement('canvas');canvas.width=1080;canvas.height=format==='portrait'?1350:1080;
 const c=canvas.getContext('2d')!;const h=canvas.height;const textOnly=scene.layout==='text';
 c.fillStyle='#17232d';c.fillRect(0,0,1080,h);c.fillStyle='#f3d044';c.fillRect(56,55,50,8);
 textBox(c,`SHORTS MACHINE   /   ${String(index+1).padStart(2,'0')} — ${String(count).padStart(2,'0')}`,126,47,900,44,23,'#c8d2d8',500);
 textBox(c,scene.headline||`장면 ${index+1}`,56,118,968,185,64,'#ffffff');
 const photoY=330,photoH=h===1350?530:340;
 c.fillStyle='#263742';c.fillRect(56,photoY,968,photoH);
 if(!textOnly&&scene.asset){
 const image=new Image();await new Promise<void>((resolve,reject)=>{const timeout=setTimeout(()=>reject(new Error(`${index+1}번 카드의 이미지 연결이 지연됩니다. 다시 시도해 주세요.`)),20000);image.onload=()=>{clearTimeout(timeout);resolve();};image.onerror=()=>{clearTimeout(timeout);reject(new Error(`${index+1}번 카드의 이미지를 불러오지 못했습니다.`));};image.src=assetUrl(projectId,scene.asset!.id);});
 const scale=scene.fit==='cover'?Math.max(968/image.width,photoH/image.height):Math.min(968/image.width,photoH/image.height);
 c.save();c.beginPath();c.rect(56,photoY,968,photoH);c.clip();c.drawImage(image,56+(968-image.width*scale)/2,photoY+(photoH-image.height*scale)/2,image.width*scale,image.height*scale);c.restore();
 }else if(textOnly){textBox(c,scene.caption||'',88,photoY+36,904,photoH-72,60,'#f3d044');}
 else{textBox(c,'자료를 선택해 주세요',90,photoY+60,900,160,42,'#a9bac5');}
 if(!textOnly)textBox(c,scene.caption||'',56,photoY+photoH+32,968,h===1350?245:170,42,'#ffffff',500);
 if(scene.reaction)textBox(c,`🦆 ${scene.reaction}`,56,h-164,968,65,28,'#f3d044',600);
 let host='';try{host=new URL(source).hostname;}catch{}
 const credit=scene.asset&&!textOnly?[scene.asset.credit,scene.asset.license].filter(Boolean).join(' · '):'';
 textBox(c,credit||`출처 · ${host}`,56,h-83,968,66,21,'#a7b7c1',400);
 return canvas;
}
export function png(canvas:HTMLCanvasElement){return new Promise<Blob>((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error('이미지 저장에 실패했습니다.')),'image/png'));}
export function download(blob:Blob,name:string){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),60000);}

// ZIP store format: PNG is already compressed. UTF-8 names, CRC32, no dependency.
export function zipStore(files:{name:string;bytes:Uint8Array}[]){
 const chunks:Uint8Array[]=[],directory:Uint8Array[]=[];let offset=0;
 const u16=(v:DataView,p:number,n:number)=>v.setUint16(p,n,true),u32=(v:DataView,p:number,n:number)=>v.setUint32(p,n,true);
 for(const f of files){const name=new TextEncoder().encode(f.name);let crc=0xffffffff;for(const b of f.bytes){crc^=b;for(let k=0;k<8;k++)crc=(crc>>>1)^((crc&1)?0xedb88320:0);}crc=(crc^0xffffffff)>>>0;
 const local=new Uint8Array(30+name.length),l=new DataView(local.buffer);u32(l,0,0x04034b50);u16(l,4,20);u16(l,6,0x800);u16(l,12,33);u32(l,14,crc);u32(l,18,f.bytes.length);u32(l,22,f.bytes.length);u16(l,26,name.length);local.set(name,30);
 const central=new Uint8Array(46+name.length),d=new DataView(central.buffer);u32(d,0,0x02014b50);u16(d,4,20);u16(d,6,20);u16(d,8,0x800);u16(d,14,33);u32(d,16,crc);u32(d,20,f.bytes.length);u32(d,24,f.bytes.length);u16(d,28,name.length);u32(d,42,offset);central.set(name,46);
 chunks.push(local,f.bytes);directory.push(central);offset+=local.length+f.bytes.length;
 }
 const size=directory.reduce((n,d)=>n+d.length,0),end=new Uint8Array(22),e=new DataView(end.buffer);u32(e,0,0x06054b50);u16(e,8,files.length);u16(e,10,files.length);u32(e,12,size);u32(e,16,offset);
 return new Blob([...chunks,...directory,end] as BlobPart[],{type:'application/zip'});
}
export async function exportCards(scenes:Scene[],projectId:string,source:string,format:CardFormat,kind:'zip'|'sheet'){
 const empty=scenes.findIndex(s=>!s.headline?.trim()||!s.caption?.trim());if(empty>=0)throw new Error(`${empty+1}번 카드의 제목과 설명을 입력해 주세요.`);
 const missing=scenes.findIndex(s=>s.layout!=='text'&&!s.asset);if(missing>=0)throw new Error(`${missing+1}번 카드의 자료를 선택하거나 글 중심 카드로 바꿔 주세요.`);
 const files:{name:string;bytes:Uint8Array}[]=[];const sheet=document.createElement('canvas');sheet.width=1440;sheet.height=Math.ceil(scenes.length/3)*(format==='portrait'?600:480);const ctx=sheet.getContext('2d')!;ctx.fillStyle='#edf0f2';ctx.fillRect(0,0,sheet.width,sheet.height);
 for(let i=0;i<scenes.length;i++){const canvas=await renderCard(scenes[i],i,scenes.length,projectId,source,format);if(kind==='zip')files.push({name:`card-${String(i+1).padStart(2,'0')}.png`,bytes:new Uint8Array(await (await png(canvas)).arrayBuffer())});else ctx.drawImage(canvas,(i%3)*480,Math.floor(i/3)*(format==='portrait'?600:480),480,format==='portrait'?600:480);canvas.width=0;}
 if(kind==='sheet')return download(await png(sheet),'storyboard.png');
 const credits=scenes.map((s,i)=>`${i+1}. ${s.headline||''}\n대사: ${s.narration}\n자료: ${s.asset?.title||'글 중심 카드'}\n원문: ${source}\n사진 출처: ${s.asset?.source||''}\n저작자: ${s.asset?.credit||''}\n사용 조건: ${s.asset?.license||''}\n조건 링크: ${s.asset?.licenseUrl||''}\n편집: 카드 배치${s.fit==='cover'?' 및 중앙 자르기':''}\n`).join('\n');files.push({name:'sources.txt',bytes:new TextEncoder().encode(credits)});download(zipStore(files),'cards.zip');
}
