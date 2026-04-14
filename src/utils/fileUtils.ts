/**
 * 文件工具函数
 * 格式化文件大小、解析权限、生成文件图标等
 */

// 文件大小格式化
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B'
  if (bytes < 0) return '-'

  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const k = 1024
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  const size = bytes / Math.pow(k, i)

  // 根据大小决定精度
  if (size >= 100) {
    return `${Math.round(size)} ${units[i]}`
  } else if (size >= 10) {
    return `${size.toFixed(1)} ${units[i]}`
  } else {
    return `${size.toFixed(2)} ${units[i]}`
  }
}

// 时间格式化 (Unix timestamp -> 显示格式)
export const formatFileTime = (timestamp: number): string => {
  if (!timestamp) return '-'

  const date = new Date(timestamp)
  const now = new Date()
  const diff = now.getTime() - date.getTime()

  // 一天内显示时间
  if (diff < 24 * 60 * 60 * 1000) {
    return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
  }

  // 一年内显示月日
  if (diff < 365 * 24 * 60 * 60 * 1000) {
    return date.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' })
  }

  // 超过一年显示完整日期
  return date.toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' })
}

// 权限字符串解析 (Linux 格式: drwxrwxrwx)
export const parsePermissions = (permissions: string): { type: string; owner: string; group: string; others: string } => {
  if (!permissions || permissions.length < 10) {
    return { type: '-', owner: '---', group: '---', others: '---' }
  }

  return {
    type: permissions[0],
    owner: permissions.slice(1, 4),
    group: permissions.slice(4, 7),
    others: permissions.slice(7, 10)
  }
}

// 权限描述
export const getPermissionDescription = (permissions: string): string => {
  const parsed = parsePermissions(permissions)

  const typeDesc = {
    '-': '文件',
    'd': '目录',
    'l': '链接',
    'b': '块设备',
    'c': '字符设备',
    'p': '管道',
    's': '套接字'
  }[parsed.type] || '未知'

  const rightsDesc = (rights: string): string => {
    const r = rights[0] === 'r' ? '读' : ''
    const w = rights[1] === 'w' ? '写' : ''
    const x = rights[2] === 'x' ? '执行' : ''
    return [r, w, x].filter(Boolean).join('/') || '无'
  }

  return `${typeDesc} | 用户: ${rightsDesc(parsed.owner)} | 组: ${rightsDesc(parsed.group)} | 其他: ${rightsDesc(parsed.others)}`
}

// 获取文件图标类型
export const getFileIconType = (name: string, type: 'file' | 'directory' | 'symlink'): string => {
  if (type === 'directory') return 'folder'
  if (type === 'symlink') return 'link'

  // 根据扩展名判断
  const ext = name.split('.').pop()?.toLowerCase() || ''

  // 代码文件
  const codeExts = ['js', 'ts', 'jsx', 'tsx', 'vue', 'py', 'java', 'go', 'rs', 'c', 'cpp', 'h', 'cs', 'rb', 'php', 'swift', 'kt']
  if (codeExts.includes(ext)) return 'code'

  // 配置文件
  const configExts = ['json', 'yaml', 'yml', 'xml', 'toml', 'ini', 'conf', 'config', 'env']
  if (configExts.includes(ext)) return 'config'

  // 文档文件
  const docExts = ['md', 'txt', 'doc', 'docx', 'pdf', 'ppt', 'pptx', 'xls', 'xlsx']
  if (docExts.includes(ext)) return 'document'

  // 图片文件
  const imageExts = ['png', 'jpg', 'jpeg', 'gif', 'bmp', 'svg', 'webp', 'ico']
  if (imageExts.includes(ext)) return 'image'

  // 压缩文件
  const archiveExts = ['zip', 'tar', 'gz', 'bz2', '7z', 'rar', 'xz']
  if (archiveExts.includes(ext)) return 'archive'

  // 音频文件
  const audioExts = ['mp3', 'wav', 'flac', 'aac', 'ogg', 'm4a']
  if (audioExts.includes(ext)) return 'audio'

  // 视频文件
  const videoExts = ['mp4', 'mkv', 'avi', 'mov', 'wmv', 'flv', 'webm']
  if (videoExts.includes(ext)) return 'video'

  // Shell/脚本文件
  const shellExts = ['sh', 'bash', 'zsh', 'bat', 'cmd', 'ps1']
  if (shellExts.includes(ext)) return 'shell'

  // 特殊文件名
  const specialNames = ['.gitignore', '.env', 'Dockerfile', 'Makefile', 'README', 'LICENSE', 'package.json', 'tsconfig.json']
  if (specialNames.some(n => name === n || name.startsWith(n))) return 'config'

  return 'file'
}

// 获取 Phosphor 图标组件名
export const getFileIconComponent = (name: string, type: 'file' | 'directory' | 'symlink'): string => {
  const iconType = getFileIconType(name, type)

  const iconMap: Record<string, string> = {
    folder: 'PhFolder',
    link: 'PhLink',
    code: 'PhFileCode',
    config: 'PhFileConfig',
    document: 'PhFileText',
    image: 'PhFileImage',
    archive: 'PhFileArchive',
    audio: 'PhFileAudio',
    video: 'PhFileVideo',
    shell: 'PhTerminal',
    file: 'PhFile'
  }

  return iconMap[iconType] || 'PhFile'
}

// 拼接路径
export const joinPath = (base: string, name: string): string => {
  const separator = base.includes('/') ? '/' : '\\'
  if (base.endsWith(separator)) {
    return base + name
  }
  return base + separator + name
}

// 获取父路径
export const getParentPath = (path: string): string => {
  const separator = path.includes('/') ? '/' : '\\'
  const parts = path.split(separator)
  parts.pop()
  return parts.join(separator) || (separator === '/' ? '/' : '.')
}

// 检查是否为隐藏文件
export const isHiddenFile = (name: string): boolean => {
  return name.startsWith('.')
}

// 生成唯一 ID
export const generateId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

// 判断是否为文本文件 (根据扩展名)
export const isTextFile = (name: string): boolean => {
  const ext = name.split('.').pop()?.toLowerCase() || ''

  const textExts = [
    'txt', 'md', 'json', 'yaml', 'yml', 'xml', 'html', 'css', 'scss', 'less',
    'js', 'ts', 'jsx', 'tsx', 'vue', 'svelte', 'py', 'java', 'go', 'rs', 'c',
    'cpp', 'h', 'hpp', 'cs', 'rb', 'php', 'swift', 'kt', 'scala', 'sh', 'bash',
    'zsh', 'bat', 'cmd', 'ps1', 'sql', 'log', 'conf', 'config', 'ini', 'toml',
    'env', 'gitignore', 'dockerfile', 'makefile', 'license', 'readme', 'csv'
  ]

  return textExts.includes(ext) || name.toLowerCase().startsWith('readme') || name.toLowerCase().startsWith('license')
}

// 获取文件类型描述
export const getFileTypeDescription = (type: 'file' | 'directory' | 'symlink', name: string): string => {
  if (type === 'directory') return '目录'
  if (type === 'symlink') return '符号链接'

  const ext = name.split('.').pop()?.toLowerCase() || ''

  if (!ext) return '文件'

  const typeMap: Record<string, string> = {
    js: 'JavaScript',
    ts: 'TypeScript',
    jsx: 'React JSX',
    tsx: 'React TSX',
    vue: 'Vue 组件',
    py: 'Python',
    java: 'Java',
    go: 'Go',
    rs: 'Rust',
    c: 'C 语言',
    cpp: 'C++',
    cs: 'C#',
    rb: 'Ruby',
    php: 'PHP',
    swift: 'Swift',
    kt: 'Kotlin',
    json: 'JSON',
    yaml: 'YAML',
    yml: 'YAML',
    xml: 'XML',
    html: 'HTML',
    css: 'CSS',
    md: 'Markdown',
    txt: '纯文本',
    pdf: 'PDF',
    doc: 'Word',
    docx: 'Word',
    xls: 'Excel',
    xlsx: 'Excel',
    ppt: 'PPT',
    pptx: 'PPT',
    png: 'PNG 图片',
    jpg: 'JPEG 图片',
    jpeg: 'JPEG 图片',
    gif: 'GIF 图片',
    svg: 'SVG 图片',
    zip: 'ZIP 压缩',
    tar: 'Tar 压缩',
    gz: 'GZip 压缩',
    mp3: 'MP3 音频',
    wav: 'WAV 音频',
    mp4: 'MP4 视频',
    mkv: 'MKV 视频',
    sh: 'Shell 脚本',
    bash: 'Bash 脚本',
    sql: 'SQL 脚本',
    log: '日志文件'
  }

  return typeMap[ext] || `${ext.toUpperCase()} 文件`
}