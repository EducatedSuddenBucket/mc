const { resolveAndConnect } = require('./srv');
const { fetchImage } = require('./imageFetcher');

export default async function handler(req, res) {
  const serverip = req.query.serverip;
  let [serverHost, serverPort] = serverip.split(':');
  serverPort = serverPort ? parseInt(serverPort) : 25565;

  try {
    const response = await resolveAndConnect(serverHost, serverPort);
    if (response.favicon) {
      if (response.favicon.startsWith('data:image/png;base64,')) {
        const faviconData = response.favicon.split(',')[1];
        const faviconBuffer = Buffer.from(faviconData, 'base64');
        res.setHeader('Content-Type', 'image/png');
        res.send(faviconBuffer);
      } else if (response.favicon.startsWith('http')) {
        const imageBuffer = await fetchImage(response.favicon);
        res.setHeader('Content-Type', 'image/png');
        res.send(imageBuffer);
      } else {
        res.status(400).json({ error: 'Invalid favicon format' });
      }
    } else {
      res.status(404).json({ error: 'No favicon available' });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server offline or no favicon' });
  }
}
