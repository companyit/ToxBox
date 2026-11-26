export const fileReadStatus = {
  reading: '正在本地读取文件…',
  retained: '当前输入已保留。',
  get canceled() { return '已取消读取，' + this.retained },
  get timeout() { return '读取超过 10 秒，已停止，' + this.retained },
  get failed() { return '无法读取文件，请重新选择。' + this.retained },
}
