import * as jobModel from '../models/notificationJobModel.js';

export async function listJobs(req, res) {
  const { church_id } = req.user;
  const { page, limit, job_type, status } = req.query;
  try {
    const data = await jobModel.listJobs({
      church_id,
      job_type,
      status,
      page: Number(page || 0),
      limit: Number(limit || 20)
    });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function getJob(req, res) {
  const { church_id } = req.user;
  try {
    const job = await jobModel.getJob(Number(req.params.id), church_id);
    if (!job) return res.status(404).json({ error: "Not found" });
    res.json(job);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function createJob(req, res) {
  const { church_id, userId: created_by } = req.user;
  const { job_type, title, message, schedule, config } = req.body;
  try {
    const job = await jobModel.createJob({
      church_id,
      job_type,
      title,
      message,
      schedule,
      config,
      created_by
    });
    res.status(201).json(job);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

export async function updateJob(req, res) {
  const { church_id } = req.user;
  try {
    const updated = await jobModel.updateJob(Number(req.params.id), church_id, req.body);
    if (!updated) return res.status(404).json({ error: "Not found" });
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

export async function deleteJob(req, res) {
  const { church_id } = req.user;
  try {
    const deleted = await jobModel.deleteJob(Number(req.params.id), church_id);
    if (!deleted) return res.status(404).json({ error: "Not found" });
    res.json(deleted);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}