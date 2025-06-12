// server/db/migrations/..._create_user_sessions_table.js
// This migration is specifically for 'connect-pg-simple' to store sessions in PostgreSQL.

exports.up = function(knex) {
  return knex.schema.createTable('user_sessions', function(table) {
    table.string('sid').primary(); // Session ID
    table.jsonb('sess').notNullable(); // Session data (JSONB for better performance and flexibility)
    table.timestamp('expire').notNullable(); // Expiration timestamp
  });
};

exports.down = function(knex) {
  return knex.schema.dropTableIfExists('user_sessions');
};
