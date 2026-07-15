BEGIN TRY

BEGIN TRAN;

IF OBJECT_ID(N'[dbo].[PurchaseRequestCategory]', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[PurchaseRequestCategory] (
        [id] NVARCHAR(30) NOT NULL,
        [code] NVARCHAR(60) NOT NULL,
        [name] NVARCHAR(160) NOT NULL,
        [description] NVARCHAR(500),
        [sortOrder] INT NOT NULL CONSTRAINT [PurchaseRequestCategory_sortOrder_df] DEFAULT 0,
        [isActive] BIT NOT NULL CONSTRAINT [PurchaseRequestCategory_isActive_df] DEFAULT 1,
        [createdAt] DATETIME2 NOT NULL CONSTRAINT [PurchaseRequestCategory_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
        [updatedAt] DATETIME2 NOT NULL,
        CONSTRAINT [PurchaseRequestCategory_pkey] PRIMARY KEY CLUSTERED ([id]),
        CONSTRAINT [PurchaseRequestCategory_code_key] UNIQUE NONCLUSTERED ([code])
    );
END;

IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE [name] = N'PurchaseRequestCategory_isActive_sortOrder_name_idx'
      AND [object_id] = OBJECT_ID(N'dbo.PurchaseRequestCategory')
)
BEGIN
    CREATE NONCLUSTERED INDEX [PurchaseRequestCategory_isActive_sortOrder_name_idx]
    ON [dbo].[PurchaseRequestCategory]([isActive], [sortOrder], [name]);
END;

IF COL_LENGTH(N'dbo.PurchaseRequest', N'categoryId') IS NULL
BEGIN
    ALTER TABLE [dbo].[PurchaseRequest]
    ADD [categoryId] NVARCHAR(30);
END;

IF NOT EXISTS (
    SELECT 1
    FROM sys.foreign_keys
    WHERE [name] = N'PurchaseRequest_categoryId_fkey'
      AND [parent_object_id] = OBJECT_ID(N'dbo.PurchaseRequest')
)
BEGIN
    ALTER TABLE [dbo].[PurchaseRequest]
    ADD CONSTRAINT [PurchaseRequest_categoryId_fkey]
    FOREIGN KEY ([categoryId]) REFERENCES [dbo].[PurchaseRequestCategory]([id])
    ON DELETE NO ACTION ON UPDATE NO ACTION;
END;

IF NOT EXISTS (SELECT 1 FROM [dbo].[PurchaseRequestCategory] WHERE [code] = N'HARDWARE')
BEGIN
    INSERT INTO [dbo].[PurchaseRequestCategory]
        ([id], [code], [name], [description], [sortOrder], [isActive], [createdAt], [updatedAt])
    VALUES
        (N'cat_hardware', N'HARDWARE', N'Hardware & Equipment', NULL, 10, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
END;

IF NOT EXISTS (SELECT 1 FROM [dbo].[PurchaseRequestCategory] WHERE [code] = N'SOFTWARE_LICENSE')
BEGIN
    INSERT INTO [dbo].[PurchaseRequestCategory]
        ([id], [code], [name], [description], [sortOrder], [isActive], [createdAt], [updatedAt])
    VALUES
        (N'cat_software_license', N'SOFTWARE_LICENSE', N'Software & Licenses', NULL, 20, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
END;

IF NOT EXISTS (SELECT 1 FROM [dbo].[PurchaseRequestCategory] WHERE [code] = N'SUBSCRIPTION_RENEWAL')
BEGIN
    INSERT INTO [dbo].[PurchaseRequestCategory]
        ([id], [code], [name], [description], [sortOrder], [isActive], [createdAt], [updatedAt])
    VALUES
        (N'cat_subscription_renewal', N'SUBSCRIPTION_RENEWAL', N'Subscription & Renewal', NULL, 30, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
END;

IF NOT EXISTS (SELECT 1 FROM [dbo].[PurchaseRequestCategory] WHERE [code] = N'SERVICE_MAINTENANCE')
BEGIN
    INSERT INTO [dbo].[PurchaseRequestCategory]
        ([id], [code], [name], [description], [sortOrder], [isActive], [createdAt], [updatedAt])
    VALUES
        (N'cat_service_maintenance', N'SERVICE_MAINTENANCE', N'Service & Maintenance', NULL, 40, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
END;

IF NOT EXISTS (SELECT 1 FROM [dbo].[PurchaseRequestCategory] WHERE [code] = N'NETWORK_INFRASTRUCTURE')
BEGIN
    INSERT INTO [dbo].[PurchaseRequestCategory]
        ([id], [code], [name], [description], [sortOrder], [isActive], [createdAt], [updatedAt])
    VALUES
        (N'cat_network_infra', N'NETWORK_INFRASTRUCTURE', N'Network & Infrastructure', NULL, 50, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
END;

IF NOT EXISTS (SELECT 1 FROM [dbo].[PurchaseRequestCategory] WHERE [code] = N'CLOUD_HOSTING')
BEGIN
    INSERT INTO [dbo].[PurchaseRequestCategory]
        ([id], [code], [name], [description], [sortOrder], [isActive], [createdAt], [updatedAt])
    VALUES
        (N'cat_cloud_hosting', N'CLOUD_HOSTING', N'Cloud & Hosting', NULL, 60, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
END;

IF NOT EXISTS (SELECT 1 FROM [dbo].[PurchaseRequestCategory] WHERE [code] = N'OTHER')
BEGIN
    INSERT INTO [dbo].[PurchaseRequestCategory]
        ([id], [code], [name], [description], [sortOrder], [isActive], [createdAt], [updatedAt])
    VALUES
        (N'cat_other', N'OTHER', N'Other', NULL, 70, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
END;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
