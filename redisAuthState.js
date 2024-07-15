const Redis = require('redis');
const { proto } = require('@whiskeysockets/baileys');

const redisClient = Redis.createClient({
  url: process.env.REDIS_URL // Pastikan untuk menambahkan REDIS_URL ke variabel lingkungan di Render
});

redisClient.connect().catch(console.error);

const useRedisAuthState = () => {
  const writeData = async (data, file) => {
    await redisClient.set(file, JSON.stringify(data));
  };

  const readData = async (file) => {
    const data = await redisClient.get(file);
    return JSON.parse(data);
  };

  const removeData = async (file) => {
    await redisClient.del(file);
  };

  const creds = proto.AuthenticationState.fromObject({});

  return {
    state: {
      creds,
      keys: {
        get: async (type, ids) => {
          const data = {};
          await Promise.all(
            ids.map(async (id) => {
              let value = await readData(`${type}-${id}`);
              if (type === 'app-state-sync-key' && value) {
                value = proto.AppStateSyncKeyData.fromObject(value);
              }
              data[id] = value;
            })
          );
          return data;
        },
        set: async (data) => {
          const tasks = [];
          for (const category in data) {
            for (const id in data[category]) {
              const value = data[category][id];
              const file = `${category}-${id}`;
              tasks.push(value ? writeData(value, file) : removeData(file));
            }
          }
          await Promise.all(tasks);
        }
      }
    },
    saveCreds: async () => {
      await writeData(creds, 'creds');
    }
  };
};

module.exports = { useRedisAuthState };