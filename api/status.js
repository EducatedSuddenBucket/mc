const net = require('net');
const dns = require('dns');
const { resolveAndConnect } = require('./srv'); // Adjust to import your helper functions.

export default async function handler(req, res) {
  const [serverHost, serverPort] = req.query.serverAddress.split(':');
  const port = serverPort ? parseInt(serverPort, 10) : 25565;

  try {
    const response = await resolveAndConnect(serverHost, port);
    let description = '';
    if (typeof response.description === 'string') {
      description = response.description;
    } else if (response.description) {
      description = extractText(response.description);
    }

    const serverInfo = {
      version: response.version,
      players: {
        max: response.players.max,
        online: response.players.online,
        list: response.players.sample || [],
      },
      description,
      latency: response.latency,
      favicon: response.favicon,
    };

    res.status(200).json(serverInfo);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server offline' });
  }
}
