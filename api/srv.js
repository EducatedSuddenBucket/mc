const net = require('net');
const dns = require('dns');
const dgram = require('dgram');

// Helper function to create a VarInt buffer for Minecraft protocol
function createVarInt(value) {
  const buffer = Buffer.alloc(5);
  let offset = 0;
  while (value & ~0x7F) {
    buffer[offset++] = (value & 0x7F) | 0x80;
    value >>>= 7;
  }
  buffer[offset++] = value;
  return buffer.slice(0, offset);
}

// Function to resolve SRV records for Minecraft servers
async function resolveSrv(host) {
  return new Promise((resolve, reject) => {
    dns.resolveSrv(`_minecraft._tcp.${host}`, (err, records) => {
      if (err || records.length === 0) {
        resolve(null); // No SRV record found, use default host and port
      } else {
        const srvRecord = records[0];
        resolve({ name: srvRecord.name, port: srvRecord.port });
      }
    });
  });
}

// Function to connect to a Java Edition server and perform a handshake
function connectToJavaServer(host, port) {
  return new Promise((resolve, reject) => {
    const socket = net.createConnection(port, host, () => {
      const packet = Buffer.concat([
        createVarInt(0), // Handshake packet ID
        createVarInt(754), // Protocol version (754 for 1.16.5)
        Buffer.from(createVarInt(host.length)),
        Buffer.from(host, 'utf-8'),
        Buffer.alloc(2), // Server port (always 0)
        createVarInt(1) // Next state (1 for status)
      ]);
      socket.write(createVarInt(packet.length));
      socket.write(packet);

      // Send status request packet
      socket.write(Buffer.from([0x01, 0x00])); // Packet length (1), status request ID (0)

      socket.once('data', (data) => {
        const length = data[0]; // First byte is the length of the packet
        const response = JSON.parse(data.slice(3, 3 + length).toString('utf-8')); // Skip first 3 bytes
        resolve(response);
        socket.destroy();
      });
    });

    socket.on('error', (err) => {
      reject(err);
    });
  });
}

// Function to ping a Bedrock Edition server and retrieve its status
function pingBedrockServer(host, port) {
  return new Promise((resolve, reject) => {
    const client = dgram.createSocket('udp4');
    const buffer = Buffer.alloc(24);
    buffer.writeBigInt64BE(BigInt(Date.now()), 8); // Timestamp in the buffer

    client.send(buffer, 0, buffer.length, port, host, (err) => {
      if (err) {
        client.close();
        reject(err);
      }
    });

    client.on('message', (message) => {
      const motdLength = message.readUInt8(35);
      const motd = message.toString('utf-8', 36, 36 + motdLength);

      resolve({
        motd,
        playersOnline: message.readUInt16BE(36 + motdLength),
        playersMax: message.readUInt16BE(38 + motdLength),
        latency: Date.now() - parseInt(buffer.readBigInt64BE(8)),
      });

      client.close();
    });

    client.on('error', (err) => {
      client.close();
      reject(err);
    });
  });
}

// Main function to resolve SRV and connect to either Java or Bedrock server
async function resolveAndConnect(host, port, isJava = true) {
  try {
    const srvRecord = await resolveSrv(host);
    if (srvRecord) {
      console.log(`SRV record found: ${srvRecord.name}:${srvRecord.port}`);
      host = srvRecord.name;
      port = srvRecord.port;
    }

    if (isJava) {
      return await connectToJavaServer(host, port);
    } else {
      return await pingBedrockServer(host, port);
    }
  } catch (error) {
    console.error('Error resolving or connecting:', error);
    throw error;
  }
}

module.exports = { resolveAndConnect };
