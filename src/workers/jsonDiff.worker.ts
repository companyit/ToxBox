import { compareJson, JsonDiffFailure } from '../utils/jsonDiff'
self.onmessage=(event:MessageEvent<{before:string;after:string}>)=>{
 try{self.postMessage({ok:true,result:compareJson(event.data.before,event.data.after)})}
 catch(failure){self.postMessage({ok:false,code:failure instanceof JsonDiffFailure?failure.code:'failed',...(failure instanceof JsonDiffFailure?{side:failure.side,line:failure.line,column:failure.column}:{})})}
}
