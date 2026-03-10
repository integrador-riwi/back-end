import axios from "axios";
import config from "../config/env.js";

const n8nService = {
  triggerProjectCreated: async (projectData, collaborator) => {
    if (!config.n8n.webhookUrl) {
      console.warn("N8N webhook URL not configured");
      return null;
    }

    const response = await axios.post(`${config.n8n.webhookUrl}/team-created`, {
      projectId: projectData.id,
      name: projectData.name,
      createdAt: new Date().toISOString(),
      collaboratorUsername: collaborator.githubUsername,
      collaboratorToken: collaborator.githubToken,
      githubOrg: projectData.githubOrg ?? null,
    });
    console.log("[n8n] Payload enviado:", {
      projectId: projectData.id,
      name: projectData.name,
      githubOrg: projectData.githubOrg,
    });

    return response.data;
  },

  triggerProjectSubmitted: async (projectData, leader) => {
    if (!config.n8n.webhookUrl) {
      console.warn("N8N webhook URL not configured");
      return null;
    }

    const response = await axios.post(
      `${config.n8n.webhookUrl}/project-submitted`,
      {
        projectId: projectData.id,
        repoName: projectData.repoName,
        repoUrl: projectData.repoUrl,
        leaderUsername: leader.githubUsername,
        leaderToken: leader.githubToken,
        githubOrg: projectData.githubOrg ?? null,
        submittedAt: new Date().toISOString(),
      },
    );

    console.log("[n8n] project-submitted payload enviado:", {
      projectId: projectData.id,
      repoName: projectData.repoName,
    });

    return response.data;
  },

  triggerMemberInvited: async (teamData, member) => {
    if (!config.n8n.webhookUrl) {
      console.warn("N8N webhook URL not configured");
      return null;
    }

    const response = await axios.post(
      `${config.n8n.webhookUrl}/team-member-invited`,
      {
        teamId: teamData.id,
        projectId: teamData.projectId,
        repoName: teamData.repoName,
        leaderUsername: teamData.leaderGithubUsername,
        memberUsername: member.githubUsername,
        memberToken: member.githubToken,
        memberEmail: member.email,
        memberName: member.name,
        role: member.role,
        githubOrg: teamData.githubOrg ?? null,
      },
    );

    return response.data;
  },

  triggerMemberRemoved: async (teamData, member) => {
    const response = await axios.post(
      `${config.n8n.webhookUrl}/team-member-removed`,
      {
        repoName: teamData.repoName,
        leaderUsername: teamData.leaderGithubUsername,
        memberUsername: member.githubUsername,
        memberEmail: member.email,
        memberName: member.name,
      },
    );

    return response.data;
  },
};

export default n8nService;
