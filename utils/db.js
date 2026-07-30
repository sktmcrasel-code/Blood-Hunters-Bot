const Datastore = require('nedb-promises');
const path = require('path');

// Create the datastore
const db = Datastore.create({
    filename: path.join(__dirname, '../data/guildConfigs.db'),
    autoload: true
});

module.exports = db;
