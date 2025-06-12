// server/db/db.js
const knexfile = require('../knexfile');
const knex = require('knex');

// Initialize Knex with the development configuration
const db = knex(knexfile.development);

module.exports = db; // Export the configured knex instance