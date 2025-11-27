
const testUrl = (envUrl) => {
  const url = envUrl ?? 'https://peerscholar.onrender.com/v1';
  const baseUrl = url.replace(/\/+$/, '').replace(/\/v1$/, '') + '/v1';
  console.log(`Input: "${envUrl}", Output: "${baseUrl}"`);
}

testUrl(undefined);
testUrl('https://peerscholar.onrender.com');
testUrl('https://peerscholar.onrender.com/');
testUrl('https://peerscholar.onrender.com/v1');
testUrl('https://peerscholar.onrender.com/v1/');
testUrl('http://localhost:3000');
