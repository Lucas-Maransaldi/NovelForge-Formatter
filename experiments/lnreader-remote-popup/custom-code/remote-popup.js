/* NovelForge C5.5 — isolated remote popup POC. No LNReader globals or imports. */
(() => {
  'use strict';
  const VERSION = 'nf-remote-popup-c5.5-v1';
  const EXPECTED_BOOK = 'nf-overgeared-poc';
  const ENTITY_ID = 'character:braham';
  const MANIFEST_URL = 'https://cdn.jsdelivr.net/gh/Lucas-Maransaldi/NovelForge-Formatter@main/experiments/lnreader-remote-knowledge/fixtures/manifest.json';
  const KNOWLEDGE_URL = 'https://cdn.jsdelivr.net/gh/Lucas-Maransaldi/NovelForge-Formatter@main/experiments/lnreader-remote-knowledge/fixtures/braham.json';
  const MAX_MANIFEST = 4096, MAX_KNOWLEDGE = 65536, MAX_FACTS = 100, TIMEOUT = 12000;
  const KEY = '__nfRemotePopupC55Cleanup';
  const old = document[KEY];
  if (typeof old === 'function') old();
  const cache = new Map();
  let generation = 0, controller = null, panel = null;
  const diagnostics = { version: VERSION, state: 'IDLE', click: 'NOT_TESTED', bookId: 'UNKNOWN', entityId: 'UNKNOWN', chapter: 'UNKNOWN', block: 'UNKNOWN', metadata: 'UNKNOWN', manifest: 'NOT_TESTED', http: 'NOT_TESTED', byteLength: 'NOT_TESTED', sha256Implementation: 'NOT_TESTED', sha256: 'NOT_TESTED', schema: 'NOT_TESTED', antispoiler: 'NOT_TESTED', allowed: [], blocked: [], error: '' };
  const safeError = e => `${e && e.name || 'Error'}: ${String(e && e.message || 'unknown').slice(0, 180)}`;
  const setDiag = (key, value) => { diagnostics[key] = value; };
  const add = (parent, tag, cls, text) => { const el = document.createElement(tag); el.className = cls || ''; if (text !== undefined) el.textContent = String(text); parent.appendChild(el); return el; };
  const removePanel = () => { if (panel && panel.parentNode) panel.parentNode.removeChild(panel); panel = null; };
  const render = (state, detail, facts, position, revision) => {
    removePanel(); setDiag('state', state);
    panel = document.createElement('section'); panel.className = 'nf-rp-overlay'; panel.setAttribute('role','dialog'); panel.setAttribute('aria-modal','true'); panel.setAttribute('aria-live','polite');
    const box = add(panel,'div','nf-rp-panel');
    add(box,'h2','nf-rp-title', diagnostics.label || 'Braham'); add(box,'p','nf-rp-type','Personagem');
    if (state === 'READY' || state === 'EMPTY') {
      add(box,'p','nf-rp-source',`REMOTE_POC · Revisão: ${revision}`);
      if (facts && facts.length) { const list = add(box,'ul','nf-rp-facts'); for (const fact of facts) add(list,'li','nf-rp-fact',fact.text); }
      else add(box,'p','nf-rp-empty','Nenhuma informação disponível neste ponto.');
      add(box,'p','nf-rp-position',`Capítulo: ${position.chapter} · Bloco: ${position.block}`);
    } else add(box,'p',`nf-rp-state nf-rp-${state.toLowerCase()}`,detail || (state === 'LOADING' ? 'Carregando dados remotos…' : 'Informações remotas indisponíveis.'));
    const actions = add(box,'footer','nf-rp-actions');
    const copy = add(actions,'button','nf-rp-button','Copiar diagnóstico'); copy.type='button'; copy.addEventListener('click', async () => { try { if (navigator.clipboard && navigator.clipboard.writeText) await navigator.clipboard.writeText(report()); else { const ta=add(box,'textarea','',report()); ta.select(); document.execCommand('copy'); ta.remove(); } copy.textContent='Diagnóstico copiado'; } catch (_) { copy.textContent='Cópia indisponível'; } });
    const close = add(actions,'button','nf-rp-button','Fechar'); close.type='button'; close.addEventListener('click', closePopup);
    (document.body || document.documentElement).appendChild(panel);
  };
  const report = () => ['NOVELFORGE C5.5 REMOTE POPUP', ...Object.entries(diagnostics).map(([k,v]) => `${k}: ${Array.isArray(v) ? v.join(',') || '(none)' : String(v)}`), `manifestURL: ${MANIFEST_URL}`, `knowledgeURL: ${KNOWLEDGE_URL}`, 'SHA-256 checks bytes against the manifest; it does not authenticate the publisher.'].join('\n');
  function closePopup() { generation++; if (controller) controller.abort(); controller=null; removePanel(); setDiag('state','IDLE'); }
  function sha256Fallback(input) {
    if (!(input instanceof Uint8Array)) throw new TypeError('Expected Uint8Array bytes.');
    if (input.byteLength > MAX_KNOWLEDGE) throw new RangeError('Input exceeds POC byte limit.');
    const K=[0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2];
    const n=input.byteLength*8, length=Math.ceil((input.byteLength+9)/64)*64, bytes=new Uint8Array(length); bytes.set(input); bytes[input.byteLength]=128; const view=new DataView(bytes.buffer); view.setUint32(length-8,Math.floor(n/0x100000000),false); view.setUint32(length-4,n>>>0,false);
    const H=[0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19], W=new Uint32Array(64), r=(x,c)=>(x>>>c)|(x<<(32-c));
    for(let o=0;o<length;o+=64){for(let i=0;i<16;i++)W[i]=view.getUint32(o+i*4,false);for(let i=16;i<64;i++){const x=W[i-15],y=W[i-2],s0=r(x,7)^r(x,18)^(x>>>3),s1=r(y,17)^r(y,19)^(y>>>10);W[i]=(W[i-16]+s0+W[i-7]+s1)>>>0;}let[a,b,c,d,e,f,g,h]=H;for(let i=0;i<64;i++){const s1=r(e,6)^r(e,11)^r(e,25),ch=(e&f)^(~e&g),t1=(h+s1+ch+K[i]+W[i])>>>0,s0=r(a,2)^r(a,13)^r(a,22),maj=(a&b)^(a&c)^(b&c),t2=(s0+maj)>>>0;h=g;g=f;f=e;e=(d+t1)>>>0;d=c;c=b;b=a;a=(t1+t2)>>>0;}H[0]=(H[0]+a)>>>0;H[1]=(H[1]+b)>>>0;H[2]=(H[2]+c)>>>0;H[3]=(H[3]+d)>>>0;H[4]=(H[4]+e)>>>0;H[5]=(H[5]+f)>>>0;H[6]=(H[6]+g)>>>0;H[7]=(H[7]+h)>>>0;}
    return H.map(x=>x.toString(16).padStart(8,'0')).join('');
  }
  const digest = async bytes => { try { if (globalThis.crypto && crypto.subtle && crypto.subtle.digest) { const out=new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)); setDiag('sha256Implementation','PASS: WEB_CRYPTO'); return [...out].map(x=>x.toString(16).padStart(2,'0')).join(''); } } catch (_) {} setDiag('sha256Implementation','PASS: JS_FALLBACK'); return sha256Fallback(bytes); };
  const readBytes = async (url, max, signal) => {
    if (typeof fetch !== 'function') throw new Error('fetch indisponível');
    const response=await fetch(url,{method:'GET',mode:'cors',credentials:'omit',redirect:'error',signal});
    setDiag('http',`PASS: ${response.status}`); if (!response.ok) throw new Error(`HTTP ${response.status}`); if (response.type==='opaque'||response.redirected) throw new Error('Resposta opaque/redirecionada rejeitada');
    const declared=Number(response.headers && response.headers.get('content-length')); if(Number.isFinite(declared)&&declared>max) throw new Error('Content-Length excede limite');
    let bytes;
    if(response.body&&response.body.getReader){const reader=response.body.getReader(), chunks=[];let total=0;for(;;){const part=await reader.read();if(part.done)break;total+=part.value.byteLength;if(total>max){await reader.cancel();throw new Error('Resposta excedeu limite de bytes');}chunks.push(part.value);}bytes=new Uint8Array(total);let offset=0;for(const c of chunks){bytes.set(c,offset);offset+=c.byteLength;}}
    else {bytes=new Uint8Array(await response.arrayBuffer());if(bytes.byteLength>max)throw new Error('Resposta excedeu limite de bytes (sem stream, pós-alocação)');}
    return bytes;
  };
  const timed = (promise, signal) => new Promise((resolve, reject) => {
    const timer=setTimeout(()=>{if(signal)signal.addEventListener('abort',()=>{}, {once:true});reject(new Error(`Timeout após ${TIMEOUT} ms`));},TIMEOUT);
    promise.then(resolve,reject).finally(()=>clearTimeout(timer));
  });
  const decode = bytes => JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));
  const parsePos = (raw, pattern) => { if(typeof raw!=='string'||!pattern.test(raw))return null; const n=Number(raw.match(/[0-9]+/)[0]);return Number.isSafeInteger(n)?n:null; };
  const positionFor = anchor => {
    const chapter=anchor.closest('article.nf-chapter[data-nf-novel][data-nf-chapter]');
    const block=anchor.closest('p[data-nf-block]');
    if(!chapter||!block||!chapter.contains(block))throw new Error('Marcadores explícitos de capítulo/bloco ausentes');
    const book=chapter.getAttribute('data-nf-novel'), chapterRaw=chapter.getAttribute('data-nf-chapter'), blockRaw=block.getAttribute('data-nf-block');
    const ch=parsePos(chapterRaw,/^[0-9]{1,9}$/), bl=parsePos(blockRaw,/^b[0-9]{1,9}$/);
    setDiag('bookId',book||'UNKNOWN');setDiag('chapter',ch===null?chapterRaw||'UNKNOWN':ch);setDiag('block',bl===null?blockRaw||'UNKNOWN':bl);setDiag('metadata','PASS: EPUB data-nf markers');
    if(book!==EXPECTED_BOOK)throw new Error('bookId do EPUB não corresponde à configuração experimental');
    if(ch===null||bl===null)throw new Error('Capítulo/bloco numérico inválido');
    return {chapter:ch,block:bl};
  };
  const validateManifest = m => { if(!m||m.schema!=='nf-knowledge-manifest-poc-v1'||m.bookId!==EXPECTED_BOOK||!/^[-A-Za-z0-9._]{1,40}$/.test(m.revision||'')||m.knowledgePath!=='braham.json'||!Number.isSafeInteger(m.byteLength)||m.byteLength<1||m.byteLength>MAX_KNOWLEDGE||!/^[a-f0-9]{64}$/.test(m.sha256||''))throw new Error('Manifest/schema/identidade inválido'); const from=new URL(m.knowledgePath,MANIFEST_URL);if(from.href!==new URL(KNOWLEDGE_URL).href)throw new Error('knowledgePath incompatível'); return m; };
  const validateKnowledge = k => { if(!k||k.schema!=='nf-knowledge-poc-v1'||k.bookId!==EXPECTED_BOOK||k.entityId!==ENTITY_ID||!Array.isArray(k.facts)||k.facts.length>MAX_FACTS)throw new Error('Schema/bookId/entityId/facts inválidos');const seen=new Set();for(const f of k.facts){if(!f||typeof f.id!=='string'||seen.has(f.id)||typeof f.text!=='string'||f.text.length>1000||!f.revealedAt||!Number.isSafeInteger(f.revealedAt.chapter)||f.revealedAt.chapter<0||!Number.isSafeInteger(f.revealedAt.block)||f.revealedAt.block<0)throw new Error('Fato/proveniência temporal inválido');seen.add(f.id);}return k; };
  const load = async signal => {
    const mBytes=await timed(readBytes(MANIFEST_URL,MAX_MANIFEST,signal),signal), m=validateManifest(decode(mBytes));setDiag('manifest','PASS: '+m.revision);
    const key=[m.bookId,m.revision,MANIFEST_URL,KNOWLEDGE_URL].join('|');if(cache.has(key))return {knowledge:cache.get(key),manifest:m,cached:true};
    const bytes=await timed(readBytes(KNOWLEDGE_URL,MAX_KNOWLEDGE,signal),signal);setDiag('byteLength',bytes.byteLength===m.byteLength?'PASS':'FAIL');if(bytes.byteLength!==m.byteLength)throw new Error('ByteLength diverge do manifesto');
    const hash=await digest(bytes);setDiag('sha256',hash===m.sha256?'PASS':'FAIL');if(hash!==m.sha256)throw new Error('SHA-256 diverge do manifesto');
    const knowledge=validateKnowledge(decode(bytes));setDiag('schema','PASS');if(knowledge.bookId!==m.bookId)throw new Error('bookId do conhecimento diverge');cache.set(key,knowledge);return {knowledge,manifest:m,cached:false};
  };
  const onClick = event => {
    const target=event.target&&event.target.closest?event.target.closest('[data-nf-entity]'):null;
    if(!target||target.getAttribute('data-nf-entity')!==ENTITY_ID)return;
    event.preventDefault();setDiag('click','PASS: intercepted');setDiag('entityId',ENTITY_ID);setDiag('label',(target.textContent||'Braham').trim().slice(0,100));
    const id=++generation;if(controller)controller.abort();controller=typeof AbortController==='function'?new AbortController():null;setDiag('error','');setDiag('allowed',[]);setDiag('blocked',[]);
    let position;try{position=positionFor(target);}catch(e){setDiag('metadata','FAIL');setDiag('error',safeError(e));setDiag('antispoiler','FAIL-CLOSED');render('ERROR','Contexto de livro/capítulo/bloco inválido.',[],null,'');return;}
    render('LOADING','Carregando índice remoto…',[],position,'');
    const timeout=setTimeout(()=>{if(id===generation&&controller)controller.abort();},TIMEOUT);
    load(controller&&controller.signal).then(result=>{if(id!==generation)return;const allowed=[],blocked=[];for(const f of result.knowledge.facts){const point=f.revealedAt,ok=point.chapter<position.chapter||(point.chapter===position.chapter&&point.block<=position.block);(ok?allowed:blocked).push(f);}setDiag('antispoiler','PASS');setDiag('allowed',allowed.map(x=>x.id));setDiag('blocked',blocked.map(x=>x.id));render(allowed.length?'READY':'EMPTY','',allowed,position,result.manifest.revision);}).catch(e=>{if(id!==generation)return;setDiag('error',safeError(e));setDiag('antispoiler','NOT_TESTED');render('ERROR','Informações remotas indisponíveis.',[],position,'');}).finally(()=>clearTimeout(timeout));
  };
  document.addEventListener('click',onClick,true);
  function cleanup(){generation++;if(controller)controller.abort();controller=null;document.removeEventListener('click',onClick,true);removePanel();delete document[KEY];}
  document[KEY]=cleanup;
})();
