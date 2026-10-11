const fs = require('node:fs');
const path = require('node:path');

const source = path.resolve(__dirname, '..', 'src', 'formatter.js');
const contextIndex = path.resolve(__dirname, '..', 'src', 'context-index.js');
const contextualUI = path.resolve(__dirname, '..', 'src', 'contextual-ui.js');
const css = path.resolve(__dirname, '..', 'src', 'formatter.css');
const uiCss = path.resolve(__dirname, '..', 'src', 'contextual-ui.css');
const adapter = path.resolve(__dirname, '..', 'src', 'lnreader-adapter.js');
const packageInfo = require(path.resolve(__dirname, '..', 'package.json'));
const outputDir = path.resolve(__dirname, '..', 'dist');
const outputLibrary = path.join(outputDir, 'novelforge-formatter.js');
const outputLNReader = path.join(outputDir, 'novelforge-lnreader.js');
fs.mkdirSync(outputDir, { recursive: true });
const sourceText = fs.readFileSync(source, 'utf8');
const contextText = fs.readFileSync(contextIndex, 'utf8');
const uiText = fs.readFileSync(contextualUI, 'utf8');
const cssText = JSON.stringify(fs.readFileSync(css, 'utf8'));
const uiCssText = JSON.stringify(fs.readFileSync(uiCss, 'utf8'));
const embeddedSource = sourceText.replace('global.NovelForgeFormatterCSS || \'\'', cssText);
if (embeddedSource === sourceText) throw new Error('CSS embedding hook not found in src/formatter.js');
const embeddedUI = uiText.replace('global.NovelForgeContextualCSS || \'\'', uiCssText);
if (embeddedUI === uiText) throw new Error('Contextual UI CSS embedding hook not found in src/contextual-ui.js');
const header = '/* NovelForge LNReader Formatter v' + packageInfo.version + ' | generated artifact. */\n';
fs.writeFileSync(
  outputLibrary,
  header + contextText + '\n' + embeddedSource,
  'utf8'
);
fs.writeFileSync(
  outputLNReader,
  header + contextText + '\n' + embeddedSource + '\n' + embeddedUI + '\n' + fs.readFileSync(adapter, 'utf8'),
  'utf8'
);
