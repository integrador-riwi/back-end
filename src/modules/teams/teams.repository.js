import pool from "../../db/pool.js";
import {
  NotFoundError,
  ConflictError,
  DatabaseError,
} from "../../middleware/errorHandler.js";

export const create = async ({ name, leaderId }) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const teamQuery = `
      INSERT INTO teams (name)
      VALUES ($1)
      RETURNING id_team, name, created_at
    `;

    const teamResult = await client.query(teamQuery, [name]);
    const team = teamResult.rows[0];

    const memberQuery = `
      INSERT INTO team_coders (id_team, id_user, team_role)
      VALUES ($1, $2, 'LEADER')
      RETURNING id_team, id_user, team_role
    `;

    await client.query(memberQuery, [team.id_team, leaderId]);

    await client.query("COMMIT");

    return {
      ...team,
      leader_id: leaderId,
      members: [],
    };
  } catch (error) {
    await client.query("ROLLBACK");

    if (error.code === "23505") {
      throw new ConflictError("Ya existe un equipo con este nombre");
    }
    throw new DatabaseError(`Error al crear equipo: ${error.message}`);
  } finally {
    client.release();
  }
};

export const findAll = async ({ search = null, page = 1, limit = 10 }) => {
  let whereClauses = [];
  let params = [];
  let paramIndex = 1;

  if (search) {
    whereClauses.push(`t.name ILIKE $${paramIndex++}`);
    params.push(`%${search}%`);
  }

  const whereClause =
    whereClauses.length > 0 ? `WHERE ${whereClauses.join(" AND ")}` : "";

  const offset = (page - 1) * limit;

  const countQuery = `
    SELECT COUNT(*) as total 
    FROM teams t 
    ${whereClause}
  `;
  const countResult = await pool.query(countQuery, params);
  const total = parseInt(countResult.rows[0].total, 10);

  const query = `
    SELECT 
      t.id_team,
      t.name,
      t.created_at,
      u.id_user as leader_id,
      u.name as leader_name,
      u.email as leader_email,
      COUNT(tc.id_user) as member_count
    FROM teams t
    LEFT JOIN team_coders tc ON t.id_team = tc.id_team AND tc.team_role = 'LEADER'
    LEFT JOIN users u ON tc.id_user = u.id_user
    ${whereClause}
    GROUP BY t.id_team, u.id_user, u.name, u.email, t.created_at
    ORDER BY t.created_at DESC
    LIMIT $${paramIndex++} OFFSET $${paramIndex++}
  `;

  params.push(limit, offset);
  const result = await pool.query(query, params);

  return {
    teams: result.rows,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

export const findById = async (id) => {
  const query = `
    SELECT 
      t.id_team,
      t.name,
      t.created_at,
      u.id_user as leader_id,
      u.name as leader_name,
      u.email as leader_email
    FROM teams t
    LEFT JOIN team_coders tc ON t.id_team = tc.id_team AND tc.team_role = 'LEADER'
    LEFT JOIN users u ON tc.id_user = u.id_user
    WHERE t.id_team = $1
  `;

  const result = await pool.query(query, [id]);
  return result.rows[0] || null;
};

export const findByIdWithMembers = async (id) => {
  const teamQuery = `
    SELECT 
      t.id_team,
      t.name,
      t.created_at,
      lu.id_user as leader_id,
      lu.name as leader_name,
      lu.email as leader_email
    FROM teams t
    LEFT JOIN team_coders tc ON t.id_team = tc.id_team AND tc.team_role = 'LEADER'
    LEFT JOIN users lu ON tc.id_user = lu.id_user
    WHERE t.id_team = $1
  `;

  const teamResult = await pool.query(teamQuery, [id]);
  const team = teamResult.rows[0];

  if (!team) return null;

  const membersQuery = `
    SELECT 
      u.id_user,
      u.name,
      u.email,
      u.clan,
      tc.team_role,
      p.github_url
    FROM team_coders tc
    JOIN users u ON tc.id_user = u.id_user
    LEFT JOIN profiles p ON u.id_user = p.user_id
    WHERE tc.id_team = $1
    ORDER BY 
      CASE tc.team_role
        WHEN 'LEADER' THEN 1
        WHEN 'DEVELOPER' THEN 2
        ELSE 3
      END
  `;

  const membersResult = await pool.query(membersQuery, [id]);

  return {
    ...team,
    members: membersResult.rows,
  };
};

export const update = async (id, { name }) => {
  const query = `
    UPDATE teams
    SET name = COALESCE($1, name)
    WHERE id_team = $2
    RETURNING id_team, name, created_at
  `;

  const result = await pool.query(query, [name, id]);
  return result.rows[0] || null;
};

export const remove = async (id) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    await client.query("DELETE FROM team_coders WHERE id_team = $1", [id]);
    await client.query("DELETE FROM projects WHERE team_id = $1", [id]);

    const result = await client.query(
      "DELETE FROM teams WHERE id_team = $1 RETURNING id_team",
      [id],
    );

    await client.query("COMMIT");

    return result.rows[0] || null;
  } catch (error) {
    await client.query("ROLLBACK");
    throw new DatabaseError(`Error al eliminar equipo: ${error.message}`);
  } finally {
    client.release();
  }
};

export const addMember = async (teamId, userId, teamRole = "DEVELOPER") => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const checkTeamQuery = "SELECT id_team FROM teams WHERE id_team = $1";
    const teamResult = await client.query(checkTeamQuery, [teamId]);

    if (teamResult.rows.length === 0) {
      await client.query("ROLLBACK");
      throw new NotFoundError("Equipo no encontrado");
    }

    const checkUserQuery = "SELECT id_user FROM users WHERE id_user = $1";
    const userResult = await client.query(checkUserQuery, [userId]);

    if (userResult.rows.length === 0) {
      await client.query("ROLLBACK");
      throw new NotFoundError("Usuario no encontrado");
    }

    const checkMembershipQuery = `
      SELECT id_team FROM team_coders 
      WHERE id_team = $1 AND id_user = $2
    `;
    const membershipResult = await client.query(checkMembershipQuery, [
      teamId,
      userId,
    ]);

    if (membershipResult.rows.length > 0) {
      await client.query("ROLLBACK");
      throw new ConflictError("El usuario ya es miembro del equipo");
    }

    const insertQuery = `
      INSERT INTO team_coders (id_team, id_user, team_role)
      VALUES ($1, $2, $3)
      RETURNING id_team, id_user, team_role
    `;

    const result = await client.query(insertQuery, [teamId, userId, teamRole]);

    await client.query("COMMIT");

    return result.rows[0];
  } catch (error) {
    await client.query("ROLLBACK");
    if (error instanceof NotFoundError || error instanceof ConflictError) {
      throw error;
    }
    throw new DatabaseError(`Error al agregar miembro: ${error.message}`);
  } finally {
    client.release();
  }
};

export const removeMember = async (teamId, userId) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const checkQuery = `
      SELECT team_role FROM team_coders 
      WHERE id_team = $1 AND id_user = $2
    `;
    const checkResult = await client.query(checkQuery, [teamId, userId]);

    if (checkResult.rows.length === 0) {
      await client.query("ROLLBACK");
      throw new NotFoundError("El usuario no es miembro del equipo");
    }

    if (checkResult.rows[0].team_role === "LEADER") {
      await client.query("ROLLBACK");
      throw new ConflictError("No puedes eliminar al líder del equipo");
    }

    const deleteQuery = `
      DELETE FROM team_coders 
      WHERE id_team = $1 AND id_user = $2
      RETURNING id_team, id_user
    `;

    const result = await client.query(deleteQuery, [teamId, userId]);

    await client.query("COMMIT");

    return result.rows[0];
  } catch (error) {
    await client.query("ROLLBACK");
    if (error instanceof NotFoundError || error instanceof ConflictError) {
      throw error;
    }
    throw new DatabaseError(`Error al eliminar miembro: ${error.message}`);
  } finally {
    client.release();
  }
};

export const getMyTeams = async (userId) => {
  const query = `
    SELECT 
      t.id_team,
      t.name,
      t.created_at,
      tc.team_role,
      u.id_user as leader_id,
      u.name as leader_name,
      (
        SELECT COUNT(*) FROM team_coders tc2 
        WHERE tc2.id_team = t.id_team
      ) as member_count
    FROM team_coders tc
    JOIN teams t ON tc.id_team = t.id_team
    LEFT JOIN team_coders tcl ON t.id_team = tcl.id_team AND tcl.team_role = 'LEADER'
    LEFT JOIN users u ON tcl.id_user = u.id_user
    WHERE tc.id_user = $1
    ORDER BY t.created_at DESC
  `;

  const result = await pool.query(query, [userId]);
  return result.rows;
};

export const isMember = async (teamId, userId) => {
  const query = `
    SELECT id_team, id_user, team_role 
    FROM team_coders 
    WHERE id_team = $1 AND id_user = $2
  `;

  const result = await pool.query(query, [teamId, userId]);
  return result.rows[0] || null;
};

export const isLeader = async (teamId, userId) => {
  const query = `
    SELECT id_team, id_user 
    FROM team_coders 
    WHERE id_team = $1 AND id_user = $2 AND team_role = 'LEADER'
  `;

  const result = await pool.query(query, [teamId, userId]);
  return result.rows.length > 0;
};

export const getAvailableCoders = async (
  teamId,
  { search = null, page = 1, limit = 20 },
) => {
  let whereClauses = ["u.role = $1", "u.is_active = true"];
  let params = ["CODER"];
  let paramIndex = 2;

  const notInTeamSubquery = `
    NOT EXISTS (
      SELECT 1 FROM team_coders tc2 
      WHERE tc2.id_user = u.id_user
    )
  `;
  whereClauses.push(notInTeamSubquery);

  if (search) {
    whereClauses.push(
      `(u.name ILIKE $${paramIndex} OR u.email ILIKE $${paramIndex})`,
    );
    params.push(`%${search}%`);
    paramIndex++;
  }

  const offset = (page - 1) * limit;

  const countQuery = `
    SELECT COUNT(*) as total 
    FROM users u 
    WHERE ${whereClauses.join(" AND ")}
  `;
  const countResult = await pool.query(countQuery, params);
  const total = parseInt(countResult.rows[0].total, 10);

  const query = `
    SELECT 
      u.id_user,
      u.name,
      u.email,
      u.clan,
      p.github_url,
      p.description as profile_description
    FROM users u
    LEFT JOIN profiles p ON u.id_user = p.user_id
    WHERE ${whereClauses.join(" AND ")}
    ORDER BY u.name ASC
    LIMIT $${paramIndex++} OFFSET $${paramIndex++}
  `;

  params.push(limit, offset);
  const result = await pool.query(query, params);

  return {
    coders: result.rows,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

export const getLeaderWithGithub = async (teamId) => {
  const query = `
    SELECT 
      u.id_user,
      u.name,
      u.email,
      u.github_username,
      u.github_token
    FROM team_coders tc
    JOIN users u ON tc.id_user = u.id_user
    WHERE tc.id_team = $1 AND tc.team_role = 'LEADER'
  `;
  const result = await pool.query(query, [teamId]);
  return result.rows[0] || null;
};

export const getMemberWithGithub = async (userId) => {
  const query = `
    SELECT 
      u.id_user,
      u.name,
      u.email,
      u.github_username,
      u.github_token
    FROM users u
    WHERE u.id_user = $1
  `;
  const result = await pool.query(query, [userId]);
  return result.rows[0] || null;
};

export const countTeamMembers = async (teamId) => {
  const query = "SELECT COUNT(*) as total FROM team_coders WHERE id_team = $1";
  const result = await pool.query(query, [teamId]);
  return parseInt(result.rows[0].total, 10);
};

export const getTeamProject = async (teamId) => {
  const query = `
    SELECT id_project, id_team, repo_name, repo_url, github_invite_token
    FROM team_projects
    WHERE id_team = $1
  `;
  const result = await pool.query(query, [teamId]);
  return result.rows[0] || null;
};

export const saveTeamProject = async (
  teamId,
  { repoName, repoUrl, inviteToken },
) => {
  const query = `
    INSERT INTO team_projects (id_team, repo_name, repo_url, github_invite_token)
    VALUES ($1, $2, $3, $4)
    ON CONFLICT (id_team) 
    DO UPDATE SET repo_name = $2, repo_url = $3, github_invite_token = $4, updated_at = NOW()
    RETURNING id_project, id_team, repo_name, repo_url
  `;
  const result = await pool.query(query, [
    teamId,
    repoName,
    repoUrl,
    inviteToken,
  ]);
  return result.rows[0];
};

export const createInvitation = async (teamId, userId, invitedBy) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const checkExistingQuery = `
      SELECT id_invitation FROM team_invitations 
      WHERE id_team = $1 AND id_user = $2 AND status = 'PENDING'
    `;
    const existingResult = await client.query(checkExistingQuery, [
      teamId,
      userId,
    ]);

    if (existingResult.rows.length > 0) {
      await client.query("ROLLBACK");
      throw new ConflictError(
        "Ya existe una invitación pendiente para este usuario",
      );
    }

    const checkMemberQuery = `
      SELECT id_team FROM team_coders 
      WHERE id_team = $1 AND id_user = $2
    `;
    const memberResult = await client.query(checkMemberQuery, [teamId, userId]);

    if (memberResult.rows.length > 0) {
      await client.query("ROLLBACK");
      throw new ConflictError("El usuario ya es miembro del equipo");
    }

    const query = `
      INSERT INTO team_invitations (id_team, id_user, invited_by, status)
      VALUES ($1, $2, $3, 'PENDING')
      RETURNING id_invitation, id_team, id_user, status, invited_by, created_at
    `;

    const result = await client.query(query, [teamId, userId, invitedBy]);

    await client.query("COMMIT");

    return result.rows[0];
  } catch (error) {
    await client.query("ROLLBACK");
    if (error instanceof ConflictError) {
      throw error;
    }
    throw new DatabaseError(`Error al crear invitación: ${error.message}`);
  } finally {
    client.release();
  }
};

export const getInvitationsByTeam = async (teamId) => {
  const query = `
    SELECT 
      i.id_invitation,
      i.id_team,
      i.id_user,
      i.status,
      i.invited_by,
      i.created_at,
      u.name as user_name,
      u.email as user_email,
      u.clan as user_clan
    FROM team_invitations i
    JOIN users u ON i.id_user = u.id_user
    WHERE i.id_team = $1
    ORDER BY i.created_at DESC
  `;
  const result = await pool.query(query, [teamId]);
  return result.rows;
};

export const getPendingInvitationsByUser = async (userId) => {
  const query = `
    SELECT 
      i.id_invitation,
      i.id_team,
      i.id_user,
      i.status,
      i.invited_by,
      i.created_at,
      t.name as team_name,
      lu.name as invited_by_name,
      lu.email as invited_by_email
    FROM team_invitations i
    JOIN teams t ON i.id_team = t.id_team
    JOIN users lu ON i.invited_by = lu.id_user
    WHERE i.id_user = $1 AND i.status = 'PENDING'
    ORDER BY i.created_at DESC
  `;
  const result = await pool.query(query, [userId]);
  return result.rows;
};

export const getInvitationById = async (invitationId) => {
  const query = `
    SELECT 
      i.id_invitation,
      i.id_team,
      i.id_user,
      i.status,
      i.invited_by,
      i.created_at,
      i.updated_at,
      t.name as team_name,
      u.name as user_name,
      u.email as user_email
    FROM team_invitations i
    JOIN teams t ON i.id_team = t.id_team
    JOIN users u ON i.id_user = u.id_user
    WHERE i.id_invitation = $1
  `;
  const result = await pool.query(query, [invitationId]);
  return result.rows[0] || null;
};

export const acceptInvitation = async (invitationId, userId) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const invitationQuery = `
      SELECT * FROM team_invitations 
      WHERE id_invitation = $1 AND id_user = $2 AND status = 'PENDING'
    `;
    const invitationResult = await client.query(invitationQuery, [
      invitationId,
      userId,
    ]);

    if (invitationResult.rows.length === 0) {
      await client.query("ROLLBACK");
      throw new NotFoundError("Invitación no encontrada o ya procesada");
    }

    const invitation = invitationResult.rows[0];

    const memberQuery = `
      INSERT INTO team_coders (id_team, id_user, team_role)
      VALUES ($1, $2, 'DEVELOPER')
      RETURNING id_team, id_user, team_role
    `;
    await client.query(memberQuery, [invitation.id_team, userId]);

    const updateQuery = `
      UPDATE team_invitations
      SET status = 'ACCEPTED', updated_at = NOW()
      WHERE id_invitation = $1
    `;
    await client.query(updateQuery, [invitationId]);

    await client.query("COMMIT");

    return { id_team: invitation.id_team, id_user: userId };
  } catch (error) {
    await client.query("ROLLBACK");
    if (error instanceof NotFoundError) {
      throw error;
    }
    throw new DatabaseError(`Error al aceptar invitación: ${error.message}`);
  } finally {
    client.release();
  }
};

export const rejectInvitation = async (invitationId, userId) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const invitationQuery = `
      SELECT * FROM team_invitations 
      WHERE id_invitation = $1 AND id_user = $2 AND status = 'PENDING'
    `;
    const invitationResult = await client.query(invitationQuery, [
      invitationId,
      userId,
    ]);

    if (invitationResult.rows.length === 0) {
      await client.query("ROLLBACK");
      throw new NotFoundError("Invitación no encontrada o ya procesada");
    }

    const updateQuery = `
      UPDATE team_invitations
      SET status = 'REJECTED', updated_at = NOW()
      WHERE id_invitation = $1
    `;
    await client.query(updateQuery, [invitationId]);

    await client.query("COMMIT");

    return { id_invitation: invitationId, status: "REJECTED" };
  } catch (error) {
    await client.query("ROLLBACK");
    if (error instanceof NotFoundError) {
      throw error;
    }
    throw new DatabaseError(`Error al rechazar invitación: ${error.message}`);
  } finally {
    client.release();
  }
};

export default {
  create,
  findAll,
  findById,
  findByIdWithMembers,
  update,
  remove,
  addMember,
  removeMember,
  getMyTeams,
  isMember,
  isLeader,
  getAvailableCoders,
  createInvitation,
  getInvitationsByTeam,
  getPendingInvitationsByUser,
  getInvitationById,
  acceptInvitation,
  rejectInvitation,
  getLeaderWithGithub,
  getMemberWithGithub,
  countTeamMembers,
  getTeamProject,
};
