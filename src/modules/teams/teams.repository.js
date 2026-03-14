import pool from "../../db/pool.js";
import {
  NotFoundError,
  ConflictError,
  DatabaseError,
} from "../../middleware/errorHandler.js";

export const create = async ({ name, leaderId, idEvent = null }) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const teamQuery = `
      INSERT INTO teams (name, id_event)
      VALUES ($1, $2)
      RETURNING id_team, name, id_event, created_at
    `;

    const teamResult = await client.query(teamQuery, [name, idEvent]);
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

export const findAll = async ({
  search = null,
  page = 1,
  limit = 10,
  idEvent = null,
  includeSubmitted = false,
}) => {
  let whereClauses = [];
  let params = [];
  let paramIndex = 1;

  if (search) {
    whereClauses.push(`t.name ILIKE $${paramIndex++}`);
    params.push(`%${search}%`);
  }

  if (idEvent) {
    whereClauses.push(`t.id_event = $${paramIndex++}`);
    params.push(idEvent);
  }

  // Exclude submitted teams unless the caller explicitly requests all (e.g. TL evaluation view)
  if (!includeSubmitted) {
    whereClauses.push(`(p.submitted_at IS NULL OR p.id_project IS NULL)`);
  }

  const whereClause =
    whereClauses.length > 0 ? `WHERE ${whereClauses.join(" AND ")}` : "";

  const offset = (page - 1) * limit;

  const countQuery = `
    SELECT COUNT(*) as total 
    FROM teams t
    LEFT JOIN projects p ON p.team_id = t.id_team
    ${whereClause}
  `;
  const countResult = await pool.query(countQuery, params);
  const total = parseInt(countResult.rows[0].total, 10);

  const query = `
    SELECT 
      t.id_team,
      t.name,
      t.id_event,
      t.created_at,
      u.id_user as leader_id,
      u.name as leader_name,
      u.email as leader_email,
      u.github_avatar_url as leader_avatar_url,
      p.description,
      p.submitted_at,
      (SELECT COUNT(*) FROM team_coders tc2 WHERE tc2.id_team = t.id_team) as member_count,
      (
        SELECT json_agg(
          json_build_object(
            'id_user', mu.id_user,
            'name', mu.name,
            'github_avatar_url', mu.github_avatar_url,
            'team_role', mtc.team_role
          ) ORDER BY CASE mtc.team_role WHEN 'LEADER' THEN 1 ELSE 2 END
        )
        FROM team_coders mtc
        JOIN users mu ON mtc.id_user = mu.id_user
        WHERE mtc.id_team = t.id_team
      ) as members
    FROM teams t
    LEFT JOIN team_coders tc ON t.id_team = tc.id_team AND tc.team_role = 'LEADER'
    LEFT JOIN users u ON tc.id_user = u.id_user
    LEFT JOIN projects p ON p.team_id = t.id_team
    ${whereClause}
    GROUP BY t.id_team, u.id_user, u.name, u.email, u.github_avatar_url, t.created_at, p.description, p.submitted_at
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
      t.id_event,
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
      t.id_event,
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
      u.github_avatar_url,
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

    const deleteInvitationQuery = `
      DELETE FROM team_invitations 
      WHERE id_team = $1 AND id_user = $2
    `;
    await client.query(deleteInvitationQuery, [teamId, userId]);

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
      t.id_event,
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
  // Get the event this team belongs to, so we exclude only members of teams in the same event
  const teamEventQuery = `SELECT id_event FROM teams WHERE id_team = $1`;
  const teamEventResult = await pool.query(teamEventQuery, [teamId]);
  const idEvent = teamEventResult.rows[0]?.id_event ?? null;

  let whereClauses = ["u.role = $1", "u.is_active = true"];
  let params = ["CODER"];
  let paramIndex = 2;

  // Exclude users already in a team for the SAME event (not globally)
  if (idEvent) {
    const notInEventTeamSubquery = `
      NOT EXISTS (
        SELECT 1 FROM team_coders tc2
        JOIN teams t2 ON tc2.id_team = t2.id_team
        WHERE tc2.id_user = u.id_user AND t2.id_event = $${paramIndex}
      )
    `;
    whereClauses.push(notInEventTeamSubquery);
    params.push(idEvent);
    paramIndex++;
  } else {
    // No event context: fall back to global exclusion
    whereClauses.push(`
      NOT EXISTS (
        SELECT 1 FROM team_coders tc2 
        WHERE tc2.id_user = u.id_user
      )
    `);
  }

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

export const getTeamGithubOrg = async (teamId) => {
  const query = `
    SELECT e.github_org
    FROM teams t
    LEFT JOIN events e ON t.id_event = e.id_event
    WHERE t.id_team = $1
  `;
  const result = await pool.query(query, [teamId]);
  return result.rows[0]?.github_org ?? null;
};

export const getTeamEventMaxSize = async (teamId) => {
  const query = `
    SELECT COALESCE(e.max_team_size, 5) as max_team_size
    FROM teams t
    LEFT JOIN events e ON t.id_event = e.id_event
    WHERE t.id_team = $1
  `;
  const result = await pool.query(query, [teamId]);
  return result.rows[0]?.max_team_size ?? 5;
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
      ON CONFLICT (id_team, id_user)
      DO UPDATE SET status = 'PENDING', invited_by = $3, updated_at = NOW()
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
      e.event_name as event_name,
      lu.name as invited_by_name,
      lu.email as invited_by_email
    FROM team_invitations i
    JOIN teams t ON i.id_team = t.id_team
    LEFT JOIN events e ON t.id_event = e.id_event
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

export const findLeaderTeam = async (userId, idEvent = null) => {
  if (idEvent) {
    const query = `
      SELECT t.id_team, t.name, t.created_at, t.id_event
      FROM teams t
      JOIN team_coders tc ON t.id_team = tc.id_team
      WHERE tc.id_user = $1 AND tc.team_role = 'LEADER' AND t.id_event = $2
      LIMIT 1
    `;
    const result = await pool.query(query, [userId, idEvent]);
    return result.rows[0] || null;
  }
  // Fallback: return most recent leader team regardless of event
  const query = `
    SELECT t.id_team, t.name, t.created_at, t.id_event
    FROM teams t
    JOIN team_coders tc ON t.id_team = tc.id_team
    WHERE tc.id_user = $1 AND tc.team_role = 'LEADER'
    ORDER BY t.created_at DESC
    LIMIT 1
  `;
  const result = await pool.query(query, [userId]);
  return result.rows[0] || null;
};

export const createJoinRequest = async (teamId, userId) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // First check if user is already a member (most important check)
    const checkMemberQuery = `
      SELECT id_team FROM team_coders 
      WHERE id_team = $1 AND id_user = $2
    `;
    const memberResult = await client.query(checkMemberQuery, [teamId, userId]);

    if (memberResult.rows.length > 0) {
      await client.query("ROLLBACK");
      throw new ConflictError("Ya eres miembro del equipo");
    }

    // Then check for existing requests
    const checkExisting = `
      SELECT id_request, status FROM team_join_requests 
      WHERE id_team = $1 AND id_user = $2
    `;
    const existing = await client.query(checkExisting, [teamId, userId]);

    if (existing.rows.length > 0) {
      if (existing.rows[0].status === "PENDING") {
        await client.query("ROLLBACK");
        throw new ConflictError("Ya existe una solicitud pendiente");
      }
      // If status is REJECTED, allow creating a new request
      if (existing.rows[0].status === "APPROVED") {
        await client.query("ROLLBACK");
        throw new ConflictError("Ya eres miembro del equipo");
      }
      // If REJECTED, continue to create new request
    }

    const query = `
      INSERT INTO team_join_requests (id_team, id_user, status)
      VALUES ($1, $2, 'PENDING')
      RETURNING id_request, id_team, id_user, status, created_at
    `;

    const result = await client.query(query, [teamId, userId]);

    await client.query("COMMIT");

    return result.rows[0];
  } catch (error) {
    await client.query("ROLLBACK");
    if (error instanceof ConflictError) {
      throw error;
    }
    throw new DatabaseError(`Error al crear solicitud: ${error.message}`);
  } finally {
    client.release();
  }
};

export const getJoinRequestsByTeam = async (teamId) => {
  const query = `
    SELECT 
      r.id_request,
      r.id_team,
      r.id_user,
      r.status,
      r.created_at,
      u.name as user_name,
      u.email as user_email,
      u.clan as user_clan
    FROM team_join_requests r
    JOIN users u ON r.id_user = u.id_user
    WHERE r.id_team = $1
    ORDER BY r.created_at DESC
  `;
  const result = await pool.query(query, [teamId]);
  return result.rows;
};

export const getMyPendingJoinRequests = async (userId) => {
  const query = `
    SELECT 
      r.id_request,
      r.id_team,
      r.id_user,
      r.status,
      r.created_at,
      t.name as team_name
    FROM team_join_requests r
    JOIN teams t ON r.id_team = t.id_team
    WHERE r.id_user = $1 AND r.status = 'PENDING'
    ORDER BY r.created_at DESC
  `;
  const result = await pool.query(query, [userId]);
  return result.rows;
};

export const getJoinRequestById = async (requestId) => {
  const query = `
    SELECT 
      r.id_request,
      r.id_team,
      r.id_user,
      r.status,
      r.created_at,
      t.name as team_name
    FROM team_join_requests r
    JOIN teams t ON r.id_team = t.id_team
    WHERE r.id_request = $1
  `;
  const result = await pool.query(query, [requestId]);
  return result.rows[0];
};

export const acceptJoinRequest = async (requestId) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const requestQuery = `
      SELECT * FROM team_join_requests 
      WHERE id_request = $1 AND status = 'PENDING'
    `;
    const requestResult = await client.query(requestQuery, [requestId]);

    if (requestResult.rows.length === 0) {
      await client.query("ROLLBACK");
      throw new NotFoundError("Solicitud no encontrada o ya procesada");
    }

    const request = requestResult.rows[0];

    const memberQuery = `
      INSERT INTO team_coders (id_team, id_user, team_role)
      VALUES ($1, $2, 'DEVELOPER')
      ON CONFLICT (id_team, id_user) DO NOTHING
    `;
    await client.query(memberQuery, [request.id_team, request.id_user]);

    const updateQuery = `
      UPDATE team_join_requests
      SET status = 'APPROVED', updated_at = NOW()
      WHERE id_request = $1
    `;
    await client.query(updateQuery, [requestId]);

    await client.query("COMMIT");

    return { id_team: request.id_team, id_user: request.id_user };
  } catch (error) {
    await client.query("ROLLBACK");
    if (error instanceof NotFoundError || error instanceof ConflictError) {
      throw error;
    }
    throw new DatabaseError(`Error al aceptar solicitud: ${error.message}`);
  } finally {
    client.release();
  }
};

export const rejectJoinRequest = async (requestId) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const requestQuery = `
      SELECT * FROM team_join_requests 
      WHERE id_request = $1 AND status = 'PENDING'
    `;
    const requestResult = await client.query(requestQuery, [requestId]);

    if (requestResult.rows.length === 0) {
      await client.query("ROLLBACK");
      throw new NotFoundError("Solicitud no encontrada o ya procesada");
    }

    const updateQuery = `
      UPDATE team_join_requests
      SET status = 'REJECTED', updated_at = NOW()
      WHERE id_request = $1
    `;
    await client.query(updateQuery, [requestId]);

    await client.query("COMMIT");

    return { id_request: requestId, status: "REJECTED" };
  } catch (error) {
    await client.query("ROLLBACK");
    if (error instanceof NotFoundError) {
      throw error;
    }
    throw new DatabaseError(`Error al rechazar solicitud: ${error.message}`);
  } finally {
    client.release();
  }
};

export const isInAnyTeam = async (userId, idEvent = null) => {
  // If an event is provided, only check membership within that event's teams
  if (idEvent) {
    const query = `
      SELECT tc.id_team 
      FROM team_coders tc
      JOIN teams t ON tc.id_team = t.id_team
      WHERE tc.id_user = $1 AND t.id_event = $2
      LIMIT 1
    `;
    const result = await pool.query(query, [userId, idEvent]);
    return result.rows.length > 0;
  }
  // Fallback: global check (used when no event context)
  const query = `
    SELECT id_team FROM team_coders WHERE id_user = $1 LIMIT 1
  `;
  const result = await pool.query(query, [userId]);
  return result.rows.length > 0;
};

export const cancelJoinRequest = async (requestId, userId) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const requestQuery = `
      SELECT * FROM team_join_requests
      WHERE id_request = $1 AND id_user = $2 AND status = 'PENDING'
    `;
    const requestResult = await client.query(requestQuery, [requestId, userId]);

    if (requestResult.rows.length === 0) {
      await client.query("ROLLBACK");
      throw new NotFoundError("Solicitud no encontrada o ya procesada");
    }

    const updateQuery = `
      UPDATE team_join_requests
      SET status = 'CANCELLED', updated_at = NOW()
      WHERE id_request = $1
    `;
    await client.query(updateQuery, [requestId]);

    await client.query("COMMIT");

    return { id_request: requestId, status: "CANCELLED" };
  } catch (error) {
    await client.query("ROLLBACK");
    if (error instanceof NotFoundError) {
      throw error;
    }
    throw new DatabaseError(`Error al cancelar solicitud: ${error.message}`);
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
  saveTeamProject,
  getTeamGithubOrg,
  getTeamEventMaxSize,
  findLeaderTeam,
  createJoinRequest,
  getJoinRequestsByTeam,
  getMyPendingJoinRequests,
  getJoinRequestById,
  acceptJoinRequest,
  rejectJoinRequest,
  isInAnyTeam,
  cancelJoinRequest,
};
