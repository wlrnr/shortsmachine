import assert from 'node:assert/strict';
const base='http://localhost:5173';
const headers={'content-type':'application/json',origin:base,cookie:'__sites_local_auth=1'};
async function call(path,method='GET',body,extra={}){return fetch(base+path,{method,headers:{...headers,...extra},...(body?{body:JSON.stringify(body)}:{})})}
assert.equal((await fetch(base+'/api/projects')).status,401);
assert.equal((await call('/api/projects','POST',{title:'x',source:'javascript:alert(1)',notes:'test'})).status,400);
assert.equal((await call('/api/projects','POST',{}, {origin:'https://other.example'})).status,403);
let list=await (await call('/api/projects')).json();
let p=list.projects.find(x=>x.title==='[검증용] 쇼츠 제작 흐름');
if(!p){const r=await call('/api/projects','POST',{title:'[검증용] 쇼츠 제작 흐름',source:'https://example.com',notes:'이 자료는 저장 및 수정 검증용이며 실제 사건을 나타내지 않습니다.'});assert.equal(r.status,201);const {id}=await r.json();list=await (await call('/api/projects')).json();p=list.projects.find(x=>x.id===id)}
assert.ok(p);
const scenes=Array.from({length:8},(_,i)=>({seconds:6,visual:'검증용 장면 '+(i+1),narration:'대본 편집 검증용 대사 '+(i+1),reaction:'오리가 고개를 끄덕인다.'}));
assert.equal((await call('/api/projects/'+p.id,'PATCH',{revision:p.revision,scenes})).status,200);
assert.equal((await call('/api/projects/'+p.id,'PATCH',{revision:p.revision,scenes})).status,409);
assert.equal((await call('/api/projects/'+p.id+'/download')).status,404);
list=await (await call('/api/projects')).json();const saved=list.projects.find(x=>x.id===p.id);
assert.equal(saved.revision,p.revision+1);assert.deepEqual(JSON.parse(saved.scenes),scenes);assert.equal(saved.board,null);
console.log('PASS: auth, origin, validation, persistence, concurrency, download state');
