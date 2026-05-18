const { dbGet, dbAll, dbRun } = require('../config/database');
const { v4: uuidv4 } = require('uuid');
const { audit } = require('../utils/audit');

// GET /api/buildings
const listBuildings = async (req, res, next) => {
  try {
    const buildings = await dbAll('SELECT * FROM buildings ORDER BY name');
    for (const b of buildings) {
      b.floors = await dbAll('SELECT * FROM floors WHERE building_id=? ORDER BY level', [b.id]);
    }
    res.json({ success: true, data: buildings });
  } catch (err) { next(err); }
};

// POST /api/buildings
const createBuilding = async (req, res, next) => {
  try {
    const { name, address } = req.body;
    if (!name) return res.status(400).json({ success: false, message: 'Nama gedung diperlukan' });
    const id = uuidv4();
    await dbRun('INSERT INTO buildings (id, name, address) VALUES (?,?,?)', [id, name, address || null]);
    await audit({ actorId: req.user.id, actorName: req.user.name, action: 'CREATE_BUILDING', resource: name, ip: req.ip, after: { id, name } });
    const building = await dbGet('SELECT * FROM buildings WHERE id=?', [id]);
    building.floors = [];
    res.status(201).json({ success: true, data: building });
  } catch (err) { next(err); }
};

// GET /api/buildings/:id/floors
const listFloors = async (req, res, next) => {
  try {
    const floors = await dbAll('SELECT * FROM floors WHERE building_id=? ORDER BY level', [req.params.id]);
    res.json({ success: true, data: floors });
  } catch (err) { next(err); }
};

// POST /api/buildings/:id/floors
const createFloor = async (req, res, next) => {
  try {
    const { name, level } = req.body;
    if (!name) return res.status(400).json({ success: false, message: 'Nama lantai diperlukan' });
    const building = await dbGet('SELECT id FROM buildings WHERE id=?', [req.params.id]);
    if (!building) return res.status(404).json({ success: false, message: 'Gedung tidak ditemukan' });
    const id = uuidv4();
    await dbRun('INSERT INTO floors (id, building_id, name, level) VALUES (?,?,?,?)', [id, req.params.id, name, level || 0]);
    const floor = await dbGet('SELECT * FROM floors WHERE id=?', [id]);
    res.status(201).json({ success: true, data: floor });
  } catch (err) { next(err); }
};

module.exports = { listBuildings, createBuilding, listFloors, createFloor };
