-- The request id never tied accesses together: the scope that minted it was
-- opened inside the access wrapper, so all but a couple of rows had an id of
-- their own. Dropped until an action-level design gives it a meaning.

-- DropIndex
DROP INDEX "logs_requestId_idx";

-- AlterTable
ALTER TABLE "logs" DROP COLUMN "requestId";
