import { redactJson, RedactFailure } from '../utils/jsonRedact'
self.onmessage=(event:MessageEvent<{source:string;paths:string;replacement:string}>)=>{
 try{const data=event.data;self.postMessage({ok:true,...redactJson(data.source,data.paths,data.replacement)})}
 catch(failure){self.postMessage(failure instanceof RedactFailure?{ok:false,code:failure.code,field:failure.field,item:failure.item,line:failure.line,column:failure.column}:{ok:false,code:'failed'})}
}
