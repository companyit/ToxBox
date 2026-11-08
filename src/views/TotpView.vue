<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { generateTotp, defaultTotpOptions, type TotpOptions } from '@/utils/totp'
import { parseOtpauth } from '@/utils/otpauth'
const uri = ref(''), importError = ref(''), account = ref(''), issuer = ref('')
const options = ref<TotpOptions>(defaultTotpOptions)
const secret = ref(''), code = ref(''), error = ref(''), message = ref('')
const visible = ref(false), running = ref(false), busy = ref(false), now = ref(0)
const remaining = computed(() => options.value.period - Math.floor(now.value / 1000) % options.value.period)
let version = 0, lastWindow = -1, timer: ReturnType<typeof setInterval> | undefined
function stop() {
  version++; running.value = false; busy.value = false; code.value = ''; error.value = ''; message.value = ''; lastWindow = -1
  clearInterval(timer); timer = undefined
}
function clear() { stop(); secret.value = ''; uri.value = ''; account.value = ''; issuer.value = ''; importError.value = ''; options.value = defaultTotpOptions; visible.value = false }
function editSecret() { stop(); account.value = ''; issuer.value = ''; options.value = defaultTotpOptions }
function importLink() {
  stop(); importError.value = ''
  try {
    const imported = parseOtpauth(uri.value)
    secret.value = imported.secret
    options.value = { algorithm: imported.algorithm, digits: imported.digits, period: imported.period }
    account.value = imported.account; issuer.value = imported.issuer
    uri.value = ''; visible.value = false
    message.value = '链接已导入，请点击生成验证码。'
  } catch { importError.value = '导入失败：请检查链接。仅支持 TOTP、SHA1/256/512、6/8 位及 1～300 秒周期，不允许重复或未知参数。' }
}
async function update() {
  now.value = Date.now()
  const window = Math.floor(now.value / (options.value.period * 1000))
  if (!running.value || window === lastWindow) return
  lastWindow = window
  const current = ++version
  code.value = ''; message.value = ''; busy.value = true
  try {
    const result = await generateTotp(secret.value, now.value, undefined, options.value)
    if (current !== version) return
    // 计算期间跨时间窗时重算，避免显示已过期验证码。
    if (Math.floor(Date.now() / (options.value.period * 1000)) !== window) { lastWindow = -1; void update(); return }
    code.value = result
  } catch (failure) {
    if (current !== version) return
    stop(); error.value = failure instanceof Error && /^(密钥|请输入)/.test(failure.message)
      ? failure.message : '暂时无法生成验证码，请检查设备时间和浏览器安全计算支持。'
  } finally { if (current === version) busy.value = false }
}
function start() { stop(); running.value = true; void update(); timer = setInterval(() => { void update() }, 250) }
async function copy() {
  if (!code.value || Math.floor(Date.now() / (options.value.period * 1000)) !== lastWindow) { lastWindow = -1; void update(); return }
  const current = version
  try { await navigator.clipboard.writeText(code.value); if (current === version) message.value = '验证码已复制。' }
  catch { if (current === version) message.value = '复制失败，请选中验证码手动复制。' }
}
function restore() { if (document.visibilityState === 'visible' && running.value) { lastWindow = -1; void update() } }
onMounted(() => { document.addEventListener('visibilitychange', restore); window.addEventListener('pagehide', clear) })
onUnmounted(() => { clear(); document.removeEventListener('visibilitychange', restore); window.removeEventListener('pagehide', clear) })
</script>
<template>
  <section class="totp-tool" aria-label="2FA 动态验证码生成">
    <p class="local-note">密钥仅在当前页面内存中处理，不保存、不上传。本页面不加载访问分析脚本。</p>
    <form class="import-form" @submit.prevent="importLink">
      <label for="totp-uri">otpauth 链接</label>
      <input id="totp-uri" v-model="uri" type="password" autocomplete="off" autocapitalize="off" spellcheck="false" aria-describedby="totp-uri-help totp-import-error" :aria-invalid="Boolean(importError)" @input="stop(); importError = ''">
      <p id="totp-uri-help">粘贴 otpauth://totp/ 链接，最多 4096 个字符。链接含密钥，导入成功后清空此输入框。</p>
      <button type="submit" :disabled="!uri.trim()">导入链接</button>
      <p id="totp-import-error" role="alert">{{ importError }}</p>
    </form>
    <p v-if="account" class="account-info">账户：{{ account }}<span v-if="issuer"> · 发行方：{{ issuer }}</span></p>
    <p class="parameter-summary">当前参数：{{ options.algorithm }} · {{ options.digits }} 位 · {{ options.period }} 秒</p>
    <form @submit.prevent="start">
      <label for="totp-secret">Base32 密钥</label>
      <input id="totp-secret" v-model="secret" :type="visible ? 'text' : 'password'" autocomplete="off" autocapitalize="off" spellcheck="false" :aria-invalid="Boolean(error)" aria-describedby="totp-help totp-error" @input="editSecret">
      <p id="totp-help">输入已有密钥，支持字母 A–Z、数字 2–7 及分隔空白；最多 1024 个字符。手动编辑会恢复默认 SHA-1 / 6 位 / 30 秒。</p>
      <div class="actions">
        <button type="button" :aria-pressed="visible" @click="visible = !visible">{{ visible ? '隐藏密钥' : '显示密钥' }}</button>
        <button type="submit" :disabled="!secret.trim() || busy">{{ busy ? '计算中…' : '生成验证码' }}</button>
        <button type="button" @click="clear">清空</button>
      </div>
    </form>
    <p id="totp-error" role="alert">{{ error }}</p>
    <div v-if="code" class="code-panel">
      <p>当前验证码</p><output class="code" aria-label="当前验证码">{{ code }}</output>
      <p>剩余 {{ remaining }} 秒，到期自动更新</p>
      <progress :value="remaining" :max="options.period" aria-label="验证码剩余有效期" />
      <button type="button" @click="copy">复制验证码</button>
    </div>
    <p role="status">{{ message }}</p>
    <details><summary>使用说明</summary><p>手动密钥默认采用 TOTP：SHA-1、6 位、30 秒。链接可导入 SHA-256/SHA-512、8 位及其他支持的周期。请保持设备时间准确，并与服务方参数一致；本工具不验证账户登录。刷新或离开页面会清空密钥，剪贴板内容需自行管理。</p></details>
  </section>
</template>
<style scoped>
.totp-tool { max-width: 42rem; }
label { display: block; font-weight: 650; margin-bottom: 8px; }
input { width: 100%; box-sizing: border-box; padding: 12px; font: inherit; color: var(--color-text); background: var(--color-surface); border: 1px solid var(--color-border); border-radius: 8px; }
.actions { display: flex; flex-wrap: wrap; gap: 10px; }
button { min-height: 44px; padding: 8px 16px; cursor: pointer; }
.code-panel { padding: 24px; margin-block: 20px; background: var(--color-accent-soft); border: 1px solid var(--color-border); border-radius: 12px; }
.code { display: block; font: 600 clamp(2rem, 10vw, 3rem) monospace; letter-spacing: .15em; user-select: all; }
progress { display: block; width: 100%; margin-block: 12px; }
.local-note, #totp-help { color: var(--color-muted); }
</style>

