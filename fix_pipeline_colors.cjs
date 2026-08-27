const fs = require('fs');
const file = 'src/features/Pipeline.jsx';
let content = fs.readFileSync(file, 'utf8');

// Text Colors
content = content.split('color: "#1E293B"').join('color: T.white');
content = content.split('color: "#64748B"').join('color: T.whiteDim');
content = content.split('color: "#94A3B8"').join('color: T.whiteFade');
content = content.split('color: "#CBD5E1"').join('color: T.whiteFade');
content = content.split('color: "#334155"').join('color: T.white');
content = content.split('color: "#475569"').join('color: T.whiteDim');

// Input/Card Backgrounds
content = content.split('background: "#F8FAFC"').join('background: T.bg2');
content = content.split('background: "#F1F5F9"').join('background: T.bg3');
content = content.split('background: "#FFF"').join('background: T.bg0');
content = content.split('background: "#FFFFFF"').join('background: T.bg0');
content = content.split('background: "rgba(255,255,255,0.7)"').join('background: T.bg1');
content = content.split('background: "rgba(255,255,255,0.85)"').join('background: T.bg1');
content = content.split('background: "rgba(255,255,255,0.9)"').join('background: T.bg1');

// Borders
content = content.split('border: "1px solid #E2E8F0"').join('border: `1px solid ${T.borderHi}`');
content = content.split('borderBottom: "2px solid #E2E8F0"').join('borderBottom: `2px solid ${T.borderHi}`');
content = content.split('borderTop: "1px solid #F1F5F9"').join('borderTop: `1px solid ${T.border}`');
content = content.split("border: `2px dashed #E2E8F0`").join('border: `2px dashed ${T.borderHi}`');
content = content.split('border: "1px solid rgba(0,0,0,0.05)"').join('border: `1px solid ${T.border}`');
content = content.split('border: "1px solid rgba(255,255,255,0.5)"').join('border: `1px solid ${T.border}`');
content = content.split("borderColor = \"#E2E8F0\"").join('borderColor = T.borderHi');

// Section wrappers: white rgba backgrounds
content = content.split('background: "rgba(255,255,255,0.02)"').join('background: T.bg2');
content = content.split('background: "rgba(255,255,255,0.01)"').join('background: T.bg1');

// Section header text colors with hardcoded dark labels
content = content.split('color: "#0EA5E9"').join('color: T.teal');

fs.writeFileSync(file, content);
console.log('Done! All hardcoded light-mode colors replaced with T theme tokens.');
