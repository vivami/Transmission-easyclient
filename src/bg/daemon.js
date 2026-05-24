import getLogger from "../tools/getLogger";
import promiseFinally from "../tools/promiseFinally";

const logger = getLogger('Daemon');

const ALARM_NAME = 'daemon';

class Daemon {
  constructor(/**Bg*/bg) {
    this.bg = bg;

    this.isActive = false;
    this.retryCount = 0;
    this.inProgress = false;
  }

  /**
   * @return {BgStore}
   */
  get bgStore() {
    return this.bg.bgStore;
  }

  handleFire() {
    logger.info('Fire');
    if (this.inProgress) return;
    this.inProgress = true;

    this.bg.client.updateTorrents().then(() => {
      this.retryCount = 0;
    }, (err) => {
      logger.error('updateTorrents error', err);
      if (++this.retryCount > 3) {
        logger.warn('Daemon stopped, cause', err);
        this.stop();
      }
    }).then(...promiseFinally(() => {
      this.inProgress = false;
    }));
  }

  start() {
    logger.info('Start');

    const interval = this.bgStore.config.backgroundUpdateInterval;
    if (interval >= 1000) {
      this.isActive = true;
      this.retryCount = 0;
      // MV3 replaces setInterval (which dies with the idle service worker) with
      // chrome.alarms. Creating an alarm with an existing name replaces it.
      // Note: Chrome clamps the period to a ~30s floor, so sub-30s intervals
      // configured in options are not honored on Chrome.
      const periodInMinutes = Math.max(0.5, interval / 60000);
      chrome.alarms.create(ALARM_NAME, {periodInMinutes});
    } else {
      this.stop(true);
    }
  }

  stop(force) {
    if (!force) {
      logger.info('Stop');
    }
    this.isActive = false;
    chrome.alarms.clear(ALARM_NAME);
  }

  destroy() {
    logger.info('Destroyed');
    this.stop();
  }
}

export {ALARM_NAME};
export default Daemon;
