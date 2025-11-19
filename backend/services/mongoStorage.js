const mongoose = require('mongoose');
const Schedule = require('../models/Schedule');

class MongoStorage {
  async find(filter = {}) {
    return await Schedule.find(filter).lean();
  }

  async findById(id) {
    return await Schedule.findById(id).lean();
  }

  async create(scheduleData) {
    const schedule = new Schedule(scheduleData);
    return await schedule.save();
  }

  async updateById(id, updates) {
    return await Schedule.findByIdAndUpdate(id, updates, { new: true }).lean();
  }

  async deleteById(id) {
    return await Schedule.findByIdAndDelete(id).lean();
  }

  async findPendingSchedules() {
    return await Schedule.find({ status: 'pending' }).lean();
  }

  async findAll(sortBy = { createdAt: -1 }) {
    return await Schedule.find({}).sort(sortBy).lean();
  }
}

module.exports = MongoStorage;
