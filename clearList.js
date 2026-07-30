const db = require('./utils/db');
db.update({}, { $set: { PLAYTIME_TRACKED_MEMBERS: [] } }, { multi: true })
    .then(() => console.log('List cleared'))
    .catch(console.error);
