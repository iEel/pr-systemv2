BEGIN TRY

BEGIN TRAN;

IF COL_LENGTH(N'dbo.PurchaseRequestItem', N'rowType') IS NULL
BEGIN
    ALTER TABLE [dbo].[PurchaseRequestItem]
    ADD [rowType] NVARCHAR(20) NOT NULL
        CONSTRAINT [PurchaseRequestItem_rowType_df] DEFAULT N'ITEM';
END;

IF NOT EXISTS (
    SELECT 1
    FROM sys.check_constraints
    WHERE [name] = N'PurchaseRequestItem_rowType_check'
      AND [parent_object_id] = OBJECT_ID(N'dbo.PurchaseRequestItem')
)
BEGIN
    EXEC(N'ALTER TABLE [dbo].[PurchaseRequestItem]
    ADD CONSTRAINT [PurchaseRequestItem_rowType_check]
    CHECK ([rowType] IN (N''ITEM'', N''HEADING''))');
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
