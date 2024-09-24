const https = require('https');
const http = require('http');

function fetchImage(url) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    protocol.get(url, (response) => {
      if (response.statusCode === 200) {
        let data = [];
        response.on('data', (chunk) => {
          data.push(chunk);
        });
        response.on('end', () => {
          resolve(Buffer.concat(data));
        });
      } else {
        reject(new Error(`HTTP Status Code: ${response.statusCode}`));
      }
    }).on('error', (err) => {
      reject(err);
    });
  });
}

module.exports = { fetchImage };
