// Script temporário para corrigir keys duplicadas
const fs = require('fs');

const filePath = './components/LeadFullViewModal.tsx';
let content = fs.readFileSync(filePath, 'utf8');

// Substituir a linha problemática
content = content.replace(
  /{availablePhones\.map\(phone => \(/g,
  '{availablePhones.map((phone, index) => ('
);

content = content.replace(
  /<option key={phone\.value} value={phone\.value}>/g,
  '<option key={`${phone.value}-${index}`} value={phone.value}>'
);

fs.writeFileSync(filePath, content, 'utf8');
console.log('✅ Arquivo corrigido!');
