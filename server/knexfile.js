// server/knexfile.js

// Load environment variables from .env file.
// IMPORTANT: Assumes .env is in the CURRENT directory (server folder).
require('dotenv').config({ path: './.env' }); 

/**
 * @type { Object.<string, import("knex").Knex.Config> }
 */
module.exports = {

  development: {
    client: 'pg', // PostgreSQL client
    connection: {
      host: process.env.DB_HOST || 'localhost', 
      port: process.env.DB_PORT || 5432,
      user: process.env.DB_USER || 'postgres', 
      password: process.env.DB_PASSWORD, // Using environment variable
      database: process.env.DB_NAME || 'team_task_manager_db', // Using environment variable, with correct default
    },
    migrations: {
      directory: './db/migrations', // Correct path to your migration files
      tableName: 'knex_migrations', 
    },
    seeds: {
      directory: './db/seeds', 
    },
    pool: { 
      min: 2,
      max: 10
    },
  },

  // Staging configuration (unchanged)
  staging: {
    client: 'pg',
    connection: {
      database: process.env.STAGING_DB_NAME || 'my_db_staging',
      user:     process.env.STAGING_DB_USER || 'username',
      password: process.env.STAGING_DB_PASSWORD || 'password'
    },
    pool: {
      min: 2,
      max: 10
    },
    migrations: {
      tableName: 'knex_migrations',
      directory: './db/migrations',
    },
    seeds: {
      directory: './db/seeds',
    },
  },

  // Production configuration, specifically optimized for Render deployment
  production: {
    client: 'pg',
    connection: process.env.DATABASE_URL, 
    pool: {
      min: 2,
      max: 10
    },
    migrations: {
      tableName: 'knex_migrations',
      directory: './db/migrations',
    },
    seeds: {
      directory: './db/seeds',
    },
    ssl: {
      rejectUnauthorized: false 
    }
  }

};
