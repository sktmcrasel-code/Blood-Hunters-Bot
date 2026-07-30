const Datastore = require('nedb-promises');
const path = require('path');

// Create the datastore for tracking CFX linked names
const cfxDb = Datastore.create({
    filename: path.join(__dirname, '../data/cfxPlayers.db'),
    autoload: true
});

module.exports = cfxDb;
