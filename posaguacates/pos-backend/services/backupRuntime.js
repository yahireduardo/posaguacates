const db = require('../db/conexion');
const { InstanceControlService } = require('./instanceControlService');
const { AuditService } = require('./auditService');
const { BackupService } = require('./backupService');
const { RestoreService } = require('./restoreService');

const instanceControl = new InstanceControlService({ db: db.promise });
const audit = new AuditService({ db: db.promise, instanceControl });
const backupService = new BackupService({ db: db.promise, instanceControl, audit });
const restoreService = new RestoreService({ db: db.promise, backupService, instanceControl, audit });

module.exports = { instanceControl, audit, backupService, restoreService };
