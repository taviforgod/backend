import * as model from '../models/inactiveExitModel.js';

async function run() {
  try {
    const church_id = process.argv[2] ? Number(process.argv[2]) : 1;
    const rows = await model.listExitsWithInterviews(church_id, { offset: 0, limit: 25, includeReinstated: false });
    console.log(JSON.stringify(rows, null, 2));
    process.exit(0);
  } catch (err) {
    console.error('Query failed', err);
    process.exit(1);
  }
}

run();
