// client/src/Dashboard.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';

// NOTE: Uncomment these if you have @heroicons/react installed and want to use actual icons
// import { PlusIcon, UserGroupIcon, DocumentTextIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/solid';

const API_BASE_URL = 'http://localhost:5000'; // Your backend server URL

function Dashboard({ loggedInUser, handleLogout }) {
  // State for storing teams, tasks, and UI messages/loading status
  const [teams, setTeams] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  // State for filtering tasks
  const [selectedTeamId, setSelectedTeamId] = useState(null); 
  const [selectedAssigneeId, setSelectedAssigneeId] = useState(null); 

  // State for 'Create Team' modal
  const [showCreateTeamModal, setShowCreateTeamModal] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');
  const [newTeamDescription, setNewTeamDescription] = useState('');

  // State for 'Create Task' modal
  const [showCreateTaskModal, setShowCreateTaskModal] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDescription, setNewTaskDescription] = useState('');
  const [newTaskTeamId, setNewTaskTeamId] = useState('');
  const [newTaskAssignedTo, setNewTaskAssignedTo] = useState(''); // Stores user ID
  const [newTaskDueDate, setNewTaskDueDate] = useState('');
  const [availableAssignees, setAvailableAssignees] = useState([]); // Users in the selected team for task assignment

  // State for 'Manage Members' modal
  const [showManageMembersModal, setShowManageMembersModal] = useState(false);
  const [currentTeamToManage, setCurrentTeamToManage] = useState(null); // The team whose members are being managed
  const [teamMembers, setTeamMembers] = useState([]); // Members of the currentTeamToManage
  const [allUsers, setAllUsers] = useState([]); // All registered users in the system
  const [memberSearchMessage, setMemberSearchMessage] = useState('');
  const [selectedUserToAddId, setSelectedUserToAddId] = useState(''); // New state for selected user ID
  const [memberToRemove, setMemberToRemove] = useState(null); // State for member to remove
  const [showConfirmRemoveMember, setShowConfirmRemoveMember] = useState(false); // State for remove member confirmation modal

  // State for 'Task Details' modal
  const [showTaskDetailsModal, setShowTaskDetailsModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null); // The task whose details are being viewed

  // State for 'Team Details' modal
  const [showTeamDetailsModal, setShowTeamDetailsModal] = useState(false);
  const [selectedTeamForDetails, setSelectedTeamForDetails] = useState(null);

  // States for Editing a Task
  const [showEditTaskModal, setShowEditTaskModal] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState(null);
  const [editTaskTitle, setEditTaskTitle] = useState('');
  const [editTaskDescription, setEditTaskDescription] = useState('');
  const [editTaskStatus, setEditTaskStatus] = useState('pending'); // Default status
  const [editTaskAssignedTo, setEditTaskAssignedTo] = useState('');
  const [editTaskDueDate, setEditTaskDueDate] = useState('');
  const [editTaskTeamMembers, setEditTaskTeamMembers] = useState([]); // Members of the task's team for assignment dropdown

  // States for Deleting a Task
  const [showDeleteTaskConfirm, setShowDeleteTaskConfirm] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState(null);

  // States for Deleting a Team (NEW)
  const [showDeleteTeamConfirm, setShowDeleteTeamConfirm] = useState(false);
  const [teamToDelete, setTeamToDelete] = useState(null);


  // Effect to fetch teams and tasks when the user logs in or component mounts
  useEffect(() => {
    if (loggedInUser) {
      fetchTeams();
      fetchTasks(); 
      fetchUsers(); // Fetch all users for member management
    }
  }, [loggedInUser]); // Re-run when loggedInUser changes (e.g., after successful login)

  // Effect to re-fetch tasks when filters (selectedTeamId, selectedAssigneeId) change
  useEffect(() => {
    if (loggedInUser) {
      fetchTasks();
    }
  }, [selectedTeamId, selectedAssigneeId]); // Re-fetch tasks on filter change

  // Effect to fetch available assignees when new task modal is open or team selection changes
  useEffect(() => {
    if (showCreateTaskModal && newTaskTeamId) {
      fetchTeamMembers(newTaskTeamId, setAvailableAssignees);
    } else if (!showCreateTaskModal) {
      // Clear assignees and selected assignee when modal closes
      setAvailableAssignees([]);
      setNewTaskAssignedTo('');
    }
  }, [showCreateTaskModal, newTaskTeamId]);

  // Effect for edit task modal: fetch team members for assignment dropdown
  useEffect(() => {
    if (showEditTaskModal && taskToEdit?.team_id) {
      fetchTeamMembers(taskToEdit.team_id, setEditTaskTeamMembers);
    } else if (!showEditTaskModal) {
      setEditTaskTeamMembers([]);
    }
  }, [showEditTaskModal, taskToEdit]);


  // Effect to fetch team members when manage members modal opens or currentTeamToManage changes
  useEffect(() => {
    if (showManageMembersModal && currentTeamToManage) {
      fetchTeamMembersForManagement(currentTeamToManage.id);
    }
  }, [showManageMembersModal, currentTeamToManage]);


  // Function to fetch all teams the logged-in user is a member of
  const fetchTeams = async () => {
    setIsLoading(true);
    setMessage(''); // Clear previous messages
    try {
      const response = await axios.get(`${API_BASE_URL}/teams`, {
        withCredentials: true, // Important for sending the session cookie
      });
      setTeams(response.data);
    } catch (error) {
      console.error('Error fetching teams:', error.response?.data || error.message);
      setMessage(error.response?.data?.message || 'Failed to load teams.');
    } finally {
      setIsLoading(false);
    }
  };

  // Function to fetch tasks, applying filters if selected
  const fetchTasks = async () => {
    setIsLoading(true);
    setMessage('');
    try {
      const params = {};
      // Add team ID filter if selected
      if (selectedTeamId) {
        params.team_id = selectedTeamId;
      }
      // Add assignee ID filter if selected
      if (selectedAssigneeId) {
        params.assigned_to_user_id = selectedAssigneeId;
      }
      // You can add a status filter here later (e.g., params.status = selectedStatus)

      const response = await axios.get(`${API_BASE_URL}/tasks`, {
        params, // axios automatically serializes params into query strings
        withCredentials: true,
      });
      setTasks(response.data);
    } catch (error) {
      console.error('Error fetching tasks:', error.response?.data || error.message);
      setMessage(error.response?.data?.message || 'Failed to load tasks.');
    } finally {
      setIsLoading(false);
    }
  };

  // Function to handle creating a new team
  const handleCreateTeam = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage('');
    try {
      const response = await axios.post(`${API_BASE_URL}/teams`, {
        name: newTeamName,
        description: newTeamDescription,
      }, {
        withCredentials: true,
      });
      setMessage(response.data.message);
      setNewTeamName(''); // Clear form fields
      setNewTeamDescription('');
      setShowCreateTeamModal(false); // Close the modal after successful creation
      fetchTeams(); // Refresh the teams list to show the new team
    } catch (error) {
      console.error('Error creating team:', error.response?.data || error.message);
      // Improved error message for team name conflict
      if (error.response?.status === 409) {
        setMessage(error.response?.data?.message || 'A team with this name already exists.');
      } else {
        setMessage(error.response?.data?.message || 'Failed to create team.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Function to fetch members for a specific team (used in Create Task modal and Edit Task modal)
  const fetchTeamMembers = async (teamId, setStateCallback) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/teams/${teamId}/members`, {
        withCredentials: true,
      });
      setStateCallback(response.data);
    } catch (error) {
      console.error('Error fetching team members for assignment:', error.response?.data || error.message);
      setMessage(error.response?.data?.message || 'Failed to load team members for assignment.');
      setStateCallback([]); // Clear assignees on error
    }
  };

  // Function to fetch all registered users for team member search
  const fetchUsers = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/users`, {
        withCredentials: true,
      });
      setAllUsers(response.data);
    } catch (error) {
      console.error('Error fetching all users:', error.response?.data || error.message);
      // No specific message for general users, as this is for internal search
    }
  };

  // Function to fetch members for a specific team (used in Manage Members modal)
  const fetchTeamMembersForManagement = async (teamId) => {
    setMemberSearchMessage('');
    try {
      const response = await axios.get(`${API_BASE_URL}/teams/${teamId}/members`, {
        withCredentials: true,
      });
      setTeamMembers(response.data);
    } catch (error) {
      console.error('Error fetching team members for management:', error.response?.data || error.message);
      setMemberSearchMessage(error.response?.data?.message || 'Failed to load team members.');
      setTeamMembers([]);
    }
  };

  // Function to handle adding a member to a team
  const handleAddMemberToTeam = async (e) => {
    e.preventDefault();
    setMemberSearchMessage('');
    setIsLoading(true);

    if (!selectedUserToAddId) {
        setMemberSearchMessage('Please select a user to add.');
        setIsLoading(false);
        return;
    }

    try {
      const userToAdd = allUsers.find(user => user.id === parseInt(selectedUserToAddId));

      if (!userToAdd) {
        setMemberSearchMessage('Selected user not found.');
        setIsLoading(false);
        return;
      }
      
      const response = await axios.post(`${API_BASE_URL}/teams/${currentTeamToManage.id}/members`, {
        member_email: userToAdd.email, // Backend still expects email for simplicity
        role: 'member' // Default role for new members
      }, {
        withCredentials: true,
      });
      setMemberSearchMessage(response.data.message);
      setSelectedUserToAddId(''); // Clear selection
      fetchTeamMembersForManagement(currentTeamToManage.id); // Refresh member list
      fetchTeams(); // Also refresh main teams list in case roles changed or membership updated
    } catch (error) {
      console.error('Error adding member to team:', error.response?.data || error.message);
      setMemberSearchMessage(error.response?.data?.message || 'Failed to add member.');
    } finally {
      setIsLoading(false);
    }
  };

  // Function to open the confirm remove member modal
  const openConfirmRemoveMember = (member) => {
    setMemberToRemove(member);
    setShowConfirmRemoveMember(true);
  };

  // Function to close the confirm remove member modal
  const closeConfirmRemoveMember = () => {
    setMemberToRemove(null);
    setShowConfirmRemoveMember(false);
    setMemberSearchMessage(''); // Clear message
  };

  // Function to handle removing a member from a team
  const handleRemoveMemberFromTeam = async () => {
    setIsLoading(true);
    setMemberSearchMessage(''); // Clear previous messages

    if (!currentTeamToManage || !memberToRemove) {
      setMemberSearchMessage('Error: Team or member not selected for removal.');
      setIsLoading(false);
      return;
    }

    try {
      const response = await axios.delete(`${API_BASE_URL}/teams/${currentTeamToManage.id}/members/${memberToRemove.id}`, {
        withCredentials: true,
      });
      setMemberSearchMessage(response.data.message);
      closeConfirmRemoveMember(); // Close confirmation modal
      fetchTeamMembersForManagement(currentTeamToManage.id); // Refresh member list
      fetchTeams(); // Also refresh main teams list (in case current user's team membership changed)
    } catch (error) {
      console.error('Error removing member from team:', error.response?.data || error.message);
      setMemberSearchMessage(error.response?.data?.message || 'Failed to remove member.');
    } finally {
      setIsLoading(false);
    }
  };

  // Function to handle creating a new task
  const handleCreateTask = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage('');
    try {
      const response = await axios.post(`${API_BASE_URL}/tasks`, {
        title: newTaskTitle,
        description: newTaskDescription,
        team_id: parseInt(newTaskTeamId), // Ensure it's an integer
        assigned_to_user_id: newTaskAssignedTo ? parseInt(newTaskAssignedTo) : null, // Ensure integer or null
        due_date: newTaskDueDate || null, // Allow null if no due date
      }, {
        withCredentials: true,
      });
      setMessage(response.data.message);
      // Clear form fields
      setNewTaskTitle('');
      setNewTaskDescription('');
      setNewTaskTeamId('');
      setNewTaskAssignedTo('');
      setNewTaskDueDate('');
      setShowCreateTaskModal(false); // Close modal
      fetchTasks(); // Refresh tasks list
    } catch (error) {
      console.error('Error creating task:', error.response?.data || error.message);
      setMessage(error.response?.data?.message || 'Failed to create task.');
    } finally {
      setIsLoading(false);
    }
  };

  // Function to open task details modal
  const openTaskDetails = (task) => {
    setSelectedTask(task);
    setShowTaskDetailsModal(true);
  };

  // Function to close task details modal
  const closeTaskDetails = () => {
    setSelectedTask(null);
    setShowTaskDetailsModal(false);
  };

  // Function to open team details modal
  const openTeamDetails = (team) => {
    setSelectedTeamForDetails(team);
    setShowTeamDetailsModal(true);
  };

  // Function to close team details modal
  const closeTeamDetails = () => {
    setSelectedTeamForDetails(null);
    setShowTeamDetailsModal(false);
  };

  // Function to open the Edit Task Modal
  const openEditTaskModal = (task) => {
    setTaskToEdit(task);
    setEditTaskTitle(task.title);
    setEditTaskDescription(task.description || '');
    setEditTaskStatus(task.status);
    setEditTaskAssignedTo(task.assigned_to_user_id || '');
    setEditTaskDueDate(task.due_date ? new Date(task.due_date).toISOString().split('T')[0] : ''); // Format date for input type="date"
    setShowEditTaskModal(true);
  };

  // Function to close the Edit Task Modal
  const closeEditTaskModal = () => {
    setTaskToEdit(null);
    setShowEditTaskModal(false);
    setMessage(''); // Clear message when closing
  };

  // Function to handle updating a task
  const handleUpdateTask = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage('');

    try {
      const response = await axios.put(`${API_BASE_URL}/tasks/${taskToEdit.id}`, {
        title: editTaskTitle,
        description: editTaskDescription,
        status: editTaskStatus,
        assigned_to_user_id: editTaskAssignedTo ? parseInt(editTaskAssignedTo) : null,
        due_date: editTaskDueDate || null,
      }, {
        withCredentials: true,
      });
      setMessage(response.data.message);
      closeEditTaskModal(); // Close modal on success
      fetchTasks(); // Refresh the tasks list
    } catch (error) {
      console.error('Error updating task:', error.response?.data || error.message);
      setMessage(error.response?.data?.message || 'Failed to update task.');
    } finally {
      setIsLoading(false);
    }
  };

  // Function to open Delete Task Confirmation Modal
  const openDeleteTaskConfirm = (task) => {
    setTaskToDelete(task);
    setShowDeleteTaskConfirm(true);
  };

  // Function to close Delete Task Confirmation Modal
  const closeDeleteTaskConfirm = () => {
    setTaskToDelete(null);
    setShowDeleteTaskConfirm(false);
    setMessage(''); // Clear message
  };

  // Function to handle deleting a task
  const handleDeleteTask = async () => {
    setIsLoading(true);
    setMessage('');

    try {
      const response = await axios.delete(`${API_BASE_URL}/tasks/${taskToDelete.id}`, {
        withCredentials: true,
      });
      setMessage(response.data.message);
      closeDeleteTaskConfirm(); // Close confirmation on success
      fetchTasks(); // Refresh the tasks list
    } catch (error) {
      console.error('Error deleting task:', error.response?.data || error.message);
      setMessage(error.response?.data?.message || 'Failed to delete task.');
    } finally {
      setIsLoading(false);
    }
  };

  // NEW: Function to open Delete Team Confirmation Modal
  const openDeleteTeamConfirm = (team) => {
    setTeamToDelete(team);
    setShowDeleteTeamConfirm(true);
    closeTeamDetails(); // Close the details modal first
  };

  // NEW: Function to close Delete Team Confirmation Modal
  const closeDeleteTeamConfirm = () => {
    setTeamToDelete(null);
    setShowDeleteTeamConfirm(false);
    setMessage(''); // Clear message
  };

  // NEW: Function to handle deleting a team
  const handleDeleteTeam = async () => {
    setIsLoading(true);
    setMessage('');

    try {
      const response = await axios.delete(`${API_BASE_URL}/teams/${teamToDelete.id}`, {
        withCredentials: true,
      });
      setMessage(response.data.message);
      closeDeleteTeamConfirm(); // Close confirmation on success
      fetchTeams(); // Refresh the teams list
      fetchTasks(); // Refresh tasks as some might no longer belong to a team
    } catch (error) {
      console.error('Error deleting team:', error.response?.data || error.message);
      setMessage(error.response?.data?.message || 'Failed to delete team.');
    } finally {
      setIsLoading(false);
    }
  };


  // Helper function to extract unique assignees from the current tasks list
  // This is used to populate the assignee filter dropdown
  const getAllAssignees = () => {
    const assignees = new Map(); // Using a Map to ensure unique assignees by ID
    tasks.forEach(task => {
      if (task.assigned_to_user_id && task.assigned_to_username) {
        assignees.set(task.assigned_to_user_id, {
          id: task.assigned_to_user_id,
          username: task.assigned_to_username
        });
      }
    });
    return Array.from(assignees.values()); // Convert Map values to an array
  };

  // Filter out users who are already members of the current team
  const availableUsersForAdd = allUsers.filter(user => 
    !teamMembers.some(member => member.id === user.id)
  );

  // Determine if the logged-in user is an admin of the current team being managed
  const isCurrentUserAdmin = currentTeamToManage && teams.some(team => 
    team.id === currentTeamToManage.id && team.my_role === 'admin'
  );

  // Determine if the logged-in user is an admin of the team being viewed in details modal
  const isCurrentUserAdminOfSelectedTeam = selectedTeamForDetails && teams.some(team =>
    team.id === selectedTeamForDetails.id && team.my_role === 'admin'
  );


  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col items-center p-4 font-[Poppins] text-gray-800">
      {/* Header section for the Dashboard */}
      <header className="w-full max-w-6xl flex justify-between items-center py-6 border-b-2 border-blue-200 px-4 md:px-0">
        <div className="text-left">
          <h1 className="text-5xl font-extrabold text-blue-900 tracking-tight leading-tight drop-shadow-md">
            Team Task Manager
          </h1>
          <p className="mt-2 text-xl text-gray-700 font-light">Welcome, {loggedInUser?.username}!</p>
        </div>
        <button
          onClick={handleLogout}
          className="px-6 py-2 bg-red-600 text-white rounded-lg shadow-md hover:bg-red-700 transition-colors duration-200"
          disabled={isLoading}
        >
          Logout
        </button>
      </header>

      {/* Main content area for Teams and Tasks sections */}
      <main className="w-full max-w-6xl mt-8 grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Teams Section */}
        <section className="bg-white p-6 rounded-xl shadow-lg col-span-1 border border-blue-200">
          <h2 className="text-2xl font-bold text-blue-800 mb-4 flex justify-between items-center">
            Your Teams
            {/* Button to open the 'Create Team' modal */}
            <button
              onClick={() => setShowCreateTeamModal(true)}
              className="bg-green-600 text-white px-4 py-2 rounded-lg shadow-md hover:bg-green-700 transition-colors duration-200 flex items-center"
            >
              {/* <PlusIcon className="h-5 w-5 mr-1" /> */}
              New Team
            </button>
          </h2>
          {/* Loading indicator for teams */}
          {isLoading && message.includes('teams') ? <p className="text-center text-gray-500">Loading teams...</p> : null}
          {/* Display general messages (including specific team creation errors) */}
          {message && (message.includes('team') || message.includes('Failed to create team')) && (
            <div className={`mb-4 p-3 rounded-md text-sm text-center 
              ${message.includes('successfully') ? 'bg-green-100 border border-green-300 text-green-800' : 'bg-red-100 border border-red-300 text-red-800'}`
            }>
              {message}
            </div>
          )}

          {/* Message if no teams are found */}
          {teams.length === 0 && !isLoading && !message.includes('team') && (
            <p className="text-gray-600 text-center">No teams found. Create one!</p>
          )}

          {/* List of Teams */}
          <ul className="space-y-3">
            {teams.map((team) => (
              <li
                key={team.id}
                className={`p-3 border rounded-lg flex flex-col md:flex-row items-start md:items-center justify-between transition-all duration-200 cursor-pointer
                  ${selectedTeamId === team.id ? 'bg-blue-100 border-blue-500 shadow-inner' : 'bg-gray-50 border-gray-200 hover:bg-gray-100'}`}
                onClick={() => openTeamDetails(team)} // Added onClick to open team details
              >
                <div className="flex-grow mb-2 md:mb-0">
                  <span className="font-medium text-lg block">{team.name}</span>
                  <span className="text-sm text-gray-500 capitalize">Role: {team.my_role}</span>
                </div>
                {team.my_role === 'admin' && ( // Only show "Manage Members" to admins
                  <button
                    onClick={(e) => { // Stop propagation to prevent team details modal from opening
                      e.stopPropagation(); 
                      setCurrentTeamToManage(team);
                      setShowManageMembersModal(true);
                    }}
                    className="ml-0 md:ml-4 px-3 py-1 bg-purple-100 text-purple-700 rounded-md hover:bg-purple-200 transition-colors duration-200 text-sm"
                  >
                    {/* <UserGroupIcon className="h-4 w-4 mr-1" /> */}
                    Manage Members
                  </button>
                )}
              </li>
            ))}
          </ul>
        </section>

        {/* Tasks Section */}
        <section className="bg-white p-6 rounded-xl shadow-lg col-span-1 md:col-span-2 border border-indigo-200">
          <h2 className="text-2xl font-bold text-indigo-800 mb-4 flex justify-between items-center">
            Tasks
            <button
              onClick={() => { setShowCreateTaskModal(true); setNewTaskTeamId(selectedTeamId || ''); setNewTaskAssignedTo(''); setNewTaskDueDate(''); }} // Added onClick to open modal
              className="bg-blue-600 text-white px-4 py-2 rounded-lg shadow-md hover:bg-blue-700 transition-colors duration-200 flex items-center"
            >
              {/* <PlusIcon className="h-5 w-5 mr-1" /> */}
              New Task
            </button>
          </h2>

          {/* Task Filters */}
          <div className="flex flex-wrap gap-4 mb-6 items-center">
            {/* Filter by Team dropdown */}
            <div className="relative inline-block text-left">
              <label htmlFor="team-filter" className="sr-only">Filter by Team</label>
              <select
                id="team-filter"
                className="block w-full rounded-md border-gray-300 shadow-sm py-2 px-3 pr-8 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                value={selectedTeamId || ''} // Handle null for 'All Teams' option
                onChange={(e) => setSelectedTeamId(e.target.value === '' ? null : parseInt(e.target.value))}
              >
                <option value="">All Teams</option>
                {teams.map(team => (
                  <option key={team.id} value={team.id}>{team.name}</option>
                ))}
              </select>
            </div>

            {/* Filter by Assignee dropdown */}
            <div className="relative inline-block text-left">
              <label htmlFor="assignee-filter" className="sr-only">Filter by Assignee</label>
              <select
                id="assignee-filter"
                className="block w-full rounded-md border-gray-300 shadow-sm py-2 px-3 pr-8 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                value={selectedAssigneeId || ''} // Handle null for 'All Assignees' option
                onChange={(e) => setSelectedAssigneeId(e.target.value === '' ? null : parseInt(e.target.value))}
              >
                <option value="">All Assignees</option>
                {getAllAssignees().map(assignee => (
                  <option key={assignee.id} value={assignee.id}>{assignee.username}</option>
                ))}
              </select>
            </div>

            {/* Clear Filters Button */}
            {(selectedTeamId || selectedAssigneeId) && (
              <button
                onClick={() => { setSelectedTeamId(null); setSelectedAssigneeId(null); setMessage(''); }}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg shadow-sm hover:bg-gray-300 transition-colors duration-200 text-sm"
              >
                Clear Filters
              </button>
            )}
          </div>

          {/* Loading indicator for tasks */}
          {isLoading && !message.includes('teams') ? <p className="text-center text-gray-500">Loading tasks...</p> : null}
          {/* Display general messages (errors for tasks) */}
          {message && !message.includes('teams') && <div className="mb-4 p-3 bg-red-100 border border-red-300 text-red-800 rounded-md text-sm">{message}</div>}

          {/* Message if no tasks are found */}
          {tasks.length === 0 && !isLoading && !message && (
            <p className="text-gray-600 text-center">No tasks found for selected filters. Create one!</p>
          )}

          {/* List of Tasks */}
          <ul className="space-y-4">
            {tasks.map((task) => (
              <li
                key={task.id}
                className="bg-white p-4 border border-gray-200 rounded-lg shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center cursor-pointer hover:bg-gray-50 transition-colors duration-150"
                onClick={() => openTaskDetails(task)} // Added onClick to open details
              >
                <div>
                  <h3 className="font-bold text-lg text-gray-900">{task.title}</h3>
                  <p className="text-gray-600 text-sm mt-1">
                    Team: <span className="font-semibold">{teams.find(t => t.id === task.team_id)?.name || 'N/A'}</span>
                  </p>
                  <p className="text-gray-600 text-sm">
                    Assignee: <span className="font-semibold">{task.assigned_to_username || 'Unassigned'}</span>
                  </p>
                  <p className="text-gray-600 text-sm">
                    Status: <span className={`font-semibold capitalize ${task.status === 'completed' ? 'text-green-600' : task.status === 'in-progress' ? 'text-blue-600' : 'text-yellow-600'}`}>
                      {task.status}
                    </span>
                  </p>
                  {task.due_date && (
                    <p className="text-gray-600 text-sm">
                      Due: <span className="font-semibold">{new Date(task.due_date).toLocaleDateString()}</span>
                    </p>
                  )}
                </div>
                {/* Action buttons for tasks (Edit/Delete) */}
                <div className="flex space-x-2 mt-3 sm:mt-0">
                  <button
                    onClick={(e) => { e.stopPropagation(); openEditTaskModal(task); }} // Open edit modal
                    className="p-2 bg-blue-100 text-blue-700 rounded-full hover:bg-blue-200 transition-colors duration-200"
                    title="Edit Task"
                  >
                    {/* <PencilIcon className="h-5 w-5" /> */}
                    Edit
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); openDeleteTaskConfirm(task); }} // Open delete confirmation
                    className="p-2 bg-red-100 text-red-700 rounded-full hover:bg-red-200 transition-colors duration-200"
                    title="Delete Task"
                  >
                    {/* <TrashIcon className="h-5 w-5" /> */}
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      </main>

      {/* Create Team Modal */}
      {showCreateTeamModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex justify-center items-center p-4 z-50">
          <div className="bg-white p-8 rounded-xl shadow-2xl w-full max-w-md">
            <h3 className="text-2xl font-bold text-gray-800 mb-6 text-center">Create New Team</h3>
            <form onSubmit={handleCreateTeam} className="space-y-4">
              <div>
                <label htmlFor="newTeamName" className="block text-sm font-medium text-gray-700 mb-1">Team Name</label>
                <input
                  type="text"
                  id="newTeamName"
                  value={newTeamName}
                  onChange={(e) => setNewTeamName(e.target.value)}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  disabled={isLoading}
                />
              </div>
              <div>
                <label htmlFor="newTeamDescription" className="block text-sm font-medium text-gray-700 mb-1">Description (Optional)</label>
                <textarea
                  id="newTeamDescription"
                  value={newTeamDescription}
                  onChange={(e) => setNewTeamDescription(e.target.value)}
                  rows="3"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  disabled={isLoading}
                ></textarea>
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => { setShowCreateTeamModal(false); setMessage(''); }}
                  className="px-5 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors duration-200"
                  disabled={isLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200"
                  disabled={isLoading}
                >
                  {isLoading ? 'Creating...' : 'Create Team'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Task Modal */}
      {showCreateTaskModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex justify-center items-center p-4 z-50">
          <div className="bg-white p-8 rounded-xl shadow-2xl w-full max-w-md">
            <h3 className="text-2xl font-bold text-gray-800 mb-6 text-center">Create New Task</h3>
            <form onSubmit={handleCreateTask} className="space-y-4">
              <div>
                <label htmlFor="newTaskTitle" className="block text-sm font-medium text-gray-700 mb-1">Task Title</label>
                <input
                  type="text"
                  id="newTaskTitle"
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  disabled={isLoading}
                />
              </div>
              <div>
                <label htmlFor="newTaskDescription" className="block text-sm font-medium text-gray-700 mb-1">Description (Optional)</label>
                <textarea
                  id="newTaskDescription"
                  value={newTaskDescription}
                  onChange={(e) => setNewTaskDescription(e.target.value)}
                  rows="3"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  disabled={isLoading}
                ></textarea>
              </div>
              <div>
                <label htmlFor="newTaskTeam" className="block text-sm font-medium text-gray-700 mb-1">Assign to Team</label>
                <select
                  id="newTaskTeam"
                  value={newTaskTeamId}
                  onChange={(e) => setNewTaskTeamId(e.target.value)}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  disabled={isLoading || teams.length === 0}
                >
                  <option value="">Select a Team</option>
                  {teams.map(team => (
                    <option key={team.id} value={team.id}>{team.name}</option>
                  ))}
                </select>
                {teams.length === 0 && !isLoading && (
                  <p className="text-sm text-red-500 mt-1">No teams available. Please create a team first.</p>
                )}
              </div>
              {newTaskTeamId && ( // Show assignee dropdown only if a team is selected
                <div>
                  <label htmlFor="newTaskAssignedTo" className="block text-sm font-medium text-gray-700 mb-1">Assigned To (Optional)</label>
                  <select
                    id="newTaskAssignedTo"
                    value={newTaskAssignedTo}
                    onChange={(e) => setNewTaskAssignedTo(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    disabled={isLoading || availableAssignees.length === 0}
                  >
                    <option value="">Unassigned</option>
                    {availableAssignees.map(member => (
                      <option key={member.id} value={member.id}>{member.username}</option>
                    ))}
                  </select>
                  {availableAssignees.length === 0 && newTaskTeamId && !isLoading && (
                    <p className="text-sm text-gray-500 mt-1">No members found for this team.</p>
                  )}
                </div>
              )}
              <div>
                <label htmlFor="newTaskDueDate" className="block text-sm font-medium text-gray-700 mb-1">Due Date (Optional)</label>
                <input
                  type="date"
                  id="newTaskDueDate"
                  value={newTaskDueDate}
                  onChange={(e) => setNewTaskDueDate(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  disabled={isLoading}
                />
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => { setShowCreateTaskModal(false); setMessage(''); }}
                  className="px-5 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors duration-200"
                  disabled={isLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200"
                  disabled={isLoading}
                >
                  {isLoading ? 'Creating...' : 'Create Task'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Manage Members Modal */}
      {showManageMembersModal && currentTeamToManage && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex justify-center items-center p-4 z-50">
          <div className="bg-white p-8 rounded-xl shadow-2xl w-full max-w-lg">
            <h3 className="text-2xl font-bold text-gray-800 mb-6 text-center">Manage Members for "{currentTeamToManage.name}"</h3>
            
            {memberSearchMessage && (
              <div className={`mb-4 p-3 rounded-md text-sm text-center 
                ${memberSearchMessage.includes('successfully') ? 'bg-green-100 border border-green-300 text-green-800' : 'bg-red-100 border border-red-300 text-red-800'}`
              }>
                {memberSearchMessage}
              </div>
            )}

            {/* Add Member Form (Dropdown/Select for available users) */}
            <form onSubmit={handleAddMemberToTeam} className="space-y-4 mb-6 p-4 border border-gray-200 rounded-lg bg-gray-50">
              <h4 className="text-lg font-semibold text-gray-700">Add New Member</h4>
              <div className="flex flex-col sm:flex-row gap-3">
                <select
                  value={selectedUserToAddId}
                  onChange={(e) => setSelectedUserToAddId(e.target.value)}
                  className="flex-grow px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  disabled={isLoading || availableUsersForAdd.length === 0}
                >
                  <option value="">Select user to add</option>
                  {availableUsersForAdd.map(user => (
                    <option key={user.id} value={user.id}>
                      {user.username} ({user.email})
                    </option>
                  ))}
                </select>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200"
                  disabled={isLoading || !selectedUserToAddId}
                >
                  {isLoading ? 'Adding...' : 'Add Member'}
                </button>
              </div>
              {availableUsersForAdd.length === 0 && !isLoading && (
                <p className="text-sm text-gray-500 mt-1">All available users are already members of this team.</p>
              )}
            </form>

            {/* Current Members List */}
            <h4 className="text-lg font-semibold text-gray-700 mb-3">Current Members</h4>
            {teamMembers.length === 0 && !isLoading && <p className="text-gray-600">No members yet, except the creator.</p>}
            <ul className="space-y-2 max-h-60 overflow-y-auto pr-2">
              {teamMembers.map(member => (
                <li key={member.id} className="flex justify-between items-center p-3 bg-white border border-gray-200 rounded-lg shadow-sm">
                  <span className="font-medium">{member.username} ({member.email})</span>
                  <span className="text-sm text-gray-500 capitalize">{member.role}</span>
                  {/* Show Remove button only if current user is an admin of this team AND the member is not the logged-in user */}
                  {isCurrentUserAdmin && loggedInUser.id !== member.id && ( 
                     <button 
                       onClick={() => openConfirmRemoveMember(member)} 
                       className="ml-4 px-3 py-1 bg-red-100 text-red-700 rounded-md hover:bg-red-200 transition-colors duration-200 text-sm"
                       disabled={isLoading}
                     >
                       Remove
                     </button>
                  )}
                </li>
              ))}
            </ul>

            <div className="flex justify-end mt-6">
              <button
                type="button"
                onClick={() => { setShowManageMembersModal(false); setCurrentTeamToManage(null); setMemberSearchMessage(''); setSelectedUserToAddId(''); }}
                className="px-5 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors duration-200"
                disabled={isLoading}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Remove Member Modal */}
      {showConfirmRemoveMember && memberToRemove && currentTeamToManage && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex justify-center items-center p-4 z-50">
          <div className="bg-white p-8 rounded-xl shadow-2xl w-full max-w-sm">
            <h3 className="text-xl font-bold text-gray-800 mb-4 text-center">Confirm Member Removal</h3>
            <p className="text-gray-700 text-center mb-6">
              Are you sure you want to remove <br />
              <strong className="text-red-600">"{memberToRemove.username}"</strong> from <br />
              <strong className="text-blue-600">"{currentTeamToManage.name}"</strong>?
            </p>
            {memberSearchMessage && (
              <div className={`mb-4 p-3 rounded-md text-sm text-center 
                ${memberSearchMessage.includes('successfully') ? 'bg-green-100 border border-green-300 text-green-800' : 'bg-red-100 border border-red-300 text-red-800'}`
              }>
                {memberSearchMessage}
              </div>
            )}
            <div className="flex justify-center space-x-4">
              <button
                type="button"
                onClick={closeConfirmRemoveMember}
                className="px-5 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors duration-200"
                disabled={isLoading}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRemoveMemberFromTeam}
                className="px-5 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors duration-200"
                disabled={isLoading}
              >
                {isLoading ? 'Removing...' : 'Remove'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Task Details Modal */}
      {showTaskDetailsModal && selectedTask && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex justify-center items-center p-4 z-50">
          <div className="bg-white p-8 rounded-xl shadow-2xl w-full max-w-sm max-h-[80vh] overflow-y-auto">
            <h3 className="text-2xl font-bold text-gray-800 mb-6 text-center">Task Details</h3>
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium text-gray-700">Title:</p>
                <p className="text-lg font-semibold text-gray-900">{selectedTask.title}</p>
              </div>
              {selectedTask.description && (
                <div>
                  <p className="text-sm font-medium text-gray-700">Description:</p>
                  <p className="text-gray-800">{selectedTask.description}</p>
                </div>
              )}
              <div>
                <p className="text-sm font-medium text-gray-700">Team:</p>
                <p className="text-gray-800">{teams.find(t => t.id === selectedTask.team_id)?.name || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700">Assigned To:</p>
                <p className="text-gray-800">{selectedTask.assigned_to_username || 'Unassigned'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700">Status:</p>
                <p className={`font-semibold capitalize ${selectedTask.status === 'completed' ? 'text-green-600' : selectedTask.status === 'in-progress' ? 'text-blue-600' : 'text-yellow-600'}`}>
                  {selectedTask.status}
                </p>
              </div>
              {selectedTask.due_date && (
                <div>
                  <p className="text-sm font-medium text-gray-700">Due Date:</p>
                  <p className="text-gray-800">{new Date(selectedTask.due_date).toLocaleDateString()}</p>
                </div>
              )}
              <div>
                <p className="text-sm font-medium text-gray-700">Created By:</p>
                <p className="text-gray-800">{selectedTask.created_by_username || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700">Created At:</p>
                <p className="text-gray-800">{new Date(selectedTask.created_at).toLocaleString()}</p>
              </div>
              {selectedTask.updated_at && (
                <div>
                  <p className="text-sm font-medium text-gray-700">Last Updated:</p>
                  <p className="text-gray-800">{new Date(selectedTask.updated_at).toLocaleString()}</p>
                </div>
              )}
            </div>
            <div className="flex justify-end mt-6">
              <button
                type="button"
                onClick={closeTaskDetails}
                className="px-5 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors duration-200"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Task Modal */}
      {showEditTaskModal && taskToEdit && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex justify-center items-center p-4 z-50">
          <div className="bg-white p-8 rounded-xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h3 className="text-2xl font-bold text-gray-800 mb-6 text-center">Edit Task</h3>
            <form onSubmit={handleUpdateTask} className="space-y-4">
              <div>
                <label htmlFor="editTaskTitle" className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                <input
                  type="text"
                  id="editTaskTitle"
                  value={editTaskTitle}
                  onChange={(e) => setEditTaskTitle(e.target.value)}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  disabled={isLoading}
                />
              </div>
              <div>
                <label htmlFor="editTaskDescription" className="block text-sm font-medium text-gray-700 mb-1">Description (Optional)</label>
                <textarea
                  id="editTaskDescription"
                  value={editTaskDescription}
                  onChange={(e) => setEditTaskDescription(e.target.value)}
                  rows="3"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  disabled={isLoading}
                ></textarea>
              </div>
              <div>
                <label htmlFor="editTaskStatus" className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  id="editTaskStatus"
                  value={editTaskStatus}
                  onChange={(e) => setEditTaskStatus(e.target.value)}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  disabled={isLoading}
                >
                  <option value="pending">Pending</option>
                  <option value="in-progress">In Progress</option>
                  <option value="completed">Completed</option>
                </select>
              </div>
              <div>
                <label htmlFor="editTaskAssignedTo" className="block text-sm font-medium text-gray-700 mb-1">Assigned To (Optional)</label>
                <select
                  id="editTaskAssignedTo"
                  value={editTaskAssignedTo}
                  onChange={(e) => setEditTaskAssignedTo(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  disabled={isLoading || editTaskTeamMembers.length === 0}
                >
                  <option value="">Unassigned</option>
                  {editTaskTeamMembers.map(member => (
                    <option key={member.id} value={member.id}>{member.username}</option>
                  ))}
                </select>
                {editTaskTeamMembers.length === 0 && !isLoading && (
                  <p className="text-sm text-gray-500 mt-1">No members found for this team.</p>
                )}
              </div>
              <div>
                <label htmlFor="editTaskDueDate" className="block text-sm font-medium text-gray-700 mb-1">Due Date (Optional)</label>
                <input
                  type="date"
                  id="editTaskDueDate"
                  value={editTaskDueDate}
                  onChange={(e) => setEditTaskDueDate(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  disabled={isLoading}
                />
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={closeEditTaskModal}
                  className="px-5 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors duration-200"
                  disabled={isLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200"
                  disabled={isLoading}
                >
                  {isLoading ? 'Updating...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Task Confirmation Modal */}
      {showDeleteTaskConfirm && taskToDelete && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex justify-center items-center p-4 z-50">
          <div className="bg-white p-8 rounded-xl shadow-2xl w-full max-w-sm">
            <h3 className="text-xl font-bold text-gray-800 mb-4 text-center">Confirm Delete Task</h3>
            <p className="text-gray-700 text-center mb-6">Are you sure you want to delete the task: <br /><strong className="text-red-600">"{taskToDelete.title}"</strong>?</p>
            <div className="flex justify-center space-x-4">
              <button
                type="button"
                onClick={closeDeleteTaskConfirm}
                className="px-5 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors duration-200"
                disabled={isLoading}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteTask}
                className="px-5 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors duration-200"
                disabled={isLoading}
              >
                {isLoading ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Team Details Modal */}
      {showTeamDetailsModal && selectedTeamForDetails && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex justify-center items-center p-4 z-50">
          <div className="bg-white p-8 rounded-xl shadow-2xl w-full max-w-sm max-h-[80vh] overflow-y-auto">
            <h3 className="text-2xl font-bold text-gray-800 mb-6 text-center">Team Details</h3>
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium text-gray-700">Team Name:</p>
                <p className="text-lg font-semibold text-gray-900">{selectedTeamForDetails.name}</p>
              </div>
              {selectedTeamForDetails.description && (
                <div>
                  <p className="text-sm font-medium text-gray-700">Description:</p>
                  <p className="text-gray-800">{selectedTeamForDetails.description}</p>
                </div>
              )}
              <div>
                <p className="text-sm font-medium text-gray-700">Your Role:</p>
                <p className="text-gray-800 capitalize">{selectedTeamForDetails.my_role}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700">Created By:</p>
                <p className="text-gray-800">{selectedTeamForDetails.created_by_username || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700">Created At:</p>
                <p className="text-gray-800">{new Date(selectedTeamForDetails.created_at).toLocaleString()}</p>
              </div>
              {selectedTeamForDetails.updated_at && (
                <div>
                  <p className="text-sm font-medium text-gray-700">Last Updated:</p>
                  <p className="text-gray-800">{new Date(selectedTeamForDetails.updated_at).toLocaleString()}</p>
                </div>
              )}
            </div>
            <div className="flex justify-between items-center mt-6"> {/* Changed to justify-between */}
              {isCurrentUserAdminOfSelectedTeam && (
                <button
                  type="button"
                  onClick={() => openDeleteTeamConfirm(selectedTeamForDetails)} // Open delete confirmation
                  className="px-5 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors duration-200"
                  disabled={isLoading}
                >
                  Delete Team
                </button>
              )}
              <button
                type="button"
                onClick={closeTeamDetails}
                className="px-5 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors duration-200"
                disabled={isLoading}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* NEW: Delete Team Confirmation Modal */}
      {showDeleteTeamConfirm && teamToDelete && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex justify-center items-center p-4 z-50">
          <div className="bg-white p-8 rounded-xl shadow-2xl w-full max-w-sm">
            <h3 className="text-xl font-bold text-gray-800 mb-4 text-center">Confirm Delete Team</h3>
            <p className="text-gray-700 text-center mb-6">
              Are you sure you want to delete the team: <br />
              <strong className="text-red-600">"{teamToDelete.name}"</strong>?
              <br />
              <span className="text-sm text-gray-500">This will also delete all tasks associated with this team.</span>
            </p>
            {message && (
              <div className={`mb-4 p-3 rounded-md text-sm text-center 
                ${message.includes('successfully') ? 'bg-green-100 border border-green-300 text-green-800' : 'bg-red-100 border border-red-300 text-red-800'}`
              }>
                {message}
              </div>
            )}
            <div className="flex justify-center space-x-4">
              <button
                type="button"
                onClick={closeDeleteTeamConfirm}
                className="px-5 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors duration-200"
                disabled={isLoading}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteTeam}
                className="px-5 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors duration-200"
                disabled={isLoading}
              >
                {isLoading ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Dashboard;
