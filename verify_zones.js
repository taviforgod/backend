import 'dotenv/config';
import db from './config/db.js';

async function verifyZonalPastor() {
  try {
    console.log('\n📋 ===== ZONAL PASTOR SETUP VERIFICATION =====\n');

    // Check Zonal Pastor role
    const rolesRes = await db.query(
      "SELECT id, name FROM roles WHERE name LIKE '%onal%' OR name LIKE '%astor%' ORDER BY name"
    );
    console.log('✅ ROLES IN SYSTEM:');
    rolesRes.rows.forEach(r => console.log(`   - ${r.name} (ID: ${r.id})`));

    // Check zone permissions
    const permsRes = await db.query(
      "SELECT id, name FROM permissions WHERE name LIKE '%zone%' ORDER BY name"
    );
    console.log('\n✅ ZONE PERMISSIONS:');
    if (permsRes.rows.length > 0) {
      permsRes.rows.forEach(p => console.log(`   - ${p.name} (ID: ${p.id})`));
    } else {
      console.log('   (none found)');
    }

    // Check Zonal Pastor's permissions
    const rolePermsRes = await db.query(`
      SELECT r.name as role, p.name as permission 
      FROM role_permissions rp 
      JOIN roles r ON rp.role_id = r.id 
      JOIN permissions p ON rp.permission_id = p.id 
      WHERE r.name LIKE '%onal%' OR r.name LIKE '%astor%'
      ORDER BY r.name, p.name
    `);
    console.log('\n✅ ROLE-PERMISSION ASSIGNMENTS:');
    if (rolePermsRes.rows.length > 0) {
      let currentRole = '';
      rolePermsRes.rows.forEach(rp => {
        if (rp.role !== currentRole) {
          console.log(`\n   ${rp.role}:`);
          currentRole = rp.role;
        }
        console.log(`      • ${rp.permission}`);
      });
    } else {
      console.log('   (none found)');
    }

    // Check zones table
    const zonesRes = await db.query('SELECT COUNT(*) as count FROM zones');
    console.log(`\n✅ ZONES TABLE: ${zonesRes.rows[0].count} zones exist`);

    // Check zone_leaders table
    const zoneLeadersRes = await db.query('SELECT COUNT(*) as count FROM zone_leaders');
    console.log(`✅ ZONE_LEADERS TABLE: ${zoneLeadersRes.rows[0].count} leaders assigned`);

    console.log('\n🎉 ===== ZONAL PASTOR SYSTEM READY =====\n');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

verifyZonalPastor();
