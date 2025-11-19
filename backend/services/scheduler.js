function initScheduler({ storage, getAuthoritativeTime, executeRelayAction, intervalMs = 30000 }) {
  if (!storage || !getAuthoritativeTime || !executeRelayAction) {
    throw new Error('Scheduler requires storage, getAuthoritativeTime and executeRelayAction');
  }

  let timer = null;
  let isRunning = false;

  const tick = async () => {
    if (isRunning) {
      return;
    }

    isRunning = true;
    try {
      const snapshot = await getAuthoritativeTime();
      const now = snapshot.now;

      const allPending = await storage.findPendingSchedules();
      const dueSchedules = allPending
        .filter(s => new Date(s.executeAt) <= now)
        .sort((a, b) => new Date(a.executeAt) - new Date(b.executeAt))
        .slice(0, 10);

      for (const schedule of dueSchedules) {
        // Try to lock by checking if still pending
        const current = await storage.findById(schedule._id);
        if (!current || current.status !== 'pending') {
          continue;
        }

        const locked = await storage.updateById(schedule._id, {
          status: 'processing',
          processingStartedAt: new Date().toISOString()
        });

        if (!locked) {
          continue;
        }

        try {
          await executeRelayAction(locked.action, {
            source: 'scheduler',
            scheduleId: String(locked._id),
            requestedAt: locked.createdAt
          });

          await storage.updateById(locked._id, {
            status: 'completed',
            executedAt: new Date().toISOString()
          });
        } catch (error) {
          await storage.updateById(locked._id, {
            status: 'failed',
            failureReason: error.message
          });
          console.error('⛔ Schedule execution failed:', error.message);
        }
      }
    } catch (error) {
      console.error('Scheduler tick failed:', error.message);
    } finally {
      isRunning = false;
    }
  };

  const start = () => {
    if (timer) return;
    timer = setInterval(tick, intervalMs);
    console.log(`⏱️  Scheduler started (interval ${intervalMs / 1000}s)`);
  };

  const stop = () => {
    if (timer) {
      clearInterval(timer);
      timer = null;
      console.log('⏹️  Scheduler stopped');
    }
  };

  return { start, stop, tick };
}

module.exports = initScheduler;
