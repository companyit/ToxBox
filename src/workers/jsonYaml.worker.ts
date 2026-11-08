import { convertJsonYaml, type JsonYamlDirection } from '../utils/jsonYaml'
for(const method of ['log','warn','error','info','debug'] as const)console[method]=()=>{}
self.onmessage=(event:MessageEvent<{input:string;direction:JsonYamlDirection}>)=>{
 self.postMessage(convertJsonYaml(event.data.input,event.data.direction))
}
