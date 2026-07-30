const Datastore = require('nedb-promises');
const path = require('path');
const db = Datastore.create({ filename: path.join(__dirname, 'data/guildConfigs.db'), autoload: true });
db.update({ guildId: 'test' }, { $set: { CFX_CODE: 'qplrv9' } }, { upsert: true }).then(() => console.log('success')).catch(console.error);
