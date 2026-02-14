const axios = require("axios");

const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL;

const n8nService = {
  triggerProjectCreated: async (projectData, collaborator) => {
    await axios.post(`${N8N_WEBHOOK_URL}/team-created`, {
      projectId: projectData.id,
      name: projectData.name,
      createdAt: new Date().toISOString(),
      collaboratorUsername: collaborator.githubUsername,
      collaboratorToken: collaborator.githubToken,
    });
  },

  triggerMemberInvited: async (teamData, member) => {
    await axios.post(`${N8N_WEBHOOK_URL}/team-member-invited`, {
      teamId: teamData.id,
      projectId: teamData.projectId,
      repoName: teamData.repoName,
      leaderUsername: teamData.leaderGithubUsername,
      memberUsername: member.githubUsername,
      memberEmail: member.email,
      memberName: member.name,
      role: member.role,
    });
  },
};

module.exports = n8nService;
