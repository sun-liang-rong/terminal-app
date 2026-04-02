/**
 * 项目验证测试
 * 验证 Terminal MVP 项目的代码结构和构建输出
 */

const fs = require('fs');
const path = require('path');

const tests = [];
const errors = [];

function test(name, fn) {
  tests.push({ name, fn });
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

// 测试：检查文件是否存在
test('检查 electron/main.cjs 存在', () => {
  assert(fs.existsSync('electron/main.cjs'), 'electron/main.cjs 不存在');
});

test('检查 electron/preload.cjs 存在', () => {
  assert(fs.existsSync('electron/preload.cjs'), 'electron/preload.cjs 不存在');
});

test('检查 src/App.vue 存在', () => {
  assert(fs.existsSync('src/App.vue'), 'src/App.vue 不存在');
});

test('检查 src/components/Terminal.vue 存在', () => {
  assert(fs.existsSync('src/components/Terminal.vue'), 'Terminal.vue 不存在');
});

test('检查 src/components/Tabs.vue 存在', () => {
  assert(fs.existsSync('src/components/Tabs.vue'), 'Tabs.vue 不存在');
});

test('检查 src/components/Toolbar.vue 存在', () => {
  assert(fs.existsSync('src/components/Toolbar.vue'), 'Toolbar.vue 不存在');
});

test('检查 src/components/ThemeToggle.vue 存在', () => {
  assert(fs.existsSync('src/components/ThemeToggle.vue'), 'ThemeToggle.vue 不存在');
});

// 测试：检查构建输出
test('检查 dist/ 目录存在', () => {
  assert(fs.existsSync('dist'), 'dist 目录不存在');
});

test('检查 dist/index.html 存在', () => {
  assert(fs.existsSync('dist/index.html'), 'dist/index.html 不存在');
});

test('检查 dist/assets/ 目录存在', () => {
  assert(fs.existsSync('dist/assets'), 'dist/assets 目录不存在');
});

test('检查 dist-electron/ 目录存在', () => {
  assert(fs.existsSync('dist-electron'), 'dist-electron 目录不存在');
});

test('检查 dist-electron/main.cjs 存在', () => {
  assert(fs.existsSync('dist-electron/main.cjs'), 'dist-electron/main.cjs 不存在');
});

test('检查 dist-electron/preload.cjs 存在', () => {
  assert(fs.existsSync('dist-electron/preload.cjs'), 'dist-electron/preload.cjs 不存在');
});

// 测试：检查代码内容
test('检查 Terminal.vue 包含 xterm 导入', () => {
  const content = fs.readFileSync('src/components/Terminal.vue', 'utf8');
  assert(content.includes('@xterm/xterm'), 'Terminal.vue 未导入 @xterm/xterm');
  assert(content.includes('FitAddon'), 'Terminal.vue 未导入 FitAddon');
  assert(content.includes('WebLinksAddon'), 'Terminal.vue 未导入 WebLinksAddon');
});

test('检查 Terminal.vue 包含基础命令处理', () => {
  const content = fs.readFileSync('src/components/Terminal.vue', 'utf8');
  assert(content.includes('help'), 'Terminal.vue 未处理 help 命令');
  assert(content.includes('clear'), 'Terminal.vue 未处理 clear 命令');
  assert(content.includes('date'), 'Terminal.vue 未处理 date 命令');
  assert(content.includes('echo'), 'Terminal.vue 未处理 echo 命令');
});

test('检查 Tabs.vue 支持多标签功能', () => {
  const content = fs.readFileSync('src/components/Tabs.vue', 'utf8');
  assert(content.includes('addTab'), 'Tabs.vue 未实现 addTab');
  assert(content.includes('closeTab'), 'Tabs.vue 未实现 closeTab');
});

test('检查 ThemeToggle.vue 支持主题切换', () => {
  const content = fs.readFileSync('src/components/ThemeToggle.vue', 'utf8');
  assert(content.includes('theme-change'), 'ThemeToggle.vue 未触发 theme-change 事件');
});

// 测试：检查 package.json 配置
test('检查 package.json 包含 electron 脚本', () => {
  const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  assert(pkg.scripts['electron:dev'], '未配置 electron:dev 脚本');
  assert(pkg.scripts['electron:build'], '未配置 electron:build 脚本');
  assert(pkg.main === 'dist-electron/main.cjs', 'main 字段配置不正确');
});

// 运行所有测试
console.log('\n🧪 运行项目验证测试...\n');

let passed = 0;
let failed = 0;

for (const { name, fn } of tests) {
  try {
    fn();
    console.log(`✅ ${name}`);
    passed++;
  } catch (err) {
    console.log(`❌ ${name}`);
    console.log(`   ${err.message}`);
    failed++;
  }
}

console.log(`\n📊 测试结果: ${passed} 通过, ${failed} 失败`);

if (failed > 0) {
  process.exit(1);
} else {
  console.log('\n🎉 所有测试通过！项目验证成功。');
}
