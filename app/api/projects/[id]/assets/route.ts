import {owner,db,runtime,failure,HttpError} from '@/lib/server';
import {commons,boundedBytes,rasterType} from '@/lib/commons';
type Context={params:Promise<{id:string}>};
async function access(request:Request,c:Context){const user=await owner(request),{id}=await c.params;const p=await db().prepare('SELECT id FROM projects WHERE id=? AND owner=?').bind(id,user).first();if(!p)throw new HttpError(404,'소재를 찾을 수 없습니다.');return {user,id};}
export async function GET(request:Request,c:Context){try{
 const {user,id}=await access(request,c),url=new URL(request.url),asset=url.searchParams.get('asset');
 if(asset){if(!/^[0-9a-f-]{36}$/.test(asset))throw new HttpError(400,'잘못된 자료입니다.');const f=await runtime.BUCKET.get(`${user}/${id}/assets/${asset}`);if(!f)throw new HttpError(404,'자료가 없습니다.');return new Response(f.body,{headers:{'Content-Type':f.httpMetadata?.contentType||'image/png','Cache-Control':'private, max-age=3600','X-Content-Type-Options':'nosniff'}});}
 const query=url.searchParams.get('q')?.trim();if(!query||query.length>200)throw new HttpError(400,'이미지 검색어를 1~200자로 입력해 주세요.');
 return Response.json({images:await commons({generator:'search',gsrsearch:query,gsrnamespace:'6',gsrlimit:'12'})});
 }catch(e){return failure(e)}}
export async function POST(request:Request,c:Context){try{
 const {user,id}=await access(request,c);let bytes:Uint8Array;let info:{title:string;source:string;credit:string;license:string;licenseUrl:string};
 if(request.headers.get('content-type')?.startsWith('image/')){
 bytes=await boundedBytes(new Response(request.body));
 info={title:'직접 올린 자료',source:'',credit:'',license:'사용 조건 직접 확인',licenseUrl:''};
 }else{
 const {pageid}=await request.json() as {pageid:unknown};if(!Number.isSafeInteger(pageid)||Number(pageid)<=0)throw new HttpError(400,'자료를 다시 선택해 주세요.');
 const image=(await commons({pageids:String(pageid)}))[0];if(!image)throw new HttpError(404,'사용 가능한 이미지가 없습니다.');
 const r=await fetch(image.thumbnail,{redirect:'manual',headers:{'User-Agent':'ShortsMachine/1.0 (https://github.com/wlrnr/shortsmachine)'},signal:AbortSignal.timeout(25000)}).catch((e:Error)=>{console.error('Commons image fetch:',e.message);throw new HttpError(502,'원본 자료에 연결하지 못했습니다. 원본을 직접 내려받아 올리거나 다른 자료를 선택해 주세요.');});if(!r.ok){console.error('Commons image status',r.status);throw new HttpError(502,'원본 자료를 가져오지 못했습니다. 다른 자료를 선택해 주세요.');}bytes=await boundedBytes(r);info=image;
 }
 const type=rasterType(bytes),assetId=crypto.randomUUID();await runtime.BUCKET.put(`${user}/${id}/assets/${assetId}`,bytes,{httpMetadata:{contentType:type}});
 return Response.json({asset:{id:assetId,title:info.title,source:info.source,credit:info.credit,license:info.license,licenseUrl:info.licenseUrl}},{status:201});
 }catch(e){return failure(e)}}
