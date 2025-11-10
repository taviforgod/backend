import db from "../config/db.js";

// Record attendance
export async function markAttendance(req, res) {
  try {
    const { cell_group_id, member_id, meeting_date, status, notes } = req.body;

    // Insert or update attendance
    await db.query(
      `INSERT INTO cell_attendance (cell_group_id, member_id, meeting_date, status, notes)
       VALUES ($1,$2,$3,$4,$5)
       ON CONFLICT (cell_group_id, member_id, meeting_date)
       DO UPDATE SET status=$4, notes=$5`,
      [cell_group_id, member_id, meeting_date, status, notes]
    );

    // Update absentee counters
    if (status === "absent") {
      await db.query(
        `UPDATE cell_group_members
         SET consecutive_absences = consecutive_absences + 1,
             total_absences = total_absences + 1
         WHERE cell_group_id=$1 AND member_id=$2`,
        [cell_group_id, member_id]
      );
    } else {
      // reset consecutive absences on attendance
      await db.query(
        `UPDATE cell_group_members
         SET consecutive_absences = 0
         WHERE cell_group_id=$1 AND member_id=$2`,
        [cell_group_id, member_id]
      );
    }

    res.json({ message: "Attendance recorded" });
  } catch (err) {
    console.error("Attendance error:", err);
    res.status(500).json({ message: "Server error" });
  }
}

// List attendance for a cell group
export async function getAttendance(req, res) {
  try {
    const { cell_group_id } = req.params;
    const result = await db.query(
      `SELECT a.*, m.first_name, m.surname
       FROM cell_attendance a
       JOIN members m ON a.member_id = m.id
       WHERE a.cell_group_id=$1
       ORDER BY meeting_date DESC`,
      [cell_group_id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching attendance:", err);
    res.status(500).json({ message: "Server error" });
  }
}

// Repeat absentees for dashboard
export async function getRepeatAbsentees(req, res) {
  try {
    const { cell_group_id } = req.params;
    const result = await db.query(
      `SELECT m.id, m.first_name, m.surname, cgm.consecutive_absences, cgm.total_absences
       FROM cell_group_members cgm
       JOIN members m ON cgm.member_id = m.id
       WHERE cgm.cell_group_id=$1
         AND cgm.consecutive_absences >= 3
       ORDER BY cgm.consecutive_absences DESC`,
      [cell_group_id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Repeat absentees error:", err);
    res.status(500).json({ message: "Server error" });
  }
}
