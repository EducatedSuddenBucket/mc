const { resolveAndConnect } = require('./srv');

export default async function handler(req, res) {
  const [serverHost, serverPort] = req.query.serverAddress.split(':');
  const port = serverPort ? parseInt(serverPort, 10) : 19132;

  try {
    const response = await resolveAndConnect(serverHost, port, false);
    const serverInfo = {
      motd: response.motd,
      levelName: response.worldname,
      playersOnline: response.playersOnline,
      playersMax: response.playersMax,
      gamemode: response.gameMode,
      serverId: response.serverId,
      protocol: response.protocol,
      version: response.version,
      latency: response.latency,
    };

    res.status(200).json(serverInfo);
  } catch (error) {
    console.error('Ping failed:', error);
    res.status(500).json({ error: 'Server offline' });
  }
}
