BEGIN TRY

BEGIN TRAN;

ALTER TABLE [dbo].[User] ADD [authProvider] NVARCHAR(20) NOT NULL CONSTRAINT [User_authProvider_df] DEFAULT 'LOCAL';
ALTER TABLE [dbo].[User] ADD [externalUsername] NVARCHAR(160);
ALTER TABLE [dbo].[User] ADD [externalId] NVARCHAR(160);
ALTER TABLE [dbo].[User] ADD [lastLoginAt] DATETIME2;
ALTER TABLE [dbo].[User] ALTER COLUMN [passwordHash] NVARCHAR(255) NULL;

EXEC(N'CREATE INDEX [User_externalId_idx] ON [dbo].[User]([externalId])');
EXEC(N'CREATE UNIQUE NONCLUSTERED INDEX [User_externalId_not_null_key] ON [dbo].[User]([externalId]) WHERE [externalId] IS NOT NULL');

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
