// controllers/exitInterviewCtrl.js
import * as model from '../models/exitInterviewModel.js';
import * as notificationModel from '../models/notificationModel.js';
import { getIO } from '../config/socket.js';
import db from '../config/db.js';
import * as inactiveExitModel from '../models/inactiveExitModel.js';
import * as memberModel from '../models/memberModel.js';

/**
 * Create an exit interview.
 * Optional behavior: if req.body.mark_member_inactive === true and member_id provided,
 * the controller will create the interview AND create an inactive exit + mark the member
 * inactive inside a DB transaction so membership module is updated atomically.
 */
export const createInterview = async (req, res) => {
  const markMemberInactive = !!req.body?.mark_member_inactive;
  const member_id = req.body?.member_id ?? null;

  // If we need to touch member/exit tables, use a transaction across operations
  if (markMemberInactive && member_id) {
    const client = await db.connect();
    try {
      await client.query('BEGIN');

      const church_id = req.user.church_id;
      const interviewer_id = req.user.id;
      const payload = { church_id, interviewer_id, ...req.body };

      // create interview (using client)
      const interviewRow = await model.createInterview({ client, ...payload });

      // If this interview is confirming a prior suggestion, update that suggestion
      // instead of creating a new exit. Otherwise create a fresh exit and mark member inactive.
      const suggestionExit = await inactiveExitModel.findActiveSuggestionForMember(church_id, member_id);
      let exitRow = null;
      if (suggestionExit) {
        const patch = {
          is_suggestion: false,
          exit_type: req.body.exit_type ?? suggestionExit.exit_type ?? 'interview',
          exit_reason: req.body.exit_reason ?? `Marked inactive via interview ${interviewRow.id}`,
          notes: (suggestionExit.notes ? suggestionExit.notes + ' | ' : '') + `Confirmed by interview ${interviewRow.id}${req.body.notes ? ` — ${req.body.notes}` : ''}`
        };

        exitRow = await inactiveExitModel.updateExit({ client, church_id, id: suggestionExit.id, patch, updated_by: interviewer_id });

        // update member status based on exit type (may be inactive, deceased, moved, transferred, etc.)
        const exitMember = await memberModel.markMemberInactive({
          client,
          church_id,
          member_id,
          exit_id: exitRow?.id ?? suggestionExit.id,
          exit_date: exitRow?.exit_date ?? (req.body.exit_date ? new Date(req.body.exit_date) : new Date()),
          reason: patch.exit_reason || patch.exit_reason,
          updated_by: interviewer_id,
          status_name: patch.exit_type || suggestionExit.exit_type
        });

        if (!exitMember) {
          await client.query('ROLLBACK');
          client.release();
          console.error('[createInterview] FAILED: Member status could not be updated from suggestion', { member_id, interview_id: interviewRow.id, exit_type: patch.exit_type });
          return res.status(500).json({ error: 'Interview created but member status could not be updated. Please try again.' });
        }
      } else {
        // create inactive exit (reuse inactiveExitModel.createExit signature)
        const exitPayload = {
          client,
          church_id,
          member_id,
          exit_type: req.body.exit_type ?? 'interview',
          exit_reason: req.body.exit_reason ?? `Marked inactive via interview ${interviewRow.id}`,
          exit_date: req.body.exit_date ? new Date(req.body.exit_date) : new Date(),
          processed_by: req.body.processed_by ?? interviewer_id,
          is_suggestion: false,
          suggestion_trigger: null,
          notes: `Created from exit interview ${interviewRow.id}${req.body.notes ? ` — ${req.body.notes}` : ''}`,
          created_by: interviewer_id
        };

        exitRow = await inactiveExitModel.createExit(exitPayload);

        // update member status based on exit type (may be inactive, deceased, moved, transferred, etc.)
        const exitMember = await memberModel.markMemberInactive({
          client,
          church_id,
          member_id,
          exit_id: exitRow?.id ?? null,
          exit_date: exitRow?.exit_date ?? exitPayload.exit_date,
          reason: exitPayload.exit_reason,
          updated_by: interviewer_id,
          status_name: exitPayload.exit_type
        });

        if (!exitMember) {
          await client.query('ROLLBACK');
          client.release();
          console.error('[createInterview] FAILED: Member status could not be updated', { member_id, interview_id: interviewRow.id, exit_type: exitPayload.exit_type });
          return res.status(500).json({ error: 'Interview created but member status could not be updated. Please try again.' });
        }
      }

      await client.query('COMMIT');

      // respond with the interview (and include exit id for client convenience)
      res.status(201).json({ ...interviewRow, exit_id: exitRow?.id ?? null });

      // notification (best-effort, non-blocking)
      (async () => {
        try {
          const user_id = req.user?.userId ?? req.user?.id ?? null;
          const title = 'Exit interview recorded and member marked inactive';
          const message = `Interview ${interviewRow.id} recorded and member ${member_id} marked inactive.`;
          const metadata = { action: 'exit_interview_created_and_member_exited', interview_id: interviewRow.id, exit_id: exitRow.id, member_id };
          const link = `/members/${member_id}/exit-interviews/${interviewRow.id}`;

          const notification = await notificationModel.createNotification({
            church_id,
            member_id,
            user_id,
            title,
            message,
            channel: 'inapp',
            metadata,
            link
          });

          const io = getIO();
          if (io) {
            if (church_id) io.to(`church:${church_id}`).emit('notification', notification);
            if (notification.user_id) io.to(`user:${notification.user_id}`).emit('notification', notification);
            if (member_id) io.to(`member:${member_id}`).emit('notification', notification);
          }
        } catch (nErr) {
          console.warn('Failed to create notification for createInterview(with exit)', nErr?.message || nErr);
        }
      })();

      return;
    } catch (err) {
      await client.query('ROLLBACK').catch(() => null);
      client.release();
      console.error('createInterview (transaction)', err);
      return res.status(500).json({ error: 'Failed to create interview and mark member inactive' });
    } finally {
      try { client.release(); } catch (e) {}
    }
  }

  // fallback: simple interview creation (existing behavior)
  try {
    const church_id = req.user.church_id;
    const interviewer_id = req.user.id;
    const payload = { church_id, interviewer_id, ...req.body }; // expects: exit_id, member_id, summary, answers
    const row = await model.createInterview(payload);
    res.status(201).json(row);

    // best-effort notification about the recorded interview
    (async () => {
      try {
        const user_id = req.user?.userId ?? req.user?.id ?? null;
        const member_id = payload.member_id ?? null;
        const title = 'Exit interview recorded';
        const message = `An exit interview was recorded${member_id ? ` for member ${member_id}` : ''}.`;
        const metadata = { action: 'exit_interview_created', interview_id: row?.id ?? null, member_id };
        const link = member_id ? `/members/${member_id}/exit-interviews/${row?.id ?? ''}` : `/exit-interviews/${row?.id ?? ''}`;

        const notification = await notificationModel.createNotification({
          church_id,
          member_id,
          user_id,
          title,
          message,
          channel: 'inapp',
          metadata,
          link
        });

        const io = getIO();
        if (io) {
          if (church_id) io.to(`church:${church_id}`).emit('notification', notification);
          if (notification.user_id) io.to(`user:${notification.user_id}`).emit('notification', notification);
          if (member_id) io.to(`member:${member_id}`).emit('notification', notification);
        }
      } catch (nErr) {
        console.warn('Failed to create notification for createInterview', nErr?.message || nErr);
      }
    })();
  } catch (err) {
    console.error('createInterview', err);
    res.status(500).json({ error: 'Failed to save interview' });
  }
};

export const getInterview = async (req, res) => {
  try {
    const church_id = req.user.church_id;
    const id = parseInt(req.params.id);
    const row = await model.getInterviewById(church_id, id);
    if (!row) return res.status(404).json({ error: 'Interview not found' });
    res.json(row);
  } catch (err) {
    console.error('getInterview', err);
    res.status(500).json({ error: 'Failed to fetch interview' });
  }
};

export const listInterviews = async (req, res) => {
  try {
    const church_id = req.user.church_id;
    const member_id = req.query.member_id || null;
    const exit_id = req.query.exit_id || null;
    const rows = await model.listInterviews(church_id, member_id, exit_id);
    res.json(rows);
  } catch (err) {
    console.error('listInterviews', err);
    res.status(500).json({ error: 'Failed to list interviews' });
  }
};

export const updateInterview = async (req, res) => {
  try {
    const church_id = req.user.church_id;
    const id = parseInt(req.params.id);
    const interviewer_id = req.user.id;
    const { summary, answers } = req.body;

    const row = await model.updateInterview({
      church_id,
      id,
      interviewer_id,
      summary,
      answers
    });

    res.json(row);
  } catch (err) {
    console.error('updateInterview', err);
    res.status(500).json({ error: 'Failed to update interview' });
  }
};

export const deleteInterview = async (req, res) => {
  try {
    const church_id = req.user.church_id;
    const id = parseInt(req.params.id);

    await model.deleteInterview(church_id, id);
    res.json({ message: 'Interview deleted successfully' });
  } catch (err) {
    console.error('deleteInterview', err);
    res.status(500).json({ error: 'Failed to delete interview' });
  }
};

export const getTemplates = async (req, res) => {
  try {
    const church_id = req.user.church_id;
    const templates = await model.getInterviewTemplates(church_id);
    res.json(templates);
  } catch (err) {
    console.error('getTemplates', err);
    res.status(500).json({ error: 'Failed to get interview templates' });
  }
};

export default { createInterview, getInterview, listInterviews, updateInterview, deleteInterview, getTemplates };
