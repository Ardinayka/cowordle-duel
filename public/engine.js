export const normalize = s => s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
export function score(guess,answer){const out=Array(5).fill('absent'),left=answer.split('');for(let i=0;i<5;i++)if(guess[i]===answer[i]){out[i]='exact';left[i]=null;}for(let i=0;i<5;i++)if(out[i]!=='exact'){const j=left.indexOf(guess[i]);if(j>=0){out[i]='present';left[j]=null;}}return out;}
export function candidates(words,rows){return words.filter(w=>rows.every(r=>score(r.word,w).join(',')===r.colors.join(',')));}
export function pickBot(words,rows,random=Math.random,difficulty='normal'){
  // A bot receives only public clues and valid guesses, never the hidden answer.
  const unused=words.filter(w=>!rows.some(r=>r.word===w));
  const complete=candidates(unused,rows);
  const latest=rows.slice(-1);
  const partial=unused.filter(w=>latest.every(r=>r.colors.every((c,i)=>c!=='exact'||w[i]===r.word[i])));
  // Easier opponents sometimes overlook deductions. They still never repeat a word.
  const careful=difficulty==='expert'||random()<(difficulty==='easy'?.3:.75);
  const pool=careful&&complete.length?complete:partial.length?partial:unused;
  return pool[Math.floor(random()*pool.length)];
}
export function botDelay(difficulty,random=Math.random){const range={easy:[7000,5000],normal:[4500,3500],expert:[2500,2000]}[difficulty]||[4500,3500];return range[0]+random()*range[1];}
