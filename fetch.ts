import * as https from 'https';
https.get('https://raw.githubusercontent.com/dartv-ajaz/Live-Sports-Group-A/refs/heads/main/sultan_cricket.json', (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => { console.log(data.substring(0, 1000)); });
});
