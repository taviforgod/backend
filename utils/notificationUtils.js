import * as notificationModel from '../models/notificationModel.js';

/**
 * Create a system notification for an event
 * @param {number} churchId - Church ID
 * @param {number} userId - User ID (optional)
 * @param {number} memberId - Member ID (optional)
 * @param {string} title - Notification title
 * @param {string} message - Notification message
 * @param {object} metadata - Additional metadata (action, object_id, etc.)
 * @param {string} link - Link to related page (optional)
 * @returns {Promise<object>} Created notification
 */
export async function createSystemNotification({ churchId, userId, memberId, title, message, metadata = {}, link }) {
  try {
    const notification = await notificationModel.createNotification({
      church_id: churchId,
      user_id: userId,
      member_id: memberId,
      title,
      message,
      channel: 'in_app',
      metadata,
      link
    });
    return notification;
  } catch (error) {
    console.error('Failed to create notification:', error);
    // Don't throw - notifications are best-effort
    return null;
  }
}

/**
 * Notify about a crisis case being created
 */
export async function notifyCrisisCreated({ churchId, caseId, memberName, severity, notifyUserId, notifyMemberId }) {
  return createSystemNotification({
    churchId,
    userId: notifyUserId,
    memberId: notifyMemberId,
    title: 'New Crisis Case',
    message: `A new ${severity} crisis case has been created for ${memberName}.`,
    metadata: {
      action: 'crisis_created',
      case_id: caseId,
      severity
    },
    link: `/crisis-followups/${caseId}`
  });
}

/**
 * Notify about a crisis case being assigned
 */
export async function notifyCrisisAssigned({ churchId, caseId, caseTitle, assignedToName, assignedToMemberId }) {
  return createSystemNotification({
    churchId,
    userId: null,
    memberId: assignedToMemberId,
    title: 'Crisis Case Assigned',
    message: `You have been assigned to manage crisis case: ${caseTitle}`,
    metadata: {
      action: 'crisis_assigned',
      case_id: caseId,
      assigned_to: assignedToName
    },
    link: `/crisis-followups/${caseId}`
  });
}

/**
 * Notify about a new member being registered
 */
export async function notifyMemberRegistered({ churchId, memberId, memberName, notifyUserId }) {
  return createSystemNotification({
    churchId,
    userId: notifyUserId,
    memberId: null,
    title: 'New Member Registered',
    message: `${memberName} has been registered as a new member.`,
    metadata: {
      action: 'member_registered',
      member_id: memberId
    },
    link: `/members/${memberId}`
  });
}

/**
 * Notify about a baptism being prepared
 */
export async function notifyBaptismPrepared({ churchId, memberId, memberName, notifyUserId }) {
  return createSystemNotification({
    churchId,
    userId: notifyUserId,
    memberId: null,
    title: 'Baptism Prepared',
    message: `${memberName} has been enrolled in baptism preparation.`,
    metadata: {
      action: 'baptism_prepared',
      member_id: memberId
    },
    link: `/members/${memberId}`
  });
}

/**
 * Notify about foundation school assignment
 */
export async function notifyFoundationAssigned({ churchId, memberId, memberName, level, notifyMemberId }) {
  return createSystemNotification({
    churchId,
    userId: null,
    memberId: notifyMemberId,
    title: 'Foundation School Assignment',
    message: `${memberName} has been assigned to Foundation Level ${level}.`,
    metadata: {
      action: 'foundation_assigned',
      member_id: memberId,
      level
    },
    link: `/foundation-school/${memberId}`
  });
}

/**
 * Notify about mentorship assignment
 */
export async function notifyMentorshipAssigned({ churchId, menteeId, menteeName, mentorId, mentorName }) {
  return createSystemNotification({
    churchId,
    userId: null,
    memberId: mentorId,
    title: 'New Mentorship Assignment',
    message: `You have been assigned as mentor for ${menteeName}.`,
    metadata: {
      action: 'mentorship_assignment',
      mentee_id: menteeId,
      mentor_id: mentorId,
      mentee_name: menteeName
    },
    link: `/mentorship/${menteeId}`
  });
}

/**
 * Notify admins/pastors of prayer request
 */
export async function notifyPrayerRequest({ churchId, memberId, memberName, requestContent, notifyUserId }) {
  return createSystemNotification({
    churchId,
    userId: notifyUserId,
    memberId: null,
    title: 'New Prayer Request',
    message: `${memberName} has submitted a prayer request.`,
    metadata: {
      action: 'prayer_request',
      member_id: memberId,
      content: requestContent?.substring(0, 100)
    },
    link: `/prayer-requests`
  });
}
