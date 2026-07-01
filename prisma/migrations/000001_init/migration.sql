BEGIN TRY

BEGIN TRAN;

-- CreateSchema
IF NOT EXISTS (SELECT * FROM sys.schemas WHERE name = N'dbo') EXEC sp_executesql N'CREATE SCHEMA [dbo];';

-- CreateTable
CREATE TABLE [dbo].[User] (
    [id] NVARCHAR(30) NOT NULL,
    [username] NVARCHAR(80) NOT NULL,
    [displayName] NVARCHAR(160) NOT NULL,
    [email] NVARCHAR(220),
    [passwordHash] NVARCHAR(255) NOT NULL,
    [role] NVARCHAR(40) NOT NULL CONSTRAINT [User_role_df] DEFAULT 'IT_USER',
    [isActive] BIT NOT NULL CONSTRAINT [User_isActive_df] DEFAULT 1,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [User_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [User_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [User_username_key] UNIQUE NONCLUSTERED ([username]),
    CONSTRAINT [User_email_key] UNIQUE NONCLUSTERED ([email])
);

-- CreateTable
CREATE TABLE [dbo].[Company] (
    [id] NVARCHAR(30) NOT NULL,
    [code] NVARCHAR(40) NOT NULL,
    [legalName] NVARCHAR(240) NOT NULL,
    [displayName] NVARCHAR(160) NOT NULL,
    [taxId] NVARCHAR(40),
    [isActive] BIT NOT NULL CONSTRAINT [Company_isActive_df] DEFAULT 1,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [Company_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [Company_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [Company_code_key] UNIQUE NONCLUSTERED ([code])
);

-- CreateTable
CREATE TABLE [dbo].[Branch] (
    [id] NVARCHAR(30) NOT NULL,
    [companyId] NVARCHAR(30) NOT NULL,
    [code] NVARCHAR(40) NOT NULL,
    [name] NVARCHAR(160) NOT NULL,
    [address] NVARCHAR(500),
    [isActive] BIT NOT NULL CONSTRAINT [Branch_isActive_df] DEFAULT 1,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [Branch_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [Branch_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [Branch_companyId_code_key] UNIQUE NONCLUSTERED ([companyId],[code])
);

-- CreateTable
CREATE TABLE [dbo].[Department] (
    [id] NVARCHAR(30) NOT NULL,
    [name] NVARCHAR(160) NOT NULL,
    [isActive] BIT NOT NULL CONSTRAINT [Department_isActive_df] DEFAULT 1,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [Department_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [Department_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [Department_name_key] UNIQUE NONCLUSTERED ([name])
);

-- CreateTable
CREATE TABLE [dbo].[Division] (
    [id] NVARCHAR(30) NOT NULL,
    [departmentId] NVARCHAR(30) NOT NULL,
    [name] NVARCHAR(160) NOT NULL,
    [isActive] BIT NOT NULL CONSTRAINT [Division_isActive_df] DEFAULT 1,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [Division_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [Division_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [Division_departmentId_name_key] UNIQUE NONCLUSTERED ([departmentId],[name])
);

-- CreateTable
CREATE TABLE [dbo].[Budget] (
    [id] NVARCHAR(30) NOT NULL,
    [year] INT NOT NULL,
    [companyId] NVARCHAR(30) NOT NULL,
    [branchId] NVARCHAR(30),
    [departmentId] NVARCHAR(30) NOT NULL,
    [budgetAmount] DECIMAL(18,2) NOT NULL,
    [usedAmount] DECIMAL(18,2) NOT NULL CONSTRAINT [Budget_usedAmount_df] DEFAULT 0,
    [reservedAmount] DECIMAL(18,2) NOT NULL CONSTRAINT [Budget_reservedAmount_df] DEFAULT 0,
    [isActive] BIT NOT NULL CONSTRAINT [Budget_isActive_df] DEFAULT 1,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [Budget_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [Budget_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [Budget_year_companyId_branchId_departmentId_key] UNIQUE NONCLUSTERED ([year],[companyId],[branchId],[departmentId])
);

-- CreateTable
CREATE TABLE [dbo].[PurchaseRequest] (
    [id] NVARCHAR(30) NOT NULL,
    [prNo] NVARCHAR(40),
    [refNo] NVARCHAR(80),
    [companyId] NVARCHAR(30) NOT NULL,
    [branchId] NVARCHAR(30) NOT NULL,
    [departmentId] NVARCHAR(30) NOT NULL,
    [divisionId] NVARCHAR(30),
    [documentDate] DATETIME2 NOT NULL,
    [requiredDate] DATETIME2,
    [purpose] NVARCHAR(120) NOT NULL,
    [purchaseMethod] NVARCHAR(120) NOT NULL,
    [remark] NVARCHAR(1000),
    [subtotal] DECIMAL(18,2) NOT NULL CONSTRAINT [PurchaseRequest_subtotal_df] DEFAULT 0,
    [vatRate] DECIMAL(5,2) NOT NULL CONSTRAINT [PurchaseRequest_vatRate_df] DEFAULT 7,
    [vatAmount] DECIMAL(18,2) NOT NULL CONSTRAINT [PurchaseRequest_vatAmount_df] DEFAULT 0,
    [totalAmount] DECIMAL(18,2) NOT NULL CONSTRAINT [PurchaseRequest_totalAmount_df] DEFAULT 0,
    [status] NVARCHAR(40) NOT NULL CONSTRAINT [PurchaseRequest_status_df] DEFAULT 'DRAFT',
    [templateVersionId] NVARCHAR(30),
    [generatedSnapshotJson] NVARCHAR(max),
    [createdById] NVARCHAR(30) NOT NULL,
    [generatedAt] DATETIME2,
    [printedAt] DATETIME2,
    [signedAt] DATETIME2,
    [cancelledAt] DATETIME2,
    [reissuedFromId] NVARCHAR(30),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [PurchaseRequest_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [PurchaseRequest_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [PurchaseRequest_prNo_key] UNIQUE NONCLUSTERED ([prNo])
);

-- CreateTable
CREATE TABLE [dbo].[PurchaseRequestItem] (
    [id] NVARCHAR(30) NOT NULL,
    [purchaseRequestId] NVARCHAR(30) NOT NULL,
    [lineNo] INT NOT NULL,
    [accountCode] NVARCHAR(80) NOT NULL,
    [description] NVARCHAR(500) NOT NULL,
    [quantity] DECIMAL(18,4) NOT NULL,
    [unitCost] DECIMAL(18,2) NOT NULL,
    [totalAmount] DECIMAL(18,2) NOT NULL,
    CONSTRAINT [PurchaseRequestItem_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [PurchaseRequestItem_purchaseRequestId_lineNo_key] UNIQUE NONCLUSTERED ([purchaseRequestId],[lineNo])
);

-- CreateTable
CREATE TABLE [dbo].[PurchaseRequestAttachment] (
    [id] NVARCHAR(30) NOT NULL,
    [purchaseRequestId] NVARCHAR(30) NOT NULL,
    [type] NVARCHAR(60) NOT NULL,
    [version] INT NOT NULL CONSTRAINT [PurchaseRequestAttachment_version_df] DEFAULT 1,
    [fileName] NVARCHAR(260) NOT NULL,
    [mimeType] NVARCHAR(120) NOT NULL,
    [fileSize] INT NOT NULL,
    [storagePath] NVARCHAR(500) NOT NULL,
    [sha256] NVARCHAR(64) NOT NULL,
    [uploadedById] NVARCHAR(30) NOT NULL,
    [uploadedAt] DATETIME2 NOT NULL CONSTRAINT [PurchaseRequestAttachment_uploadedAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [PurchaseRequestAttachment_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [PurchaseRequestAttachment_purchaseRequestId_type_version_key] UNIQUE NONCLUSTERED ([purchaseRequestId],[type],[version])
);

-- CreateTable
CREATE TABLE [dbo].[DocumentTemplate] (
    [id] NVARCHAR(30) NOT NULL,
    [name] NVARCHAR(120) NOT NULL,
    [version] NVARCHAR(40) NOT NULL,
    [contractName] NVARCHAR(160) NOT NULL,
    [status] NVARCHAR(40) NOT NULL CONSTRAINT [DocumentTemplate_status_df] DEFAULT 'DRAFT',
    [fileName] NVARCHAR(260) NOT NULL,
    [storagePath] NVARCHAR(500) NOT NULL,
    [validationJson] NVARCHAR(max),
    [createdById] NVARCHAR(30) NOT NULL,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [DocumentTemplate_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [activatedAt] DATETIME2,
    [archivedAt] DATETIME2,
    CONSTRAINT [DocumentTemplate_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [DocumentTemplate_name_version_key] UNIQUE NONCLUSTERED ([name],[version])
);

-- CreateTable
CREATE TABLE [dbo].[RunningNumberSetting] (
    [id] NVARCHAR(30) NOT NULL,
    [documentType] NVARCHAR(40) NOT NULL,
    [prefix] NVARCHAR(40) NOT NULL,
    [yearFormat] NVARCHAR(20) NOT NULL,
    [monthFormat] NVARCHAR(20) NOT NULL,
    [padding] INT NOT NULL CONSTRAINT [RunningNumberSetting_padding_df] DEFAULT 4,
    [currentValue] INT NOT NULL CONSTRAINT [RunningNumberSetting_currentValue_df] DEFAULT 0,
    [scopeCompanyId] NVARCHAR(30),
    [scopeBranchId] NVARCHAR(30),
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [RunningNumberSetting_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [RunningNumberSetting_documentType_scopeCompanyId_scopeBranchId_key] UNIQUE NONCLUSTERED ([documentType],[scopeCompanyId],[scopeBranchId])
);

-- CreateTable
CREATE TABLE [dbo].[AuditLog] (
    [id] NVARCHAR(30) NOT NULL,
    [entityType] NVARCHAR(80) NOT NULL,
    [entityId] NVARCHAR(80) NOT NULL,
    [action] NVARCHAR(120) NOT NULL,
    [actorId] NVARCHAR(30),
    [metadataJson] NVARCHAR(max),
    [ipAddress] NVARCHAR(80),
    [userAgent] NVARCHAR(500),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [AuditLog_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [AuditLog_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateIndex
CREATE NONCLUSTERED INDEX [AuditLog_entityType_entityId_idx] ON [dbo].[AuditLog]([entityType], [entityId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [AuditLog_createdAt_idx] ON [dbo].[AuditLog]([createdAt]);

-- AddForeignKey
ALTER TABLE [dbo].[Branch] ADD CONSTRAINT [Branch_companyId_fkey] FOREIGN KEY ([companyId]) REFERENCES [dbo].[Company]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Division] ADD CONSTRAINT [Division_departmentId_fkey] FOREIGN KEY ([departmentId]) REFERENCES [dbo].[Department]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Budget] ADD CONSTRAINT [Budget_companyId_fkey] FOREIGN KEY ([companyId]) REFERENCES [dbo].[Company]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Budget] ADD CONSTRAINT [Budget_branchId_fkey] FOREIGN KEY ([branchId]) REFERENCES [dbo].[Branch]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Budget] ADD CONSTRAINT [Budget_departmentId_fkey] FOREIGN KEY ([departmentId]) REFERENCES [dbo].[Department]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[PurchaseRequest] ADD CONSTRAINT [PurchaseRequest_companyId_fkey] FOREIGN KEY ([companyId]) REFERENCES [dbo].[Company]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[PurchaseRequest] ADD CONSTRAINT [PurchaseRequest_branchId_fkey] FOREIGN KEY ([branchId]) REFERENCES [dbo].[Branch]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[PurchaseRequest] ADD CONSTRAINT [PurchaseRequest_departmentId_fkey] FOREIGN KEY ([departmentId]) REFERENCES [dbo].[Department]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[PurchaseRequest] ADD CONSTRAINT [PurchaseRequest_divisionId_fkey] FOREIGN KEY ([divisionId]) REFERENCES [dbo].[Division]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[PurchaseRequest] ADD CONSTRAINT [PurchaseRequest_templateVersionId_fkey] FOREIGN KEY ([templateVersionId]) REFERENCES [dbo].[DocumentTemplate]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[PurchaseRequest] ADD CONSTRAINT [PurchaseRequest_createdById_fkey] FOREIGN KEY ([createdById]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[PurchaseRequest] ADD CONSTRAINT [PurchaseRequest_reissuedFromId_fkey] FOREIGN KEY ([reissuedFromId]) REFERENCES [dbo].[PurchaseRequest]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[PurchaseRequestItem] ADD CONSTRAINT [PurchaseRequestItem_purchaseRequestId_fkey] FOREIGN KEY ([purchaseRequestId]) REFERENCES [dbo].[PurchaseRequest]([id]) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[PurchaseRequestAttachment] ADD CONSTRAINT [PurchaseRequestAttachment_purchaseRequestId_fkey] FOREIGN KEY ([purchaseRequestId]) REFERENCES [dbo].[PurchaseRequest]([id]) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[PurchaseRequestAttachment] ADD CONSTRAINT [PurchaseRequestAttachment_uploadedById_fkey] FOREIGN KEY ([uploadedById]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[DocumentTemplate] ADD CONSTRAINT [DocumentTemplate_createdById_fkey] FOREIGN KEY ([createdById]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[AuditLog] ADD CONSTRAINT [AuditLog_actorId_fkey] FOREIGN KEY ([actorId]) REFERENCES [dbo].[User]([id]) ON DELETE SET NULL ON UPDATE NO ACTION;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
