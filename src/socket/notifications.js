import { getConnectedUsers } from "../socket/index.js";

let io = null;

export function setSocketIO(socketIO) {
  io = socketIO;
}

export function sendToUser(userId, event, data) {
  if (!io || !userId) {
    console.log("[Socket] sendToUser - io or userId missing. io:", !!io, "userId:", userId);
    return;
  }
  console.log("[Socket] sendToUser - emitting to user_%s, event: %s", userId, event);
  io.to(`user_${userId}`).emit(event, data);
}

export function emitInvitationCreated(
  invitation,
  team,
  invitedUser,
  eventName,
) {
  if (!io) return;

  sendToUser(invitedUser.id_user, "invitation:new", {
    id: invitation.id_invitation,
    teamId: invitation.id_team,
    teamName: team.name,
    eventName: eventName,
    invitedBy: invitation.invited_by,
    invitedByName: team.leader_name ?? "Team Leader",
    type: "invitation",
  });
}

export function emitJoinRequestCreated(request, team, coder, eventName) {
  if (!io) {
    console.log("[Socket] emitJoinRequestCreated - io is null!");
    return;
  }

  console.log("[Socket] emitJoinRequestCreated - sending to user:", team.leader_id);
  sendToUser(team.leader_id, "join_request:new", {
    id: request.id_request,
    teamId: team.id_team,
    teamName: team.name,
    eventName: eventName,
    coderId: coder.id_user,
    coderName: coder.name,
    type: "join_request",
  });
}

export function emitInvitationAccepted(invitation, team, user) {
  if (!io) return;

  sendToUser(invitation.invited_by, "invitation:accepted", {
    teamId: team.id_team,
    teamName: team.name,
    userId: user.id_user,
    userName: user.name,
    type: "invitation_accepted",
  });
}

export function emitInvitationRejected(invitation, team, user) {
  if (!io) return;

  sendToUser(invitation.invited_by, "invitation:rejected", {
    teamId: team.id_team,
    teamName: team.name,
    userId: user.id_user,
    userName: user.name,
    type: "invitation_rejected",
  });
}

export function emitJoinRequestAccepted(request, team, coder) {
  if (!io) return;

  sendToUser(coder.id_user, "join_request:accepted", {
    teamId: team.id_team,
    teamName: team.name,
    type: "join_request_accepted",
  });
}

export function emitJoinRequestRejected(request, team, coder) {
  if (!io) return;

  sendToUser(coder.id_user, "join_request:rejected", {
    teamId: team.id_team,
    teamName: team.name,
    type: "join_request_rejected",
  });
}

export function emitCommentCreated(projectId, comment) {
  if (!io) return;

  io.to(`project_${projectId}`).emit("comment:new", comment);
}

export default {
  setSocketIO,
  sendToUser,
  emitInvitationCreated,
  emitJoinRequestCreated,
  emitInvitationAccepted,
  emitInvitationRejected,
  emitJoinRequestAccepted,
  emitJoinRequestRejected,
  emitCommentCreated,
};
