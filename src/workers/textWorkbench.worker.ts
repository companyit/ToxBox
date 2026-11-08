import {processWorkflow,WorkflowError,type TextStep} from '../utils/textWorkbench'
for(const method of ['log','warn','error','info','debug'] as const)console[method]=()=>{}
self.onmessage=(event:MessageEvent<{input:string;steps:TextStep[]}>)=>{
 try{self.postMessage({ok:true,result:processWorkflow(event.data.input,event.data.steps)})}
 catch(error){self.postMessage({ok:false,code:error instanceof WorkflowError?error.code:'failed',step:error instanceof WorkflowError?error.step:undefined})}
}
