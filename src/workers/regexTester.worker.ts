import { testRegex, type RegexRequest } from '../utils/regexTester'

self.onmessage = (event: MessageEvent<RegexRequest>) => {
  self.postMessage(testRegex(event.data))
}
