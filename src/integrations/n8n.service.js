import axios from 'axios';
import config from '../config/env.js';

const n8nService = {
  triggerProjectCreated: async (projectData, collaborator) => {
    if (!config.n8n.webhookUrl) {
      console.warn('N8N webhook URL not configured');
      return;
    }

    await axios.post(`${config.n8n.webhookUrl}/team-created`, {
      projectId: projectData.id,
      name: projectData.name,
      createdAt: new Date().toISOString(),
      collaboratorUsername: collaborator.githubUsername,
      collaboratorToken: collaborator.githubToken
    });
  },

  triggerMemberInvited: async (teamData, member) => {
    if (!config.n8n.webhookUrl) {
      console.warn('N8N webhook URL not configured');
      return;
    }

    await axios.post(`${config.n8n.webhookUrl}/team-member-invited`, {
      teamId: teamData.id,
      projectId: teamData.projectId,
      repoName: teamData.repoName,
      leaderUsername: teamData.leaderGithubUsername,
      memberUsername: member.githubUsername,
      memberEmail: member.email,
      memberName: member.name,
      role: member.role
    });
  }
};

export default n8nService;
