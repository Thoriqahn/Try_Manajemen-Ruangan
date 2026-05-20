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
    const { name, address, lat, lng, total_floors } = req.body;
    
    if (!name) return res.status(400).json({ success: false, message: 'Nama gedung diperlukan' });
    if (!lat || !lng) return res.status(400).json({ success: false, message: 'Koordinat peta (Latitude & Longitude) wajib diisi' });
    if (!req.file) return res.status(400).json({ success: false, message: 'Gambar gedung wajib diunggah (Maks 1MB)' });

    const image_url = `${process.env.BASE_URL || ''}/uploads/${req.file.filename}`;
    const id = uuidv4();
    
    await dbRun('INSERT INTO buildings (id, name, address, lat, lng, image_url, total_floors) VALUES (?,?,?,?,?,?,?)', [id, name, address || null, lat, lng, image_url, total_floors || 1]);
    await audit({ actorId: req.user.id, actorName: req.user.name, action: 'CREATE_BUILDING', resource: name, ip: req.ip, after: { id, name } });
    const building = await dbGet('SELECT * FROM buildings WHERE id=?', [id]);
    building.floors = [];
    res.status(201).json({ success: true, data: building });
  } catch (err) { next(err); }
};

// PUT /api/buildings/:id
const updateBuilding = async (req, res, next) => {
  try {
    const { name, address, lat, lng, total_floors } = req.body;
    if (!name) return res.status(400).json({ success: false, message: 'Nama gedung diperlukan' });
    if (!lat || !lng) return res.status(400).json({ success: false, message: 'Koordinat peta (Latitude & Longitude) wajib diisi' });
    
    const building = await dbGet('SELECT id, name, image_url FROM buildings WHERE id=?', [req.params.id]);
    if (!building) return res.status(404).json({ success: false, message: 'Gedung tidak ditemukan' });
    
    // Jika ada file gambar baru yang diunggah, gunakan URL barunya. Jika tidak, tetap gunakan yang lama.
    const image_url = req.file ? `${process.env.BASE_URL || ''}/uploads/${req.file.filename}` : building.image_url;

    await dbRun('UPDATE buildings SET name=?, address=?, lat=?, lng=?, image_url=?, total_floors=? WHERE id=?', [name, address || null, lat, lng, image_url, total_floors || 1, req.params.id]);
    await audit({ actorId: req.user.id, actorName: req.user.name, action: 'UPDATE_BUILDING', resource: building.name, ip: req.ip, after: { id: req.params.id, name } });
    const updated = await dbGet('SELECT * FROM buildings WHERE id=?', [req.params.id]);
    res.json({ success: true, data: updated });
  } catch (err) { next(err); }
};

// DELETE /api/buildings/:id
const deleteBuilding = async (req, res, next) => {
  try {
    const building = await dbGet('SELECT id, name FROM buildings WHERE id=?', [req.params.id]);
    if (!building) return res.status(404).json({ success: false, message: 'Gedung tidak ditemukan' });
    await dbRun('DELETE FROM buildings WHERE id=?', [req.params.id]);
    await audit({ actorId: req.user.id, actorName: req.user.name, action: 'DELETE_BUILDING', resource: building.name, ip: req.ip });
    res.json({ success: true, message: 'Gedung berhasil dihapus' });
  } catch (err) { next(err); }
};

// GET /api/buildings/:id/floors
const listFloors = async (req, res, next) => {
  try {
    const building = await dbGet('SELECT total_floors FROM buildings WHERE id=?', [req.params.id]);
    if (!building) return res.status(404).json({ success: false, message: 'Gedung tidak ditemukan' });

    let floors = await dbAll('SELECT * FROM floors WHERE building_id=? ORDER BY level', [req.params.id]);

    // Auto-sync missing floors up to total_floors (filling gaps)
    let hasChanges = false;
    for (let i = 1; i <= building.total_floors; i++) {
      if (!floors.find(f => f.level === i)) {
        const id = uuidv4();
        await dbRun('INSERT INTO floors (id, building_id, name, level) VALUES (?,?,?,?)', [id, req.params.id, `Lantai ${i}`, i]);
        hasChanges = true;
      }
    }
    if (hasChanges) {
      floors = await dbAll('SELECT * FROM floors WHERE building_id=? ORDER BY level', [req.params.id]);
    }

    // Only return floors up to the current total_floors setting
    const activeFloors = floors.filter(f => f.level <= building.total_floors);
    res.json({ success: true, data: activeFloors });
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

module.exports = { listBuildings, createBuilding, updateBuilding, deleteBuilding, listFloors, createFloor };
