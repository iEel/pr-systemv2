ALTER TABLE [dbo].[Branch] ADD
    [documentRefNo] NVARCHAR(80),
    [documentLegalName] NVARCHAR(240),
    [documentTaxId] NVARCHAR(40),
    [documentAddress] NVARCHAR(500),
    [documentDisplayName] NVARCHAR(160),
    [documentHeaderAssetPath] NVARCHAR(260),
    [documentFooterAssetPath] NVARCHAR(260);
