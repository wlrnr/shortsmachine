import {HttpError} from './server';
export type ImageCandidate={pageid:number;title:string;thumbnail:string;source:string;credit:string;license:string;licenseUrl:string};
const clean=(s:unknown)=>String(s||'').replace(/<[^>]*>/g,'').replace(/&quot;/g,'"').replace(/&amp;/g,'&').replace(/&#39;/g,"'").trim();
export async function commons(params:Record<string,string>){
 const u=new URL('https://commons.wikimedia.org/w/api.php');u.search=new URLSearchParams({action:'query',format:'json',formatversion:'2',prop:'imageinfo',iiprop:'url|extmetadata|mime',iiurlwidth:'1280',...params}).toString();
 const r=await fetch(u,{headers:{'User-Agent':'ShortsMachine/1.0 (https://github.com/wlrnr/shortsmachine)'},signal:AbortSignal.timeout(20000)});
 if(!r.ok)throw new HttpError(502,'이미지 검색 서비스에 연결하지 못했습니다. 잠시 후 다시 검색하거나 사진을 직접 올려 주세요.');
 const data:any=await r.json();if(data.error)throw new HttpError(502,'이미지 검색을 완료하지 못했습니다. 검색어를 바꿔 주세요.');
 return (data.query?.pages||[]).flatMap((p:any)=>{
 const i=p.imageinfo?.[0];if(!i||!['image/jpeg','image/png','image/webp'].includes(i.mime))return [];
 const meta=i.extmetadata||{},thumbnail=i.thumburl||i.url;
 if(!isCommonsImage(thumbnail))return [];
 return [{pageid:p.pageid,title:clean(p.title).replace(/^File:/,''),thumbnail,source:i.descriptionurl,credit:clean(meta.Artist?.value).slice(0,2000),license:clean(meta.LicenseShortName?.value).slice(0,200),licenseUrl:clean(meta.LicenseUrl?.value)} as ImageCandidate];
 });
}
export function isCommonsImage(raw:string){try{const u=new URL(raw);return u.protocol==='https:'&&u.hostname==='upload.wikimedia.org'&&!u.username&&!u.password&&u.pathname.startsWith('/wikipedia/commons/');}catch{return false;}}
export async function boundedBytes(response:Response,max=8*1024*1024){
 if(Number(response.headers.get('content-length'))>max)throw new HttpError(413,'이미지는 8MB 이하로 선택해 주세요.');
 const reader=response.body?.getReader();if(!reader)throw new HttpError(400,'빈 파일입니다.');
 const parts:Uint8Array[]=[];let size=0;try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>max)throw new HttpError(413,'이미지는 8MB 이하로 선택해 주세요.');parts.push(value);}}finally{await reader.cancel().catch(()=>{});}
 const bytes=new Uint8Array(size);let pos=0;for(const p of parts){bytes.set(p,pos);pos+=p.length;}return bytes;
}
export function rasterType(b:Uint8Array){if(b[0]===137&&b[1]===80&&b[2]===78&&b[3]===71)return 'image/png';if(b[0]===255&&b[1]===216&&b[2]===255)return 'image/jpeg';if(String.fromCharCode(...b.slice(0,4))==='RIFF'&&String.fromCharCode(...b.slice(8,12))==='WEBP')return 'image/webp';throw new HttpError(400,'PNG, JPG, WebP 이미지 파일을 선택해 주세요.');}
