# 054设计

关联[规格](spec.md)。纯TS jsonDiffNavigation模块只根据已按类型筛选的差异数组及路径文字返回匹配索引；不改变jsonDiff算法、比较Worker或报告算法。

页面保留filtered/visible分页数据，新增查找草稿、已提交查询、搜索IME状态、匹配索引数组、当前匹配序号与对应filtered索引。输入提交后只重算匹配并撤销定位，不自动滚动/抢焦点；定位首处/下一处再主动跳转。类型筛选保留查询但重置定位和第一页；手动翻页保留查询、清除定位。invalidate统一清空查询及定位。

定位函数检查边界/IME，记录独立导航版本，更新当前匹配及page，nextTick后再次核对版本/结果/目标，按内部data-change-index查找当前页目标，focus preventScroll后scrollIntoView block:center/auto。结果项tabindex=-1，不引入数百Tab停靠点，aria-current标记唯一当前项；查询内容不参与选择器、ID或URL。清除定位递增版本，使迟到DOM任务失效。

查找草稿与提交查询分离，compositionstart暂停提交和定位，compositionend读取输入实际值再提交，不与JSON编辑器的composing状态混用。查找不影响报告内容，不清空报告或全局统计，也不伪称导出仅匹配项。

验证纯匹配的字面量/大小写/空白/~0/~1/根与顺序；组件跨100项分页、首尾/无匹配、类型组合、手动翻页、报告保持、IME及迟到聚焦；浏览器三宽度、键盘、目标可见/唯一高亮、200%重排、导入原功能及隐私。执行类型/preview、单元组件、静态和相关双引擎E2E，Firefox与真实设备/读屏单列缺口。
