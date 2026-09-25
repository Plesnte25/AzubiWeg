-- The vault already linked is the one Settings' sync switch reconnects to.
UPDATE "User" SET "lastVaultPath" = "vaultPath" WHERE "vaultPath" IS NOT NULL;
