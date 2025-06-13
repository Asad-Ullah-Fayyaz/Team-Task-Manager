// server/server.js

require('dotenv').config(); // Load environment variables from .env file

const express = require('express');
const cors = require('cors'); // Import cors
const session = require('express-session');
const pgSession = require('connect-pg-simple')(session); // Session store for PostgreSQL
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const bcrypt = require('bcryptjs');

const db = require('./db/db'); // Import the Knex database connection
const { Pool } = require('pg'); // Import Pool from 'pg' directly

const app = express();
const PORT = process.env.PORT || 5000;

// --- Create a direct PG Pool for sessions ---
const pgPool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
  max: 10, // Max number of clients in the pool
  idleTimeoutMillis: 30000, // How long a client is allowed to remain idle before being closed
});


// --- Middlewares ---

// CORS Middleware: Allow requests from your frontend
// This MUST come BEFORE other middlewares like session or body parser
app.use(cors({
  origin: 'http://localhost:5174', // Explicitly allow your frontend's origin
  credentials: true, // Allow sending/receiving cookies
  methods: ['GET', 'POST', 'PUT', 'DELETE'], // Allowed HTTP methods
  allowedHeaders: ['Content-Type', 'Authorization'], // Allowed headers
}));

// Body Parser Middleware: Parse JSON and URL-encoded data
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session Middleware
app.use(
  session({
    store: new pgSession({
      pool: pgPool, // Use the direct PG pool here
      tableName: 'user_sessions', // Name of the table to store sessions
      createTableIfMissing: true, // Automatically create the sessions table if it doesn't exist
    }),
    secret: process.env.SESSION_SECRET || 'your_session_secret', // Use a strong secret from .env
    resave: false, // Don't save session if unmodified
    saveUninitialized: false, // Don't create session until something is stored
    cookie: {
      maxAge: 1000 * 60 * 60 * 24, // 24 hours
      httpOnly: true, // Prevent client-side JavaScript from accessing the cookie
      secure: process.env.NODE_ENV === 'production', // Use secure cookies in production (HTTPS)
      sameSite: 'lax', // Protect against CSRF
    },
  })
);

// Passport Middleware
app.use(passport.initialize());
app.use(passport.session());

// --- Passport Local Strategy Configuration ---
passport.use(
  new LocalStrategy(async (username, password, done) => {
    try {
      const user = await db('users').where({ username: username }).first();

      if (!user) {
        return done(null, false, { message: 'Incorrect username.' });
      }

      const isMatch = await bcrypt.compare(password, user.password_hash);
      if (!isMatch) {
        return done(null, false, { message: 'Incorrect password.' });
      }

      return done(null, user); // User authenticated successfully
    } catch (err) {
      console.error('Passport Local Strategy error:', err);
      return done(err);
    }
  })
);

// Serialize user into the session
passport.serializeUser((user, done) => {
  // Ensure we extract the raw ID, even if 'user.id' is an object { id: N }
  const userIdToStore = (user && typeof user.id === 'object' && user.id !== null && user.id.id) 
                       ? user.id.id 
                       : user && user.id;

  if (typeof userIdToStore === 'undefined' || userIdToStore === null) {
    console.error('Serialization Error: User ID is undefined or null', user);
    return done(new Error('User ID is missing for serialization.'));
  }
  
  done(null, userIdToStore); // Store the actual numeric ID in the session
});

// Deserialize user from the session
passport.deserializeUser(async (id, done) => {
  try {
    // Ensure the ID is a primitive type before querying the database
    const userIdToQuery = (id && typeof id === 'object' && id !== null && id.id) 
                          ? id.id 
                          : id;

    if (typeof userIdToQuery !== 'number' && typeof userIdToQuery !== 'string') {
        console.error('Deserialization Error: Invalid ID type received:', id);
        return done(new Error('Invalid user ID type for database query.'));
    }

    const user = await db('users').where({ id: userIdToQuery }).first(); // Use the cleaned ID here
    if (!user) {
      console.error('Error: User not found in DB during deserialization for ID:', userIdToQuery);
    }
    done(null, user); // Attach user object to req.user
  } catch (err) {
    console.error('Passport Deserialize User error:', err);
    done(err);
  }
});

// --- Routes ---

// Basic root route
app.get('/', (req, res) => {
  res.send('Team Task Manager Backend API is running!');
});

// User Registration Route
app.post('/auth/register', async (req, res) => {
  const { username, email, password } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({ message: 'All fields are required.' });
  }

  try {
    // Check if username or email already exists
    const existingUser = await db('users')
      .where({ username })
      .orWhere({ email })
      .first();

    if (existingUser) {
      return res.status(409).json({ message: 'Username or email already exists.' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    // Insert new user into database
    // Knex's returning('id') can return an array of objects, e.g., [{ id: 1 }]
    const insertedIds = await db('users')
      .insert({ username, email, password_hash })
      .returning('id'); 
    const userId = insertedIds[0].id; // Extract the pure numeric ID

    // Automatically log in the user after registration
    // Pass a simplified user object with the pure numeric ID
    req.login({ id: userId, username, email }, (err) => { 
      if (err) {
        console.error('Error during auto-login after registration:', err);
        return res.status(500).json({ message: 'Registration successful, but auto-login failed.' });
      }
      res.status(201).json({ message: 'User registered and logged in successfully!', user: { id: userId, username, email } });
    });

  } catch (err) {
    console.error('Registration route error:', err);
    res.status(500).json({ message: 'Server error during registration.' });
  }
});

// User Login Route
app.post('/auth/login', (req, res, next) => {
  passport.authenticate('local', (err, user, info) => {
    if (err) {
      console.error('Login authentication error (Passport):', err);
      return res.status(500).json({ message: 'Server error during login.' });
    }
    if (!user) {
      return res.status(401).json({ message: info.message || 'Invalid credentials.' });
    }
    req.login(user, (err) => {
      if (err) {
        console.error('Error logging in after successful authentication:', err);
        return res.status(500).json({ message: 'Failed to log in.' });
      }
      // Successfully logged in
      return res.status(200).json({ message: 'Logged in successfully!', user: { id: user.id, username: user.username, email: user.email } });
    });
  })(req, res, next);
});

// User Logout Route
app.post('/auth/logout', (req, res) => {
  req.logout((err) => { 
    if (err) {
      console.error('Passport logout error:', err);
      return res.status(500).json({ message: 'Failed to log out.' });
    }
    req.session.destroy((err) => { 
      if (err) {
        console.error('Session destroy error:', err);
        return res.status(500).json({ message: 'Failed to destroy session.' });
      }
      res.clearCookie('connect.sid'); // Clear the session cookie
      res.status(200).json({ message: 'Logged out successfully.' });
    });
  });
});

// Protected Route Example (Only accessible by logged-in users)
app.get('/protected', isAuthenticated, (req, res) => {
  res.json({ message: `Welcome, ${req.user.username}! This is a protected route.`, user: req.user });
});

// Middleware to check if user is authenticated
function isAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ message: 'Unauthorized: Please log in.' });
}

// --- Team Routes ---
// Create a new team
app.post('/teams', isAuthenticated, async (req, res) => {
  const { name, description } = req.body;
  const created_by_user_id = req.user.id; // User ID from authenticated session

  if (!name) {
    return res.status(400).json({ message: 'Team name is required.' });
  }

  try {
    const [teamId] = await db('teams')
      .insert({ name, description, created_by_user_id })
      .returning('id');

    // Automatically add the creator as a member with 'admin' role
    await db('team_memberships').insert({
      user_id: created_by_user_id,
      team_id: teamId.id, // Ensure to get the ID from the object
      role: 'admin',
    });

    res.status(201).json({ message: 'Team created successfully!', team: { id: teamId.id, name, description, created_by_user_id } });
  } catch (err) {
    console.error('Error creating team:', err);
    if (err.code === '23505') { // PostgreSQL unique violation error code
      return res.status(409).json({ message: 'Team with this name already exists.' });
    }
    res.status(500).json({ message: 'Server error during team creation.' });
  }
});

// Get all teams associated with the logged-in user
app.get('/teams', isAuthenticated, async (req, res) => {
  const userId = req.user.id;

  try {
    const teams = await db('teams')
      .join('team_memberships', 'teams.id', '=', 'team_memberships.team_id')
      .where('team_memberships.user_id', userId)
      // Left join with users to get the creator's username
      .leftJoin('users as creator_users', 'teams.created_by_user_id', '=', 'creator_users.id')
      .select(
        'teams.*', 
        'team_memberships.role as my_role', // User's role in this specific team
        'creator_users.username as created_by_username' // Name of the user who created the team
      ); 

    res.status(200).json(teams);
  } catch (err) {
    console.error('Error fetching teams:', err);
    res.status(500).json({ message: 'Server error fetching teams.' });
  }
});

// Get a specific team by ID
app.get('/teams/:id', isAuthenticated, async (req, res) => {
  const teamId = req.params.id;
  const userId = req.user.id;

  try {
    const team = await db('teams')
      .where({ id: teamId })
      .first();

    if (!team) {
      return res.status(404).json({ message: 'Team not found.' });
    }

    // Check if the user is a member of this team
    const membership = await db('team_memberships')
      .where({ user_id: userId, team_id: teamId })
      .first();

    if (!membership) {
      return res.status(403).json({ message: 'Forbidden: You are not a member of this team.' });
    }

    res.status(200).json({ ...team, my_role: membership.role });
  } catch (err) {
    console.error('Error fetching team by ID:', err);
    res.status(500).json({ message: 'Server error fetching team.' });
  }
});

// Update a team (only by creator or admin)
app.put('/teams/:id', isAuthenticated, async (req, res) => {
  const teamId = req.params.id;
  const userId = req.user.id;
  const { name, description } = req.body;

  try {
    // Check if user is admin of the team
    const membership = await db('team_memberships')
      .where({ user_id: userId, team_id: teamId, role: 'admin' })
      .first();

    if (!membership) {
      // Also check if they are the original creator (bonus feature: role-based access)
      const team = await db('teams').where({ id: teamId }).first();
      if (!team || team.created_by_user_id !== userId) {
        return res.status(403).json({ message: 'Forbidden: Only the team creator or an admin can update this team.' });
      }
    }

    const updated = await db('teams')
      .where({ id: teamId })
      .update({ name, description, updated_at: db.fn.now() }); // Update timestamp

    if (!updated) {
      return res.status(404).json({ message: 'Team not found or no changes made.' });
    }

    res.status(200).json({ message: 'Team updated successfully!' });
  } catch (err) {
    console.error('Error updating team:', err);
    if (err.code === '23505') {
      return res.status(409).json({ message: 'Team name already exists.' });
    }
    res.status(500).json({ message: 'Server error updating team.' });
  }
});

// Delete a team (only by creator or admin)
app.delete('/teams/:id', isAuthenticated, async (req, res) => {
  const teamId = req.params.id;
  const userId = req.user.id;

  try {
    // Check if user is admin of the team
    const membership = await db('team_memberships')
      .where({ user_id: userId, team_id: teamId, role: 'admin' })
      .first();

    if (!membership) {
      // Also check if they are the original creator (bonus feature: role-based access)
      const team = await db('teams').where({ id: teamId }).first();
      if (!team || team.created_by_user_id !== userId) {
        return res.status(403).json({ message: 'Forbidden: Only the team creator or an admin can delete this team.' });
      }
    }

    const deleted = await db('teams')
      .where({ id: teamId })
      .del();

    if (!deleted) {
      return res.status(404).json({ message: 'Team not found.' });
    }

    res.status(200).json({ message: 'Team deleted successfully!' });
  } catch (err) {
    console.error('Error deleting team:', err);
    res.status(500).json({ message: 'Server error deleting team.' });
  }
});

// Add member to a team (only by admin)
app.post('/teams/:teamId/members', isAuthenticated, async (req, res) => {
  const teamId = req.params.teamId;
  const adminUserId = req.user.id;
  const { member_email, role = 'member' } = req.body; // Can specify role, default to 'member'

  if (!member_email) {
    return res.status(400).json({ message: 'Member email is required.' });
  }

  try {
    // Check if the current user is an admin of the team
    const adminMembership = await db('team_memberships')
      .where({ user_id: adminUserId, team_id: teamId, role: 'admin' })
      .first();

    if (!adminMembership) {
      return res.status(403).json({ message: 'Forbidden: Only team admins can add members.' });
    }

    // Find the user to be added by email
    const memberUser = await db('users').where({ email: member_email }).first();
    if (!memberUser) {
      return res.status(404).json({ message: 'User with provided email not found.' });
    }

    // Check if member is already in the team
    const existingMembership = await db('team_memberships')
      .where({ user_id: memberUser.id, team_id: teamId })
      .first();

    if (existingMembership) {
      return res.status(409).json({ message: 'User is already a member of this team.' });
    }

    await db('team_memberships').insert({
      user_id: memberUser.id,
      team_id: teamId,
      role: role,
    });

    res.status(201).json({ message: 'Member added successfully!' });
  } catch (err) {
    console.error('Error adding team member:', err);
    res.status(500).json({ message: 'Server error adding member to team.' });
  }
});

// Get team members
app.get('/teams/:teamId/members', isAuthenticated, async (req, res) => {
  const teamId = req.params.teamId;
  const userId = req.user.id;

  try {
    // Check if the current user is a member of the team
    const membership = await db('team_memberships')
      .where({ user_id: userId, team_id: teamId })
      .first();

    if (!membership) {
      return res.status(403).json({ message: 'Forbidden: You are not a member of this team.' });
    }

    const members = await db('team_memberships')
      .join('users', 'team_memberships.user_id', '=', 'users.id')
      .where('team_memberships.team_id', teamId)
      .select('users.id', 'users.username', 'users.email', 'team_memberships.role');

    res.status(200).json(members);
  } catch (err) {
    console.error('Error fetching team members:', err);
    res.status(500).json({ message: 'Server error fetching team members.' });
  }
});

// Remove member from a team (only by team admin)
app.delete('/teams/:teamId/members/:memberId', isAuthenticated, async (req, res) => {
  const teamId = parseInt(req.params.teamId); // Ensure teamId is an integer
  const memberIdToRemove = parseInt(req.params.memberId); // Ensure memberIdToRemove is an integer
  const adminUserId = req.user.id; // User making the request

  console.log(`[DELETE /teams/${teamId}/members/${memberIdToRemove}] Request from admin user ${adminUserId}`);
  console.log(`Attempting to remove member ${memberIdToRemove} from team ${teamId}.`);

  try {
    // 1. Check if the requesting user is an admin of the team
    const adminMembership = await db('team_memberships')
      .where({ user_id: adminUserId, team_id: teamId, role: 'admin' })
      .first();

    if (!adminMembership) {
      console.warn(`[DELETE /teams/${teamId}/members/${memberIdToRemove}] Forbidden: User ${adminUserId} is not an admin of team ${teamId}. Admin check failed.`);
      return res.status(403).json({ message: 'Forbidden: Only team admins can remove members.' });
    }
    console.log(`[DELETE /teams/${teamId}/members/${memberIdToRemove}] User ${adminUserId} confirmed as admin.`);

    // 2. Prevent an admin from removing themselves if they are the last admin,
    //    or if they are the team creator.
    const team = await db('teams').where({ id: teamId }).first();
    
    // Check if the member being removed is the team creator AND the requesting admin is trying to remove themselves (as creator)
    if (team && team.created_by_user_id === memberIdToRemove && adminUserId === memberIdToRemove) {
      console.warn(`[DELETE /teams/${teamId}/members/${memberIdToRemove}] Forbidden: User ${adminUserId} is the team creator and attempting to remove themselves (ID: ${memberIdToRemove}).`);
      return res.status(403).json({ message: 'Forbidden: Team creator cannot be removed from their own team.' });
    }
    console.log(`[DELETE /teams/${teamId}/members/${memberIdToRemove}] Creator self-removal check passed.`);
    
    // Check if the member being removed is the last admin
    const currentAdminMemberships = await db('team_memberships')
        .where({ team_id: teamId, role: 'admin' })
        .select('user_id');
    console.log(`[DELETE /teams/${teamId}/members/${memberIdToRemove}] Current admins for team ${teamId}:`, currentAdminMemberships.map(m => m.user_id));

    const isLastAdmin = currentAdminMemberships.length === 1 && currentAdminMemberships[0].user_id === memberIdToRemove;
    console.log(`[DELETE /teams/${teamId}/members/${memberIdToRemove}] Is member to remove (${memberIdToRemove}) the last admin? ${isLastAdmin}`);

    if (isLastAdmin && adminUserId === memberIdToRemove) { // Only block if *this* admin is trying to remove *themselves* as the last admin
        console.warn(`[DELETE /teams/${teamId}/members/${memberIdToRemove}] Forbidden: User ${adminUserId} is the last admin and attempting to remove themselves.`);
        return res.status(403).json({ message: 'Forbidden: Cannot remove yourself if you are the last admin of the team.' });
    }
    console.log(`[DELETE /teams/${teamId}/members/${memberIdToRemove}] Last admin self-removal check passed.`);


    // 3. Perform the deletion of the membership
    console.log(`[DELETE /teams/${teamId}/members/${memberIdToRemove}] Attempting to delete membership for user ${memberIdToRemove} from team ${teamId} via DB query.`);
    const deleted = await db('team_memberships')
      .where({ user_id: memberIdToRemove, team_id: teamId })
      .del();

    if (!deleted) {
      console.warn(`[DELETE /teams/${teamId}/members/${memberIdToRemove}] Membership not found or already removed for user ${memberIdToRemove} in team ${teamId}.`);
      return res.status(404).json({ message: 'Team member not found or already removed.' });
    }

    console.log(`[DELETE /teams/${teamId}/members/${memberIdToRemove}] Team member ${memberIdToRemove} removed successfully from team ${teamId} by admin ${adminUserId}.`);
    res.status(200).json({ message: 'Team member removed successfully.' });
  } catch (err) {
    console.error(`[DELETE /teams/${teamId}/members/${memberIdToRemove}] Error removing team member (catch block):`, err);
    res.status(500).json({ message: 'Server error removing team member.' });
  }
});


// --- User Management Routes (for internal use, e.g., assigning tasks, adding team members) ---
// Get all registered users (only return necessary public info)
app.get('/users', isAuthenticated, async (req, res) => {
  try {
    // Select only public information for users (id, username, email)
    const users = await db('users').select('id', 'username', 'email');
    res.status(200).json(users);
  } catch (err) {
    console.error('Error fetching all users:', err);
    res.status(500).json({ message: 'Server error fetching users.' });
  }
});

// --- Task Routes ---
// Create a new task within a team
app.post('/tasks', isAuthenticated, async (req, res) => {
  const { title, description, team_id, assigned_to_user_id, due_date } = req.body;
  const created_by_user_id = req.user.id;

  if (!title || !team_id) {
    return res.status(400).json({ message: 'Task title and team ID are required.' });
  }

  try {
    // Check if the current user is a member of the specified team
    const membership = await db('team_memberships')
      .where({ user_id: created_by_user_id, team_id: team_id })
      .first();

    if (!membership) {
      return res.status(403).json({ message: 'Forbidden: You are not a member of this team.' });
    }

    // Optional: Check if assigned_to_user_id is a member of the team
    if (assigned_to_user_id) {
      const assigneeMembership = await db('team_memberships')
        .where({ user_id: assigned_to_user_id, team_id: team_id })
        .first();
      if (!assigneeMembership) {
        return res.status(400).json({ message: 'Assigned user is not a member of this team.' });
      }
    }

    const [taskId] = await db('tasks')
      .insert({
        title,
        description,
        team_id,
        assigned_to_user_id: assigned_to_user_id || null, // Allow null if not assigned
        due_date: due_date || null, // Allow null if no due date
        created_by_user_id,
        status: 'pending' // Default status
      })
      .returning('id');

    res.status(201).json({ message: 'Task created successfully!', task: { id: taskId.id, title, team_id } });
  } catch (err) {
    console.error('Error creating task:', err);
    res.status(500).json({ message: 'Server error during task creation.' });
  }
});

// Get tasks (with optional filtering by team or assignee)
app.get('/tasks', isAuthenticated, async (req, res) => {
  const userId = req.user.id;
  const { team_id, assigned_to_user_id, status } = req.query; // Query parameters for filtering

  try {
    let query = db('tasks')
      .join('team_memberships', 'tasks.team_id', '=', 'team_memberships.team_id')
      .where('team_memberships.user_id', userId) // Only show tasks from teams the user is a member of
      .select('tasks.*', 'team_memberships.role as my_team_role'); // Include user's role in the team for context

    if (team_id) {
      query = query.where('tasks.team_id', team_id);
    }
    if (assigned_to_user_id) {
      query = query.where('tasks.assigned_to_user_id', assigned_to_user_id);
    }
    if (status) {
      query = query.where('tasks.status', status);
    }

    // Join with users table to get assigned user's name
    query = query.leftJoin('users as assigned_users', 'tasks.assigned_to_user_id', '=', 'assigned_users.id')
                 .select('assigned_users.username as assigned_to_username');

    // Join with users table to get creator's name
    query = query.leftJoin('users as creator_users', 'tasks.created_by_user_id', '=', 'creator_users.id')
                 .select('creator_users.username as created_by_username');


    const tasks = await query;
    res.status(200).json(tasks);
  } catch (err) {
    console.error('Error fetching tasks:', err);
    res.status(500).json({ message: 'Server error fetching tasks.' });
  }
});

// Get a specific task by ID
app.get('/tasks/:id', isAuthenticated, async (req, res) => {
  const taskId = req.params.id;
  const userId = req.user.id;

  try {
    const task = await db('tasks')
      .where('tasks.id', taskId)
      .join('team_memberships', 'tasks.team_id', '=', 'team_memberships.team_id')
      .where('team_memberships.user_id', userId) // Ensure the user is a member of the task's team
      .select('tasks.*', 'team_memberships.role as my_team_role')
      .first();

    if (!task) {
      return res.status(404).json({ message: 'Task not found or you do not have access.' });
    }

    res.status(200).json(task);
  } catch (err) {
    console.error('Error fetching task by ID:', err);
    res.status(500).json({ message: 'Server error fetching task.' });
  }
});

// Update a task
app.put('/tasks/:id', isAuthenticated, async (req, res) => {
  const taskId = req.params.id;
  const userId = req.user.id; // The user making the request
  const { title, description, status, assigned_to_user_id, due_date } = req.body;

  try {
    // Verify user has access to the task's team AND is either the creator or an admin/member
    const task = await db('tasks')
      .where('tasks.id', taskId)
      .join('team_memberships', 'tasks.team_id', '=', 'team_memberships.team_id')
      .where('team_memberships.user_id', userId)
      .select('tasks.created_by_user_id', 'team_memberships.role', 'tasks.team_id') // Added tasks.team_id to select
      .first();

    if (!task) {
      console.error(`Task update failed for user ${userId}: Task ${taskId} not found or no permission.`);
      return res.status(404).json({ message: 'Task not found or you do not have permission to update it.' });
    }

    // Only the creator, team admin, or a member can update
    if (task.created_by_user_id !== userId && task.role !== 'admin' && task.role !== 'member') {
        console.error(`Task update forbidden: User ${userId} is not creator, admin, or member for task ${taskId}. Role: ${task.role}`);
        return res.status(403).json({ message: 'Forbidden: You do not have permission to update this task.' });
    }

    const updatedData = {};
    if (title !== undefined) updatedData.title = title;
    if (description !== undefined) updatedData.description = description;
    if (status !== undefined) updatedData.status = status;
    
    if (assigned_to_user_id !== undefined) {
      // Allow null for unassigning
      if (assigned_to_user_id !== null) { 
        // Validate if assigned_to_user_id is a member of the task's team
        const assigneeMembership = await db('team_memberships')
          .where({ user_id: assigned_to_user_id, team_id: task.team_id }) // Use task.team_id here
          .first();
        if (!assigneeMembership) {
          console.error(`Task update failed: Assigned user ${assigned_to_user_id} is not a member of team ${task.team_id}.`);
          return res.status(400).json({ message: 'Assigned user is not a member of this task\'s team.' });
        }
      }
      updatedData.assigned_to_user_id = assigned_to_user_id;
    }
    if (due_date !== undefined) updatedData.due_date = due_date;

    // Log the data being updated
    console.log(`Attempting to update task ${taskId} with data:`, updatedData);

    // Update timestamp
    updatedData.updated_at = db.fn.now();

    const updated = await db('tasks')
      .where({ id: taskId })
      .update(updatedData);

    if (!updated) {
      console.warn(`Task ${taskId} not updated, possibly due to no changes or ID not found after permission check.`);
      return res.status(404).json({ message: 'Task not found or no changes made.' });
    }

    res.status(200).json({ message: 'Task updated successfully!' });
  } catch (err) {
    console.error('Error updating task (catch block):', err); // More specific catch logging
    res.status(500).json({ message: 'Server error updating task.' });
  }
});

// Delete a task
app.delete('/tasks/:id', isAuthenticated, async (req, res) => {
  const taskId = req.params.id;
  const userId = req.user.id; // The user making the request

  console.log(`[DELETE /tasks/${taskId}] Request received from user ${userId}`);

  try {
    // Verify user has access to the task's team AND is either the creator or an admin
    const task = await db('tasks')
      .where('tasks.id', taskId)
      .join('team_memberships', 'tasks.team_id', '=', 'team_memberships.team_id')
      .where('team_memberships.user_id', userId)
      .select('tasks.created_by_user_id', 'team_memberships.role', 'tasks.title') // Get creator and user's role, and task title for logging
      .first();

    console.log(`[DELETE /tasks/${taskId}] Task found:`, task);

    if (!task) {
      console.warn(`[DELETE /tasks/${taskId}] Task not found or user ${userId} does not have access.`);
      return res.status(404).json({ message: 'Task not found or you do not have permission to delete it.' });
    }

    // Only the task creator or a team admin can delete
    if (task.created_by_user_id !== userId && task.role !== 'admin') {
        console.warn(`[DELETE /tasks/${taskId}] Forbidden: User ${userId} (role: ${task.role}) is not creator (${task.created_by_user_id}) or admin.`);
        return res.status(403).json({ message: 'Forbidden: Only the task creator or a team admin can delete this task.' });
    }

    console.log(`[DELETE /tasks/${taskId}] Deleting task "${task.title}"...`);
    const deleted = await db('tasks')
      .where({ id: taskId })
      .del();

    if (!deleted) {
      console.warn(`[DELETE /tasks/${taskId}] Task was not deleted (ID: ${taskId}).`);
      return res.status(404).json({ message: 'Task not found.' }); // Should not happen if 'task' was found
    }

    console.log(`[DELETE /tasks/${taskId}] Task "${task.title}" (ID: ${taskId}) deleted successfully by user ${userId}.`);
    res.status(200).json({ message: 'Task deleted successfully!' });
  } catch (err) {
    console.error(`[DELETE /tasks/${taskId}] Error deleting task (catch block):`, err); // More specific catch logging
    res.status(500).json({ message: 'Server error deleting task.' });
  }
});


// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Access it at http://localhost:${PORT}`);
});
