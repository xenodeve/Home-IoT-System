const fs = require('fs').promises;
const path = require('path');

class FileStorage {
  constructor(filePath = path.join(__dirname, '../data/schedules.json')) {
    this.filePath = filePath;
    this.ensureFileExists();
  }

  async ensureFileExists() {
    try {
      const dir = path.dirname(this.filePath);
      await fs.mkdir(dir, { recursive: true });
      
      try {
        await fs.access(this.filePath);
      } catch {
        await fs.writeFile(this.filePath, JSON.stringify([], null, 2));
      }
    } catch (err) {
      console.error('Failed to initialize file storage:', err);
    }
  }

  async readSchedules() {
    try {
      const data = await fs.readFile(this.filePath, 'utf8');
      return JSON.parse(data);
    } catch (err) {
      console.error('Failed to read schedules:', err);
      return [];
    }
  }

  async writeSchedules(schedules) {
    try {
      await fs.writeFile(this.filePath, JSON.stringify(schedules, null, 2));
    } catch (err) {
      console.error('Failed to write schedules:', err);
      throw err;
    }
  }

  async find(filter = {}) {
    const schedules = await this.readSchedules();
    return schedules.filter(schedule => {
      return Object.entries(filter).every(([key, value]) => schedule[key] === value);
    });
  }

  async findById(id) {
    const schedules = await this.readSchedules();
    return schedules.find(s => s._id === id);
  }

  async create(scheduleData) {
    const schedules = await this.readSchedules();
    const newSchedule = {
      _id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      ...scheduleData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    schedules.push(newSchedule);
    await this.writeSchedules(schedules);
    return newSchedule;
  }

  async updateById(id, updates) {
    const schedules = await this.readSchedules();
    const index = schedules.findIndex(s => s._id === id);
    if (index === -1) return null;
    
    schedules[index] = {
      ...schedules[index],
      ...updates,
      updatedAt: new Date().toISOString()
    };
    await this.writeSchedules(schedules);
    return schedules[index];
  }

  async deleteById(id) {
    const schedules = await this.readSchedules();
    const filtered = schedules.filter(s => s._id !== id);
    if (filtered.length === schedules.length) return null;
    
    await this.writeSchedules(filtered);
    return { _id: id };
  }

  async findPendingSchedules() {
    return this.find({ status: 'pending' });
  }

  async findAll(sortBy = { createdAt: -1 }) {
    const schedules = await this.readSchedules();
    const [sortField, sortOrder] = Object.entries(sortBy)[0] || ['createdAt', -1];
    
    return schedules.sort((a, b) => {
      const aVal = a[sortField];
      const bVal = b[sortField];
      return sortOrder === -1 ? 
        (aVal < bVal ? 1 : -1) : 
        (aVal > bVal ? 1 : -1);
    });
  }
}

module.exports = FileStorage;
