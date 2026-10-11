# 使用系统Ruby/Psych，不安装额外依赖；不替代GitHub服务端或actionlint。
require 'yaml'
require 'open3'
require 'json'

file = ARGV[0] || '.github/workflows/quality.yml'
text = File.read(file)
data = YAML.safe_load(text, aliases: false)
def check(condition, message)
  raise message unless condition
end
check(data['on'].keys.sort == %w[pull_request push schedule workflow_dispatch], '触发事件错误')
check(data['on']['schedule'] == [{'cron' => '17 19 * * *'}], '定时规则错误')
check(data['permissions'] == {'contents' => 'read'}, '仓库权限不符合最小权限')
check(data['jobs'].keys.sort == %w[browsers gate quality], '任务结构错误')
check(data['jobs']['browsers']['needs'] == 'quality', '浏览器必须依赖quality成功')
check(data['jobs']['gate']['needs'] == %w[quality browsers], '最终门禁必须依赖所有质量层')
check(data['jobs']['browsers']['strategy']['fail-fast'] == false, '应保留其他引擎失败证据')
check(text.scan('run: npm run build').size == 1, 'CI必须只构建一次')
check(!text.match?(/continue-on-error|pull_request_target|secrets\.|npm audit fix|\|\| true/), '存在失败绕过或未经授权能力')
check(text.include?("github.event_name == 'pull_request' || github.event_name == 'push'"), '缺少PR/push取消策略')
check(text.include?('github.run_id ||'), '定时/手动应相互隔离')
pins = JSON.parse(File.read('docs/verification/evidence/m106c4/actions.json'))
data['jobs'].each do |name, job|
  check(job['runs-on'] == 'ubuntu-24.04', 'runner错误')
  check(job['timeout-minutes'].between?(1, 30), '超时不合理')
  check(!job.key?('permissions') && !job.key?('continue-on-error'), 'job权限或失败绕过')
  job['steps'].each do |step|
    check(!step.key?('continue-on-error'), 'step失败绕过')
    if step['uses']
      repo, sha = step['uses'].split('@')
      check(repo.start_with?('actions/') && sha.match?(/\A[0-9a-f]{40}\z/), 'Action未固定官方SHA')
      check(pins.fetch(repo.delete_prefix('actions/'))['sha'] == sha, 'Action SHA未核实')
      with = step.fetch('with', {})
      check(with['persist-credentials'] == false, 'checkout持久化凭据') if repo == 'actions/checkout'
      if repo == 'actions/setup-node'
        check(with['node-version-file'] == '.node-version' && with['cache'] == 'npm', 'Node/缓存设置错误')
      end
      if repo == 'actions/upload-artifact'
        check(with['retention-days'].between?(1, 14), '留存超过14天')
        check(with['retention-days'] <= 7, 'Trace留存超过7天') if with['path'].include?('diagnostics')
        check(with['if-no-files-found'] == 'error', '工件缺失不能忽略')
        check(%w[.ci/build/ .ci/quality/ .ci/evidence/summary/ .ci/evidence/diagnostics/].include?(with['path']), '上传范围错误')
      end
    end
    next unless step['run']
    # 所有表达式通过env传入，避免拼入shell代码。
    check(!step['run'].include?('${{'), 'run内禁止表达式插值')
    _, error, status = Open3.capture3('bash', '-n', stdin_data: step['run'])
    check(status.success?, "shell语法错误: #{error}")
  end
end
# 表达式限制在已审阅的上下文和函数；此检查不声称实现GitHub表达式解析器。
expressions = text.scan(/\$\{\{(.*?)\}\}/m).flatten
expressions.each do |expression|
  check(expression.scan(/[()]/).join.count('(') == expression.scan(/[()]/).join.count(')'), '表达式括号不平衡')
  check(!expression.match?(/secrets|inputs|head_ref/), '未批准的表达式上下文')
  functions = expression.scan(/\b(\w+)\s*\(/).flatten
  check((functions - %w[always fromJSON toJSON]).empty?, '未审阅表达式函数')
end
puts "YAML、#{data['jobs'].size}任务、#{expressions.size}表达式、官方SHA、权限、依赖/上传范围与bash语法检查通过；actionlint/远端未运行"
