import {env} from "cloudflare:workers";
import {getChatGPTUser} from "@/app/chatgpt-auth";
export const runtime=env as unknown as {DB:D1Database;BUCKET:R2Bucket;OPENAI_API_KEY?:string;TEXT_MODEL?:string;RESEARCH_MODEL?:string;IMAGE_MODEL?:string};
export class HttpError extends Error {constructor(public status:number,message:string){super(message)}}
export async function owner(request:Request){
 const u=await getChatGPTUser();if(!u)throw new HttpError(401,"로그인이 필요합니다.");
 if(request.method!=="GET" && request.headers.get("origin")!==new URL(request.url).origin)throw new HttpError(403,"요청 출처를 확인할 수 없습니다.");
 return u.userId;
}
export function db(){if(!runtime.DB)throw new HttpError(503,"데이터베이스 연결을 준비 중입니다.");return runtime.DB}
export function key(){if(!runtime.OPENAI_API_KEY)throw new HttpError(503,"AI 연결이 필요합니다. 서버의 API 키 설정을 확인해 주세요.");return runtime.OPENAI_API_KEY}
export async function ai(path:string,body:unknown,timeout=90000):Promise<any>{
 const response=await fetch("https://api.openai.com/v1/"+path,{method:"POST",headers:{"Content-Type":"application/json",Authorization:"Bearer "+key()},body:JSON.stringify(body),signal:AbortSignal.timeout(timeout)});
 if(!response.ok){ const problem:any=await response.json().catch(()=>({}));console.error("AI failure",response.status,problem.error?.code,problem.error?.type);if(problem.error?.type==="insufficient_quota"||problem.error?.code==="credit_balance_exhausted"||problem.error?.code==="insufficient_quota")throw new HttpError(402,"API 크레딧 잔액이 부족합니다. OpenAI API 결제 페이지에서 잔액을 추가해 주세요.");if(response.status===401)throw new HttpError(503,"API 키를 인증하지 못했습니다. 전체 비밀 키로 교체해 주세요.");throw new HttpError(response.status===429?429:502,response.status===429?"AI 요청 속도 한도에 도달했습니다. 잠시 후 다시 시도해 주세요.":"AI 생성에 실패했습니다. 연결 설정을 확인한 후 다시 시도해 주세요.");}
 return response.json();
}
export function output(r:any){const v=r.output?.flatMap((x:any)=>x.content||[]).filter((x:any)=>x.type==="output_text").map((x:any)=>x.text).join("");if(!v)throw new HttpError(502,"AI 응답이 비어 있습니다. 다시 시도해 주세요.");return v}
export function failure(e:unknown){if(e instanceof HttpError)return Response.json({error:e.message},{status:e.status});console.error("Request failed",e instanceof Error?e.name:"Unknown");return Response.json({error:"처리하지 못했습니다. 입력은 유지됩니다. 잠시 후 다시 시도해 주세요."},{status:500})}
