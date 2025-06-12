// server/db/migrations/<timestamp>_initial_schema.js

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema
    .createTable('users', function(table) {
      table.increments('id').primary(); // Primary key, auto-incrementing
      table.string('username', 255).notNullable().unique(); // Unique username
      table.string('email', 255).notNullable().unique();    // Unique email
      table.string('password_hash', 255).notNullable();     // Stores hashed password
      table.timestamps(true, true); // created_at and updated_at columns
    })
    .createTable('teams', function(table) {
      table.increments('id').primary();
      table.string('name', 255).notNullable().unique();
      table.text('description');
      table.integer('created_by_user_id')
           .references('id')
           .inTable('users')
           .onDelete('CASCADE') // If user is deleted, delete their teams
           .notNullable();
      table.timestamps(true, true);
    })
    .createTable('team_memberships', function(table) {
      table.increments('id').primary();
      table.integer('user_id')
           .references('id')
           .inTable('users')
           .onDelete('CASCADE')
           .notNullable();
      table.integer('team_id')
           .references('id')
           .inTable('teams')
           .onDelete('CASCADE')
           .notNullable();
      table.string('role', 50).defaultTo('member'); // e.g., 'admin', 'member'
      table.unique(['user_id', 'team_id']); // A user can only be in a team once
      table.timestamps(true, true);
    })
    .createTable('tasks', function(table) {
      table.increments('id').primary();
      table.string('title', 255).notNullable();
      table.text('description');
      table.string('status', 50).defaultTo('pending'); // e.g., 'pending', 'in-progress', 'completed'
      table.integer('team_id')
           .references('id')
           .inTable('teams')
           .onDelete('CASCADE')
           .notNullable();
      table.integer('assigned_to_user_id')
           .references('id')
           .inTable('users')
           .onDelete('SET NULL'); // If user is deleted, task assignment becomes NULL
      table.date('due_date'); // For bonus feature
      table.integer('created_by_user_id')
           .references('id')
           .inTable('users')
           .onDelete('SET NULL'); // Who created the task
      table.timestamps(true, true);
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  // Revert the changes in reverse order of creation
  return knex.schema
    .dropTableIfExists('tasks')
    .dropTableIfExists('team_memberships')
    .dropTableIfExists('teams')
    .dropTableIfExists('users');
};