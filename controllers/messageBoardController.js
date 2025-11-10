import * as postModel from '../models/messageBoardModel.js';
import { createInAppNotification } from '../models/notificationModel.js';
import { getIO } from '../config/socket.js';

export async function listPosts(req, res) {
  const { church_id } = req.user;
  const { page, limit, q } = req.query;
  try {
    const data = await postModel.listPosts({
      church_id,
      page: Number(page || 0),
      limit: Number(limit || 20),
      q
    });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function getPost(req, res) {
  const { church_id } = req.user;
  try {
    const post = await postModel.getPost(Number(req.params.id), church_id);
    if (!post) return res.status(404).json({ error: "Not found" });
    res.json(post);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function createPost(req, res) {
  const { church_id, userId: user_id, member_id } = req.user;
  const actorId = req.user?.id || req.user?.userId || null;
  const { title, content, starred, metadata, link } = req.body;
  try {
    const post = await postModel.createPost({
      church_id,
      user_id,
      member_id,
      title,
      content,
      starred: !!starred,
      metadata,
      link
    });
    res.status(201).json(post);

    // best-effort notifications (non-blocking)
    (async () => {
      try {
        // actor confirmation
        if (actorId) {
          try {
            const notification = await createInAppNotification({
              church_id,
              user_id: actorId,
              title: 'Post Created',
              message: `Your message "${title || 'Untitled'}" was posted.`,
              channel: 'in_app',
              url: `/message-board/${post.id}`,
              metadata: { type: 'message_board', event: 'created', post_id: post.id }
            });
            const io = getIO();
            if (io) {
              if (church_id) io.to(`church:${church_id}`).emit('notification', notification);
              if (notification.user_id) io.to(`user:${notification.user_id}`).emit('notification', notification);
            }
          } catch {}
        }

        // explicit target users from metadata.target_user_ids
        const targets = (metadata && Array.isArray(metadata.target_user_ids)) ? metadata.target_user_ids : [];
        if (targets.length) {
          for (const tid of targets) {
            try {
              const notification = await createInAppNotification({
                church_id,
                user_id: tid,
                title: 'You were mentioned',
                message: `${actorId ? 'A colleague' : 'Someone'} mentioned you in a post: "${title || ''}"`,
                channel: 'in_app',
                url: `/message-board/${post.id}`,
                metadata: { type: 'message_board', event: 'mentioned', post_id: post.id }
              });
              const io = getIO();
              if (io) {
                if (church_id) io.to(`church:${church_id}`).emit('notification', notification);
                if (notification.user_id) io.to(`user:${notification.user_id}`).emit('notification', notification);
              }
            } catch {}
          }
        }

        // broadcast flag in metadata -> send to church room
        if (metadata && metadata.broadcast) {
          try {
            const notification = await createInAppNotification({
              church_id,
              user_id: null,
              broadcast: true,
              title: title || 'Announcement',
              message: content ? String(content).slice(0, 200) : 'New announcement',
              channel: 'in_app',
              url: `/message-board/${post.id}`,
              metadata: { type: 'message_board', event: 'broadcast', post_id: post.id }
            });
            const io = getIO();
            if (io && church_id) io.to(`church:${church_id}`).emit('notification', notification);
          } catch {}
        }
      } catch (e) {
        console.error('notify:createPost', e);
      }
    })();

  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

export async function updatePost(req, res) {
  const { church_id } = req.user;
  const actorId = req.user?.id || req.user?.userId || null;
  try {
    const post = await postModel.updatePost(Number(req.params.id), church_id, req.body);
    if (!post) return res.status(404).json({ error: "Not found" });
    res.json(post);

    // best-effort notifications (non-blocking)
    (async () => {
      try {
        // notify original author (if different)
        if (post?.user_id && post.user_id !== actorId) {
          try {
            const notification = await createInAppNotification({
              church_id,
              user_id: post.user_id,
              title: 'Post Updated',
              message: `A post you authored "${post.title || 'Untitled'}" was updated.`,
              channel: 'in_app',
              url: `/message-board/${post.id}`,
              metadata: { type: 'message_board', event: 'updated', post_id: post.id }
            });
            const io = getIO();
            if (io) {
              if (church_id) io.to(`church:${church_id}`).emit('notification', notification);
              if (notification.user_id) io.to(`user:${notification.user_id}`).emit('notification', notification);
            }
          } catch {}
        }

        // honor metadata targets or broadcast
        const metadata = post?.metadata || req.body.metadata || {};
        const targets = Array.isArray(metadata.target_user_ids) ? metadata.target_user_ids : [];
        for (const tid of targets) {
          try {
            const notification = await createInAppNotification({
              church_id,
              user_id: tid,
              title: 'Post Updated',
              message: `A post mentioning you was updated: "${post.title || ''}"`,
              channel: 'in_app',
              url: `/message-board/${post.id}`,
              metadata: { type: 'message_board', event: 'updated', post_id: post.id }
            });
            const io = getIO();
            if (io) {
              if (church_id) io.to(`church:${church_id}`).emit('notification', notification);
              if (notification.user_id) io.to(`user:${notification.user_id}`).emit('notification', notification);
            }
          } catch {}
        }
        if (metadata.broadcast) {
          try {
            const notification = await createInAppNotification({
              church_id,
              user_id: null,
              broadcast: true,
              title: `Update: ${post.title || 'Announcement'}`,
              message: post.content ? String(post.content).slice(0,200) : '',
              channel: 'in_app',
              url: `/message-board/${post.id}`,
              metadata: { type: 'message_board', event: 'updated_broadcast', post_id: post.id }
            });
            const io = getIO();
            if (io && church_id) io.to(`church:${church_id}`).emit('notification', notification);
          } catch {}
        }
      } catch (e) {
        console.error('notify:updatePost', e);
      }
    })();

  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

export async function deletePost(req, res) {
  const { church_id } = req.user;
  const actorId = req.user?.id || req.user?.userId || null;
  try {
    const deleted = await postModel.deletePost(Number(req.params.id), church_id);
    if (!deleted) return res.status(404).json({ error: "Not found" });
    res.json(deleted);

    // best-effort notifications (non-blocking)
    (async () => {
      try {
        // notify actor
        if (actorId) {
          try {
            const notification = await createInAppNotification({
              church_id,
              user_id: actorId,
              title: 'Post Deleted',
              message: `Post #${req.params.id} was deleted.`,
              channel: 'in_app',
              url: `/message-board`,
              metadata: { type: 'message_board', event: 'deleted', post_id: Number(req.params.id) }
            });
            const io = getIO();
            if (io) {
              if (church_id) io.to(`church:${church_id}`).emit('notification', notification);
              if (notification.user_id) io.to(`user:${notification.user_id}`).emit('notification', notification);
            }
          } catch {}
        }

        // if deleted contained metadata with targets, notify them
        const meta = deleted?.metadata || {};
        const targets = Array.isArray(meta.target_user_ids) ? meta.target_user_ids : [];
        for (const tid of targets) {
          try {
            const notification = await createInAppNotification({
              church_id,
              user_id: tid,
              title: 'Post Removed',
              message: `A post that mentioned you was removed.`,
              channel: 'in_app',
              url: `/message-board`,
              metadata: { type: 'message_board', event: 'deleted', post_id: Number(req.params.id) }
            });
            const io = getIO();
            if (io) {
              if (church_id) io.to(`church:${church_id}`).emit('notification', notification);
              if (notification.user_id) io.to(`user:${notification.user_id}`).emit('notification', notification);
            }
          } catch {}
        }

        // broadcast if post had broadcast flag
        if (meta && meta.broadcast) {
          try {
            const notification = await createInAppNotification({
              church_id,
              user_id: null,
              broadcast: true,
              title: `Announcement removed`,
              message: deleted?.content ? String(deleted.content).slice(0,200) : 'An announcement was removed',
              channel: 'in_app',
              url: `/message-board`,
              metadata: { type: 'message_board', event: 'deleted_broadcast', post_id: Number(req.params.id) }
            });
            const io = getIO();
            if (io && church_id) io.to(`church:${church_id}`).emit('notification', notification);
          } catch {}
        }
      } catch (e) {
        console.error('notify:deletePost', e);
      }
    })();

  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

// export functions
export default {
  listPosts,
  getPost,
  createPost,
  updatePost,
  deletePost
};