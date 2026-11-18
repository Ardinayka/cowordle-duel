// Room words never repeat a Daily word someone may be playing now: yesterday, today or tomorrow in UTC covers
// every time zone (the Daily accepts dates within a day of the server).
export async function recentDaily(storage,now=Date.now()){try{const days=[-1,0,1].map(o=>new Date(now+o*864e5).toISOString().slice(0,10));return ((await storage.prepare('SELECT word FROM daily_puzzles WHERE day IN (?,?,?)').bind(...days).all()).results||[]).map(r=>r.word);}catch{return [];}}
export function pickWord(pool,exclude=[]){const skip=new Set([].concat(exclude).filter(Boolean));const words=pool.filter(w=>!skip.has(w));const n=crypto.getRandomValues(new Uint32Array(1))[0];return (words.length?words:pool)[n%(words.length||pool.length)];}
