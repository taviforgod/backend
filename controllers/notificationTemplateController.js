import handlebars from "handlebars";
import * as templateModel from "../models/notificationTemplateModel.js";

export async function listTemplates(req, res) {
  const { church_id } = req.user;
  const { page, limit, channel } = req.query;
  try {
    const templates = await templateModel.listTemplates({
      church_id,
      channel,
      page: Number(page || 0),
      limit: Number(limit || 20)
    });
    res.json(templates);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function getTemplate(req, res) {
  const { church_id } = req.user;
  try {
    const tpl = await templateModel.getTemplate(Number(req.params.id), church_id);
    if (!tpl) return res.status(404).json({ error: "Not found" });
    res.json(tpl);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function createTemplate(req, res) {
  try {
    // Get the member for the logged-in user
    const { church_id } = req.user;
    const { name, channel, subject, body, description, variables, is_default } = req.body;

    // Import getMemberByUserId dynamically to avoid circular imports
    const { getMemberByUserId } = await import('../models/memberModel.js');
    const member = await getMemberByUserId(req.user.userId, church_id);

    if (!member) {
      return res.status(404).json({ error: 'Member profile not found' });
    }

    const tpl = await templateModel.createTemplate({
      church_id,
      name,
      channel,
      subject,
      body,
      description,
      variables,
      is_default,
      created_by: member.id  // Use member.id instead of user.id
    });
    res.status(201).json(tpl);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

export async function updateTemplate(req, res) {
  const { church_id } = req.user;
  try {
    const updated = await templateModel.updateTemplate(Number(req.params.id), church_id, req.body);
    if (!updated) return res.status(404).json({ error: "Not found" });
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

export async function deleteTemplate(req, res) {
  const { church_id } = req.user;
  try {
    const deleted = await templateModel.deleteTemplate(Number(req.params.id), church_id);
    if (!deleted) return res.status(404).json({ error: "Not found" });
    res.json(deleted);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

// POST /api/notification-templates/:id/preview
export async function previewTemplate(req, res) {
  const { church_id } = req.user;
  const { id } = req.params;
  const { data } = req.body;
  try {
    const tpl = await templateModel.getTemplate(Number(id), church_id);
    if (!tpl) return res.status(404).json({ error: "Template not found" });
    const compileFn = handlebars.compile(tpl.body || "");
    const previewHtml = compileFn(data || {});
    res.json({
      subject: tpl.subject,
      preview: previewHtml,
      channel: tpl.channel,
      templateId: tpl.id
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// POST /api/notification-templates/:id/copy-to
export async function copyTemplateToChurch(req, res) {
  const { church_id, userId: created_by } = req.user;
  const { id } = req.params;
  const { targetChurchId } = req.body;
  try {
    if (!targetChurchId) return res.status(400).json({ error: "Target church required" });
    const tpl = await templateModel.getTemplate(Number(id), church_id);
    if (!tpl) return res.status(404).json({ error: "Template not found" });
    const copied = await templateModel.createTemplate({
      church_id: targetChurchId,
      name: tpl.name,
      channel: tpl.channel,
      subject: tpl.subject,
      body: tpl.body,
      description: tpl.description,
      config: tpl.config,
      created_by
    });
    res.status(201).json({
      message: "Template copied",
      template: copied
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}