typeof window === 'undefined' && (function() {
    var self = require('sdk/self');
    window = require('sdk/window/utils').getMostRecentBrowserWindow();
    mono = require('toolkit/loader').main(require('toolkit/loader').Loader({
        paths: {
            'data/': self.data.url('js/')
        },
        name: self.name,
        prefixURI: self.data.url().match(/([^:]+:\/\/[^/]+\/)/)[1],
        globals: {
            console: console,
            _require: function(path) {
                switch (path) {
                    case 'sdk/simple-storage':
                        return require('sdk/simple-storage');
                    default:
                        console.log('Module not found!', path);
                }
            }
        }
    }), "data/mono");
})();

var engine = {
    settings: {},
    defaultSettings: {
        useSSL: 0,
        ip: "127.0.0.1",
        port: 9091,
        path: "transmission/rpc",
        displayActiveTorrentCountIcon: 1,
        showNotificationOnDownloadCompleate: 1,
        notificationTimeout: 5000,
        backgroundUpdateInterval: 120000,
        popupUpdateInterval: 1000,

        login: null,
        password: null,

        hideSeedStatusItem: 0,
        hideFnishStatusItem: 0,
        showSpeedGraph: 1,
        popupHeight: 350,
        selectDownloadCategoryOnAddItemFromContextMenu: 0,

        treeViewContextMenu: 0,
        showDefaultFolderContextMenuItem: 0,

        badgeColor: '0,0,0,0.40',

        showFreeSpace: 1,

        guiPath: '',

        requireAuthentication: 1
    },
    torrentListColumnList: {},
    defaultTorrentListColumnList: [
         {column: 'checkbox',    display: 1, order: 0, width: 19,  lang: 'selectAll'},
         {column: 'name',        display: 1, order: 1, width: 200, lang: 'OV_COL_NAME'},
         {column: 'order',       display: 0, order: 1, width: 20,  lang: 'OV_COL_ORDER'},
         {column: 'size',        display: 1, order: 1, width: 60,  lang: 'OV_COL_SIZE'},
         {column: 'remaining',   display: 0, order: 1, width: 60,  lang: 'OV_COL_REMAINING'},
         {column: 'done',        display: 1, order: 1, width: 70,  lang: 'OV_COL_DONE'},
         {column: 'status',      display: 1, order: 1, width: 70,  lang: 'OV_COL_STATUS'},
         {column: 'seeds',       display: 0, order: 1, width: 30,  lang: 'OV_COL_SEEDS'},
         {column: 'peers',       display: 0, order: 1, width: 30,  lang: 'OV_COL_PEERS'},
         {column: 'seeds_peers', display: 1, order: 1, width: 40,  lang: 'OV_COL_SEEDS_PEERS'},
         {column: 'downspd',     display: 1, order: 1, width: 60,  lang: 'OV_COL_DOWNSPD'},
         {column: 'upspd',       display: 1, order: 1, width: 60,  lang: 'OV_COL_UPSPD'},
         {column: 'eta',         display: 1, order: 1, width: 70,  lang: 'OV_COL_ETA'},
         {column: 'upped',       display: 0, order: 1, width: 60,  lang: 'OV_COL_UPPED'},
         {column: 'downloaded',  display: 0, order: 1, width: 60,  lang: 'OV_COL_DOWNLOADED'},
         {column: 'shared',      display: 0, order: 1, width: 60,  lang: 'OV_COL_SHARED'},
         /* Transmission
         {column: 'avail',       display: 0, order: 1, width: 60,  lang: 'OV_COL_AVAIL'},
         {column: 'label',       display: 0, order: 1, width: 100, lang: 'OV_COL_LABEL'},*/
         {column: 'added',       display: 0, order: 1, width: 120, lang: 'OV_COL_DATE_ADDED'},
         {column: 'completed',   display: 0, order: 1, width: 120, lang: 'OV_COL_DATE_COMPLETED'},
         {column: 'actions',     display: 1, order: 0, width: 36,  lang: 'Actions'}
    ],
    fileListColumnList: {},
    defaultFileListColumnList: [
         {column: 'checkbox',   display: 1, order: 0, width: 19,  lang: 'selectAll'},
         {column: 'name',       display: 1, order: 1, width: 300, lang: 'FI_COL_NAME'},
         {column: 'size',       display: 1, order: 1, width: 60,  lang: 'FI_COL_SIZE'},
         {column: 'downloaded', display: 1, order: 1, width: 60,  lang: 'OV_COL_DOWNLOADED'},
         {column: 'done',       display: 1, order: 1, width: 70,  lang: 'OV_COL_DONE'},
         {column: 'prio',       display: 1, order: 1, width: 74,  lang: 'FI_COL_PRIO'}
    ],
    icons: {
        complete: 'images/notification_done.png',
        add:      'images/notification_add.png',
        error:    'images/notification_error.png'
    },
    capitalize: function(string) {
        return string.substr(0, 1).toUpperCase()+string.substr(1);
    },
    varCache: {
        webUiUrl: undefined,
        token: null,
        torrents: [],
        labels: [],
        settings: {},
        lastPublicStatus: '-_-',
        trafficList: [{name:'download', values: []}, {name:'upload', values: []}],
        startTime: parseInt(Date.now() / 1000),
        activeCount: 0,
        notifyList: {},

        folderList: [],

        rmLastScrapeResult: /"lastScrapeResult":"[^"]*","/gm
    },
    api: {
        getTorrentListRequest: {
            method: "torrent-get",
            arguments: {
                fields: ["id", "name", "totalSize", "percentDone", 'downloadedEver', 'uploadedEver',
                    'rateUpload', 'rateDownload', 'eta', 'peersSendingToUs', 'peersGettingFromUs',
                    'queuePosition', 'addedDate', 'doneDate', 'downloadDir', 'recheckProgress',
                    'status', 'error', 'errorString', 'trackerStats', 'magnetLink'],
                ids: undefined
            }
        },
        getFileListRequest: {
            method: "torrent-get",
            arguments: {
                fields: ["id", 'files', 'fileStats'],
                ids: undefined
            }
        },
        trUtColumnList: ['id', 'statusCode', 'name', 'totalSize', 'progress', 'downloadedEver', 'uploadedEver'
            , 'shared', 'rateUpload', 'rateDownload', 'eta', '_label', 'peersGettingFromUs'
            , 'peers', 'peersSendingToUs', 'seeds', 'n_unk', 'queuePosition', 'n_uploaded'
            , 't_unk1', 't_unk2', 'statusText', 'n_sid', 'addedDate', 'doneDate', 't_unk3'
            , 'downloadDir', 't_unk4', 'n_unk5', 'magnetLink'],
        flUtColumnList: ['name', 'length', 'bytesCompleted', 'priority', 'origName', 'folderName']
    },
    param: function(params) {
        if (typeof params === 'string') return params;

        var args = [];
        for (var key in params) {
            var value = params[key];
            if (value === null || value === undefined) {
                continue;
            }
            args.push(encodeURIComponent(key) + '=' + encodeURIComponent(value));
        }
        return args.join('&');
    },
    publicStatus: function(statusText) {
        if (engine.varCache.lastPublicStatus === statusText) return;

        engine.varCache.lastPublicStatus = statusText;
        mono.sendMessage({setStatus: statusText});
    },
    ajax: function(obj) {
        var url = obj.url;

        var method = obj.type || 'GET';
        method.toUpperCase();

        var data = obj.data;

        var isFormData = false;

        if (data && typeof data !== "string") {
            isFormData = String(data) === '[object FormData]';
            if (!isFormData) {
                data = engine.param(data);
            }
        }

        if (data && method === 'GET') {
            url += (url.indexOf('?') === -1 ? '?' : '&') + data;
            data = undefined;
        }

        if (obj.cache === false && ['GET','HEAD'].indexOf(method) !== -1) {
            var nc = '_=' + Date.now();
            url += (url.indexOf('?') === -1 ? '?' : '&') + nc;
        }

        var xhr = new engine.ajax.xhr();

        xhr.open(method, url, true);

        if (obj.timeout !== undefined) {
            xhr.timeout = obj.timeout;
        }

        if (obj.dataType) {
            obj.dataType = obj.dataType.toLowerCase();

            xhr.responseType = obj.dataType;
        }

        if (!obj.headers) {
            obj.headers = {};
        }

        if (obj.contentType) {
            obj.headers["Content-Type"] = obj.contentType;
        }

        if (data && !obj.headers["Content-Type"] && !isFormData) {
            obj.headers["Content-Type"] = 'application/x-www-form-urlencoded; charset=UTF-8';
        }

        if (obj.mimeType) {
            xhr.overrideMimeType(obj.mimeType);
        }
        if (obj.headers) {
            for (var key in obj.headers) {
                xhr.setRequestHeader(key, obj.headers[key]);
            }
        }

        if (obj.onTimeout !== undefined) {
            xhr.ontimeout = obj.onTimeout;
        }

        xhr.onload = function () {
            if (xhr.status >= 200 && xhr.status < 300 || xhr.status === 304) {
                var response = (obj.dataType) ? xhr.response : xhr.responseText;
                return obj.success && obj.success(response, xhr);
            }
            obj.error && obj.error(xhr);
        };

        xhr.onerror = function() {
            obj.error && obj.error(xhr);
        };

        xhr.send(data);

        return xhr;
    },
    timer: {
        clearInterval: typeof clearInterval !== 'undefined' ? clearInterval.bind() : undefined,
        setInterval: typeof setInterval !== 'undefined' ? setInterval.bind() : undefined,
        timer: undefined,
        state: 0,
        start: function() {
            this.state = 1;
            this.clearInterval(this.timer);
            if (engine.settings.backgroundUpdateInterval <= 1000) {
                return;
            }
            this.timer = this.setInterval(function() {
                engine.updateTrackerList();
            }, engine.settings.backgroundUpdateInterval);
        },
        stop: function() {
            this.clearInterval(this.timer);
            this.state = 0;
        }
    },
    tr2utStatus: function(code) {
        var uCode = 0;
        var Status = "";
        /*
         TR_STATUS_STOPPED        = 0, // Torrent is stopped
         TR_STATUS_CHECK_WAIT     = 1, // Queued to check files
         TR_STATUS_CHECK          = 2, // Checking files
         TR_STATUS_DOWNLOAD_WAIT  = 3, // Queued to download
         TR_STATUS_DOWNLOAD       = 4, // Downloading
         TR_STATUS_SEED_WAIT      = 5, // Queued to seed
         TR_STATUS_SEED           = 6  // Seeding
         */
        // todo: translate!
        if (code === 0) {
            uCode = 128;
            Status = "Stopped";
        } else
        if (code === 1) {
            uCode = 233;
            Status = "Queued to check files";
        } else
        if (code === 2) {
            uCode = 130;
            Status = "Checking";
        } else
        if (code === 3) {
            uCode = 200;
            Status = "Queued to download";
        } else
        if (code === 4) {
            uCode = 201;
            Status = "Downloading";
        } else
        if (code === 5) {
            uCode = 200;
            Status = "Queued to seed";
        } else
        if (code === 6) {
            uCode = 201;
            Status = "Seeding";
        } else {
            uCode = 152;
            Status = "Unknown";
        }
        return [uCode, Status];
    },
    tr2utTrList: function(response, request) {
        var data = response;
        data.ut = {};
        if (!request.arguments) {
            return data;
        }
        var type = request.arguments.ids === 'recently-active' ? 'torrentp' : 'torrents';
        var args = response.arguments;
        if (args.torrents !== undefined) {
            var firstField = args.torrents[0];
            if (firstField && firstField.files !== undefined) {
                var files = data.ut.files = [];
                files[0] = 'trId'+firstField.id;
                var fileList = files[1] = [];
                var firstSlashPosition;
                for (var n = 0, file; file = firstField.files[n]; n++) {
                    if (firstSlashPosition === undefined) {
                        firstSlashPosition = file.name.indexOf('/');
                        if (firstSlashPosition === -1) {
                            firstSlashPosition = null;
                            break;
                        }
                    }
                    if (file.name.indexOf('/') !== firstSlashPosition) {
                        firstSlashPosition = null;
                        break;
                    }
                }
                for (var n = 0, file; file = firstField.files[n]; n++) {
                    file.priority = (!firstField.fileStats[n].wanted) ? 0 : firstField.fileStats[n].priority + 2;
                    file.origName = file.name;
                    file.folderName = '';
                    if (firstSlashPosition !== null) {
                        file.folderName = file.name.substr(0, firstSlashPosition + 1);
                        file.name = file.name.substr(firstSlashPosition + 1);
                    }
                    var fileItem = [];
                    for (var i = 0, column; column = engine.api.flUtColumnList[i]; i++) {
                        fileItem.push(file[column]);
                    }
                    fileList.push(fileItem);
                }
                return data;
            }

            data.ut[type] = [];
            for (var field, i = 0; field = args.torrents[i]; i++) {
                field.id = 'trId'+field.id;
                // status>
                var utStatus = [];
                if (field.error > 0) {
                    utStatus[0] = 144;
                    utStatus[1] = engine.language.OV_FL_ERROR + ': ' + (field.errorString || "Unknown error");
                } else {
                    utStatus = engine.tr2utStatus(field.status);
                }
                field.statusCode = utStatus[0];
                field.statusText = utStatus[1];
                // <status
                field.percentDone = field.percentDone || 0;
                field.progress = parseInt((field.recheckProgress || field.percentDone) * 1000);
                field.shared = field.downloadedEver > 0 ? Math.round(field.uploadedEver / field.downloadedEver * 1000) : 0;
                if (field.eta < 0) {
                    field.eta = 0;
                }
                // seeds/peers in poe>
                var peers = 0;
                var seeds = 0;
                if (field.trackerStats !== undefined) {
                    for (var n = 0, item; item = field.trackerStats[n]; n++) {
                        if (item.leecherCount > 0) {
                            peers += item.leecherCount;
                        }
                        if (item.seederCount > 0) {
                            seeds += item.seederCount;
                        }
                    }
                }
                field.peers = peers;
                field.seeds = seeds;
                // <seeds/peers in poe

                field.queuePosition = field.queuePosition || 0;
                field.downloadDir = field.downloadDir || 0;

                var arrayItem = [];
                for (var n = 0, column; column = engine.api.trUtColumnList[n]; n++) {
                    if (field[column] !== undefined) {
                        arrayItem.push(field[column]);
                        continue;
                    }
                    var dataType = column[0];
                    if (dataType === 'n') {
                        arrayItem.push(0);
                        continue;
                    }
                    arrayItem.push('');
                }
                data.ut[type].push(arrayItem);
            }
        }
        if (type === 'torrents' && data.ut.torrents !== undefined) {
            var torrentm = [];
            for (var i = 0, item_s; item_s = engine.varCache.torrents[i]; i++) {
                var found = false;
                for (var n = 0, item_m; item_m = data.ut.torrents[n]; n++) {
                    if (item_m[0] === item_s[0]) {
                        found = true;
                        break;
                    }
                }
                if (!found) {
                    torrentm.push(item_s[0]);
                }
            }
            if (torrentm.length > 0) {
                data.ut.torrentm = torrentm;
            }
        } else {
            if (args.removed !== undefined) {
                data.ut.torrentm = [];
                for (var i = 0, len = args.removed.length; i < len; i++) {
                    data.ut.torrentm.push('trId'+args.removed[i]);
                }
            }
        }
        data.ut.torrentc = Date.now();
        return data;
    },
    sendAction: function(origData, onLoad, onError, force) {
        var data = origData;

        var headers = {};


        if (engine.settings.requireAuthentication && engine.settings.login !== null && engine.settings.password !== null) {
            headers.Authorization = 'Basic ' + window.btoa(engine.settings.login + ":" + engine.settings.password);
        }
        if (engine.varCache.token !== null) {
            headers['X-Transmission-Session-Id'] = engine.varCache.token;
        }

        engine.ajax({
            type: 'POST',
            url: engine.varCache.webUiUrl,
            headers: headers,
            data: JSON.stringify(data),
            success: function(data, xhr) {
                var data = xhr.responseText;
                try {
                    data = data.replace(engine.varCache.rmLastScrapeResult, '"lastScrapeResult":"","');
                    data = JSON.parse(data);
                } catch (err) {
                    return engine.publicStatus('Data parse error!');
                }
                engine.publicStatus('');
                engine.tr2utTrList(data, origData);
                onLoad && onLoad(data);
                engine.readResponse(data, origData);
            },
            error: function(xhr) {
                if (force === undefined) {
                    force = 0;
                }
                force++;
                if (xhr.status === 409) {
                    engine.varCache.token = xhr.getResponseHeader("X-Transmission-Session-Id");
                }
                if (force < 2) {
                    return engine.sendAction.call(engine, origData, onLoad, onError, force);
                }
                engine.publicStatus('Can\'t send action! '+xhr.statusText+' (Code: '+xhr.status+')');
                onError && onError({
                    status: xhr.status,
                    statusText: xhr.statusText
                });
            }
        });
    },
    readResponse: function(response, request) {
        var data = response.ut;
        if (data.torrentm !== undefined) {
            // Removed torrents
            var list = engine.varCache.torrents;
            for (var i = 0, item_m; item_m = data.torrentm[i]; i++) {
                for (var n = 0, item_s; item_s = list[n]; n++) {
                    if (item_s[0] === item_m) {
                        list.splice(n, 1);
                        break;
                    }
                }
            }
        }

        var newTorrentList = data.torrents || data.torrentp;
        if (newTorrentList !== undefined) {
            engine.utils(engine.varCache.torrents, newTorrentList);
        }

        if (data.torrents !== undefined) {
            //Full torrent list
            engine.varCache.torrents = data.torrents;
        } else
        if (data.torrentp !== undefined) {
            // Updated torrent list with CID
            var list = engine.varCache.torrents;
            var newItem = [];
            for (var i = 0, item_p; item_p = data.torrentp[i]; i++) {
                var found = false;
                for (var n = 0, item_s; item_s = list[n]; n++) {
                    if (item_s[0] !== item_p[0]) {
                        continue;
                    }
                    list[n] = item_p;
                    found = true;
                    break;
                }
                if (found === false) {
                    newItem.push(item_p);
                    list.push(item_p);
                }
            }
        }

        if (request.method === 'session-get') {
            engine.varCache.settings = response.arguments;
        }

        engine.settings.displayActiveTorrentCountIcon && engine.displayActiveItemsCountIcon(engine.varCache.torrents);
    },
    updateTrackerList: function() {
        engine.sendAction(engine.api.getTorrentListRequest, function(data) {
            // on ready
        }, function() {
            // on error
            engine.timer.stop();
        });
    },
    loadSettings: function(cb) {
        var defaultSettings = engine.defaultSettings;

        var optionsList = [];
        for (var item in defaultSettings) {
            optionsList.push(item);
        }

        var columnList = ['fileListColumnList', 'torrentListColumnList'];
        columnList.forEach(function(item) {
            optionsList.push(item);
        });

        optionsList.push('language');
        optionsList.push('folderList');

        optionsList.push('ut_port');
        optionsList.push('ut_ip');
        optionsList.push('ut_path');
        optionsList.push('ssl');

        mono.storage.get(optionsList, function(storage) {
            var settings = {};

            // migration >>>
            if (!storage.hasOwnProperty('port') && storage.ut_port && !isNaN(parseInt(storage.ut_port))) {
                storage.port = parseInt(storage.ut_port);
            }
            if (!storage.hasOwnProperty('ip') && storage.ut_ip) {
                storage.ip = storage.ut_ip;
            }
            if (!storage.hasOwnProperty('path') && storage.path) {
                storage.path = storage.ut_path;
            }
            if (!storage.hasOwnProperty('useSSL') && storage.ssl === 1) {
                storage.useSSL = storage.ssl;
            }
            // <<< migration

            for (var item in defaultSettings) {
                settings[item] = storage.hasOwnProperty(item) ? storage[item] : defaultSettings[item];
            }

            settings.lang = storage.language;

            engine.varCache.folderList = storage.folderList || engine.varCache.folderList;

            engine.settings = settings;

            columnList.forEach(function(item) {
                var defItem = 'default'+engine.capitalize(item);
                engine[item] = storage.hasOwnProperty(item) ? storage[item] : engine[defItem];
                if (engine[defItem].length !== engine[item].length) {
                    for (var n = 0, dItem; dItem = engine[defItem][n]; n++) {
                        var found = false;
                        for (var g = 0, nItem; nItem = engine[item][g]; g++) {
                            if (nItem.column === dItem.column) {
                                found = true;
                                break;
                            }
                        }
                        if (!found) {
                            if (dItem.column === 'checkbox') {
                                engine[item].unshift(dItem);
                            } else {
                                engine[item].push(dItem);
                            }
                        }
                    }
                }
            });

            engine.varCache.webUiUrl = (settings.useSSL ? 'https://' : 'http://') + settings.ip + ':' + settings.port + '/' + settings.path;

            return cb();
        });
    },
    checkAvailableLanguage: function(lang) {
        var dblList = ['pt-BR', 'zh-CN'];
        if (dblList.indexOf(lang) === -1) {
            lang = lang.substr(0, 2);
        }
        return ['ru', 'fr', 'en', 'es'].concat(dblList).indexOf(lang) !== -1 ? lang : 'en';
    },
    getLocale: function() {
        if (engine.getLocale.locale !== undefined) {
            return engine.getLocale.locale;
        }

        var getLang = function() {
            return String(navigator.language).toLowerCase();
        };

        if (mono.isModule) {
            getLang = function() {
                var window = require('sdk/window/utils').getMostRecentBrowserWindow();
                return String(window.navigator && window.navigator.language).toLowerCase();
            };
        }

        var lang = getLang();
        var match = lang.match(/\(([^)]+)\)/);
        if (match !== null) {
            lang = match[1];
        }

        var tPos = lang.indexOf('-');
        if (tPos !== -1) {
            var left = lang.substr(0, tPos);
            var right = lang.substr(tPos + 1);
            if (left === right) {
                lang = left;
            } else {
                lang = left + '-' + right.toUpperCase();
            }
        }
        return engine.getLocale.locale = lang;
    },
    detectLanguage: function() {
        "use strict";
        if (mono.isChrome) {
            return chrome.i18n.getMessage('lang');
        }

        if (mono.isModule) {
            var lang = require("sdk/l10n").get('lang');
            if (lang !== 'lang') {
                return lang;
            }
        }

        return engine.getLocale();
    },
    readChromeLocale: function(lang) {
        var language = {};
        for (var key in lang) {
            language[key] = lang[key].message;
        }
        return language;
    },
    setLanguage: function(languageWordList) {
        for (var key in languageWordList) {
            engine.language[key] = languageWordList[key];
        }
    },
    loadLanguage: function(cb, force) {
        var lang = force || engine.checkAvailableLanguage((engine.settings.lang || engine.detectLanguage()));

        if (!force) {
            engine.settings.lang = engine.settings.lang || lang;
        }

        if (engine.language.lang === lang) {
            return cb();
        }

        var url = '_locales/' + lang.replace('-', '_') + '/messages.json';

        if (mono.isModule) {
            try {
                engine.setLanguage(engine.readChromeLocale(JSON.parse(require('sdk/self').data.load(url))));
                return cb();
            } catch (e) {
                console.error('Can\'t load language!', lang);
                return cb();
            }
        }

        engine.ajax({
            url: url,
            dataType: 'JSON',
            success: function(data) {
                engine.setLanguage(engine.readChromeLocale(data));
                cb();
            },
            error: function() {
                console.error('Can\'t load language!', lang);
                cb();
            }
        });
    },
    getLanguage: function(cb) {
        engine.language = {};
        engine.loadLanguage(function() {
            engine.loadLanguage(cb);
        }, 'en');
    },
    trafficCounter: function(torrentList) {
        var limit = 90;
        var dlSpeed = 0;
        var upSpeed = 0;
        for (var i = 0, item; item = torrentList[i]; i++) {
            dlSpeed += item[9];
            upSpeed += item[8];
        }
        var dlSpeedList = engine.varCache.trafficList[0].values;
        var upSpeedList = engine.varCache.trafficList[1].values;
        var now = parseInt(Date.now() / 1000) - engine.varCache.startTime;
        dlSpeedList.push({time: now, pos: dlSpeed});
        upSpeedList.push({time: now, pos: upSpeed});
        if (dlSpeedList.length > limit) {
            dlSpeedList.shift();
            upSpeedList.shift();
        }
    },
    showNotification: function() {
        var moduleFunc = function(icon, title, desc) {
            var notification = require("sdk/notifications");
            notification.notify({title: String(title), text: String(desc), iconURL: icon});
        };

        var chromeFunc = function(icon, title, desc, id) {
            var notifyId = 'notify';
            if (id !== undefined) {
                notifyId += id;
            } else {
                notifyId += Date.now();
            }
            var timerId = notifyId + 'Timer';

            var notifyList = engine.varCache.notifyList;

            if (id !== undefined && notifyList[notifyId] !== undefined) {
                clearTimeout(notifyList[timerId]);
                delete notifyList[notifyId];
                chrome.notifications.clear(notifyId, function(){});
            }
            /**
             * @namespace chrome.notifications
             */
            chrome.notifications.create(
                notifyId,
                {
                    type: 'basic',
                    iconUrl: icon,
                    title: String(title),
                    message: String(desc)
                },
                function(id) {
                    notifyList[notifyId] = id;
                }
            );
            if (engine.settings.notificationTimeout > 0) {
                notifyList[timerId] = setTimeout(function () {
                    notifyList[notifyId] = undefined;
                    chrome.notifications.clear(notifyId, function(){});
                }, engine.settings.notificationTimeout);
            }
        };

        if (mono.isModule) {
            return moduleFunc.apply(this, arguments);
        }

        if (mono.isChrome) {
            return chromeFunc.apply(this, arguments);
        }
    },
    onCompleteNotification: function(oldTorrentList, newTorrentList) {
        if (oldTorrentList.length === 0) {
            return;
        }
        for (var i = 0, newItem; newItem = newTorrentList[i]; i++) {
            if (newItem[4] !== 1000) {
                continue;
            }
            for (var n = 0, oldItem; oldItem = oldTorrentList[n]; n++) {
                if (oldItem[0] !== newItem[0] || oldItem[4] === 1000 || oldItem[24]) {
                    continue;
                }
                engine.showNotification(engine.icons.complete, newItem[2], (newItem[21] !== undefined) ? engine.language.OV_COL_STATUS + ': ' + newItem[21] : '');
            }
        }
    },
    setBadgeText: function() {
        "use strict";
        var chromeFunc = function(text) {
            engine.setBadgeText.lastText = text;

            chrome.browserAction.setBadgeText({
                text: text
            });

            var color = engine.settings.badgeColor.split(',').map(function(i){return parseFloat(i);});
            if (color.length === 4) {
                color.push(parseInt(255 * color.splice(-1)[0]));
            }
            chrome.browserAction.setBadgeBackgroundColor({
                color: color
            });
        };

        var moduleFunc = function(text) {
            engine.setBadgeText.lastText = text;

            mono.ffButton.badge = text;

            var color = engine.settings.badgeColor;
            var hexColor = mono.rgba2hex.apply(mono, color.split(','));
            mono.ffButton.badgeColor = hexColor;
        };

        if (mono.isModule) {
            return moduleFunc.apply(this, arguments);
        }

        if (mono.isChrome) {
            return chromeFunc.apply(this, arguments);
        }
    },
    displayActiveItemsCountIcon: function(newTorrentList) {
        var activeCount = 0;
        for (var i = 0, item; item = newTorrentList[i]; i++) {
            if (item[4] !== 1000 && ( item[24] === undefined || item[24] === 0) ) {
                activeCount++;
            }
        }
        if (engine.varCache.activeCount === activeCount) {
            return;
        }
        engine.varCache.activeCount = activeCount;
        var text = activeCount ? String(activeCount) : '';
        engine.setBadgeText(text);
    },
    utils: function(oldTorrentList, newTorrentList) {
        engine.settings.showSpeedGraph && engine.trafficCounter(newTorrentList);
        engine.settings.showNotificationOnDownloadCompleate && engine.onCompleteNotification(oldTorrentList.slice(0), newTorrentList);
    },
    downloadFile: function (url, cb, referer) {
        var xhr = new engine.ajax.xhr();
        xhr.open('GET', url, true);
        xhr.responseType = 'blob';
        if (referer !== undefined) {
            xhr.setRequestHeader('Referer', referer);
        }
        xhr.onprogress = function (e) {
            if (e.total > 1048576 * 10 || e.loaded > 1048576 * 10) {
                xhr.abort();
                engine.showNotification(engine.icons.error, engine.language.OV_FL_ERROR, engine.language.fileSizeError);
            }
        };
        xhr.onload = function () {
            cb(xhr.response);
        };
        xhr.onerror = function () {
            if (xhr.status === 0) {
                engine.showNotification(engine.icons.error, xhr.status, engine.language.unexpectedError);
            } else {
                engine.showNotification(engine.icons.error, xhr.status, xhr.statusText);
            }
        };
        xhr.send();
    },
    sendFile: function(url, folder, label, referer) {
        var isUrl;
        if (isUrl = typeof url === "string") {
            if (url.substr(0, 7).toLowerCase() !== 'magnet:') {
                engine.downloadFile(url, function (file) {
                    if (url.substr(0,5).toLowerCase() === 'blob:') {
                        window.URL.revokeObjectURL(url);
                    }
                    engine.sendFile(file, folder, label, referer);
                }, referer);
                return;
            }
        }
        var args = {
            method: 'torrent-add',
            arguments: {}
        };
        if (isUrl) {
            args.arguments.filename = url;
        } else {
            args.arguments.metainfo = url;
        }
        if (folder) {
            args.arguments['download-dir'] = folder.path;
        }
        var onRequestReady = function() {
            engine.sendAction(args, function(data) {
                if (data.result && data.result !== 'success') {
                    engine.showNotification(engine.icons.error, engine.language.OV_FL_ERROR, data.result);
                    return;
                }

                if (data.arguments['torrent-added']) {
                    var name = data.arguments['torrent-added'].name;
                    if (engine.settings.selectDownloadCategoryOnAddItemFromContextMenu) {
                        mono.storage.set({selectedLabel: {label: 'DL', custom: 1}});
                    }
                    engine.showNotification(engine.icons.add, name, engine.language.torrentAdded);
                } else
                if (data.arguments['torrent-duplicate']) {
                    var name = data.arguments['torrent-duplicate'].name;
                    engine.showNotification(engine.icons.error, name, engine.language.torrentFileIsExists);
                }

                engine.updateTrackerList();
            });
        };
        if (args.arguments.filename !== undefined) {
            return onRequestReady();
        }
        var reader = new window.FileReader();
        reader.readAsDataURL(args.arguments.metainfo);
        reader.onloadend = function() {
            var fileDataPos = reader.result.indexOf(',');
            args.arguments.metainfo = reader.result.substr(fileDataPos + 1);
            onRequestReady();
        }
    },
    onCtxMenuCall: function (e) {
        /**
         * @namespace e.linkUrl
         * @namespace e.menuItemId
         */
        var link = e.linkUrl;
        var id = e.menuItemId;
        var updateMenu = false;
        var contextMenu = engine.createFolderCtxMenu.contextMenu;
        var defaultItem = contextMenu[0] ? contextMenu[0] : ['0', '', ''];
        if (id === 'newFolder') {
            var path = window.prompt(engine.language.enterNewDirPath, defaultItem[1]);
            if (!path) {
                return;
            }
            var download_dir = defaultItem[0];
            id = -1;
            for (var i = 0, item; item = contextMenu[i]; i++) {
                if (item[1] === path && item[0] === download_dir) {
                    id = i;
                    break;
                }
            }
            if (id === -1) {
                id = contextMenu.length;
                contextMenu.push([download_dir, path, '']);
                engine.varCache.folderList.push([download_dir, path, '']);
                updateMenu = true;
            }
        }
        if (id === 'main' || id === 'default') {
            return engine.sendFile(link, undefined, undefined, e.referer);
        }
        var dir, label;
        var item = contextMenu[id];
        if (typeof item === 'string') {
            label = item;
        } else {
            dir = {download_dir: item[0], path: item[1]};
        }
        if (updateMenu) {
            mono.storage.set({
                folderList: engine.varCache.folderList
            }, function() {
                engine.createFolderCtxMenu();
            });
        }
        engine.sendFile(link, dir, label, e.referer);
    },
    listToTreeList: function(contextMenu) {
        var tmp_folders_array = [];
        var tree = {};
        var sepType;
        var treeLen = 0;
        for (var i = 0, item; item = contextMenu[i]; i++) {
            var path = item[1];
            if (sepType === undefined) {
                sepType = path.indexOf('/') === -1 ? path.indexOf('\\') === -1 ? undefined : '\\' : '/';
            } else {
                if (sepType === '\\') {
                    item[1] = path.replace(/\//g, '\\');
                } else {
                    item[1] = path.replace(/\\/g, '/');
                }
            }
        }
        if (sepType === undefined) {
            sepType = '';
        }
        for (var i = 0, item; item = contextMenu[i]; i++) {
            var _disk = item[0];
            var path = item[1];
            if (!path) {
                continue;
            }

            var dblSep = sepType+sepType;
            var splitedPath = [];
            if (path.search(/[a-zA-Z]{1}:(\/\/|\\\\)/) === 0) {
                var disk = path.split(':'+dblSep);
                if (disk.length === 2) {
                    disk[0] += ':'+dblSep;
                    splitedPath.push(disk[0]);
                    path = disk[1];
                }
            }

            var pathList;
            if (sepType.length !== 0) {
                pathList = path.split(sepType);
            } else {
                pathList = [path];
            }

            splitedPath = splitedPath.concat(pathList);

            if (splitedPath[0] === '') {
                splitedPath.shift();
                splitedPath[0] = sepType + splitedPath[0];
            }

            if (splitedPath.slice(-1)[0] === '') {
                splitedPath.splice(-1);
            }

            var lastDir = undefined;
            var folderPath = undefined;
            for (var m = 0, len = splitedPath.length; m < len; m++) {
                var cPath = (lastDir !== undefined)?lastDir:tree;
                var jPath = splitedPath[m];
                if (folderPath === undefined) {
                    folderPath = jPath;
                } else {
                    if (m === 1 && folderPath.slice(-3) === ':'+dblSep) {
                        folderPath += jPath;
                    } else {
                        folderPath += sepType + jPath;
                    }
                }

                lastDir = cPath[ jPath ];
                if (lastDir === undefined) {
                    if (cPath === tree) {
                        treeLen++;
                    }
                    lastDir = cPath[ jPath ] = {
                        arrayIndex: tmp_folders_array.length,
                        currentPath: jPath
                    };
                    tmp_folders_array.push([ _disk , folderPath ]);
                }
            }
            if (lastDir) {
                lastDir.end = true;
            }
        }

        var smartTree = [];

        var createSubMenu = function(parentId, itemList) {
            var childList = [];
            for (var subPath in itemList) {
                var item = itemList[subPath];
                if (item.currentPath !== undefined) {
                    childList.push(item);
                }
            }
            var childListLen = childList.length;
            if (childListLen === 1 && itemList.end === undefined) {
                var cPath = itemList.currentPath;
                if (itemList.currentPath.slice(-1) !== sepType) {
                    cPath += sepType;
                }
                childList[0].currentPath = cPath + childList[0].currentPath;
                createSubMenu(parentId, childList[0]);
                return;
            }
            var hasChild = childListLen !== 0;
            var id = (hasChild) ? 'p'+String(itemList.arrayIndex) : String(itemList.arrayIndex);
            if (itemList.currentPath) {
                smartTree.push({
                    id: id,
                    parentId: parentId,
                    title: itemList.currentPath
                });
                if (hasChild) {
                    smartTree.push({
                        id: id.substr(1),
                        parentId: id,
                        title: engine.language.currentDirectory
                    });
                }
            }
            childList.forEach(function(item) {
                createSubMenu(id, item);
            });
        };

        for (var item in tree) {
            createSubMenu('main', tree[item]);
        }

        return {tree: smartTree, list: tmp_folders_array};
    },
    createFolderCtxMenu: function() {
        var moduleFunc = function() {
            var contentScript = (function() {
                var onClick = function() {
                    self.on("click", function(node) {
                        var href = node.href;
                        if (!href) {
                            return self.postMessage({error: -1});
                        }
                        if (href.substr(0, 7).toLowerCase() === 'magnet:') {
                            return self.postMessage({href: href});
                        }
                        self.postMessage({href: href, referer: window.location.href});
                    });
                };
                var minifi = function(str) {
                    var list = str.split('\n');
                    var newList = [];
                    list.forEach(function(line) {
                        newList.push(line.trim());
                    });
                    return newList.join('');
                };
                var onClickString = onClick.toString();
                var n_pos =  onClickString.indexOf('\n')+1;
                onClickString = onClickString.substr(n_pos, onClickString.length - 1 - n_pos).trim();
                return minifi(onClickString);
            })();

            var topLevel = undefined;

            var readData = function(data, cb) {
                if (typeof data !== 'object' || data.error === -1) {
                    return engine.showNotification(engine.icons.error, engine.language.OV_FL_ERROR, engine.language.unexpectedError);
                }
                if (data.href) {
                    return cb(data.href, data.referer);
                }
            };

            var createSingleTopMenu = function(self, cm) {
                return topLevel = cm.Item({
                    label: engine.language.addInTorrentClient,
                    context: cm.SelectorContext("a"),
                    image: self.data.url('./icons/icon-16.png'),
                    contentScript: contentScript,
                    onMessage: function (data) {
                        readData(data, function(href, referer) {
                            engine.sendFile(href, undefined, undefined, referer);
                        });
                    }
                });
            };

            var onSubMenuMessage = function(data) {
                var _this = this;
                readData(data, function(href, referer) {
                    engine.onCtxMenuCall({
                        linkUrl: href,
                        menuItemId: _this.data,
                        referer: referer
                    });
                });
            };

            var createTreeItems = function(cm, parentId, itemList) {
                var menuItemList = [];
                for (var i = 0, item; item = itemList[i]; i++) {
                    if (item.parentId !== parentId) {
                        continue;
                    }
                    var itemOpt = { label: item.title, context: cm.SelectorContext("a") };
                    var subItems = createTreeItems(cm, item.id, itemList );
                    if (subItems.length !== 0) {
                        itemOpt.items = subItems;
                        menuItemList.push(cm.Menu(itemOpt));
                    } else {
                        itemOpt.onMessage = onSubMenuMessage;
                        itemOpt.contentScript = contentScript;
                        itemOpt.data = item.id;
                        menuItemList.push(cm.Item(itemOpt));
                    }
                }
                return menuItemList;
            };

            (function() {
                var self = require('sdk/self');
                var cm = require("sdk/context-menu");

                try {
                    topLevel && topLevel.parentMenu && topLevel.parentMenu.removeItem(topLevel);
                } catch (e) {}
                topLevel = undefined;

                var contextMenu = engine.createFolderCtxMenu.contextMenu = [];

                var folderList = engine.varCache.folderList;

                var items = [];

                Array.prototype.push.apply(contextMenu, folderList);
                if (folderList.length > 0) {
                    if (engine.settings.treeViewContextMenu) {
                        var treeList = engine.listToTreeList(folderList.slice(0));
                        Array.prototype.push.apply(items, createTreeItems(cm, 'main', treeList.tree));
                        contextMenu.splice(0);
                        Array.prototype.push.apply(contextMenu, treeList.list);
                    } else {
                        for (var i = 0, item; item = folderList[i]; i++) {
                            items.push(cm.Item({
                                label: item[2] || item[1],
                                data: String(i),
                                context: cm.SelectorContext("a"),
                                onMessage: onSubMenuMessage,
                                contentScript: contentScript
                            }));
                        }
                    }
                }
                if (engine.settings.showDefaultFolderContextMenuItem) {
                    items.push(cm.Item({
                        label: engine.language.defaultPath,
                        data: 'default',
                        context: cm.SelectorContext("a"),
                        onMessage: onSubMenuMessage,
                        contentScript: contentScript
                    }));
                }
                if (folderList.length > 0 || engine.settings.showDefaultFolderContextMenuItem) {
                    items.push(cm.Item({
                        label: engine.language.add+'...',
                        data: 'newFolder',
                        context: cm.SelectorContext("a"),
                        onMessage: onSubMenuMessage,
                        contentScript: contentScript
                    }));
                }
                if (items.length === 0) {
                    return createSingleTopMenu(self, cm);
                }
                topLevel = cm.Menu({
                    label: engine.language.addInTorrentClient,
                    context: cm.SelectorContext("a"),
                    image: self.data.url('./icons/icon-16.png'),
                    items: items
                });
            })();
        };

        var chromeFunc = function() {
            chrome.contextMenus.removeAll(function () {
                var contextMenu = engine.createFolderCtxMenu.contextMenu = [];

                var folderList = engine.varCache.folderList;

                chrome.contextMenus.create({
                    id: 'main',
                    title: engine.language.addInTorrentClient,
                    contexts: ["link"],
                    onclick: engine.onCtxMenuCall
                }, function () {
                    Array.prototype.push.apply(contextMenu, folderList);
                    if (folderList.length > 0) {
                        if (engine.settings.treeViewContextMenu) {
                            var treeList = engine.listToTreeList(folderList.slice(0));
                            for (var i = 0, item; item = treeList.tree[i]; i++) {
                                chrome.contextMenus.create({
                                    id: item.id,
                                    parentId: item.parentId,
                                    title: item.title,
                                    contexts: ["link"],
                                    onclick: engine.onCtxMenuCall
                                });
                            }
                            contextMenu.splice(0);
                            Array.prototype.push.apply(contextMenu, treeList.list);
                        } else {
                            for (var i = 0, item; item = folderList[i]; i++) {
                                chrome.contextMenus.create({
                                    id: String(i),
                                    parentId: 'main',
                                    title: item[2] || item[1],
                                    contexts: ["link"],
                                    onclick: engine.onCtxMenuCall
                                });
                            }
                        }
                    }
                    if (engine.settings.showDefaultFolderContextMenuItem) {
                        chrome.contextMenus.create({
                            id: 'default',
                            parentId: 'main',
                            title: engine.language.defaultPath,
                            contexts: ["link"],
                            onclick: engine.onCtxMenuCall
                        });
                    }
                    if (folderList.length > 0 || engine.settings.showDefaultFolderContextMenuItem) {
                        chrome.contextMenus.create({
                            id: 'newFolder',
                            parentId: 'main',
                            title: engine.language.add+'...',
                            contexts: ["link"],
                            onclick: engine.onCtxMenuCall
                        });
                    }
                });
            });
        };

        if (mono.isModule) {
            return moduleFunc.apply(this, arguments);
        }

        if (mono.isChrome) {
            return chromeFunc.apply(this, arguments);
        }
    },
    run: function() {
        engine.loadSettings(function() {
            engine.getLanguage(function() {
                engine.varCache.isReady = 1;

                var msg;
                while ( msg = engine.varCache.msgStack.shift() ) {
                    engine.onMessage.apply(engine, msg);
                }

                engine.updateTrackerList();

                engine.timer.start();

                engine.createFolderCtxMenu();
            });
        });
    },
    onMessage: function(msgList, response) {
        if (engine.varCache.isReady !== 1) {
            return engine.varCache.msgStack.push([msgList, response]);
        }
        if (Array.isArray(msgList)) {
            var c_wait = msgList.length;
            var c_ready = 0;
            var resultList = {};
            var ready = function(key, data) {
                c_ready++;
                resultList[key] = data;
                if (c_wait === c_ready) {
                    response(resultList);
                }
            };
            msgList.forEach(function(message) {
                var fn = engine.actionList[message.action];
                fn && fn(message, function(response) {
                    ready(message.action, response);
                });
            });
            return;
        }
        var fn = engine.actionList[msgList.action];
        fn && fn(msgList, response);
    },
    storageCache: {},
    hookList: {
        getTorrentList: function(data, response) {
            var request = engine.api.getTorrentListRequest;
            if (data.cid) {
                request = mono.cloneObj(request);
                request.arguments.ids = 'recently-active';
            }
            engine.sendAction(request, function(data) {
                if (data.result !== 'success') {
                    return;
                }
                response(data.ut);
            });
        }
    },
    actionList: {
        getLanguage: function(message, response) {
            response(engine.language);
        },
        getSettings: function(message, response) {
            response(engine.settings);
        },
        getDefaultSettings: function(message, response) {
            response(engine.defaultSettings);
        },
        getTrColumnArray: function(message, response) {
            response(engine.torrentListColumnList);
        },
        getFlColumnArray: function(message, response) {
            response(engine.fileListColumnList);
        },
        getRemoteTorrentList: function(message, response) {
            response(engine.varCache.torrents);
        },
        getRemoteSettings: function(message, response) {
            response(engine.varCache.settings);
        },
        getPublicStatus: function(message, responose) {
            responose(engine.varCache.lastPublicStatus);
        },
        api: function(message, response) {
            var hook = engine.hookList[message.data.action];
            if (hook !== undefined) {
                return hook(message.data, response);
            }
            engine.sendAction(message.data, response);
        },
        sessionSet: function(message, response) {
            engine.sendAction(message.data, function(data) {
                if (data.result === 'success') {
                    for (var key in message.data.arguments) {
                        engine.varCache.settings[key] = message.data.arguments[key];
                    }
                }
                response(data);
            });
        },
        setTrColumnArray: function(message, response) {
            engine.torrentListColumnList = message.data;
            mono.storage.set({torrentListColumnList: message.data}, response);
        },
        setFlColumnArray: function(message, response) {
            engine.fileListColumnList = message.data;
            mono.storage.set({fileListColumnList: message.data}, response);
        },
        onSendFile: function(message, response) {
            if (message.base64) {
                var b64Data = message.base64;
                var type = message.type;
                delete message.base64;
                delete message.type;

                message.url = mono.base64ToUrl(b64Data, type);
            }

            engine.sendFile(message.url, message.folder, message.label);
        },
        getTraffic: function(message, response) {
            response({trafficList: engine.varCache.trafficList, startTime: engine.varCache.startTime});
        },
        checkSettings: function(message, response) {
            engine.loadSettings(function() {
                engine.getLanguage(function () {
                    engine.sendAction(engine.api.getTorrentListRequest, function(data) {
                        if (data.result !== 'success') {
                            return response({error: data.result});
                        }
                        response({});
                    }, function(statusObj) {
                        response({error: statusObj});
                    });
                });
            });
        },
        reloadSettings: function(message, response) {
            engine.loadSettings(function() {
                engine.getLanguage(function () {
                    engine.createFolderCtxMenu();
                    if (!engine.settings.displayActiveTorrentCountIcon
                        && engine.varCache.activeCount > 0) {
                        engine.varCache.activeCount = 0;
                        engine.setBadgeText('');
                    }
                    response();
                });
            });
        },
        managerIsOpen: function(message, response) {
            mono.msgClean();
            if (engine.timer.state !== 1) {
                engine.timer.start();
            }
            response();
        },
        getFileList: function(message, response) {
            engine.api.getFileListRequest.arguments.ids = [parseInt(message.hash.substr(4))];
            engine.sendAction(engine.api.getFileListRequest, function(data) {
                if (data.result !== 'success') {
                    return;
                }
                response(data.ut);
            });
        },
        changeBadgeColor: function(message) {
            engine.settings.badgeColor = message.color;
            engine.setBadgeText(engine.setBadgeText.lastText || '0');
        },
        copy: function() {
            "use strict";
            var moduleFunc = function(message) {
                var clipboard = require("sdk/clipboard");
                clipboard.set(message.text);
            };

            var chromeFunc = function(message) {
                var textArea = document.createElement('textarea');
                textArea.textContent = message.text;
                document.body.appendChild(textArea);
                textArea.select();
                setTimeout(function() {
                    document.execCommand("copy", false, null);
                    textArea.parentNode.removeChild(textArea);
                });
            };

            if (mono.isModule) {
                return moduleFunc.apply(this, arguments);
            }

            if (mono.isChrome) {
                return chromeFunc.apply(this, arguments);
            }
        }
    },
    init: function() {
        engine.setBadgeText.lastText = '';

        if (mono.isModule) {
            engine.ajax.xhr = require('sdk/net/xhr').XMLHttpRequest;
        } else {
            engine.ajax.xhr = XMLHttpRequest;
        }

        if (mono.isChrome) {
            chrome.browserAction.setBadgeText({
                text: ''
            });
        }

        engine.varCache.msgStack = [];

        mono.onMessage(engine.onMessage);

        engine.run();
    }
};

mono.isModule && (function(origFunc){
    engine.init = function(addon, button) {
        mono = mono.init(addon);

        mono.rgba2hex = function(r, g, b, a) {
            if (a > 1) {
                a = a / 100;
            }
            a = parseFloat(a);
            r = parseInt(r * a);
            g = parseInt(g * a);
            b = parseInt(b * a);

            var componentToHex = function(c) {
                var hex = c.toString(16);
                return hex.length == 1 ? "0" + hex : hex;
            };

            return "#" + componentToHex(r) + componentToHex(g) + componentToHex(b);
        };

        mono.base64ToUrl = function(b64Data, contentType) {
            "use strict";
            var sliceSize = 256;
            contentType = contentType || '';
            var byteCharacters = window.atob(b64Data);

            var byteCharacters_len = byteCharacters.length;
            var byteArrays = new Array(Math.ceil(byteCharacters_len / sliceSize));
            var n = 0;
            for (var offset = 0; offset < byteCharacters_len; offset += sliceSize) {
                var slice = byteCharacters.slice(offset, offset + sliceSize);
                var slice_len = slice.length;
                var byteNumbers = new Array(slice_len);
                for (var i = 0; i < slice_len; i++) {
                    byteNumbers[i] = slice.charCodeAt(i) & 0xff;
                }

                byteArrays[n] = new Uint8Array(byteNumbers);
                n++;
            }

            var blob = new window.Blob(byteArrays, {type: contentType});

            var blobUrl = window.URL.createObjectURL(blob);

            return blobUrl;
        };

        mono.ffButton = button;

        var sdkTimers = require("sdk/timers");
        engine.timer.setInterval = sdkTimers.setInterval;
        engine.timer.clearInterval = sdkTimers.clearInterval;

        var self = require('sdk/self');
        engine.icons.complete = self.data.url(engine.icons.complete);
        engine.icons.add = self.data.url(engine.icons.add);
        engine.icons.error = self.data.url(engine.icons.error);

        origFunc();
    };
})(engine.init.bind(engine));

if (mono.isModule) {
    exports.init = engine.init;
} else
mono.onReady(function() {
    engine.init();
});
