const Datastore = require('nedb-promises');
const path = require('path');

// Create the datastore for playtime tracking
const playtimeDb = Datastore.create({
    filename: path.join(__dirname, '../data/playtime.db'),
    autoload: true
});

module.exports = playtimeDb;
