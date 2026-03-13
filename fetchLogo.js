import https from 'https';
import fs from 'fs';

https.get('https://atbocciidldnhaclyerh.supabase.co/storage/v1/object/public/assets/logoswift.png', (res) => {
    const data = [];
    res.on('data', chunk => data.push(chunk));
    res.on('end', () => {
        const buffer = Buffer.concat(data);
        const base64 = buffer.toString('base64');
        console.log('BASE64_LENGTH: ' + base64.length);
        if (!fs.existsSync('src/utils')) fs.mkdirSync('src/utils');
        fs.writeFileSync('src/utils/logoBase64.js', 'export const logoBase64 = "data:image/png;base64,' + base64 + '";');
        console.log('Saved to src/utils/logoBase64.js');
    });
});
