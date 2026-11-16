import assert from 'node:assert/strict'
import config from '../config/adsense-readiness.json' with { type: 'json' }
export function validateAdSenseDocument(doc, { mode, isHome, pagePath = isHome ? '/' : '' }) {
  assert.equal(typeof config.adScriptEnabled, 'boolean')
  assert.deepEqual(config.allowedPaths, ['/', '/office/', '/developer/', '/about/'])
  assert(config.allowedPaths.every(path => !config.excludedPaths.includes(path)), '广告白名单不得包含敏感路径')
  assert.equal(config.verificationMethod, 'meta-home')
  assert.match(config.publisherId, /^ca-pub-\d{16}$/)
  const metas = [...doc.querySelectorAll('meta[name="google-adsense-account"]')]
  const expected = mode === 'production' && isHome
  assert.equal(metas.length, expected ? 1 : 0, 'AdSense验证标记数量/页面不符')
  if (expected) {
    assert.equal(metas[0].parentElement, doc.head, '验证标记必须位于head')
    assert.equal(metas[0].getAttribute('content'), config.publisherId, 'AdSense发布商ID不符')
  }
  assert.equal(doc.querySelectorAll('ins.adsbygoogle, [data-ad-client], [data-ad-slot]').length, 0, '不允许广告位')
  const source = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${config.publisherId}`
  const expectedScript = mode === 'production' && config.adScriptEnabled && config.allowedPaths.includes(pagePath)
  const loaders = [...doc.scripts].filter(script => script.id === 'workdev-adsense' || /pagead2\.googlesyndication\.com|adsbygoogle/i.test((script.getAttribute('src') ?? '') + script.textContent))
  assert.equal(loaders.length, expectedScript ? 1 : 0, 'AdSense广告脚本数量/页面不符')
  if (expectedScript) {
    const script = loaders[0]
    assert.equal(script.parentElement, doc.head, '广告脚本必须位于head')
    assert.equal(script.id, 'workdev-adsense', '广告脚本标识不符')
    assert.equal(script.getAttribute('src'), source, '广告脚本URL/ID不符')
    assert(script.hasAttribute('async'), '广告脚本必须async')
    assert.equal(script.getAttribute('crossorigin'), 'anonymous', '广告脚本crossorigin不符')
    assert.equal(script.textContent, '', '广告脚本禁止内联内容')
  }
}
