BEGIN TRY

BEGIN TRAN;

IF COL_LENGTH(N'dbo.DocumentTemplate', N'templateType') IS NULL
BEGIN
    ALTER TABLE [dbo].[DocumentTemplate]
    ADD [templateType] NVARCHAR(20) NOT NULL
        CONSTRAINT [DocumentTemplate_templateType_df] DEFAULT 'DOCX';
END;

IF EXISTS (
    SELECT 1
    FROM sys.key_constraints
    WHERE [name] = N'DocumentTemplate_name_version_key'
      AND [parent_object_id] = OBJECT_ID(N'dbo.DocumentTemplate')
)
BEGIN
    ALTER TABLE [dbo].[DocumentTemplate]
    DROP CONSTRAINT [DocumentTemplate_name_version_key];
END;

IF NOT EXISTS (
    SELECT 1
    FROM sys.key_constraints
    WHERE [name] = N'DocumentTemplate_name_version_templateType_key'
      AND [parent_object_id] = OBJECT_ID(N'dbo.DocumentTemplate')
)
BEGIN
    ALTER TABLE [dbo].[DocumentTemplate]
    ADD CONSTRAINT [DocumentTemplate_name_version_templateType_key]
    UNIQUE NONCLUSTERED ([name], [version], [templateType]);
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
