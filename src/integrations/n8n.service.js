const axios = require("axios");

const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL;

const n8nService = {
  triggerProjectCreated: async (projectData) => {
    await axios.post(`${N8N_WEBHOOK_URL}/project-created`, {
      projectId: projectData.id,
      name: projectData.name,
      createdAt: new Date().toISOString(),
    });
  },

  triggerMemberAdded: async (memberData) => {
    await axios.post(`${N8N_WEBHOOK_URL}/member-added`, {
      userId: memberData.userId,
      email: memberData.email,
      projectId: memberData.projectId,
      role: memberData.role,
    });
  },
};

module.exports = n8nService;
