BEGIN TRY

BEGIN TRAN;

IF COL_LENGTH(N'dbo.PurchaseRequest', N'clonedFromId') IS NULL
BEGIN
    ALTER TABLE [dbo].[PurchaseRequest]
    ADD [clonedFromId] NVARCHAR(30);
END;

IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE [name] = N'PurchaseRequest_clonedFromId_idx'
      AND [object_id] = OBJECT_ID(N'dbo.PurchaseRequest')
)
BEGIN
    CREATE NONCLUSTERED INDEX [PurchaseRequest_clonedFromId_idx]
    ON [dbo].[PurchaseRequest]([clonedFromId]);
END;

IF NOT EXISTS (
    SELECT 1
    FROM sys.foreign_keys
    WHERE [name] = N'PurchaseRequest_clonedFromId_fkey'
      AND [parent_object_id] = OBJECT_ID(N'dbo.PurchaseRequest')
)
BEGIN
    ALTER TABLE [dbo].[PurchaseRequest]
    ADD CONSTRAINT [PurchaseRequest_clonedFromId_fkey]
    FOREIGN KEY ([clonedFromId]) REFERENCES [dbo].[PurchaseRequest]([id])
    ON DELETE NO ACTION ON UPDATE NO ACTION;
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
