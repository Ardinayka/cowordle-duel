// Stop reading as soon as a request exceeds its byte budget, including chunked bodies.
export async function boundedBody(request,limit){
 const length=request.headers.get('content-length');
 if(length!==null&&(!/^\d+$/.test(length)||Number(length)>limit))throw Object.assign(Error('too_large'),{status:413});
 if(!request.body)return '';
 const reader=request.body.getReader(),chunks=[];let size=0;
 try{
  while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;
   if(size>limit){void reader.cancel().catch(()=>{});throw Object.assign(Error('too_large'),{status:413});}
   chunks.push(value);
  }
 }finally{reader.releaseLock();}
 const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength;}
 try{return new TextDecoder('utf-8',{fatal:true}).decode(bytes);}catch{throw Object.assign(Error('invalid_request'),{status:400});}
}
