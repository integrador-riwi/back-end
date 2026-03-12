import { getConnectedUsers } from "../socket/index.js";

let io = null;

export function setSocketIO(socketIO) {
  io = socketIO;
}

export function sendToUser(userId, event, data) {
  if (!io) {
    console.log("[Socket] IO not initialized, cannot send notification");
    return;
  }
  
  if (!userId) {
    console.log("[Socket] Cannot send notification: userId is undefined");
    return;
  }
  
  console.log(`[Socket] Sending ${event} to user ${userId}:`, data);
  
  const users = io.sockets.sockets;
  let found = false;
  for (const [socketId, socket] of users) {
    if (socket.user && socket.user.id_user === userId) {
      socket.emit(event, data);
      found = true;
      break;
    }
  }
  
  if (!found) {
    console.log(`[Socket] User ${userId} not connected, notification queued (offline)`);
  }
}

export function emitInvitationCreated(invitation, team, invitedUser, eventName) {
  if (!io) return;
  
  sendToUser(invitedUser.id_user, "invitation:new", {
    id: invitation.id_invitation,
    teamId: invitation.id_team,
    teamName: team.name,
    eventName: eventName,
    invitedBy: invitation.invited_by,
    invitedByName: invitedUser.name,
    type: "invitation"
  });
}

export function emitJoinRequestCreated(request, team, coder, eventName) {
  if (!io) return;
  
  sendToUser(team.leader_id, "join_request:new", {
    id: request.id_request,
    teamId: team.id_team,
    teamName: team.name,
    eventName: eventName,
    coderId: coder.id_user,
    coderName: coder.name,
    type: "join_request"
  });
}

export function emitInvitationAccepted(invitation, team, user) {
  if (!io) return;
  
  sendToUser(invitation.invited_by, "invitation:accepted", {
    teamId: team.id_team,
    teamName: team.name,
    userId: user.id_user,
    userName: user.name,
    type: "invitation_accepted"
  });
}

export function emitInvitationRejected(invitation, team, user) {
  if (!io) return;
  
  sendToUser(invitation.invited_by, "invitation:rejected", {
    teamId: team.id_team,
    teamName: team.name,
    userId: user.id_user,
    userName: user.name,
    type: "invitation_rejected"
  });
}

export function emitJoinRequestAccepted(request, team, coder) {
  if (!io) return;
  
  sendToUser(coder.id_user, "join_request:accepted", {
    teamId: team.id_team,
    teamName: team.name,
    type: "join_request_accepted"
  });
}

export function emitJoinRequestRejected(request, team, coder) {
  if (!io) return;
  
  sendToUser(coder.id_user, "join_request:rejected", {
    teamId: team.id_team,
    teamName: team.name,
    type: "join_request_rejected"
  });
}

export default {
  setSocketIO,
  sendToUser,
  emitInvitationCreated,
  emitJoinRequestCreated,
  emitInvitationAccepted,
  emitInvitationRejected,
  emitJoinRequestAccepted,
  emitJoinRequestRejected
};
