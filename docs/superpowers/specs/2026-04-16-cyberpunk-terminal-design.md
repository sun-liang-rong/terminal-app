# 赛博朋克终端视觉设计

## 概述

将本地终端页面的视觉风格从当前"Nocturnal"紫色调重新设计为"赛博朋克 Cyberpunk"风格，采用适度光效点缀，保持专业感的同时增强科技氛围。

## 设计背景

用户对当前终端的视觉风格不满意，需要更精致、更有质感的外观。设计目标是：
- 增强科技感和视觉吸引力
- 保持适度光效，不分散注意力
- 提升整体品牌识别度

## 配色方案

### 核心色彩

| 颜色 | HEX | 用途 |
|------|-----|------|
| Cyan | #00ffff | 主色，边框、提示符、标题 |
| Magenta | #ff00ff | 点缀色，Logo、强调元素 |
| Green | #00ff88 | 成功色，输出、在线状态 |
| Red | #ff0055 | 错误色，警告、失败 |

### 背景色

| 层级 | HEX | 用途 |
|------|-----|------|
| 深层 | #0a0a12 | 终端主体背景 |
| 卡片 | #000000 | 内层卡片背景 |
| 半透明 | rgba(0,0,0,0.95) | 欢迎页遮罩 |

### CSS 变量定义

```css
:root {
  /* Cyberpunk 色彩 */
  --cyber-cyan: #00ffff;
  --cyber-cyan-rgb: 0, 255, 255;
  --cyber-magenta: #ff00ff;
  --cyber-magenta-rgb: 255, 0, 255;
  --cyber-green: #00ff88;
  --cyber-green-rgb: 0, 255, 136;
  --cyber-red: #ff0055;
  --cyber-red-rgb: 255, 0, 85;

  /* 发光效果 */
  --cyber-glow-sm: 0 0 5px rgba(var(--color-rgb), 0.3);
  --cyber-glow-md: 0 0 10px rgba(var(--color-rgb), 0.5);
  --cyber-glow-lg: 0 0 20px rgba(var(--color-rgb), 0.5);

  /* 边框光效 */
  --cyber-border-cyan: rgba(0, 255, 255, 0.3);
  --cyber-border-magenta: rgba(255, 0, 255, 0.3);
}
```

## 组件设计

### 1. 终端主体区域

**视觉效果：**
- 边框：半透明 Cyan (30% opacity) + 微外发光
- 标题栏：渐变背景 (Cyan→Magenta @ 10% opacity)
- 状态指示灯：红/绿发光小球，带 box-shadow
- 命令提示符：Cyan/Magenta 双色 + text-shadow
- 输出文字：Green + 柔和发光

**CSS 实现：**
```css
.terminal-container {
  border: 1px solid rgba(0, 255, 255, 0.3);
  box-shadow: 0 0 30px rgba(0, 255, 255, 0.1);
}

.terminal-header {
  background: linear-gradient(90deg,
    rgba(0, 255, 255, 0.1),
    rgba(255, 0, 255, 0.1)
  );
  border-bottom: 1px solid rgba(0, 255, 255, 0.2);
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  box-shadow: 0 0 6px currentColor;
}

.prompt-symbol {
  color: #ff00ff;
  text-shadow: 0 0 8px rgba(255, 0, 255, 0.5);
}
```

### 2. 空态引导层 (欢迎页)

**视觉效果：**
- Logo：64px 圆角方块，Cyan→Magenta 渐变背景 + 外发光
- 标题：Cyan + Magenta 双色拼接，letter-spacing: 2px
- 分隔线：三色渐变 (transparent → Cyan → Magenta → transparent)
- 操作卡片：每项独立配色边框
- 快捷键：统一 Cyan 边框的 kbd 样式

**CSS 实现：**
```css
.guide-logo {
  width: 64px;
  height: 64px;
  border-radius: 16px;
  background: linear-gradient(135deg, #00ffff 0%, #ff00ff 100%);
  box-shadow: 0 0 40px rgba(0, 255, 255, 0.3);
}

.guide-title-cyan {
  color: #00ffff;
  text-shadow: 0 0 10px rgba(0, 255, 255, 0.5);
}

.guide-title-magenta {
  color: #ff00ff;
  text-shadow: 0 0 10px rgba(255, 0, 255, 0.5);
}

.guide-divider {
  background: linear-gradient(90deg,
    transparent,
    rgba(0, 255, 255, 0.5),
    rgba(255, 0, 255, 0.5),
    transparent
  );
}

.action-card-cyan {
  background: rgba(0, 255, 255, 0.05);
  border: 1px solid rgba(0, 255, 255, 0.2);
}

.action-card-magenta {
  background: rgba(255, 0, 255, 0.05);
  border: 1px solid rgba(255, 0, 255, 0.2);
}

.action-card-green {
  background: rgba(0, 255, 136, 0.05);
  border: 1px solid rgba(0, 255, 136, 0.2);
}
```

### 3. 系统监控区

**视觉效果：**
- 卡片边框：Cyan (20% opacity) + 微外发光
- 状态指示：Green 发光小球 + "ONLINE" 文字
- 进度条：Cyan→Magenta 渐变 + 发光效果
- 数据分列：CPU Cyan / RAM Magenta 区分
- 数值：monospace 字体 + text-shadow

**CSS 实现：**
```css
.system-monitor {
  background: rgba(0, 0, 0, 0.8);
  border: 1px solid rgba(0, 255, 255, 0.2);
  box-shadow: 0 0 20px rgba(0, 255, 255, 0.05);
}

.status-indicator {
  width: 6px;
  height: 6px;
  background: #00ff88;
  border-radius: 50%;
  box-shadow: 0 0 6px #00ff88;
}

.progress-bar {
  background: linear-gradient(90deg, #00ffff, #ff00ff);
  box-shadow: 0 0 10px rgba(0, 255, 255, 0.5);
}

.cpu-value {
  color: #00ffff;
  text-shadow: 0 0 5px rgba(0, 255, 255, 0.3);
}

.ram-value {
  color: #ff00ff;
  text-shadow: 0 0 5px rgba(255, 0, 255, 0.3);
}
```

## 实现文件清单

| 文件 | 修改内容 |
|------|----------|
| src/styles/design-system.css | 添加 Cyberpunk CSS 变量 |
| src/components/Terminal.vue | 更新终端主体样式 |
| src/App.vue | 更新系统监控区样式 |

## 验证标准

1. 启动应用，终端边框显示 Cyan 光效
2. 欢迎页 Logo 带渐变背景和发光
3. 系统监控区进度条显示渐变发光
4. 文字发光效果不影响可读性
5. 整体视觉协调，专业感与科技感平衡

## 备注

- 保持适度光效原则，发光强度不超过 0.5 opacity
- text-shadow 范围控制在 8px 以内
- 确保暗色背景下的文字对比度足够