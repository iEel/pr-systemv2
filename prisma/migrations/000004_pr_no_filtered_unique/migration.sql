BEGIN TRY

BEGIN TRAN;

IF EXISTS (
    SELECT 1
    FROM sys.key_constraints
    WHERE [name] = N'PurchaseRequest_prNo_key'
      AND [parent_object_id] = OBJECT_ID(N'dbo.PurchaseRequest')
)
BEGIN
    ALTER TABLE [dbo].[PurchaseRequest] DROP CONSTRAINT [PurchaseRequest_prNo_key];
END;

IF EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE [name] = N'PurchaseRequest_prNo_key'
      AND [object_id] = OBJECT_ID(N'dbo.PurchaseRequest')
)
BEGIN
    DROP INDEX [PurchaseRequest_prNo_key] ON [dbo].[PurchaseRequest];
END;

IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE [name] = N'PurchaseRequest_prNo_not_null_key'
      AND [object_id] = OBJECT_ID(N'dbo.PurchaseRequest')
)
BEGIN
    CREATE UNIQUE NONCLUSTERED INDEX [PurchaseRequest_prNo_not_null_key]
    ON [dbo].[PurchaseRequest]([prNo])
    WHERE [prNo] IS NOT NULL;
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
