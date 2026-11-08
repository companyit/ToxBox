import {compareText,TextDiffError} from '../utils/textDiff'
for(const method of ['log','warn','error','info','debug'] as const)console[method]=()=>{}
self.onmessage=(event:MessageEvent<{before:string;after:string}>)=>{
 try{self.postMessage({ok:true,result:compareText(event.data.before,event.data.after)})}
 catch(error){self.postMessage({ok:false,code:error instanceof TextDiffError?error.code:'failed'})}
}
