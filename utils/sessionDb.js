const Datastore = require('nedb-promises');
const path = require('path');

// Create the datastore for active play sessions
const sessionDb = Datastore.create({
    filename: path.join(__dirname, '../data/sessions.db'),
    autoload: true
});

module.exports = sessionDb;
