BEGIN TRY

BEGIN TRAN;

IF OBJECT_ID(N'[dbo].[RecurringPurchaseRequestSchedule]', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[RecurringPurchaseRequestSchedule] (
        [id] NVARCHAR(30) NOT NULL,
        [name] NVARCHAR(160) NOT NULL,
        [sourcePurchaseRequestId] NVARCHAR(30),
        [companyId] NVARCHAR(30) NOT NULL,
        [branchId] NVARCHAR(30) NOT NULL,
        [departmentId] NVARCHAR(30) NOT NULL,
        [divisionId] NVARCHAR(30),
        [categoryId] NVARCHAR(30) NOT NULL,
        [purpose] NVARCHAR(120) NOT NULL,
        [purchaseMethod] NVARCHAR(120) NOT NULL,
        [remark] NVARCHAR(1000),
        [vatRate] DECIMAL(5,2) NOT NULL CONSTRAINT [RecurringPurchaseRequestSchedule_vatRate_df] DEFAULT 7,
        [renewalMonth] INT NOT NULL,
        [renewalDay] INT NOT NULL,
        [leadDays] INT NOT NULL CONSTRAINT [RecurringPurchaseRequestSchedule_leadDays_df] DEFAULT 30,
        [responsibleUserId] NVARCHAR(30) NOT NULL,
        [createdById] NVARCHAR(30) NOT NULL,
        [status] NVARCHAR(20) NOT NULL CONSTRAINT [RecurringPurchaseRequestSchedule_status_df] DEFAULT 'ACTIVE',
        [nextRunDate] DATETIME2 NOT NULL,
        [lastRunAt] DATETIME2,
        [createdAt] DATETIME2 NOT NULL CONSTRAINT [RecurringPurchaseRequestSchedule_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
        [updatedAt] DATETIME2 NOT NULL,
        CONSTRAINT [RecurringPurchaseRequestSchedule_pkey] PRIMARY KEY CLUSTERED ([id])
    );
END;

IF OBJECT_ID(N'[dbo].[RecurringPurchaseRequestScheduleItem]', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[RecurringPurchaseRequestScheduleItem] (
        [id] NVARCHAR(30) NOT NULL,
        [scheduleId] NVARCHAR(30) NOT NULL,
        [lineNo] INT NOT NULL,
        [rowType] NVARCHAR(20) NOT NULL CONSTRAINT [RecurringPurchaseRequestScheduleItem_rowType_df] DEFAULT 'ITEM',
        [accountCode] NVARCHAR(80) NOT NULL,
        [description] NVARCHAR(500) NOT NULL,
        [quantity] DECIMAL(18,4) NOT NULL,
        [unitCost] DECIMAL(18,2) NOT NULL,
        [totalAmount] DECIMAL(18,2) NOT NULL,
        CONSTRAINT [RecurringPurchaseRequestScheduleItem_pkey] PRIMARY KEY CLUSTERED ([id]),
        CONSTRAINT [RecurringPurchaseRequestScheduleItem_scheduleId_lineNo_key] UNIQUE NONCLUSTERED ([scheduleId], [lineNo])
    );
END;

IF OBJECT_ID(N'[dbo].[RecurringPurchaseRequestRun]', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[RecurringPurchaseRequestRun] (
        [id] NVARCHAR(30) NOT NULL,
        [scheduleId] NVARCHAR(30) NOT NULL,
        [occurrenceYear] INT NOT NULL,
        [renewalDate] DATETIME2 NOT NULL,
        [scheduledDraftDate] DATETIME2 NOT NULL,
        [status] NVARCHAR(20) NOT NULL CONSTRAINT [RecurringPurchaseRequestRun_status_df] DEFAULT 'PROCESSING',
        [purchaseRequestId] NVARCHAR(30),
        [errorMessage] NVARCHAR(1000),
        [startedAt] DATETIME2 NOT NULL CONSTRAINT [RecurringPurchaseRequestRun_startedAt_df] DEFAULT CURRENT_TIMESTAMP,
        [finishedAt] DATETIME2,
        CONSTRAINT [RecurringPurchaseRequestRun_pkey] PRIMARY KEY CLUSTERED ([id]),
        CONSTRAINT [RecurringPurchaseRequestRun_scheduleId_occurrenceYear_key] UNIQUE NONCLUSTERED ([scheduleId], [occurrenceYear])
    );
END;

IF NOT EXISTS (
    SELECT 1 FROM sys.check_constraints
    WHERE [name] = N'RecurringSchedule_status_check'
      AND [parent_object_id] = OBJECT_ID(N'dbo.RecurringPurchaseRequestSchedule')
)
BEGIN
    ALTER TABLE [dbo].[RecurringPurchaseRequestSchedule]
    ADD CONSTRAINT [RecurringSchedule_status_check]
    CHECK ([status] IN (N'ACTIVE', N'PAUSED'));
END;

IF NOT EXISTS (
    SELECT 1 FROM sys.check_constraints
    WHERE [name] = N'RecurringSchedule_renewalMonth_check'
      AND [parent_object_id] = OBJECT_ID(N'dbo.RecurringPurchaseRequestSchedule')
)
BEGIN
    ALTER TABLE [dbo].[RecurringPurchaseRequestSchedule]
    ADD CONSTRAINT [RecurringSchedule_renewalMonth_check]
    CHECK ([renewalMonth] BETWEEN 1 AND 12);
END;

IF NOT EXISTS (
    SELECT 1 FROM sys.check_constraints
    WHERE [name] = N'RecurringSchedule_renewalDay_check'
      AND [parent_object_id] = OBJECT_ID(N'dbo.RecurringPurchaseRequestSchedule')
)
BEGIN
    ALTER TABLE [dbo].[RecurringPurchaseRequestSchedule]
    ADD CONSTRAINT [RecurringSchedule_renewalDay_check]
    CHECK ([renewalDay] BETWEEN 1 AND 31);
END;

IF NOT EXISTS (
    SELECT 1 FROM sys.check_constraints
    WHERE [name] = N'RecurringSchedule_leadDays_check'
      AND [parent_object_id] = OBJECT_ID(N'dbo.RecurringPurchaseRequestSchedule')
)
BEGIN
    ALTER TABLE [dbo].[RecurringPurchaseRequestSchedule]
    ADD CONSTRAINT [RecurringSchedule_leadDays_check]
    CHECK ([leadDays] BETWEEN 1 AND 365);
END;

IF NOT EXISTS (
    SELECT 1 FROM sys.check_constraints
    WHERE [name] = N'RecurringScheduleItem_rowType_check'
      AND [parent_object_id] = OBJECT_ID(N'dbo.RecurringPurchaseRequestScheduleItem')
)
BEGIN
    ALTER TABLE [dbo].[RecurringPurchaseRequestScheduleItem]
    ADD CONSTRAINT [RecurringScheduleItem_rowType_check]
    CHECK ([rowType] IN (N'ITEM', N'HEADING', N'DETAIL'));
END;

IF NOT EXISTS (
    SELECT 1 FROM sys.check_constraints
    WHERE [name] = N'RecurringPurchaseRequestRun_status_check'
      AND [parent_object_id] = OBJECT_ID(N'dbo.RecurringPurchaseRequestRun')
)
BEGIN
    ALTER TABLE [dbo].[RecurringPurchaseRequestRun]
    ADD CONSTRAINT [RecurringPurchaseRequestRun_status_check]
    CHECK ([status] IN (N'PROCESSING', N'SUCCEEDED', N'FAILED'));
END;

IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE [name] = N'RecurringPurchaseRequestSchedule_status_nextRunDate_idx'
      AND [object_id] = OBJECT_ID(N'dbo.RecurringPurchaseRequestSchedule')
)
BEGIN
    CREATE NONCLUSTERED INDEX [RecurringPurchaseRequestSchedule_status_nextRunDate_idx]
    ON [dbo].[RecurringPurchaseRequestSchedule]([status], [nextRunDate]);
END;

IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE [name] = N'RecurringPurchaseRequestSchedule_responsibleUserId_idx'
      AND [object_id] = OBJECT_ID(N'dbo.RecurringPurchaseRequestSchedule')
)
BEGIN
    CREATE NONCLUSTERED INDEX [RecurringPurchaseRequestSchedule_responsibleUserId_idx]
    ON [dbo].[RecurringPurchaseRequestSchedule]([responsibleUserId]);
END;

IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE [name] = N'RecurringPurchaseRequestRun_purchaseRequestId_key'
      AND [object_id] = OBJECT_ID(N'dbo.RecurringPurchaseRequestRun')
)
BEGIN
    CREATE UNIQUE NONCLUSTERED INDEX [RecurringPurchaseRequestRun_purchaseRequestId_key]
    ON [dbo].[RecurringPurchaseRequestRun]([purchaseRequestId])
    WHERE [purchaseRequestId] IS NOT NULL;
END;

IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE [name] = N'RecurringPurchaseRequestRun_status_startedAt_idx'
      AND [object_id] = OBJECT_ID(N'dbo.RecurringPurchaseRequestRun')
)
BEGIN
    CREATE NONCLUSTERED INDEX [RecurringPurchaseRequestRun_status_startedAt_idx]
    ON [dbo].[RecurringPurchaseRequestRun]([status], [startedAt]);
END;

IF NOT EXISTS (
    SELECT 1 FROM sys.foreign_keys
    WHERE [name] = N'RecurringPurchaseRequestSchedule_sourcePurchaseRequestId_fkey'
      AND [parent_object_id] = OBJECT_ID(N'dbo.RecurringPurchaseRequestSchedule')
)
BEGIN
    ALTER TABLE [dbo].[RecurringPurchaseRequestSchedule]
    ADD CONSTRAINT [RecurringPurchaseRequestSchedule_sourcePurchaseRequestId_fkey]
    FOREIGN KEY ([sourcePurchaseRequestId]) REFERENCES [dbo].[PurchaseRequest]([id])
    ON DELETE SET NULL ON UPDATE NO ACTION;
END;

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE [name] = N'RecurringPurchaseRequestSchedule_companyId_fkey' AND [parent_object_id] = OBJECT_ID(N'dbo.RecurringPurchaseRequestSchedule'))
BEGIN
    ALTER TABLE [dbo].[RecurringPurchaseRequestSchedule] ADD CONSTRAINT [RecurringPurchaseRequestSchedule_companyId_fkey]
    FOREIGN KEY ([companyId]) REFERENCES [dbo].[Company]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;
END;

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE [name] = N'RecurringPurchaseRequestSchedule_branchId_fkey' AND [parent_object_id] = OBJECT_ID(N'dbo.RecurringPurchaseRequestSchedule'))
BEGIN
    ALTER TABLE [dbo].[RecurringPurchaseRequestSchedule] ADD CONSTRAINT [RecurringPurchaseRequestSchedule_branchId_fkey]
    FOREIGN KEY ([branchId]) REFERENCES [dbo].[Branch]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;
END;

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE [name] = N'RecurringPurchaseRequestSchedule_departmentId_fkey' AND [parent_object_id] = OBJECT_ID(N'dbo.RecurringPurchaseRequestSchedule'))
BEGIN
    ALTER TABLE [dbo].[RecurringPurchaseRequestSchedule] ADD CONSTRAINT [RecurringPurchaseRequestSchedule_departmentId_fkey]
    FOREIGN KEY ([departmentId]) REFERENCES [dbo].[Department]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;
END;

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE [name] = N'RecurringPurchaseRequestSchedule_divisionId_fkey' AND [parent_object_id] = OBJECT_ID(N'dbo.RecurringPurchaseRequestSchedule'))
BEGIN
    ALTER TABLE [dbo].[RecurringPurchaseRequestSchedule] ADD CONSTRAINT [RecurringPurchaseRequestSchedule_divisionId_fkey]
    FOREIGN KEY ([divisionId]) REFERENCES [dbo].[Division]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;
END;

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE [name] = N'RecurringPurchaseRequestSchedule_categoryId_fkey' AND [parent_object_id] = OBJECT_ID(N'dbo.RecurringPurchaseRequestSchedule'))
BEGIN
    ALTER TABLE [dbo].[RecurringPurchaseRequestSchedule] ADD CONSTRAINT [RecurringPurchaseRequestSchedule_categoryId_fkey]
    FOREIGN KEY ([categoryId]) REFERENCES [dbo].[PurchaseRequestCategory]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;
END;

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE [name] = N'RecurringPurchaseRequestSchedule_responsibleUserId_fkey' AND [parent_object_id] = OBJECT_ID(N'dbo.RecurringPurchaseRequestSchedule'))
BEGIN
    ALTER TABLE [dbo].[RecurringPurchaseRequestSchedule] ADD CONSTRAINT [RecurringPurchaseRequestSchedule_responsibleUserId_fkey]
    FOREIGN KEY ([responsibleUserId]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;
END;

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE [name] = N'RecurringPurchaseRequestSchedule_createdById_fkey' AND [parent_object_id] = OBJECT_ID(N'dbo.RecurringPurchaseRequestSchedule'))
BEGIN
    ALTER TABLE [dbo].[RecurringPurchaseRequestSchedule] ADD CONSTRAINT [RecurringPurchaseRequestSchedule_createdById_fkey]
    FOREIGN KEY ([createdById]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;
END;

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE [name] = N'RecurringPurchaseRequestScheduleItem_scheduleId_fkey' AND [parent_object_id] = OBJECT_ID(N'dbo.RecurringPurchaseRequestScheduleItem'))
BEGIN
    ALTER TABLE [dbo].[RecurringPurchaseRequestScheduleItem] ADD CONSTRAINT [RecurringPurchaseRequestScheduleItem_scheduleId_fkey]
    FOREIGN KEY ([scheduleId]) REFERENCES [dbo].[RecurringPurchaseRequestSchedule]([id]) ON DELETE CASCADE ON UPDATE NO ACTION;
END;

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE [name] = N'RecurringPurchaseRequestRun_scheduleId_fkey' AND [parent_object_id] = OBJECT_ID(N'dbo.RecurringPurchaseRequestRun'))
BEGIN
    ALTER TABLE [dbo].[RecurringPurchaseRequestRun] ADD CONSTRAINT [RecurringPurchaseRequestRun_scheduleId_fkey]
    FOREIGN KEY ([scheduleId]) REFERENCES [dbo].[RecurringPurchaseRequestSchedule]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;
END;

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE [name] = N'RecurringPurchaseRequestRun_purchaseRequestId_fkey' AND [parent_object_id] = OBJECT_ID(N'dbo.RecurringPurchaseRequestRun'))
BEGIN
    ALTER TABLE [dbo].[RecurringPurchaseRequestRun] ADD CONSTRAINT [RecurringPurchaseRequestRun_purchaseRequestId_fkey]
    FOREIGN KEY ([purchaseRequestId]) REFERENCES [dbo].[PurchaseRequest]([id]) ON DELETE SET NULL ON UPDATE NO ACTION;
END;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW;

END CATCH
