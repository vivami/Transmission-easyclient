import "../tools/configureMobx";
import getLogger from "../tools/getLogger";
import Daemon, {ALARM_NAME} from "./daemon";
import ContextMenu from "./contextMenu";
import BgStore from "../stores/BgStore";
import {autorun} from "mobx";
import TransmissionClient from "./transmissionClient";
import MobxPatchLine from "../tools/mobxPatchLine";
import completeIcon from "../assets/img/notification_done.png?resource";
import addIcon from "../assets/img/notification_add.png?resource";
import errorIcon from "../assets/img/notification_error.png?resource";
import {serializeError} from "serialize-error";

const logger = getLogger('background');

const notificationIcons = {
  complete: completeIcon,
  add: addIcon,
  error: errorIcon,
};

class Bg {
  constructor() {
    /**@type BgStore*/
    this.bgStore = BgStore.create();
    this.bgStorePathLine = new MobxPatchLine(this.bgStore, ['client']);
    this.client = null;
    this.daemon = null;
    this.contextMenu = null;

    this.initPromise = null;

    this.init().catch((err) => {
      logger.error('init error', err);
    });
  }

  init() {
    this.daemon = new Daemon(this);
    this.contextMenu = new ContextMenu(this);

    return this.initPromise = this.bgStore.fetchConfig().then(() => {
      const logger = getLogger('autorun');

      autorun(() => {
        logger.info('daemon');
        this.daemon.start();
      });

      autorun(() => {
        logger.info('client');
        const dep = [
          this.bgStore.config.ssl,
          this.bgStore.config.port,
          this.bgStore.config.hostname,
          this.bgStore.config.pathname,
          this.bgStore.config.authenticationRequired,
        ];

        if (dep.length) {
          this.bgStore.flushClient();
          this.client = new TransmissionClient(this);
          this.client.updateSettings().catch((err) => {
            logger.error('client', 'updateSettings error', err);
          });
          this.client.updateTorrents().catch((err) => {
            logger.error('client', 'updateTorrents error', err);
          });
        }
      });

      autorun(() => {
        logger.info('badge');
        if (this.bgStore.config.showActiveCountBadge) {
          const count = this.bgStore.client.activeCount;
          if (count > 0) {
            setBadgeText('' + count);
          } else {
            setBadgeText('');
          }
        } else {
          setBadgeText('');
        }
      });

      autorun(() => {
        logger.info('badgeColor');
        setBadgeBackgroundColor(this.bgStore.config.badgeColor);
      });

      autorun(() => {
        logger.info('contextMenu');
        const dep = [
          this.bgStore.config.folders.length,
          this.bgStore.config.treeViewContextMenu,
          this.bgStore.config.putDefaultPathInContextMenu
        ];

        if (dep.length) {
          this.contextMenu.create();
        }
      });
    });
  }

  whenReady() {
    return this.initPromise;
  }

  handleMessage = (message, sender, response) => {
    // Every action is dispatched after whenReady() so the store/client are
    // reconstructed first — on MV3 the service worker may be cold when a
    // message arrives.
    const promise = this.whenReady().then(() => {
      switch (message && message.action) {
        case 'getBgStoreDelta':
          return this.bgStorePathLine.getDelta(message.id, message.patchId);
        case 'getConfigStore':
          return this.bgStore.config.toJSON();
        case 'updateTorrentList':
          return this.client.updateTorrents(message.force);
        case 'start':
          return this.client.start(message.ids);
        case 'forcestart':
          return this.client.forcestart(message.ids);
        case 'stop':
          return this.client.stop(message.ids);
        case 'recheck':
          return this.client.recheck(message.ids);
        case 'removetorrent':
          return this.client.removetorrent(message.ids);
        case 'removedatatorrent':
          return this.client.removedatatorrent(message.ids);
        case 'queueTop':
          return this.client.queueTop(message.ids);
        case 'queueUp':
          return this.client.queueUp(message.ids);
        case 'queueDown':
          return this.client.queueDown(message.ids);
        case 'queueBottom':
          return this.client.queueBottom(message.ids);
        case 'setPriority':
          return this.client.setPriority(message.id, message.level, message.fileIdxs);
        case 'getFileList':
          return this.client.getFileList(message.id);
        case 'setDownloadSpeedLimitEnabled':
          return this.client.setDownloadSpeedLimitEnabled(message.enabled);
        case 'setDownloadSpeedLimit':
          return this.client.setDownloadSpeedLimit(message.speed);
        case 'setUploadSpeedLimitEnabled':
          return this.client.setUploadSpeedLimitEnabled(message.enabled);
        case 'setUploadSpeedLimit':
          return this.client.setUploadSpeedLimit(message.speed);
        case 'setAltSpeedEnabled':
          return this.client.setAltSpeedEnabled(message.enabled);
        case 'setAltUploadSpeedLimit':
          return this.client.setAltUploadSpeedLimit(message.speed);
        case 'setAltDownloadSpeedLimit':
          return this.client.setAltDownloadSpeedLimit(message.speed);
        case 'updateSettings':
          return this.client.updateSettings();
        case 'sendFiles':
          return this.client.sendFiles(message.urls, message.directory);
        case 'getFreeSpace':
          return this.client.getFreeSpace(message.path);
        case 'reannounce':
          return this.client.reannounce(message.ids);
        case 'rename':
          return this.client.rename(message.ids, message.path, message.name);
        case 'torrentSetLocation':
          return this.client.torrentSetLocation(message.ids, message.location);
        default:
          throw new Error('Unknown request');
      }
    });

    promise.then((result) => {
      response({result});
    }, (err) => {
      response({error: serializeError(err)});
    }).catch((err) => {
      logger.error('Send response error', err);
    });
    return true;
  };

  torrentAddedNotify(torrent) {
    const icon = notificationIcons.add;
    const statusText = chrome.i18n.getMessage('torrentAdded');
    showNotification('added-' + torrent.id, icon, torrent.name, statusText);
  }

  torrentIsExistsNotify(torrent) {
    const icon = notificationIcons.error;
    const title = chrome.i18n.getMessage('torrentFileIsExists');
    showNotification('exists-' + torrent.id, icon, torrent.name, title);
  }

  torrentExistsNotify() {
    const icon = notificationIcons.error;
    const title = chrome.i18n.getMessage('torrentFileExists');
    showNotification(null, icon, title);
  }

  torrentCompleteNotify(torrent) {
    const icon = notificationIcons.complete;
    const statusText = chrome.i18n.getMessage('OV_COL_STATUS') + ': ' + torrent.stateText;
    showNotification('complete-' + torrent.id, icon, torrent.name, statusText);
  }

  torrentErrorNotify(message) {
    const icon = notificationIcons.error;
    const title = chrome.i18n.getMessage('OV_FL_ERROR');
    showNotification(null, icon, title, message);
  }
}

function setBadgeText(text) {
  chrome.action.setBadgeText({
    text: text
  });
}

function showNotification(id, iconUrl, title = '', message = '') {
  chrome.notifications.create(id, {
    type: 'basic',
    // Resolve to an absolute extension URL — the service worker has no document
    // base to resolve a relative asset path against.
    iconUrl: chrome.runtime.getURL(iconUrl),
    title: title,
    message: message
  });
}

function setBadgeBackgroundColor(color) {
  const colors = color.split(',').map(i => parseFloat(i));
  if (colors.length === 4) {
    colors.push(parseInt(255 * colors.pop(), 10));
  }
  chrome.action.setBadgeBackgroundColor({
    color: colors
  });
}

// Lazy singleton. The MV3 service worker is torn down when idle and the module
// is re-evaluated on the next event, so the Bg instance (store, client, daemon,
// context menu) is rebuilt on demand and its config is re-read from storage.
let bgInstance = null;
function getBg() {
  if (!bgInstance) {
    bgInstance = new Bg();
  }
  return bgInstance;
}

// Event listeners MUST be registered synchronously at the top level on every
// worker startup, otherwise the event that woke the worker is not delivered.
chrome.runtime.onMessage.addListener((message, sender, response) => {
  return getBg().handleMessage(message, sender, response);
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === ALARM_NAME) {
    const bg = getBg();
    bg.whenReady().then(() => bg.daemon.handleFire());
  }
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  getBg().contextMenu.handleClick(info, tab);
});

// Build menus / start polling right after install or browser startup, without
// waiting for the popup to open.
chrome.runtime.onInstalled.addListener(() => {
  getBg().whenReady().catch(() => {});
});
chrome.runtime.onStartup.addListener(() => {
  getBg().whenReady().catch(() => {});
});