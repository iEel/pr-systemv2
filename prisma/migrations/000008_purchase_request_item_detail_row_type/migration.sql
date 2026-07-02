BEGIN TRY

BEGIN TRAN;

IF EXISTS (
    SELECT 1
    FROM sys.check_constraints
    WHERE [name] = N'PurchaseRequestItem_rowType_check'
      AND [parent_object_id] = OBJECT_ID(N'dbo.PurchaseRequestItem')
)
BEGIN
    ALTER TABLE [dbo].[PurchaseRequestItem]
    DROP CONSTRAINT [PurchaseRequestItem_rowType_check];
END;

ALTER TABLE [dbo].[PurchaseRequestItem]
ADD CONSTRAINT [PurchaseRequestItem_rowType_check]
CHECK ([rowType] IN (N'ITEM', N'HEADING', N'DETAIL'));

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
